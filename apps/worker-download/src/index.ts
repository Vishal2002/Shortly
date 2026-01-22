import { Worker, Job } from 'bullmq';
import { prisma } from '@shortly/database';
import { uploadFile } from '@shortly/storage';
import { exec } from 'child_process';
import { promisify } from 'util';
import { addAnalysisJob } from '@shortly/queue';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6380',
  maxRetriesPerRequest: null,
};

console.log('🎬 Download Worker starting...');
console.log('📡 Redis URL:', connection.url);

const worker = new Worker(
  'download-queue',
  async (job: Job) => {
    const { jobId, youtubeUrl, userId } = job.data;

    console.log(`📥 Processing job: ${jobId}`);
    console.log(`📺 YouTube URL: ${youtubeUrl}`);

    let outputDir: string | null = null;

    try {
      await updateJobStatus(jobId, 'downloading', 10, 'Starting download...');

      const videoId = extractVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      outputDir = `/tmp/${videoId}-${Date.now()}`;
      await execAsync(`mkdir -p ${outputDir}`);

      console.log(`⬇️ Downloading video: ${videoId}`);
      await updateJobStatus(jobId, 'downloading', 30, 'Downloading from YouTube...');

      // FIXED: Simplified, more reliable yt-dlp command
      // - Removed problematic format selectors
      // - Added --no-check-certificates for SSL issues
      // - Added --extractor-args for YouTube issues
      // - Simplified to just get best available format
      const downloadCommand = `
        yt-dlp \
          --no-check-certificates \
          --no-warnings \
          --ignore-errors \
          --format "best[ext=mp4]/best" \
          --output "${outputDir}/video.%(ext)s" \
          --write-info-json \
          --write-thumbnail \
          --no-playlist \
          --socket-timeout 30 \
          --retries 15 \
          --fragment-retries 15 \
          --extractor-args "youtube:player_client=android" \
          --user-agent "com.google.android.youtube/19.09.37 (Linux; U; Android 13) gzip" \
          "${youtubeUrl}"
      `.replace(/\s+/g, ' ').trim();

      console.log('🚀 Executing download...');
      
      const { stdout, stderr } = await execAsync(downloadCommand, {
        maxBuffer: 50 * 1024 * 1024,
        timeout: 600000, // 10 minute timeout
      });

      if (stderr) {
        console.log('⚠️ yt-dlp stderr:', stderr);
      }
      if (stdout) {
        console.log('📋 yt-dlp stdout:', stdout);
      }

      await updateJobStatus(jobId, 'downloading', 60, 'Download complete! Uploading to storage...');

      // Find the downloaded video file
      const files = fs.readdirSync(outputDir);
      console.log('📁 Files in output directory:', files);

      const videoFile = files.find(f => 
        f.startsWith('video.') && 
        (f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.mkv'))
      );

      if (!videoFile) {
        console.error('❌ No video file found. Files:', files);
        throw new Error('Downloaded video file not found');
      }

      const videoPath = path.join(outputDir, videoFile);
      const fileSize = fs.statSync(videoPath).size;
      console.log(`📦 Video file: ${videoFile} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

      // Upload to storage
      const s3Key = `raw-videos/${videoId}/${videoFile}`;
      console.log(`📤 Uploading to storage: ${s3Key}`);

      await uploadFile({
        bucket: process.env.S3_BUCKET_RAW_VIDEOS || 'raw-videos',
        key: s3Key,
        filePath: videoPath,
        contentType: 'video/mp4',
        onProgress: (progress: any) => {
          const percent = progress.total
            ? Math.round((progress.loaded / progress.total) * 100)
            : 0;
          console.log(`📊 Upload progress: ${percent}%`);
        },
      });

      console.log(`✅ Uploaded to storage: ${s3Key}`);

      await updateJobStatus(jobId, 'downloading', 80, 'Saving metadata...');

      // Read metadata
      const metadataPath = path.join(outputDir, 'video.info.json');
      let metadata: any = {};

      if (fs.existsSync(metadataPath)) {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        console.log(`📋 Metadata loaded: ${metadata.title}`);
      } else {
        console.warn('⚠️ No metadata file found, using defaults');
      }

      // Save to database
      const video = await prisma.video.create({
        data: {
          youtubeId: videoId,
          youtubeUrl: youtubeUrl,
          userId: userId,
          title: metadata.title || 'Untitled Video',
          description: metadata.description || null,
          duration: metadata.duration || 0,
          thumbnailUrl: metadata.thumbnail || null,
          s3Key: s3Key,
          status: 'downloaded',
          metadata: metadata,
        },
      });

      console.log(`💾 Video saved to database: ${video.id}`);

      // Link video to job
      await prisma.job.update({
        where: { id: jobId },
        data: { videoId: video.id },
      });

      await updateJobStatus(jobId, 'completed', 100, 'Download complete!');

      // Queue analysis job
      console.log(`🔬 Queueing analysis job for video: ${video.id}`);
      await addAnalysisJob({ jobId, videoId: video.id });

      console.log(`✅ Job ${jobId} completed successfully`);

      // Clean up temp files
      if (outputDir) {
        await execAsync(`rm -rf ${outputDir}`);
        console.log(`🧹 Cleaned up temp directory: ${outputDir}`);
      }

      return { success: true, videoId: video.id };

    } catch (error: any) {
      console.error(`❌ Job ${jobId} failed:`, error.message);
      console.error('Stack trace:', error.stack);
      
      await updateJobStatus(jobId, 'failed', 0, `Error: ${error.message}`);
      
      // Clean up on error
      if (outputDir && fs.existsSync(outputDir)) {
        try {
          await execAsync(`rm -rf ${outputDir}`);
          console.log(`🧹 Cleaned up temp directory after error`);
        } catch (cleanupError) {
          console.error('Failed to cleanup:', cleanupError);
        }
      }
      
      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  }
);

worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('❌ Worker error:', err);
});

worker.on('ready', () => {
  console.log('✅ Download Worker is ready and waiting for jobs');
});

async function updateJobStatus(
  jobId: string,
  status: string,
  progress: number,
  currentStep: string
) {
  try {
    await prisma.job.update({
      where: { id: jobId },
      data: { status, progress, currentStep, updatedAt: new Date() },
    });
    console.log(`📊 Job ${jobId}: ${status} (${progress}%) - ${currentStep}`);
  } catch (error) {
    console.error(`Failed to update job status:`, error);
  }
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

console.log('✅ Download Worker initialized and ready!');