import { z } from "zod";

export const signUpSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z
		.string()
		.min(8, "Password must be at least 8 characters")
		.max(64, "Password must be at most 64 characters"),
	name: z.string().min(1, "Name is required"),
});

// 👇 Infer the TypeScript type from the schema
export type SignUpInput = z.infer<typeof signUpSchema>;

export const logInSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string(),
});

// 👇 Infer the TypeScript type from the schema
export type LogInInput = z.infer<typeof logInSchema>;
