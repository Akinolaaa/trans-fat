import { useEffect, useRef, useState } from "react";
import {
	initiateUpload,
	getPresignedUrl,
	completeUpload,
	updateStatus,
} from "@/api/upload";
import { sleep } from "@/lib/utils";
import { Progress } from "./ui/progress";

const CHUNK_SIZE = 5 * 1024 * 1024;

export default function VideoUploader() {
	const [file, setFile] = useState<File | null>(null);
	const [progress, setProgress] = useState(0);
	const [uploadState, setUploadState] = useState<
		"IDLE" | "UPLOADING" | "PAUSED" | "CANCELLED" | "FAILED" | "COMPLETED"
	>("IDLE");

	const statusRef = useRef(uploadState);
	const uploadIdRef = useRef<string | null>(null);
	const partsDataRef = useRef<{ partNumber: number; eTag: string }[]>([]);
	const resumeResolver = useRef<(() => void) | null>(null);

	useEffect(() => {
		statusRef.current = uploadState;
	}, [uploadState]);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selected = e.target.files?.[0];
		if (selected) setFile(selected);
	};

	const waitForResume = () =>
		new Promise<void>((resolve) => {
			resumeResolver.current = resolve;
		});

	const handlePause = async () => {
		if (uploadState === "UPLOADING") {
			setUploadState("PAUSED");
			if (uploadIdRef.current) {
				await updateStatus({ uploadId: uploadIdRef.current, status: "PAUSED" });
			}
		}
	};

	const handleResume = async () => {
		if (uploadState === "PAUSED") {
			setUploadState("UPLOADING");
			if (uploadIdRef.current) {
				await updateStatus({
					uploadId: uploadIdRef.current,
					status: "UPLOADING",
				});
			}
			// resolve the paused promise so loop can continue
			resumeResolver.current?.();
		}
	};

	const handleCancel = async () => {
		if (uploadIdRef.current) {
			await updateStatus({
				uploadId: uploadIdRef.current,
				status: "CANCELLED",
			});
		}
		setUploadState("CANCELLED");
	};

	const handleUpload = async () => {
		if (!file) {
			alert("No file selected");
			return;
		}

		setUploadState("UPLOADING");
		setProgress(0);
		partsDataRef.current = [];

		try {
			const { uploadId } = await initiateUpload({
				fileName: file.name,
				fileSize: file.size,
				contentType: file.type,
			});

			uploadIdRef.current = uploadId;

			const totalParts = Math.ceil(file.size / CHUNK_SIZE);

			for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
				// 🟢 FIX: Check the mutable ref value!
				if (statusRef.current === "PAUSED") {
					console.log("I am WAITING");
					await waitForResume();
					console.log("I have CONTINUED");
				}

				// 🟢 FIX: Check the mutable ref value!
				if (statusRef.current === "CANCELLED") {
					throw new Error("Upload cancelled");
				}

				const start = (partNumber - 1) * CHUNK_SIZE;
				const end = Math.min(partNumber * CHUNK_SIZE, file.size);
				const blobPart = file.slice(start, end);

				const { url } = await getPresignedUrl({
					uploadId,
					partNumber,
				});

				const uploadRes = await fetch(url, { method: "PUT", body: blobPart });
				if (!uploadRes.ok) throw new Error(`Failed part ${partNumber}`);

				const eTag = uploadRes.headers.get("ETag")?.replace(/"/g, "");
				if (!eTag) throw new Error("ETag missing");

				partsDataRef.current.push({ partNumber, eTag });
				setProgress(Math.round((partNumber / totalParts) * 100));
				await sleep(3);
			}

			await completeUpload({
				uploadId,
				parts: partsDataRef.current,
			});

			setUploadState("COMPLETED");
			setFile(null);
		} catch {
			if (uploadState !== "CANCELLED") {
				setUploadState("FAILED");
				if (uploadIdRef.current && statusRef.current !== "CANCELLED") {
					await updateStatus({
						uploadId: uploadIdRef.current,
						status: "FAILED",
					});
				}
			}
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

			<div className='flex space-x-2'>
				<button
					onClick={handleUpload}
					disabled={uploadState === "UPLOADING"}
					className='bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50'
				>
					Start Upload
				</button>
				{uploadState === "UPLOADING" && (
					<button
						onClick={handlePause}
						className='bg-yellow-500 text-white px-4 py-2 rounded'
					>
						Pause
					</button>
				)}
				{uploadState === "PAUSED" && (
					<button
						onClick={handleResume}
						className='bg-green-600 text-white px-4 py-2 rounded'
					>
						Resume
					</button>
				)}
				{uploadState !== "IDLE" && uploadState !== "COMPLETED" && (
					<button
						onClick={handleCancel}
						className='bg-red-600 text-white px-4 py-2 rounded'
					>
						Cancel
					</button>
				)}
			</div>

			{uploadState === "UPLOADING" && (
				<div className='w-full bg-gray-200 rounded-full h-2'>
					<Progress value={progress} className='bg-blue-600  transition-all' />
				</div>
			)}
		</div>
	);
}
