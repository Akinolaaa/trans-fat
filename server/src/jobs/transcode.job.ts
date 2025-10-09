import { Job } from "bullmq";
import { prisma } from "../db";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import * as fs from "fs-extra";
import * as path from "path";
import ffmpeg from "fluent-ffmpeg";
import { s3Client } from "../lib/s3";
import { Readable } from "stream";

export async function transcodeJob(job: Job<{ videoUploadId: string }>) {
	const { videoUploadId } = job.data;

	// Check if this job has already been processed (idempotency)
	const videoUpload = await prisma.videoUpload.findUnique({
		where: { id: videoUploadId },
	});
	if (!videoUpload) {
		throw new Error(`Upload with ID ${videoUploadId} not found`);
	}

	if (videoUpload.status !== "COMPLETED") {
		job.log(`Job ${job.id} skipped — upload incomplete`);
		return;
	}
	if (videoUpload.isTranscoded) {
		job.log(`Job ${job.id} skipped — already transcoded`);
		return;
	}

	job.log(`Starting transcode for ${videoUploadId}`);

	try {
		// This should be your actual transcoding logic
		await fakeTranscode(videoUploadId); // placeholder

		await prisma.videoUpload.update({
			where: { id: videoUploadId },
			data: {
				isTranscoded: true,
				transcodedAt: new Date(),
			},
		});

		job.log(`Transcode completed for ${videoUploadId}`);
	} catch (err) {
		job.log(`Transcode failed: ${err}`);
		throw err; // let BullMQ handle retries
	}
}

async function fakeTranscode(_key: string) {
	return new Promise((resolve) => setTimeout(resolve, 3000));
}

const TEMP_DIR = path.join(process.cwd(), "temp_processing");
const OUTPUT_DIR_NAME = "hls";

export async function processTranscodeJob(
	job: Job<{ videoUploadId: string }>
): Promise<void> {
	const { videoUploadId } = job.data;
	const videoUpload = await prisma.videoUpload.findUnique({
		where: { id: videoUploadId },
	});

	if (!videoUpload) {
		throw new Error(`Upload with ID ${videoUploadId} not found`);
	}

	const [sourceBucket, sourceKey] = [videoUpload.bucket, videoUpload.key];

	const videoOutputPath = path.join(TEMP_DIR, videoUpload.id);

	const localSourcePath = path.join(videoOutputPath, "source.mp4");

	const hlsOutputFolder = path.join(videoOutputPath, OUTPUT_DIR_NAME);

	await fs.ensureDir(hlsOutputFolder);

	// --- 1. Check Idempotency / Status Update ---
	const videoRecord = await prisma.videoUpload.findUnique({
		where: { id: videoUploadId },
	});
	if (videoRecord?.status === "COMPLETED") {
		console.log(`Video ${videoUploadId} already completed. Exiting job.`);
		return;
	}
	// Set status to IN_PROGRESS to prevent concurrent jobs/retries from re-running fully
	await prisma.videoUpload.update({
		where: { id: videoUploadId },
		data: { transcodeStatus: "PROCESSING" },
	});

	try {
		// --- 2. Download from S3 ---
		// Pipe the S3 GetObject stream to a local file
		const downloadCommand = new GetObjectCommand({
			Bucket: sourceBucket,
			Key: sourceKey,
		});
		const s3Object = await s3Client.send(downloadCommand);
		const writeStream = fs.createWriteStream(localSourcePath);
		await new Promise<void>((resolve, reject) => {
			(s3Object.Body as Readable)
				.pipe(writeStream)
				.on("error", reject)
				.on("close", resolve);
		});

		// --- 3. Transcode to HLS and Generate Thumbnail ---
		await transcodeAndGenerateThumbnail(localSourcePath, hlsOutputFolder);

		// --- 4. Upload Artifacts to S3 ---
		const hlsMasterKey = await uploadHlsArtifacts(
			videoUploadId,
			hlsOutputFolder
		);

		// --- 5. Final DB Update & Cleanup ---
		await prisma.videoUpload.update({
			where: { id: videoUploadId },
			data: {
				status: "COMPLETED",
				hlsMasterKey: hlsMasterKey, // Store the master manifest key
				thumbNailKey: `videos/${videoUploadId}/thumbnail.jpg`,
			},
		});
	} catch (error) {
		console.error(`Transcoding job failed for ${videoUploadId}:`, error);
		// BullMQ retry will handle the attempts; this ensures status is marked FAILED if retries are exhausted
		await prisma.videoUpload.update({
			where: { id: videoUploadId },
			data: { status: "FAILED" },
		});
		throw error; // Re-throw to trigger BullMQ retry logic
	} finally {
		// Crucial for cleanup in a Docker environment
		await fs.remove(videoOutputPath);
	}
}

// Helper to run FFmpeg command
function transcodeAndGenerateThumbnail(
	inputPath: string,
	outputDir: string
): Promise<void> {
	return new Promise((resolve, reject) => {
		ffmpeg(inputPath)
			// FFmpeg to HLS (480p and 720p streams + thumbnail)
			.outputOptions([
				// HLS settings for VOD
				"-hls_list_size 0",
				"-hls_time 10",
				"-hls_master_playlist_name master.m3u8",
				"-f hls",

				// --- 720p stream (High Bandwidth) ---
				"-map 0:v:0",
				"-map 0:a:0",
				"-c:v:0 libx264",
				"-preset veryfast",
				"-profile:v:0 main",
				"-b:v:0 4000k",
				"-maxrate:v:0 4200k",
				"-bufsize:v:0 6000k",
				"-vf:0 scale=-2:720",
				`${outputDir}/720p.m3u8`,

				// --- 480p stream (Medium Bandwidth) ---
				"-map 0:v:0",
				"-map 0:a:0",
				"-c:v:1 libx264",
				"-preset veryfast",
				"-profile:v:1 main",
				"-b:v:1 1500k",
				"-maxrate:v:1 1600k",
				"-bufsize:v:1 2400k",
				"-vf:1 scale=-2:480",
				`${outputDir}/480p.m3u8`,

				// --- Thumbnail Generation ---
				"-map 0:v:0",
				"-vframes 1", // Take only one frame
				"-ss 00:00:05.000", // Capture at 5 seconds
				"-f image2",
				`${outputDir}/../thumbnail.jpg`, // Go up one level
			])
			.on("end", () => resolve())
			.on("error", (err) => reject(new Error("FFmpeg error: " + err.message)))
			.run();
	});
}

// Helper to upload all generated files recursively
async function uploadHlsArtifacts(
	videoUploadId: string,
	hlsOutputFolder: string
): Promise<string> {
	const files = await fs.readdir(hlsOutputFolder);
	const uploadPromises = files.map(async (file) => {
		const filePath = path.join(hlsOutputFolder, file);
		const s3Key = `videos/${videoUploadId}/hls/${file}`;

		// Determine Content-Type
		let contentType = "application/octet-stream";
		if (file.endsWith(".m3u8")) contentType = "application/x-mpegURL";
		else if (file.endsWith(".ts")) contentType = "video/MP2T";
		else if (file.endsWith(".jpg")) contentType = "image/jpeg";

		const uploadCommand = new PutObjectCommand({
			Bucket: "YOUR_S3_BUCKET", // Replace with your actual bucket name
			Key: s3Key,
			Body: fs.createReadStream(filePath),
			ContentType: contentType,
		});
		await s3Client.send(uploadCommand);
		return s3Key;
	});

	await Promise.all(uploadPromises);
	return `videos/${videoUploadId}/hls/master.m3u8`; // Return the master key
}
