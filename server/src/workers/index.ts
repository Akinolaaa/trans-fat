import dotenv from "dotenv";
dotenv.config();

import "./transcode.worker";

console.log("Worker is now running and listening for jobs....");
