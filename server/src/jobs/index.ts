import { Queue } from "bullmq";
import { redis } from "../lib/redis";

export const transcodeQueue = new Queue("transcode", {
	connection: redis,
});
