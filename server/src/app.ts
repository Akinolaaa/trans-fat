import express, { type Request, type Response } from "express";
import appRouter from "./router";
import { errorHandler } from "./middleware/global-error-handler";
import cors from 'cors'

const app = express();


app.use(cors())
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
