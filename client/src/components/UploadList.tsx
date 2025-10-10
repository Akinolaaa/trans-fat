// src/components/UploadList.tsx
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listUploads, type ListUploadsResponse } from "@/api/upload";
import { Popover, PopoverContent } from "@radix-ui/react-popover";
import { PopoverTrigger } from "./ui/popover";

export default function UploadList() {
	const [uploads, setUploads] = useState<ListUploadsResponse["data"]>([]);
	const [meta, setMeta] = useState<ListUploadsResponse["meta"] | null>(null);
	const [loading, setLoading] = useState(false);

	const fetchUploads = async (page = 1) => {
		try {
			setLoading(true);
			const res = await listUploads({ page });
			setUploads(res.data);
			setMeta(res.meta);
		} catch (error) {
			console.error("Error fetching uploads", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchUploads();
	}, []);

	if (loading) {
		return <p className='text-center mt-4'>Loading uploads...</p>;
	}

	return (
		<div className='mt-6'>
			<h2 className='text-xl font-semibold mb-3'>Your Uploads</h2>
			<div className='space-y-3'>
				{uploads.length === 0 && <p>No uploads yet.</p>}
				{uploads.map((upload) => (
					<Card
						key={upload.id}
						className='p-3 flex justify-between items-center'
					>
						<div>
							<p className='font-medium'>{upload.fileName}</p>
							<p className='text-sm text-gray-500'>
								{upload.status} • {new Date(upload.createdAt).toLocaleString()}
							</p>
						</div>
						<p className='text-sm'>
							{(Number(upload.size) / (1024 * 1024)).toFixed(2)} MB
						</p>
						<Popover>
							<PopoverTrigger>Play</PopoverTrigger>
							<PopoverContent> Video player here</PopoverContent>
						</Popover>
					</Card>
				))}
			</div>

			{meta && meta.totalPages > 1 && (
				<div className='flex justify-center mt-4 gap-2'>
					<Button
						disabled={!meta.hasPrevPage}
						onClick={() => fetchUploads(meta.page - 1)}
					>
						Previous
					</Button>
					<span className='self-center'>
						Page {meta.page} of {meta.totalPages}
					</span>
					<Button
						disabled={!meta.hasNextPage}
						onClick={() => fetchUploads(meta.page + 1)}
					>
						Next
					</Button>
				</div>
			)}
		</div>
	);
}
