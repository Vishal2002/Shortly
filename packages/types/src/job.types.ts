export type JobStatus = 
  | 'queued'
  | 'downloading'
  | 'analyzing'
  | 'extracting'
  | 'completed'
  | 'failed';

export interface JobOptions {
  clipCount: number;
  minDuration: number;
  maxDuration: number;
  autoUpload: boolean;
  addSubtitles: boolean;
}

export interface JobData {
  id: string;
  userId: string;
  youtubeUrl: string;
  videoId?: string;
  status: JobStatus;
  progress: number;
  currentStep?: string;
  errorMessage?: string;
  options: JobOptions;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateJobDto {
  youtubeUrl: string;
  options: JobOptions;
}
