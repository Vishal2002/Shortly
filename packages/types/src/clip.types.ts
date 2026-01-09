export type ClipStatus = 
  | 'ready_for_review'
  | 'approved'
  | 'rejected'
  | 'uploading'
  | 'published';

export interface ClipData {
  id: string;
  segmentId: string;
  videoId: string;
  title: string;
  description: string;
  tags: string[];
  youtubeId?: string;
  youtubeUrl?: string;
  status: ClipStatus;
  createdAt: Date;
}
