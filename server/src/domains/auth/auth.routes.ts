import express from "express";
import { AuthController } from "./auth.controller";
import { validate } from "../../middleware/validate";
import { logInSchema, signUpSchema } from "./auth.schema";

const authRouter = express.Router();

const authController = new AuthController();

authRouter.post(
	"/sign-up",
	validate({ body: signUpSchema }),
	authController.signUp.bind(authController)
);

authRouter.post(
	"/login",
	validate({ body: logInSchema }),
	authController.logIn.bind(authController)
);

export default authRouter;
