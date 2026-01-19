import { Injectable } from '@nestjs/common';
import { prisma } from '@shortly/database';
import { addDownloadJob } from '@shortly/queue';

@Injectable()
export class JobsService {
  async create(userId: string, youtubeUrl: string, options: any): Promise<any> {
    // Create job in database
    const job = await prisma.job.create({
      data: {
        userId,
        youtubeUrl,
        status: 'queued',
        progress: 0,
        currentStep: 'Queued for processing...',
        options,
      },
    });

    // Add to download queue
    await addDownloadJob({
      jobId: job.id,
      youtubeUrl,
      userId,
    });

    return job;
  }

  async findByUserId(userId: string): Promise<any[]> {
    return prisma.job.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            duration: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<any> {
    return prisma.job.findUnique({
      where: { id },
      include: {
        video: {
          include: {
            clips: true,
          },
        },
      },
    });
  }

  async updateStatus(id: string, status: string, progress: number, currentStep?: string): Promise<any> {
    return prisma.job.update({
      where: { id },
      data: {
        status,
        progress,
        currentStep,
        ...(status === 'completed' && { completedAt: new Date() }),
      },
    });
  }
}