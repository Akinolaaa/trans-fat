import { z } from "zod";

export const initiateUploadSchema = z.object({
	fileName: z.string(),
	fileSize: z.number(),
	contentType: z.string(),
});

export const presignUrlQuerySchema = z.object({
	uploadId: z.string(),
	partNumber: z.string(),
});

export const completeUploadSchema = z.object({
	uploadId: z.string(),
	parts: z.array(z.object({ eTag: z.string(), partNumber: z.number() })),
});

// 👇 Infer the TypeScript type from the schema
export type InitiateUploadInput = z.infer<typeof initiateUploadSchema>;
export type PresignUrlQueryInput = z.infer<typeof presignUrlQuerySchema>;
export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;
