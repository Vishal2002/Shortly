import { Worker, Job } from 'bullmq';
import { prisma } from '@shortly/database';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

const connection = {
    url: process.env.REDIS_URL || 'redis://localhost:6380',
    maxRetriesPerRequest: null,
  };
  

console.log('🎬 Download Worker starting...');

const worker = new Worker(
  'download-queue',
  async (job: Job) => {
    const { jobId, youtubeUrl, userId } = job.data;

    console.log(`📥 Processing job: ${jobId}`);
    console.log(`📺 YouTube URL: ${youtubeUrl}`);

    try {
      await updateJobStatus(jobId, 'downloading', 10, 'Starting download...');

      const videoId = extractVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      const outputDir = `/tmp/${videoId}`;
      await execAsync(`mkdir -p ${outputDir}`);

      console.log(`⬇️ Downloading video: ${videoId}`);
      
      await updateJobStatus(jobId, 'downloading', 30, 'Downloading from YouTube...');

      // Real yt-dlp command
      const downloadCommand = `
        yt-dlp \
          -f "bestvideo[height<=1080]+bestaudio[ext=m4a]/best[height<=1080]" \
          --output "${outputDir}/video.%(ext)s" \
          --write-info-json \
          --write-thumbnail \
          --no-playlist \
          "${youtubeUrl}"
      `;
      
      await execAsync(downloadCommand, { maxBuffer: 50 * 1024 * 1024 });

      await updateJobStatus(jobId, 'downloading', 70, 'Download complete! Saving...');

      // Read metadata
      const metadataPath = `${outputDir}/video.info.json`;
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

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
          s3Key: `${videoId}/video.mp4`,
          status: 'downloaded',
          metadata: metadata,
        },
      });

      await prisma.job.update({
        where: { id: jobId },
        data: { videoId: video.id },
      });

      await updateJobStatus(jobId, 'completed', 100, 'Download complete!');

      console.log(`✅ Job ${jobId} completed successfully`);

      // Clean up
      await execAsync(`rm -rf ${outputDir}`);

      return { success: true, videoId: video.id };

    } catch (error: any) {
      console.error(`❌ Job ${jobId} failed:`, error.message);
      await updateJobStatus(jobId, 'failed', 0, `Error: ${error.message}`);
      throw error;
    }
  },
  { connection:connection, concurrency: 3 }
);

worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.log(`❌ Job ${job?.id} failed:`, err.message);
});

async function updateJobStatus(jobId: string, status: string, progress: number, currentStep: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: { status, progress, currentStep, updatedAt: new Date() },
  });
}

function extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

console.log('✅ Download Worker ready!');