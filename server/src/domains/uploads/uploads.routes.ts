import express from "express";
import { AuthenticatedRequest, authGuard } from "../auth/auth.guard";
import { UploadsController } from "./uploads.controller";
import { validate } from "../../middleware/validate";
import { completeUploadSchema, initiateUploadSchema, presignUrlQuerySchema } from "./uploads.schema";

const uploadRouter = express.Router();
const uploadController = new UploadsController();

uploadRouter.get("/", authGuard, (req: AuthenticatedRequest, res) => {
	res.json({ user: req.user });
});

uploadRouter.post(
	"/initiate",
	authGuard,
	validate({ body: initiateUploadSchema }),
	uploadController.initiate.bind(uploadController)
);

uploadRouter.get(
	"/presigned-url",
	authGuard,
	validate({ query: presignUrlQuerySchema }),
	uploadController.getPresignedUrl.bind(uploadController)
);
uploadRouter.post(
	"/complete",
	authGuard,
	validate({ body: completeUploadSchema }),
	uploadController.complete.bind(uploadController)
);

export default uploadRouter;
