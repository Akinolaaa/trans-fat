import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
	region: process.env.AWS_REGION! || "us-east-1",
	endpoint: process.env.S3_ENDPOINT!, // e.g. http://localhost:9000 for MinIO
	credentials: {
		accessKeyId: process.env.S3_ACCESS_KEY!,
		secretAccessKey: process.env.S3_SECRET_KEY!,
	},
	forcePathStyle: true, // required for MinIO
});
