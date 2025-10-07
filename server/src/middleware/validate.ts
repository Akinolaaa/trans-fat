import { Request, Response, NextFunction } from "express";
import { ZodObject, ZodError } from "zod";
import { HttpException } from "../exceptions/http.exception";

interface SchemaShape {
	body?: ZodObject;
	query?: ZodObject;
	params?: ZodObject;
}

export const validate = (schema: SchemaShape) => {
	return (req: Request, _res: Response, next: NextFunction) => {
		try {
			if (schema.body) {
				const parsed = schema.body.parse(req.body);
				req.body = parsed;
			}

			if (schema.query) {
				const parsed = schema.query.parse(req.query);
				req.query = parsed as typeof req.query;
			}

			if (schema.params) {
				const parsed = schema.params.parse(req.params);
				req.params = parsed as typeof req.params;
			}

			next();
		} catch (error: unknown) {
			if (error instanceof ZodError) {
				const errors = error.issues.map((issue) => ({
					path: issue.path.join("."),
					message: issue.message,
				}));
				return next(
					new HttpException({ message: "Validation failed", errors }, 422)
				);
			}

			next(error);
		}
	};
};
