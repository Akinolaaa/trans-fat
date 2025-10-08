import express from "express";
import { authGuard } from "../auth/auth.guard";
import { UploadsController } from "./uploads.controller";
import { validate } from "../../middleware/validate";
import {
	completeUploadSchema,
	initiateUploadSchema,
	presignUrlQuerySchema,
	updateStatusSchema,
} from "./uploads.schema";

const uploadRouter = express.Router();
const uploadController = new UploadsController();

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

uploadRouter.post(
	"/update-status",
	authGuard,
	validate({ body: updateStatusSchema }),
	uploadController.updateStatus.bind(uploadController)
);

uploadRouter.get(
	"/list",
	authGuard,
	uploadController.listUploads.bind(uploadController)
);

export default uploadRouter;
