import api from "@/api/api";

interface InitiateUploadPayload {
	fileName: string;
	fileSize: number; // in bytes
	contentType: string;
}

interface InitiateUploadResponse {
	uploadId: string;
}

interface PresignedUrlParams {
	uploadId: string;
	partNumber: number;
}

interface CompleteUploadPayload {
	uploadId: string;
	parts: {
		partNumber: number;
		eTag: string;
	}[];
}

interface PresignedUrlResponse {
	url: string;
}

/**
 * Initiate a multipart upload. Returns an uploadId + key to be used for subsequent part uploads.
 */
export async function initiateUpload(
	payload: InitiateUploadPayload
): Promise<InitiateUploadResponse> {
	const res = await api.post<InitiateUploadResponse>(
		"/api/uploads/initiate",
		payload
	);
	return res.data;
}

/**
 * Get a presigned URL for uploading a specific part.
 */
export async function getPresignedUrl(
	params: PresignedUrlParams
): Promise<PresignedUrlResponse> {
	const res = await api.get<PresignedUrlResponse>(
		"/api/uploads/presigned-url",
		{
			params,
		}
	);
	return res.data;
}

export async function completeUpload(payload: CompleteUploadPayload) {
	console.log({ payload });
	const res = await api.post("/api/uploads/complete", payload);
	return res.data;
}
