import { Routes, Route, Navigate } from "react-router-dom";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import VideoUploadPage from "./pages/VideoUploadPage";

export default function App() {
	// const token = localStorage.getItem("token");

	return (
		<Routes>
			<Route path='/signup' element={<SignupPage />} />
			<Route path='/login' element={<LoginPage />} />
			<Route path='/upload' element={<VideoUploadPage />} />
			{/* element={token ? <VideoUploadPage /> : <Navigate to='/login' />} */}
			{/* /> */}
			<Route path='*' element={<Navigate to='/login' />} />
		</Routes>
	);
}
