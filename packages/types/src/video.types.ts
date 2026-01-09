export type VideoStatus = 'downloaded' | 'analyzed' | 'processed';

export interface VideoData {
  id: string;
  userId: string;
  youtubeId: string;
  youtubeUrl: string;
  title: string;
  description?: string;
  duration: number;
  s3Key: string;
  status: VideoStatus;
  createdAt: Date;
}
