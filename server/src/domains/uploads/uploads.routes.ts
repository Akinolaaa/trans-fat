import express from "express";
import { authGuard } from "../auth/auth.guard";
import { UploadsController } from "./uploads.controller";
import { validate } from "../../middleware/validate";
import {
	completeUploadSchema,
	initiateUploadSchema,
	presignUrlQuerySchema,
	updateStatusSchema,
} from "./uploads.schema";

const uploadRouter = express.Router();
const uploadController = new UploadsController();

uploadRouter.post(
	"/initiate",
	authGuard,
	validate({ body: initiateUploadSchema }),
	uploadController.initiate.bind(uploadController)
);

uploadRouter.get(
	"/presigned-url",
	authGuard,
	validate({ query: presignUrlQuerySchema }),
	uploadController.getPresignedUrl.bind(uploadController)
);

uploadRouter.post(
	"/complete",
	authGuard,
	validate({ body: completeUploadSchema }),
	uploadController.complete.bind(uploadController)
);

uploadRouter.post(
	"/update-status",
	authGuard,
	validate({ body: updateStatusSchema }),
	uploadController.updateStatus.bind(uploadController)
);

uploadRouter.get(
	"/list",
	authGuard,
	uploadController.listUploads.bind(uploadController)
);

uploadRouter.get(
	"/:videoUploadId/manifest",
	authGuard,
	uploadController.listUploads.bind(uploadController)
);

export default uploadRouter;

/* 

import { Router, Request, Response, NextFunction } from 'express';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../prisma/client';

const router = Router();

// Endpoint for all HLS assets: master.m3u8, 720p.m3u8, 480p.m3u8, and all .ts segments
router.get('/videos/:videoId/hls/*', authenticateToken, async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const pathParts = req.params[0].split('/'); // e.g., [ 'master.m3u8' ] or [ '480p_00001.ts' ]
  const assetName = pathParts[pathParts.length - 1];
  
  // 1. Authorization Check (Use req.user from middleware)
  const video = await prisma.videoUpload.findUnique({ where: { id: videoId } });
  
  if (!video || video.status !== 'COMPLETED' /* || video.ownerId !== req.user.id ) {
      return res.status(404).send('Video not found or access denied.');
  }

  // 2. Determine S3 Key
  const s3Key = `videos/${videoId}/hls/${assetName}`;
  
  // 3. Determine Content-Type for headers
  let contentType = 'application/octet-stream';
  if (assetName.endsWith('.m3u8')) contentType = 'application/x-mpegURL';
  else if (assetName.endsWith('.ts')) contentType = 'video/MP2T';

  // 4. Stream from S3
  try {
    const command = new GetObjectCommand({
      Bucket: 'YOUR_S3_BUCKET',
      Key: s3Key,
    });
    const s3Object = await s3Client.send(command);

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache segments aggressively

    // HLS players often use Range headers for segments, so handle that
    // S3's GetObject handles the Range header automatically when passed from the client,
    // so we can just pipe the stream.
    if (s3Object.Body) {
        // Handle Manifest Rewriting (CRITICAL for sub-manifests/segments)
        if (assetName.endsWith('.m3u8')) {
            const manifestBuffer = await new Promise<Buffer>((resolve, reject) => {
                const chunks: Buffer[] = [];
                (s3Object.Body as any).on('data', (chunk: Buffer) => chunks.push(chunk));
                (s3Object.Body as any).on('error', reject);
                (s3Object.Body as any).on('end', () => resolve(Buffer.concat(chunks)));
            });
            let manifest = manifestBuffer.toString('utf-8');
            
            // Rewrite all segment/sub-manifest URLs to point back to our proxy
            // Example: "480p.m3u8" becomes "/api/videos/123/hls/480p.m3u8"
            manifest = manifest.replace(/(^|\n)([^#\n].*\.(m3u8|ts|key))/gm, `$1/api/videos/${videoId}/hls/$2`);
            
            res.send(manifest);
        } else {
            // Stream the segment (.ts) directly
            (s3Object.Body as any).pipe(res);
        }
    } else {
        res.status(500).send('Empty object body from S3.');
    }
  } catch (error) {
    console.error(`Error streaming HLS asset ${s3Key}:`, error);
    res.status(500).send('Streaming error.');
  }
});

// Endpoint for the player to get the initial URL
router.get('/videos/:videoId/data', authenticateToken, async (req: Request, res: Response) => {
    const { videoId } = req.params;
    const video = await prisma.videoUpload.findUnique({
        where: { id: videoId },
        select: { status: true, thumbnailKey: true, hlsMasterKey: true }
    });

    if (!video) return res.status(404).send('Not found');

    // Return the URL for the master manifest and the thumbnail key
    res.json({
        status: video.status,
        hlsUrl: video.status === 'COMPLETED' ? `/api/videos/${videoId}/hls/master.m3u8` : null,
        thumbnailUrl: video.status === 'COMPLETED' ? `/api/videos/${videoId}/hls/thumbnail.jpg` : null,
    });
});

export default router;

*/
