import { NextFunction, Request, Response } from "express";
import { Logger } from "../utils/logger";
import { HttpException } from "../exceptions/http.exception";

const logger = new Logger("ErrorHandler");

export function errorHandler(
	err: Error,
	req: Request,
	res: Response,
	_next: NextFunction
) {
	if (err instanceof HttpException) {
		logger.warn(`${err.message} - ${req.method} ${req.originalUrl}`);
		return res.status(err.statusCode).json({
			message: err.message,
			...(err.payload && { details: err.payload }),
		});
	}

	logger.error(`Unhandled error: ${err.message}`, err.stack);
	res.status(500).json({
		statusCode: 500,
		message: "Internal Server Error",
	});
}
