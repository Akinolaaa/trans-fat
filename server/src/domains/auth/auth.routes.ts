import express, { Request, Response } from "express";

const authRouter = express.Router();

authRouter.get("/", (_: Request, res: Response) => {
	console.log("auth router authing");

	return res.send("message from auth");
});

export default authRouter;
