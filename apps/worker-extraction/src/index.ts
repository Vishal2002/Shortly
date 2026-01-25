import { Worker, Job } from 'bullmq';
import { Prisma, prisma } from '@shortly/database';
import { downloadFile, uploadFile } from '@shortly/storage';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';


import { generateViralCaptions, generateASS, generateSRT, burnCaptions } from './captions';

const execAsync = promisify(exec);

const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  maxRetriesPerRequest: null,
};

console.log('✂️ Clip Extraction Worker starting...');
console.log('📡 Redis:', connection.url.replace(/:[^:]+$/, ':****'));
console.log('🎨 Captions:', process.env.OPENAI_API_KEY ? 'enabled' : 'disabled');

const worker = new Worker(
  'extraction-queue',
  async (job: Job) => {
    const { jobId, segmentId, start, end } = job.data;

    console.log(`[Job ${job.id}] Extracting clip ${segmentId} (${start}s → ${end}s)`);

    let tempDir: string | null = null;

    try {
      // ────────────────────────────────────────────────────────────
      // 1. Load segment and video metadata
      // ────────────────────────────────────────────────────────────
      await updateSegmentStatus(segmentId, 'extracting');

      const segment = await prisma.segment.findUnique({
        where: { id: segmentId },
        include: { 
          video: { 
            select: { id: true, title: true, s3Key: true, duration: true } 
          } 
        },
      });

      if (!segment) throw new Error(`Segment ${segmentId} not found`);

      const { video } = segment;
      const duration = end - start;

      console.log(`Segment: ${segment.startTime}s → ${segment.endTime}s (${duration}s)`);
      console.log(`Video: "${video.title}"`);

      // ────────────────────────────────────────────────────────────
      // 2. Download source video
      // ────────────────────────────────────────────────────────────
      tempDir = await fs.mkdtemp('/tmp/extraction-');
      const videoPath = path.join(tempDir, 'source.mp4');

      console.log('⬇️ Downloading source video...');
      await downloadFile({
        bucket: process.env.S3_BUCKET_RAW_VIDEOS || 'raw-videos',
        key: video.s3Key,
        filePath: videoPath,
      });

      const sizeMB = (await fs.stat(videoPath)).size / (1024 * 1024);
      console.log(`Downloaded ${sizeMB.toFixed(1)} MB`);

      // ────────────────────────────────────────────────────────────
      // 3. Extract clip (high quality, 9:16 vertical)
      // ────────────────────────────────────────────────────────────
      const clipPath = path.join(tempDir, 'clip.mp4');

      console.log('✂️ Extracting clip...');
      await extractClip(videoPath, start, end, clipPath);

      const clipSizeMB = (await fs.stat(clipPath)).size / (1024 * 1024);
      console.log(`Extracted ${clipSizeMB.toFixed(1)} MB clip`);

      // ────────────────────────────────────────────────────────────
      // 4. Generate and burn captions (ASS format preferred)
      // ────────────────────────────────────────────────────────────
      let finalClipPath = clipPath;
      let captionData = null;
      const captionsEnabled = process.env.ENABLE_CAPTIONS !== 'false';

      if (captionsEnabled && process.env.OPENAI_API_KEY) {
        try {
          console.log('🎨 Generating viral captions...');
          
          const captions = await generateViralCaptions(
            videoPath,
            segment.startTime,
            segment.endTime
          );

          if (captions.length > 0) {
            console.log(`Generated ${captions.length} caption segments`);

            // Try ASS format first (better performance and styling)
            const assContent = generateASS(captions);
            const assPath = path.join(tempDir, 'captions.ass');
            await fs.writeFile(assPath, assContent);

            const captionedPath = path.join(tempDir, 'clip-captioned.mp4');
            
            console.log('🔥 Burning captions (ASS format)...');
            
            try {
              await burnCaptions(clipPath, assPath, captionedPath, 'ass');
              
              finalClipPath = captionedPath;
              captionData = captions;

              const captionedSizeMB = (await fs.stat(captionedPath)).size / (1024 * 1024);
              console.log(`✅ Captioned clip: ${captionedSizeMB.toFixed(1)} MB`);
              
            } catch (assError: any) {
              console.warn('⚠️ ASS format failed, trying SRT fallback...');
              
              // Fallback to SRT format
              const srtContent = generateSRT(captions);
              const srtPath = path.join(tempDir, 'captions.srt');
              await fs.writeFile(srtPath, srtContent);
              
              console.log('🔥 Burning captions (SRT format)...');
              await burnCaptions(clipPath, srtPath, captionedPath, 'srt');
              
              finalClipPath = captionedPath;
              captionData = captions;
              
              const captionedSizeMB = (await fs.stat(captionedPath)).size / (1024 * 1024);
              console.log(`✅ Captioned clip (SRT): ${captionedSizeMB.toFixed(1)} MB`);
            }
            
          } else {
            console.warn('⚠️ Caption generation returned empty, using plain clip');
          }
        } catch (err: any) {
          console.error('⚠️ Caption generation failed, using plain clip:', err.message);
          // Continue with plain clip
        }
      } else {
        console.log('ℹ️ Captions disabled or no OpenAI API key');
      }

      // ────────────────────────────────────────────────────────────
      // 5. Generate thumbnail
      // ────────────────────────────────────────────────────────────
      const thumbnailPath = path.join(tempDir, 'thumbnail.jpg');
      
      console.log('📸 Generating thumbnail...');
      await generateThumbnail(finalClipPath, thumbnailPath);

      // ────────────────────────────────────────────────────────────
      // 6. Upload to S3
      // ────────────────────────────────────────────────────────────
      const clipKey = `clips/${video.id}/${segmentId}.mp4`;
      const thumbnailKey = `thumbnails/${video.id}/${segmentId}.jpg`;

      console.log('⬆️ Uploading clip...');
      const bucket = process.env.S3_BUCKET_PROCESSED_SHORTS || 'processed-shorts';
      console.log(`Bucket: ${bucket}`);
      console.log(`Clip key: ${clipKey}`);
      
      await uploadFile({
        bucket: bucket,
        key: clipKey,
        filePath: finalClipPath,
        contentType: 'video/mp4',
      });

      console.log('⬆️ Uploading thumbnail...');
      await uploadFile({
        bucket: bucket,
        key: thumbnailKey,
        filePath: thumbnailPath,
        contentType: 'image/jpeg',
      });

      console.log(`✅ Clip uploaded to: ${bucket}/${clipKey}`);

      // ────────────────────────────────────────────────────────────
      // 7. Create Clip record in database
      // ────────────────────────────────────────────────────────────
      await prisma.clip.create({
        data: {
          segmentId: segment.id,
          videoId: video.id,
          s3Key: clipKey,
          thumbnailKey,
          title: `${video.title} - Clip`,
          description: segment.reason || 'Auto-generated clip',
          tags: [],
          status: 'ready_for_review',
        },
      });

      // Update segment with caption data (stored in existing fields)
      await prisma.segment.update({
        where: { id: segmentId },
        data: {
          status: 'extracted',
          hasCaptions: captionData !== null,
          captionStyle: captionData ? 'viral' : null,
          captionData:
            captionData !== null
              ? (JSON.parse(JSON.stringify(captionData)) as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        },
      });

      // Update parent job if provided
      if (jobId) {
        await updateJobProgress(jobId);
      }

      console.log(`✅ Clip extraction complete: ${clipKey}`);

      return { 
        success: true, 
        clipKey, 
        thumbnailKey,
        hasCaptions: captionData !== null,
        captionCount: captionData?.length || 0,
      };

    } catch (err: any) {
      console.error(`[Job ${job.id}] Extraction failed:`, err.message);

      // Update segment status
      await prisma.segment.update({
        where: { id: segmentId },
        data: { 
          status: 'failed',
        },
      }).catch(() => {});

      throw err;

    } finally {
      // Cleanup temp directory
      if (tempDir) {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  },
  {
    connection,
    concurrency: parseInt(process.env.EXTRACTION_CONCURRENCY || '2'),
    limiter: {
      max: 5,
      duration: 1000,
    },
  }
);

// ────────────────────────────────────────────────────────────────
// Worker Event Handlers
// ────────────────────────────────────────────────────────────────

worker.on('completed', (job) => {
  console.log(`[Job ${job.id}] ✅ Extraction completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Job ${job?.id ?? '?'}] ❌ Extraction failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('⚠️ Worker-level error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received, shutting down gracefully...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 SIGINT received, shutting down gracefully...');
  await worker.close();
  process.exit(0);
});

// ────────────────────────────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────────────────────────────

/**
 * Extract video clip with optimal settings for Shorts/Reels
 * - 9:16 aspect ratio (1080x1920)
 * - High quality encoding (H.264)
 * - Optimized for mobile playback
 */
async function extractClip(
  inputPath: string,
  startTime: number,
  endTime: number,
  outputPath: string
): Promise<void> {
  const duration = endTime - startTime;

  // FFmpeg command for high-quality 9:16 vertical clip
  const command = `
    ffmpeg -ss ${startTime} -i "${inputPath}" -t ${duration} \
    -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
    -c:v libx264 -preset medium -crf 23 \
    -c:a aac -b:a 128k -ar 44100 \
    -movflags +faststart \
    -y "${outputPath}"
  `.replace(/\s+/g, ' ').trim();

  await execAsync(command);
}

/**
 * Generate thumbnail from video (middle frame)
 */
async function generateThumbnail(
  videoPath: string,
  outputPath: string
): Promise<void> {
  // Get video duration first
  const durationCmd = `
    ffprobe -v error -show_entries format=duration \
    -of default=noprint_wrappers=1:nokey=1 "${videoPath}"
  `.replace(/\s+/g, ' ').trim();

  const { stdout } = await execAsync(durationCmd);
  const duration = parseFloat(stdout.trim());
  const midPoint = duration / 2;

  // Extract frame at midpoint
  const command = `
    ffmpeg -ss ${midPoint} -i "${videoPath}" \
    -vframes 1 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
    -q:v 2 -y "${outputPath}"
  `.replace(/\s+/g, ' ').trim();

  await execAsync(command);
}

/**
 * Update segment status
 */
async function updateSegmentStatus(
  segmentId: string,
  status: string
): Promise<void> {
  try {
    await prisma.segment.update({
      where: { id: segmentId },
      data: { status },
    });
  } catch (err) {
    console.warn(`Failed to update segment ${segmentId} status:`, err);
  }
}

/**
 * Update parent job progress
 * Counts completed segments vs total
 */
async function updateJobProgress(jobId: string): Promise<void> {
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        video: {
          include: {
            segments: {
              select: { status: true },
            },
          },
        },
      },
    });

    if (!job || !job.video) return;

    const totalSegments = job.video.segments.length;
    const extractedSegments = job.video.segments.filter(
      s => s.status === 'extracted'
    ).length;

    const progress = totalSegments > 0 
      ? Math.round((extractedSegments / totalSegments) * 100)
      : 0;

    await prisma.job.update({
      where: { id: jobId },
      data: {
        progress,
        currentStep: `Extracted ${extractedSegments}/${totalSegments} clips`,
      },
    });
  } catch (err) {
    console.warn(`Failed to update job ${jobId} progress:`, err);
  }
}



console.log('✅ Clip Extraction Worker ready');
console.log(`⚙️ Concurrency: ${process.env.EXTRACTION_CONCURRENCY || '2'}`);
console.log(`🎨 Captions: ${process.env.ENABLE_CAPTIONS !== 'false' ? 'enabled' : 'disabled'}`);