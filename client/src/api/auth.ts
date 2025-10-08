import api from "./api";

interface AuthResponse {
	token: string;
	user: {
		id: string;
		email: string;
		name: string;
	};
}

interface SignupPayload {
	email: string;
	name: string;
	password: string;
}

interface LoginPayload {
	email: string;
	password: string;
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
	const res = await api.post<AuthResponse>("/api/auth/sign-up", payload);
	return res.data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
	const res = await api.post<AuthResponse>("/api/auth/login", payload);
	return res.data;
}
