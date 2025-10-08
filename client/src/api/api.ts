import axios from "axios";

const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL, // e.g. http://localhost:3000
	headers: {
		"Content-Type": "application/json",
	},
});

// Optional: Add token automatically to requests
api.interceptors.request.use((config) => {
	const token = localStorage.getItem("token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

export default api;
