import { Card } from "@/components/ui/card";
import VideoUploader from "@/components/VideoUploader";
import { useNavigate } from "react-router-dom";

export default function VideoUploadPage() {
	const navigate = useNavigate();
	const userStorage = localStorage.getItem("user");

	if (!userStorage) {
		navigate("./login");
		return <></>;
	}
	const user = JSON.parse(userStorage) as { name: string };
	return (
		<div className='h-screen'>
			<p className='text-center pt-1'>Welcome {user?.name ?? ""},</p>
			<div className='px-6 h-min-h flex items-center justify-center w-screen'>
				<Card className='w-5/6 h-5/6 px-3'>
					<h1 className='text-2xl font-bold mb-4'>Video Upload Page</h1>
					<VideoUploader />
				</Card>
			</div>
		</div>
	);
}
