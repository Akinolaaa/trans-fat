import { useState, useCallback } from "react";
import UploadTaskItem from "./UploadTaskItem";

/**
 * MultiVideoUploader component: Manages the list of files and renders a task item for each.
 */

type Task = {
	id: string;
	file: File;
};
export default function MultiVideoUploader() {
	// State holds the list of files selected for upload
	const [tasks, setTasks] = useState<Task[]>([]);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.length) {
			const newFiles = Array.from(e.target.files);

			// Generate a unique task object for each file
			const newTasks = newFiles.map((file) => ({
				id: crypto.randomUUID(),
				file: file,
			}));

			// Add new tasks to the existing list
			setTasks((prev) => [...prev, ...newTasks]);

			// Clear the file input so the user can select the same file(s) again
			e.target.value = "";
		}
	};

	// Callback function passed to children to request removal from the list
	const removeTask = useCallback((taskId: string) => {
		setTasks((prev) => prev.filter((task) => task.id !== taskId));
	}, []);

	return (
		<div className='max-w-xl mx-auto pb-6 space-y-5 rounded-xl mt-10 font-sans'>
			<h1 className='text-xl font-extrabold text-gray-800 border-b pb-3'>
				Transfat Uploader
			</h1>

			{/* File Selection */}
			<div className='flex flex-col space-y-3'>
				<label
					htmlFor='file-upload'
					className='block text-base font-medium text-gray-700'
				>
					Add Video Files to Queue
				</label>
				<input
					id='file-upload'
					type='file'
					accept='video/*'
					onChange={handleFileChange}
					multiple // Key change for multiple selection
					className='block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition duration-150'
				/>
			</div>

			{/* Upload Queue */}
			<div className='pt-4 border-t border-gray-100'>
				<h2 className='text-xl font-bold text-gray-700 mb-3'>
					Upload Queue ({tasks.length}){" "}
					<span className='text-xs font-light italic'> 3 second sleep time between chunks</span>
				</h2>
				{tasks.length === 0 ? (
					<div className='text-gray-500 italic p-4 bg-gray-50 rounded-lg text-center'>
						No files added yet. Select videos to begin.
					</div>
				) : (
					<div className='space-y-4'>
						{tasks.map((task) => (
							<UploadTaskItem
								key={task.id}
								taskId={task.id}
								file={task.file}
								onTaskRemoval={removeTask}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
