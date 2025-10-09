import api from "@/api/api";

interface InitiateUploadPayload {
	fileName: string;
	fileSize: number; // in bytes
	contentType: string;
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

interface UpdateStatusPayload {
	uploadId: string;
	status: "PAUSED" | "UPLOADING" | "CANCELLED" | "FAILED";
}

interface PresignedUrlResponse {
	url: string;
}
export interface Upload {
	id: string;
	uploadId: string
	fileName: string;
	contentType: string;
	size: string;
	status: string;
	createdAt: string;
}
export interface ListUploadsResponse {
	data: Upload[];

	meta: {
		page: number;
		perPage: number;
		total: number;
		totalPages: number;
		hasNextPage: boolean;
		hasPrevPage: boolean;
	};
}

/**
 * Initiate a multipart upload. Returns an uploadId + key to be used for subsequent part uploads.
 */
export async function initiateUpload(payload: InitiateUploadPayload) {
	const res = await api.post<Upload>("/api/uploads/initiate", payload);
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
	const res = await api.post("/api/uploads/complete", payload);
	return res.data;
}

export async function updateStatus(payload: UpdateStatusPayload) {
	const res = await api.post("/api/uploads/update-status", payload);
	return res.data;
}

export async function listUploads(
	options: { page?: number; perPage?: number } = { page: 1, perPage: 10 }
) {
	const page = options.page ?? "";
	const perPage = options.perPage ?? "";
	const res = await api.get<ListUploadsResponse>(
		`/api/uploads/list?page=${page}&perPage=${perPage}`
	);
	return res.data;
}
