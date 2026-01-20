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
      // Update job status
      await updateJobStatus(jobId, 'downloading', 10, 'Starting download...');

      // Extract video ID from URL
      const videoId = extractVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      // Download video with yt-dlp
      const outputDir = `/tmp/${videoId}`;
      await execAsync(`mkdir -p ${outputDir}`);

      console.log(`⬇️ Downloading video: ${videoId}`);
      
      await updateJobStatus(jobId, 'downloading', 30, 'Downloading from YouTube...');

      // Download command (simulated for now - you'll need yt-dlp installed)
      const downloadCommand = `
        echo "Simulating download of ${youtubeUrl}" > ${outputDir}/video.mp4
        echo '{"title":"Test Video","duration":120}' > ${outputDir}/metadata.json
      `;
      
      await execAsync(downloadCommand);

      await updateJobStatus(jobId, 'downloading', 70, 'Download complete! Saving to database...');

      // Read metadata
      const metadata = JSON.parse(fs.readFileSync(`${outputDir}/metadata.json`, 'utf8'));

      // Save to database
      const video = await prisma.video.create({
        data: {
          youtubeId: videoId,
          youtubeUrl: youtubeUrl,
          userId: userId,
          title: metadata.title || 'Untitled Video',
          duration: metadata.duration || 0,
          s3Key: `${videoId}/video.mp4`,
          status: 'downloaded',
        },
      });

      // Update job
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
  {
    connection:connection,
    concurrency: 3, // Process 3 videos at a time
  }
);

worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.log(`❌ Job ${job?.id} failed:`, err.message);
});

async function updateJobStatus(
  jobId: string,
  status: string,
  progress: number,
  currentStep: string
) {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status,
      progress,
      currentStep,
      updatedAt: new Date(),
    },
  });
}

function extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

console.log('✅ Download Worker ready and listening for jobs!');