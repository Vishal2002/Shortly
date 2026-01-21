import { Worker, Job } from 'bullmq';
import { prisma } from '@shortly/database';
import { extractionQueue } from '@shortly/queue';
// import Redis from 'ioredis';

const connection = {
    url: process.env.REDIS_URL || 'redis://localhost:6380',
    maxRetriesPerRequest: null,
  };

console.log('🔬 Analysis Worker starting...');

const worker = new Worker(
  'analysis-queue',
  async (job: Job) => {
    const { jobId, videoId } = job.data;

    console.log(`🔍 Analyzing video: ${videoId}`);

    try {
      await updateJobStatus(jobId, 'analyzing', 40, 'Detecting highlights...');

      const video = await prisma.video.findUnique({ where: { id: videoId } });
      if (!video) throw new Error('Video not found');

      // Simplified analysis - divide video into segments
      const duration = video.duration;
      const segmentDuration = 20; // 20-second clips
      const maxSegments = 5;

      const segments = [];
      const step = Math.floor(duration / (maxSegments + 1));

      for (let i = 1; i <= maxSegments; i++) {
        const start = i * step;
        const end = Math.min(start + segmentDuration, duration);

        // Create segment with random score (simulated)
        const score = 0.7 + Math.random() * 0.3; // 0.7-1.0

        const segment = await prisma.segment.create({
          data: {
            videoId: video.id,
            startTime: start,
            endTime: end,
            duration: end - start,
            compositeScore: score,
            ytRetention: score,
            signals: {
              audio: score * 0.9,
              speech: score * 0.8,
              visual: score * 0.85,
            },
            reason: 'High engagement detected',
            status: 'detected',
          },
        });

        segments.push(segment);
        console.log(`✅ Segment ${i}: ${start}s - ${end}s (score: ${score.toFixed(2)})`);
      }

      await updateJobStatus(jobId, 'analyzing', 60, `Found ${segments.length} segments! Starting extraction...`);

      // Queue extraction jobs
      for (const segment of segments) {
        await extractionQueue.add('extract-clip', {
          jobId,
          videoId,
          segmentId: segment.id,
          start: segment.startTime,
          end: segment.endTime,
        });
      }

      console.log(`✅ Queued ${segments.length} clips for extraction`);

      return { success: true, segments: segments.length };

    } catch (error: any) {
      console.error(`❌ Analysis failed:`, error.message);
      await updateJobStatus(jobId, 'failed', 0, `Analysis error: ${error.message}`);
      throw error;
    }
  },
  { connection:connection, concurrency: 2 }
);

worker.on('completed', (job) => {
  console.log(`✅ Analysis job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.log(`❌ Analysis job ${job?.id} failed:`, err.message);
});

async function updateJobStatus(jobId: string, status: string, progress: number, currentStep: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: { status, progress, currentStep, updatedAt: new Date() },
  });
}

console.log('✅ Analysis Worker ready!');