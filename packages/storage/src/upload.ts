import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';
import { createS3Client } from './client';

interface UploadOptions {
  bucket: string;
  key: string;
  filePath: string;
  contentType?: string;
  onProgress?: (progress: { loaded: number; total?: number }) => void;
}

/**
 * Upload a file to S3/MinIO
 */
export async function uploadFile({
  bucket,
  key,
  filePath,
  contentType = 'video/mp4',
  onProgress,
}: UploadOptions): Promise<string> {
  const client = createS3Client();

  const fileStream = fs.createReadStream(filePath);

  const upload = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: fileStream,
      ContentType: contentType,
    },
    partSize: 10 * 1024 * 1024, // 10 MB parts — good for videos
    queueSize: 3,               // concurrent parts
  });

  if (onProgress) {
    upload.on('httpUploadProgress', (evt) => {
      onProgress({ loaded: Number(evt.loaded), total: evt.total });
    });
  }

  await upload.done();

  return key;
}