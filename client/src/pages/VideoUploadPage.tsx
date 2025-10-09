import { Card } from "@/components/ui/card";
import UploadList from "@/components/UploadList";
// import VideoUploader from "@/components/VideoUploader";
import VideoUploaderV2 from "@/components/VideoUploaderV2";
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
		<div className='min-h-screen'>
			<p className='text-center pt-1'>Welcome {user?.name ?? ""},</p>
			<div className='px-6 h-min-h flex items-center justify-center w-screen'>
				<Card className='w-5/6 h-5/6 px-3'>
					<VideoUploaderV2 />
					<UploadList />
				</Card>
			</div>
		</div>
	);
}
