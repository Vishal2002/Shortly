export interface DownloadJobData {
  jobId: string;
  youtubeUrl: string;
  videoId: string;
  userId: string;
}

export interface AnalysisJobData {
  jobId: string;
  videoId: string;
  s3Key: string;
}

export interface ExtractionJobData {
  jobId: string;
  videoId: string;
  segmentId: string;
  start: number;
  end: number;
  s3Key: string;
}

export interface UploadJobData {
  jobId: string;
  clipId: string;
  userId: string;
}

export interface UploadOptions {
  bucket: string;
  key: string;
  filePath: string;
  contentType?: string;
  onProgress?: (progress: { loaded: number; total?: number }) => void;
}