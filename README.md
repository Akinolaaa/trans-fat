# Trans Fat

Large file upload and streaming service

## Strategy

- Frontend (React + Tailwind): Handles video selection, validation, upload chunking, and UI feedback (progress, pause/resume, cancel).
- Backend (NestJS / Node.js): Manages uploads, generates presigned URLs, validates file metadata, tracks upload status, and enqueues background jobs.
- Object Storage (MinIO / S3): Stores raw video files using multipart upload.
- Worker Service (BullMQ): Processes background jobs like video transcoding or thumbnail generation facilitated by redis
- Database (Prisma + Postgres): Persists upload metadata and job states for reliability and auditability.

## Upload Lifecycle

You implemented a robust lifecycle for video uploads:

### Initiate Upload

This validates contentType (must be video) and fileSize (≤ 5GB), saves upload metadata (name, type, size, user, key, status = INITIALIZED), creates an MinIO multipart upload session and returns uploadId.

### Chunked Upload via Presigned URLs

The frontend requests presigned URLs from the backend for each part add ploads each chunk directly to MinIO via PUT.

### Complete Upload

After all parts are uploaded, the backend calls completeMultipartUpload, Marks upload as COMPLETED in the DB, enqueues a job in the BullMQ queue to transcode or process the video. For indempotency and avoiding dual transcoding a field called `transcodeStatus` is added to track the status for the transcoding and generation of the streaming artifacts in s3 for the video

### Transcoding

There worker server picks up the job from the queue to begin transcoding. Relevant data/metadata are pulled from the database as well `transcodeStatus` to track process and ensure retry-safe jobs.

A cron job to remove/delet abandoned upload chunks in the S3 will be added to the worker manage storage.

The transcoding process goes as thus;

1. The video is streamed from the miniobucket and written in a temporary folder on the local worker server in a temp directory
2. The video is then transcoded using FFmpeg and artifacts(manifest files and thumbnails) are then genrated and stored in an s3 bucket.
3. The temporary folder is then deleted to conserve space.

### Streaming

Presigned URLs for the playlist and segment files in the bucket for the hls player (to ensure secure temporary access).

## Frontend Strategy (React + Tailwind)

You built two main components:

### VideoUploader

- Handles video selection and validation
- Rejects files larger than 5GB.
- Implements chunked upload with progress tracking.
- Supports pause, resume and cancel:
- Persists state with backend via updateStatus API.
- Resumes from the last uploaded part if possible.

Shows file name, progress, and status.

### UploadList

- Displays uploads fetched from the backend (paginated and sorted by creation date descending).
- Provides buttons to pause, resume, or cancel existing uploads.
- Reactively updates when a new upload is initiated or status changes
- Play button that shows a video player poppup and streams the video for already transcoded videos

## Scaling to One Million Concurrent Downloads

### Autoscale Services as Needed

- API autoscaling behind a load balancer to handle requests.
- Worker autoscaling based on queue length & CPU/memory to handle transcoding and manifest/thumbnail generation
- Storage autoscaling (use cloud S3 or a highly-available MinIO cluster).

## Current Bugs/Backlog

- Manifest and thumbnail generation
- Video player implementation
- Cron job to delete abandoned uploads

## To Run

1. Clone the repo.
2. Create a file called `.env`.
3. Copy and past the following into the file created in the previous step
4.

```txt
# DATABASE CONFIG
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=transfat

# MINIO CONFIG
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_ENDPOINT=http://minio:9000
MINIO_BUCKET_NAME=transfat-uploads


# REDIS CONFIG
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379

# API/WORKER
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/transfat?schema=public
JWT_SECRET=jwtsecret

AWS_REGION=us-east-1
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=transfat-uploads

# Frontend
VITE_API_BASE_URL=http://localhost:4000

```

Run this command in the root directory of the project `docker compose up -d`

In your browser, go to **http://localhost:3000**
