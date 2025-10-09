import { Response } from "express";
import { Logger } from "../../utils/logger";
import {
	CompleteMultipartUploadCommand,
	CreateMultipartUploadCommand,
	GetObjectCommand,
	ListPartsCommand,
	UploadPartCommand,
} from "@aws-sdk/client-s3";
import { s3Client } from "../../lib/s3";
import { AuthenticatedRequest } from "../auth/auth.guard";
import {
	CompleteUploadInput,
	InitiateUploadInput,
	PresignUrlQueryInput,
	UpdateStatusInput,
} from "./uploads.schema";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { HttpException } from "../../exceptions/http.exception";
import { prisma } from "../../db";
import { transcodeQueue } from "../../jobs";

export class UploadsController {
	private logger = new Logger(UploadsController.name);
	constructor() {}

	async initiate(
		req: AuthenticatedRequest<unknown, unknown, InitiateUploadInput>,
		res: Response
	) {
		const { fileName, contentType, fileSize } = req.body;

		if (!req.user) {
			throw new HttpException("User missing", 500);
		}

		// TODO- parse the filename to a safer one
		const key = `videos/${req.user.id}/${fileName}_${Date.now()}`; // videos/userId/filename_date

		const command = new CreateMultipartUploadCommand({
			Bucket: process.env.S3_BUCKET!,
			Key: key,
			ContentType: contentType,
		});

		const response = await s3Client.send(command);

		if (!response.UploadId) {
			this.logger.error("uploadId not found in s3 client response");
			throw new HttpException("Something went wrong- cannot get uploadId");
		}

		this.logger.info("creating upload in db");
		const videoUpload = await prisma.videoUpload.create({
			data: {
				uploadId: response.UploadId,
				key,
				bucket: process.env.S3_BUCKET!,
				fileName,
				contentType,
				size: BigInt(fileSize), // or actual file size
				userId: req.user.id,
			},
		});

		res.status(200).json({ ...videoUpload, size: videoUpload.size.toString() });
	}

	async getPresignedUrl(
		req: AuthenticatedRequest<unknown, unknown, unknown, PresignUrlQueryInput>,
		res: Response
	) {
		const { uploadId, partNumber } = req.query;

		// look for upload record
		const videoUpload = await prisma.videoUpload.findFirst({
			where: {
				uploadId,
				userId: req.user!.id,
			},
		});

		if (!videoUpload) {
			throw new HttpException(
				`No video upload with uploadId ${uploadId} found for this user`
			);
		}

		if (isNaN(parseInt(partNumber))) {
			throw new HttpException("Invalid part number");
		}
		try {
			const command = new UploadPartCommand({
				Bucket: process.env.S3_BUCKET!,
				Key: videoUpload.key,
				UploadId: videoUpload.uploadId,
				PartNumber: parseInt(partNumber),
			});

			const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

			await prisma.videoUpload.update({
				where: { id: videoUpload.id },
				data: {
					status: "UPLOADING",
				},
			});

			res.status(200).json({ url });
		} catch (error: unknown) {
			this.logger.error("Unable to get signed url", error as string | object);
			throw new HttpException("Unable to get signed url");
		}
	}

	async complete(
		req: AuthenticatedRequest<unknown, unknown, CompleteUploadInput>,
		res: Response
	) {
		const { uploadId, parts } = req.body;
		// look for upload record
		const videoUpload = await prisma.videoUpload.findFirst({
			where: {
				uploadId,
				userId: req.user!.id,
			},
		});

		if (!videoUpload) {
			throw new HttpException(
				`No video upload with uploadId ${uploadId} found for this user`
			);
		}

		const formattedParts = parts.map((p) => ({
			ETag: p.eTag,
			PartNumber: p.partNumber,
		}));

		try {
			const listPartsCommand = new ListPartsCommand({
				Bucket: process.env.S3_BUCKET!,
				Key: videoUpload.key,
				UploadId: uploadId,
			});

			const listPartsResponse = await s3Client.send(listPartsCommand);
			if (listPartsResponse.Parts?.length !== formattedParts.length) {
				// set the video upload to failed
				throw new HttpException("An error occured while uploading", 400);
			}

			this.logger.info(`gotten parts for uploadId ${videoUpload.id}`);
			const commpleteUploadCommand = new CompleteMultipartUploadCommand({
				Bucket: process.env.S3_BUCKET!,
				Key: videoUpload.key,
				UploadId: uploadId,
				MultipartUpload: {
					Parts: formattedParts,
				},
			});

			await s3Client.send(commpleteUploadCommand);

			await prisma.videoUpload.update({
				where: { id: videoUpload.id },
				data: {
					status: "COMPLETED",
				},
			});

			// send to queue fro processing
			await transcodeQueue.add(
				"transcode-video",
				{
					videoUploadId: videoUpload.id,
				},
				{
					attempts: 3, // retry up to 3 times
					removeOnComplete: true,
					removeOnFail: false,
				}
			);
		} catch (error: unknown) {
			if (error instanceof HttpException) {
				throw error;
			}
			this.logger.error(
				"Unable to list upload parts",
				error as string | object
			);
			throw new HttpException("Unable to list upload parts");
		}

		res.status(200).json({ success: true });
	}

	async updateStatus(
		req: AuthenticatedRequest<unknown, unknown, UpdateStatusInput>,
		res: Response
	) {
		const { uploadId, status } = req.body;

		// look for upload record
		const videoUpload = await prisma.videoUpload.findFirst({
			where: {
				uploadId,
				userId: req.user!.id,
			},
		});

		if (!videoUpload) {
			throw new HttpException(
				`No video upload with uploadId ${uploadId} found for this user`
			);
		}

		if (
			videoUpload.status === "COMPLETED" ||
			videoUpload.status === "CANCELLED"
		) {
			throw new HttpException(`Upload already ${videoUpload.status}`);
		}

		await prisma.videoUpload.update({
			where: { id: videoUpload.id },
			data: {
				status,
			},
		});

		return res.status(200).json({ message: "Status update successful" });
	}

	async listUploads(
		req: AuthenticatedRequest<
			unknown,
			unknown,
			unknown,
			{ page?: string; perPage?: string }
		>,
		res: Response
	) {
		if (!req.user) {
			throw new HttpException("User missing", 500);
		}

		const page = parseInt(req.query.page || "1", 10);
		const perPage = parseInt(req.query.perPage || "10", 10);

		if (isNaN(page) || isNaN(perPage)) {
			throw new HttpException("Invalid format for page or perPage");
		}

		const skip = (page - 1) * perPage;

		// Get total count
		const total = await prisma.videoUpload.count({
			where: {
				userId: req.user.id,
			},
		});

		// Fetch paginated uploads
		const uploads = await prisma.videoUpload.findMany({
			where: {
				userId: req.user.id,
			},
			orderBy: {
				createdAt: "desc",
			},
			skip,
			take: perPage,
		});

		const serialized = uploads.map((u) => ({
			...u,
			size: u.size?.toString(), // convert BigInt to string
		}));

		const totalPages = Math.ceil(total / perPage);

		res.json({
			data: serialized,
			meta: {
				page,
				perPage,
				total,
				totalPages,
				hasNextPage: page < totalPages,
				hasPrevPage: page > 1,
			},
		});
	}

	async getUploadManifest(
		req: AuthenticatedRequest<{ videoUploadId: string }>,
		res: Response
	) {
		const { videoUploadId } = req.params;

		const videoUpload = await prisma.videoUpload.findFirst({
			where: {
				id: videoUploadId,
				userId: req.user!.id,
			},
		});

		if (!videoUpload) {
			throw new HttpException(
				`No video upload with uploadId ${videoUploadId} found for this user`
			);
		}

		if (!videoUpload.hlsMasterKey) {
			throw new HttpException("Video not found or still processing.", 404);
		}

		//  generate a pre-signed URL for the master manifest
		const command = new GetObjectCommand({
			Bucket: videoUpload.bucket,
			Key: videoUpload.hlsMasterKey,
		});

		const url = await getSignedUrl(s3Client, command, {
			expiresIn: 24 * 60 * 60,
		});

		res.json({ url });
	}
}
