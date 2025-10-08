import { useState } from "react";
import { initiateUpload, getPresignedUrl, completeUpload } from "@/api/upload";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB per part

export default function VideoUploader() {
	const [file, setFile] = useState<File | null>(null);
	const [progress, setProgress] = useState(0);
	const [uploading, setUploading] = useState(false);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selected = e.target.files?.[0];
		if (selected) {
			setFile(selected);
		}
	};

	const handleUpload = async () => {
		try {
			if (!file) return;

			setUploading(true);
			setProgress(0);

			const { uploadId } = await initiateUpload({
				fileName: file.name,
				fileSize: file.size,
				contentType: file.type,
			});

			const totalParts = Math.ceil(file.size / CHUNK_SIZE);
			const partsData: { partNumber: number; eTag: string }[] = [];

			for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
				const start = (partNumber - 1) * CHUNK_SIZE;
				const end = Math.min(partNumber * CHUNK_SIZE, file.size);
				const blobPart = file.slice(start, end);

				// Step 3: Get presigned URL for each part
				const { url } = await getPresignedUrl({
					uploadId,
					partNumber,
				});

				// Step 4: Upload part
				const uploadRes = await fetch(url, {
					method: "PUT",
					body: blobPart,
				});

				if (!uploadRes.ok) {
					throw new Error(`Failed to upload part ${partNumber}`);
				}
				const eTag = uploadRes.headers.get("ETag")?.replace(/"/g, "");
				if (!eTag) throw new Error(`ETag missing for part ${partNumber}`);

				partsData.push({ partNumber, eTag });

				// Update progress
				setProgress(Math.round((partNumber / totalParts) * 100));
			}

			// Step 5: Complete upload
			await completeUpload({ uploadId, parts: partsData });

			setUploading(false);
			setFile(null);
			setProgress(100);
			alert("✅ Upload completed successfully!");
		} catch {
			setUploading(false);
			setFile(null);
			alert("Failed to upload file");
		}
	};

	return (
		<div className='max-w-lg mx-auto p-4 space-y-4'>
			<h1 className='text-xl font-semibold'>Upload a Video</h1>
			<input type='file' accept='video/*' onChange={handleFileChange} />
			{file && (
				<div className='text-sm text-gray-600'>
					{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
				</div>
			)}
			<button
				onClick={handleUpload}
				disabled={uploading}
				className='bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50'
			>
				{uploading ? "Uploading..." : "Start Upload"}
			</button>

			{uploading && (
				<div className='w-full bg-gray-200 rounded-full h-2'>
					<div
						className='bg-blue-600 h-2 rounded-full transition-all'
						style={{ width: `${progress}%` }}
					></div>
				</div>
			)}
		</div>
	);
}
