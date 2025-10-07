// src/middlewares/auth.guard.ts
import { Logger } from "../../utils/logger";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient, User } from "@prisma/client";
import { HttpException } from "../../exceptions/http.exception";

const logger = new Logger("AuthGuard");
const prisma = new PrismaClient();

export interface AuthenticatedRequest<
	Params = unknown,
	ResBody = unknown,
	ReqBody = unknown,
	ReqQuery = unknown
> extends Request<Params, ResBody, ReqBody, ReqQuery> {
	user?: {
		id: string;
		email: string;
	} & Partial<User>;
}

export const authGuard = async (
	req: AuthenticatedRequest,
	_res: Response,
	next: NextFunction
) => {
	try {
		// 1️⃣ Extract token from header
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			throw new HttpException("Unauthorized: Missing or invalid token", 401);
		}

		const token = authHeader.split(" ")[1];

		if (!token) {
			throw new HttpException("Invalid Token");
		}

		//  Verify token
		const secret = process.env.JWT_SECRET;
		if (!secret) {
			logger.error("JWT_SECRET not defined");
			throw new HttpException("Server misconfiguration", 500);
		}

		let userId = "";
		try {
			console.log(token);
			const decoded = jwt.verify(token, secret) as { sub: string };
			if (!decoded || !decoded.sub) {
				throw new HttpException("Invalid token", 403);
			}
			userId = decoded.sub;
		} catch {
			throw new HttpException("Invalid Token-", 403);
		}

		//  Fetch user
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, email: true },
		});

		if (!user) {
			logger.warn(`Token sub=${userId} refers to non-existent user`);
			throw new HttpException("User not found", 401);
		}

		// Attach user to request object
		req.user = user;

		logger.info(`Authenticated request for user=${user.email}`);
		next();
	} catch (err: unknown) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		logger.error(`AuthGuard error: ${errorMessage}`);
		next(err);
	}
};
