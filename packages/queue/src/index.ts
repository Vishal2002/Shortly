import { Queue, Worker, Job } from 'bullmq';

const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6380',
  maxRetriesPerRequest: null,
};

export const downloadQueue = new Queue('download-queue', { connection });
export const analysisQueue = new Queue('analysis-queue', { connection });
export const extractionQueue = new Queue('extraction-queue', { connection });
export const uploadQueue = new Queue('upload-queue', { connection });

// Helper to add jobs
export async function addDownloadJob(data: any) {
  return downloadQueue.add('download-video', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
}

export async function addAnalysisJob(data: any) {
    return analysisQueue.add('analyze-video', data, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 3000 },
    });
  }

export { Queue, Worker, Job };