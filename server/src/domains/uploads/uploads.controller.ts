import { Response } from "express";
import { Logger } from "../../utils/logger";
import {
	CompleteMultipartUploadCommand,
	CreateMultipartUploadCommand,
	ListPartsCommand,
	UploadPartCommand,
} from "@aws-sdk/client-s3";
import { s3Client } from "../../lib/s3";
import { AuthenticatedRequest } from "../auth/auth.guard";
import {
	CompleteUploadInput,
	InitiateUploadInput,
	PresignUrlQueryInput,
} from "./uploads.schema";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { HttpException } from "../../exceptions/http.exception";
import { prisma } from "../../db";

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

		res.json({
			uploadId: videoUpload.uploadId,
			key: response.Key,
		});
	}

	async getPresignedUrl(
		req: AuthenticatedRequest<unknown, unknown, unknown, PresignUrlQueryInput>,
		res: Response
	) {
		const { uploadId, partNumber, key } = req.query;

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

		try {
			const command = new UploadPartCommand({
				Bucket: process.env.S3_BUCKET!,
				Key: key,
				UploadId: uploadId,
				PartNumber: parseInt(partNumber),
			});

			const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

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
			Etag: p.eTag,
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

			this.logger.info(`gotten parts for uploadId ${uploadId}`);
			const commpleteUploadCommand = new CompleteMultipartUploadCommand({
				Bucket: process.env.S3_BUCKET!,
				Key: videoUpload.key,
				UploadId: uploadId,
				MultipartUpload: {
					Parts: formattedParts,
				},
			});

			await s3Client.send(commpleteUploadCommand);

			// enqueue FFmpeg job here (we'll add later)
			// queue.add('transcode', { key })
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
		// enqueue FFmpeg job here (we'll add later)
		// queue.add('transcode', { key })

		res.json({ success: true });
	}
}
