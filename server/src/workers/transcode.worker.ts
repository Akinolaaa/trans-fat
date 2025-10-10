import "dotenv/config";
import { Worker } from "bullmq";
import { redis } from "../lib/redis";
import { transcodeJob } from "../jobs/transcode.job";

const worker = new Worker("transcode", transcodeJob, {
	connection: redis,
});

worker.on("ready", () => {
	console.log("🎥 Transcode worker is ready");
});

worker.on("completed", (job) => {
	console.log(`✅ Job ${job.id}, ${job.name} completed`);
});

worker.on("failed", (job, err) => {
	console.error(`❌ Job ${job?.id} failed:`, err);
});
