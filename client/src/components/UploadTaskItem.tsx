import {
	completeUpload,
	getPresignedUrl,
	initiateUpload,
	updateStatus,
} from "@/api/upload";
import { sleep } from "@/lib/utils";
import { Progress } from "@radix-ui/react-progress";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * UploadTaskItem component: Manages the state and logic for a single file upload.
 * It is completely self-contained with its own lifecycle controls.
 */
interface Props {
	taskId: string;
	file: File;
	onTaskRemoval: (t: string) => void;
}
const CHUNK_SIZE = 5 * 1024 * 1024;

const UploadTaskItem = ({ taskId, file, onTaskRemoval }: Props) => {
	const [progress, setProgress] = useState(0);
	const [uploadState, setUploadState] = useState("IDLE");

	// Refs for asynchronous safety and upload metadata
	const uploadIdRef = useRef<string | null>(null);
	const partsDataRef = useRef<{ partNumber: number; eTag: string }[]>([]);
	const resumeResolver = useRef<((t?: unknown) => void) | null>(null);
	const statusRef = useRef(uploadState); // The mutable ref for async loop status

	// Sync the mutable ref with the current state after every render
	useEffect(() => {
		statusRef.current = uploadState;
	}, [uploadState]);

	const waitForResume = useCallback(
		() =>
			new Promise((resolve) => {
				resumeResolver.current = resolve;
			}),
		[]
	);

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
			// Resolve the paused promise, allowing the loop to continue
			resumeResolver.current?.();
			resumeResolver.current = null; // Clear resolver after use
		}
	};

	const handleCancel = async () => {
		setUploadState("CANCELLED");
		if (uploadIdRef.current) {
			await updateStatus({
				uploadId: uploadIdRef.current,
				status: "CANCELLED",
			});
		}
		// If paused, resolve the resume promise so the loop wakes up and hits the CANCEL check
		if (resumeResolver.current) {
			resumeResolver.current?.();
			resumeResolver.current = null;
		}
	};

	const handleRemove = () => {
		if (uploadState === "UPLOADING" || uploadState === "PAUSED") {
			console.warn(`Task ${taskId}: Please cancel upload before removing.`);
			return;
		}
		onTaskRemoval(taskId);
	};

	const handleUpload = async () => {
		if (!file) return;

		setUploadState("UPLOADING");
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
				// PAUSE/RESUME LOGIC: Check the mutable ref value
				if (statusRef.current === "PAUSED") {
					await waitForResume();
				}

				// CANCEL LOGIC: Check the mutable ref value
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

				console.log(
					"progress should be",
					Math.round((partNumber / totalParts) * 100)
				);
				setProgress(Math.round((partNumber / totalParts) * 100));
				console.log("Progress is this", progress);

				// Simulate network latency
				await sleep(2);
			}

			await completeUpload({ uploadId, parts: partsDataRef.current });

			setUploadState("COMPLETED");
		} catch (error) {
			console.error("Upload error:", error);
			if (statusRef.current !== "CANCELLED") {
				setUploadState("FAILED");
				if (uploadIdRef.current) {
					await updateStatus({
						uploadId: uploadIdRef.current,
						status: "FAILED",
					});
				}
			}
		}
	};

	const isUploadingOrPaused =
		uploadState === "UPLOADING" || uploadState === "PAUSED";
	const canRemove = !isUploadingOrPaused;
	const canStart =
		uploadState === "IDLE" ||
		uploadState === "FAILED" ||
		uploadState === "CANCELLED";

	const fileSizeMB = useMemo(
		() => (file.size / 1024 / 1024).toFixed(2),
		[file.size]
	);

	return (
		<div className='bg-gray-50 p-4 rounded-xl shadow-inner mb-4 border border-gray-200'>
			{/* File Info */}
			<div className='flex justify-between items-start'>
				<div className='flex-1 min-w-0 pr-4'>
					<p className='font-semibold text-gray-800 truncate'>{file.name}</p>
					<p className='text-sm text-gray-500'>{fileSizeMB} MB</p>
				</div>

				{/* Status Badge */}
				<span
					className={`text-xs font-bold px-3 py-1 rounded-full ${
						uploadState === "UPLOADING"
							? "bg-blue-100 text-blue-800 animate-pulse"
							: uploadState === "PAUSED"
							? "bg-yellow-100 text-yellow-800"
							: uploadState === "COMPLETED"
							? "bg-green-100 text-green-800"
							: uploadState === "FAILED" || uploadState === "CANCELLED"
							? "bg-red-100 text-red-800"
							: "bg-gray-100 text-gray-600"
					}`}
				>
					{uploadState}
				</span>
			</div>

			{/* Progress Bar */}
			<div className='mt-3 relative h-2 bg-gray-200 rounded-full overflow-hidden'>
				<Progress value={progress} className='h-full transition-all ease-out' />
				{isUploadingOrPaused && progress >= 0 && (
					<span className='absolute right-0 text-xs font-medium pr-1 text-gray-700 -mt-0.5'>
						{progress}%
					</span>
				)}
			</div>

			{/* Controls */}
			<div className='flex justify-start space-x-2 mt-4'>
				{canStart && (
					<button
						onClick={handleUpload}
						className='bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg shadow-sm hover:bg-blue-700 transition'
					>
						Start
					</button>
				)}

				{uploadState === "UPLOADING" && (
					<button
						onClick={handlePause}
						className='bg-yellow-500 text-white text-sm px-3 py-1.5 rounded-lg shadow-sm hover:bg-yellow-600 transition'
					>
						Pause
					</button>
				)}

				{uploadState === "PAUSED" && (
					<button
						onClick={handleResume}
						className='bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg shadow-sm hover:bg-green-700 transition'
					>
						Resume
					</button>
				)}

				{isUploadingOrPaused && (
					<button
						onClick={handleCancel}
						className='bg-red-600 text-white text-sm px-3 py-1.5 rounded-lg shadow-sm hover:bg-red-700 transition'
					>
						Cancel
					</button>
				)}

				{canRemove && (
					<button
						onClick={handleRemove}
						className='text-xs text-gray-500 hover:text-red-600 border border-gray-300 px-3 py-1.5 rounded-lg transition'
					>
						Remove
					</button>
				)}
			</div>
		</div>
	);
};

export default UploadTaskItem;
