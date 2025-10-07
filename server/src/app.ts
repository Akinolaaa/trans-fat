import express, { type Request, type Response } from "express";
import appRouter from "./router";
import { errorHandler } from "./middleware/global-error-handler";

const app = express();

// // error handler
// import notFoundMiddleware from "./middleware/not-found.middleware";
// import errorHandlerMiddleware from "./middleware/error-handler.middleware";

app.set("trust proxy", 1);

app.use(express.json());

app.get("/", (_: Request, res: Response) => {
	res.send("<h1>Transfat API</h1>");
});

// routes
app.use(appRouter);

// extra packages

// errors
// app.use(notFoundMiddleware);
app.use(errorHandler);

export default app;
