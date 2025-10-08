import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { login } from "@/api/auth";

export default function LoginPage() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const res = await login({ email, password });
			localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
			navigate("/upload");
		} catch (error: unknown) {
			const err = error as { data?: { message?: string } };
			if (err?.data?.message) {
				alert(err.data.message);
				return;
			}
			alert("Login failed. Please try again");
		}
	};

	return (
		<div className='h-screen w-screen flex items-center justify-center border-2'>
			<Card className='w-[350px]'>
				<CardContent className='p-6'>
					<h2 className='text-xl font-bold mb-4'>Login</h2>
					<form onSubmit={handleLogin} className='flex flex-col gap-3'>
						<Input
							placeholder='Email'
							type='email'
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
						<Input
							placeholder='Password'
							type='password'
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
						<Button type='submit' className='w-full'>
							Login
						</Button>
						<Button type='button' onClick={() => navigate("/signup")}>
							Go to signup
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
