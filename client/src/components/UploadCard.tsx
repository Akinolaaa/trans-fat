import { updateStatus } from "@/api/upload";
import { useState, useRef } from "react";

interface Props {
	uploadId: string;
	// other props like file, etc...
}

export default function UploadCard({ uploadId }: Props) {
	const [paused, setPaused] = useState(false);
	const [canceled, setCanceled] = useState(false);
	const controllerRef = useRef<AbortController | null>(null);

	const handlePause = async () => {
		setPaused(true);
		await updateStatus({ uploadId, status: "PAUSED" });
	};

	const handleResume = async () => {
		setPaused(false);
		await updateStatus({ uploadId, status: "UPLOADING" });
	};

	const handleCancel = async () => {
		setCanceled(true);
		controllerRef.current?.abort();
		await updateStatus({ uploadId, status: "CANCELLED" });
	};

	// const startUpload = async (file: File) => {
	// 	await updateStatus({ uploadId, status: "UPLOADING" });

	// 	// example multipart upload loop
	// 	const totalParts = Math.ceil(file.size / (5 * 1024 * 1024)); // 5MB parts
	// 	for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
	// 		if (canceled) break;

	// 		// 🟡 pause handling
	// 		if (paused) {
	// 			await new Promise<void>((resolve) => {
	// 				const interval = setInterval(() => {
	// 					if (!paused) {
	// 						clearInterval(interval);
	// 						resolve();
	// 					}
	// 				}, 500);
	// 			});
	// 		}

	// 		// upload part...
	// 	}
	// };

	return (
		<div className='border rounded p-3'>
			<div className='flex gap-2'>
				<button
					onClick={handlePause}
					disabled={paused || canceled}
					className='bg-yellow-500 text-white px-3 py-1 rounded'
				>
					Pause
				</button>
				<button
					onClick={handleResume}
					disabled={!paused || canceled}
					className='bg-green-600 text-white px-3 py-1 rounded'
				>
					Resume
				</button>
				<button
					onClick={handleCancel}
					disabled={canceled}
					className='bg-red-600 text-white px-3 py-1 rounded'
				>
					Cancel
				</button>
			</div>
		</div>
	);
}
