import { Request, Response } from "express";
import { Logger } from "../../utils/logger";
import { LogInInput, SignUpInput } from "./auth.schema";
import { HttpException } from "../../exceptions/http.exception";
import { prisma } from "../../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export class AuthController {
	private logger = new Logger(AuthController.name);
	constructor() {}

	async signUp(req: Request<unknown, unknown, SignUpInput>, res: Response) {
		const { email, password, name } = req.body;

		const existingUser = await prisma.user.findUnique({ where: { email } });
		if (existingUser) {
			throw new HttpException("Email already in use", 400);
		}

		// Hash the password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create new user
		const user = await prisma.user.create({
			data: { email, name, password: hashedPassword },
			select: { id: true, email: true, createdAt: true },
		});

		// Generate JWT token
		const token = this.generateToken(user.id);

		// return { user, token };
		return res.status(200).json({ message: "Successful sign up", user, token });
	}

	async logIn(req: Request<unknown, unknown, LogInInput>, res: Response) {
		this.logger.info("Login successful");
		const { email, password } = req.body;

		const user = await prisma.user.findFirst({ where: { email } });

		if (!user) {
			throw new HttpException(`user with email ${email} not found`, 404);
		}

		const validPasswordMatch = await bcrypt.compare(password, user.password);

		if (!validPasswordMatch) {
			throw new HttpException("Invalid email/password", 403);
		}

		// Generate JWT token
		const token = this.generateToken(user.id);

		// return { user, token };
		return res.status(200).json({ message: "Successful log in", user, token });
	}

	private generateToken(userId: string) {
		return jwt.sign({ sub: userId }, process.env.JWT_SECRET!, {
			expiresIn: "30d",
		});
	}
}
