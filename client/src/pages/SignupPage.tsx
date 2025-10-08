import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signup } from "@/api/auth";

export default function SignupPage() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");

	const handleSignup = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const res = await signup({ email, password, name });
			localStorage.setItem("token", res.token);
			localStorage.setItem("user", JSON.stringify(res.user));
			navigate("/upload");
		} catch (error: unknown) {
			const err = error as { data?: { message?: string } };
			if (err?.data?.message) {
				alert(err.data.message);
				return;
			}
			alert("Signup failed. Please try again");
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
							placeholder='Name'
							type='text'
							value={name}
							onChange={(e) => setName(e.target.value)}
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
