import { Worker, Job } from 'bullmq';
import { prisma } from '@shortly/database';
import { uploadFile, downloadFile } from '@shortly/storage';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

const connection = {
  url: process.env.REDIS_URL || 'redis://redis:6379',
  maxRetriesPerRequest: null,
};

console.log('Extraction Worker starting...');
console.log('Redis URL:', connection.url);

const worker = new Worker(
  'extraction-queue',
  async (job: Job) => {
    const { jobId, videoId, segmentId, start, end } = job.data as {
      jobId: string;
      videoId: string;
      segmentId: string;
      start: number;
      end: number;
    };

    console.log(`[segment:${segmentId}] Extracting clip (${start}s → ${end}s)`);

    let workDir: string | null = null;
    let thumbnailKey: string | null = null;

    try {
      await updateJobStatus(jobId, 'extracting', 20, 'Fetching video & segment data');

      const [video, segment] = await Promise.all([
        prisma.video.findUnique({
          where: { id: videoId },
          include: { user: true },
        }),
        prisma.segment.findUnique({ where: { id: segmentId } }),
      ]);

      if (!video || !segment) {
        throw new Error('Video or segment not found');
      }

      console.log(
        `[segment:${segmentId}] Video: ${video.title} | Score: ${segment.compositeScore.toFixed(2)}`
      );

      workDir = await fs.mkdtemp(path.join('/tmp', `extract-${segmentId}-`));
      const localVideoPath = path.join(workDir, 'input.mp4');
      const outputClipPath = path.join(workDir, 'clip.mp4');
      const thumbnailPath = path.join(workDir, 'thumbnail.png');

      // ── Download raw video ───────────────────────────────────────
      await updateJobStatus(jobId, 'extracting', 40, 'Downloading raw video');
      await downloadFile({
        bucket: process.env.S3_BUCKET_RAW_VIDEOS || 'raw-videos',
        key: video.s3Key,
        filePath: localVideoPath,
      });

      const sizeMB = (await fs.stat(localVideoPath)).size / (1024 * 1024);
      console.log(`[segment:${segmentId}] Downloaded ${sizeMB.toFixed(2)} MB`);

      const duration = end - start;

      // ── Extract clip ─────────────────────────────────────────────
      // Extract clip – no metadata to avoid quoting issues
      await updateJobStatus(jobId, 'extracting', 60, 'Extracting clip with FFmpeg');
      const clipCmd = [
        'ffmpeg',
        '-ss',
        start.toString(),
        '-i',
        localVideoPath,
        '-t',
        duration.toString(),
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '23',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-movflags',
        '+faststart',
        '-y',
        outputClipPath,
      ].join(' ');

      const { stderr } = await execAsync(clipCmd, { timeout: 300_000 });
      if (stderr) console.log('FFmpeg clip stderr:', stderr);

      if (!(await fs.stat(outputClipPath).catch(() => false))) {
        throw new Error('Clip not created – check FFmpeg logs above');
      }

      await execAsync(clipCmd, { timeout: 300_000 });
      if (!(await fs.stat(outputClipPath).catch(() => false))) {
        throw new Error('Clip file not created');
      }

      // ── Generate thumbnail (PNG – more reliable) ─────────────────
      await updateJobStatus(jobId, 'extracting', 75, 'Generating thumbnail');
      const thumbTime = (start + end) / 2;
      const thumbCmd = [
        'ffmpeg',
        '-ss',
        thumbTime.toString(),
        '-i',
        `"${outputClipPath}"`,
        '-vframes',
        '1',
        '-y',
        `"${thumbnailPath}"`,
      ].join(' ');

      try {
        await execAsync(thumbCmd, { timeout: 30000 });
        if (await fs.stat(thumbnailPath).catch(() => false)) {
          thumbnailKey = `thumbnails/${video.youtubeId}/${segmentId}.png`;
          await uploadFile({
            bucket: process.env.S3_BUCKET_THUMBNAILS || 'thumbnails',
            key: thumbnailKey,
            filePath: thumbnailPath,
            contentType: 'image/png',
          });
          console.log(`[segment:${segmentId}] Thumbnail uploaded → ${thumbnailKey}`);
        }
      } catch (thumbErr: any) {
        console.warn(`[segment:${segmentId}] Thumbnail failed (continuing): ${thumbErr.message}`);
      }

      // ── Upload clip ──────────────────────────────────────────────
      await updateJobStatus(jobId, 'extracting', 85, 'Uploading clip');
      const clipKey = `processed-shorts/${video.youtubeId}/${segmentId}.mp4`;

      await uploadFile({
        bucket: process.env.S3_BUCKET_PROCESSED_SHORTS || 'processed-shorts',
        key: clipKey,
        filePath: outputClipPath,
        contentType: 'video/mp4',
      });

      console.log(`[segment:${segmentId}] Clip uploaded → ${clipKey}`);

      // ── Generate metadata ────────────────────────────────────────
      const clipTitle = generateClipTitle(video.title, segment);
      const clipDescription = generateClipDescription(video, segment);
      const clipTags = generateClipTags(video.title);

      // ── Save clip to DB ──────────────────────────────────────────
      await updateJobStatus(jobId, 'extracting', 95, 'Saving clip metadata');
      const clip = await prisma.clip.create({
        data: {
          segmentId: segment.id,
          videoId: video.id,
          s3Key: clipKey,
          thumbnailKey, // null if failed
          title: clipTitle,
          description: clipDescription,
          tags: clipTags,
          status: 'ready_for_review',
        },
      });

      console.log(`[segment:${segmentId}] Clip saved → ${clip.id} "${clipTitle}"`);

      // ── Cleanup & completion check ───────────────────────────────
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
      await checkJobCompletion(jobId, videoId);

      return { success: true, clipId: clip.id, clipKey };
    } catch (error: any) {
      console.error(`[segment:${segmentId}] Extraction failed:`, error.message);

      if (workDir) {
        await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
      }

      try {
        await prisma.segment
          .update({
            where: { id: segmentId },
            data: { status: 'failed' },
          })
          .catch((dbErr) => {
            console.error('Failed to mark segment failed:', dbErr);
          });
      } catch (dbErr) {
        console.error('Failed to update segment status:', dbErr);
      }

      throw error;
    }
  },
  {
    connection,
    concurrency: 2, // lowered slightly – arm64 can struggle with 3+ ffmpeg
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  }
);

// ── Worker events ────────────────────────────────────────────────────────
worker.on('completed', (job) => console.log(`Job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`Job ${job?.id} failed:`, err.message));
worker.on('error', (err) => console.error('Worker error:', err));
worker.on('ready', () => console.log('Extraction Worker ready!'));

// ── Helper functions ─────────────────────────────────────────────────────
async function updateJobStatus(jobId: string, status: string, progress: number, step: string) {
  try {
    await prisma.job.update({
      where: { id: jobId },
      data: { status, progress, currentStep: step, updatedAt: new Date() },
    });
  } catch (err) {
    console.error('Status update failed:', err);
  }
}

async function checkJobCompletion(jobId: string, videoId: string) {
  const [total, done] = await Promise.all([
    prisma.segment.count({ where: { videoId } }),
    prisma.clip.count({ where: { videoId } }),
  ]);

  if (done >= total && total > 0) {
    await updateJobStatus(jobId, 'completed', 100, `All ${total} clips ready`);
    await prisma.job.update({
      where: { id: jobId },
      data: { completedAt: new Date() },
    });
    console.log(`Job ${jobId} fully completed`);
  }
}

function generateClipTitle(title: string, segment: { compositeScore: number }): string {
  const short = title.length > 60 ? title.slice(0, 57) + '…' : title;
  const emoji = segment.compositeScore >= 0.9 ? '🔥' : segment.compositeScore >= 0.8 ? '⚡' : '✨';
  return `${short} ${emoji}`;
}

function generateClipDescription(
  video: { title: string; youtubeUrl: string },
  segment: any
): string {
  const score = Math.round(segment.compositeScore * 100);
  return `Powerful moment from "${video.title}"

Engagement: ${score}/100
Source: ${video.youtubeUrl}

#Shorts #Viral #Highlight`;
}

function generateClipTags(title: string): string[] {
  const base = ['shorts', 'viral', 'trending', 'highlight', 'fyp'];
  const words = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 6);
  return Array.from(new Set([...base, ...words]));
}

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  console.log('Shutdown signal received...');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

console.log('Extraction Worker initialized!');
