import { z } from "zod";

export const initiateUploadSchema = z.object({
	fileName: z.string(),
	fileSize: z.number().max(5 * 1024 * 1024 * 1024, "File size exceeds 5GB"),
	contentType: z.string().refine((val) => val.startsWith("video/"), {
		message: "Only video files are allowed",
	}),
});

export const presignUrlQuerySchema = z.object({
	uploadId: z.string(),
	partNumber: z.string(),
});

export const completeUploadSchema = z.object({
	uploadId: z.string(),
	parts: z.array(z.object({ eTag: z.string(), partNumber: z.number() })),
});

export const updateStatusSchema = z.object({
	uploadId: z.string(),
	status: z.enum(["PAUSED", "UPLOADING", "CANCELLED", "FAILED"]),
});

// 👇 Infer the TypeScript type from the schema
export type InitiateUploadInput = z.infer<typeof initiateUploadSchema>;
export type PresignUrlQueryInput = z.infer<typeof presignUrlQuerySchema>;
export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
