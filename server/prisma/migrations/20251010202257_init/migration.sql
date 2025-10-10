-- CreateEnum
CREATE TYPE "TranscodeStatus" AS ENUM ('NOT_STARTED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterEnum
ALTER TYPE "UploadStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "VideoUpload" ADD COLUMN     "hlsManifestKey" TEXT,
ADD COLUMN     "hlsMasterKey" TEXT,
ADD COLUMN     "isTranscoded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "thumbNailKey" TEXT,
ADD COLUMN     "transcodeStatus" "TranscodeStatus" DEFAULT 'NOT_STARTED',
ADD COLUMN     "transcodedAt" TIMESTAMP(3);
