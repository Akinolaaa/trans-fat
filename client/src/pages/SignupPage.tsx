import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const handleSignup = async (e: React.FormEvent) => {
		e.preventDefault();
		const res = await fetch("http://localhost:3000/auth/signup", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		});

		if (res.ok) {
			const data = await res.json();
			localStorage.setItem("token", data.token);
			navigate("/upload");
		} else {
			alert("Signup failed");
		}
	};

	return (
		<div className='h-screen w-screen flex items-center justify-center'>
			<Card className='w-[350px]'>
				<CardContent className='p-6'>
					<h2 className='text-xl font-bold mb-4'>Sign Up</h2>
					<form onSubmit={handleSignup} className='flex flex-col gap-3'>
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
							Sign Up
						</Button>
						<Button
							type='button'
							variant='link'
							onClick={() => navigate("/login")}
						>
							Already have an account? Login
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
