import { GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import * as path from 'path';
import { createS3Client } from './client';

interface DownloadFileParams {
  bucket: string;
  key: string;
  filePath: string;
}

/**
 * Download a file from S3/MinIO to local filesystem
 */
export async function downloadFile({
  bucket,
  key,
  filePath,
}: DownloadFileParams): Promise<void> {
  const s3Client = createS3Client();

  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    console.log(`⬇️ Downloading ${bucket}/${key}...`);

    // Get object from S3
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error('No body in S3 response');
    }

    // Write stream to file
    const writeStream = fs.createWriteStream(filePath);
    
    // AWS SDK v3 returns a Readable stream in Node.js
    const stream = response.Body as any;
    
    await new Promise<void>((resolve, reject) => {
      stream.pipe(writeStream);
      stream.on('error', (err: Error) => {
        console.error('Stream error:', err);
        reject(err);
      });
      writeStream.on('finish', () => {
        console.log(`✅ Downloaded ${key} to ${filePath}`);
        resolve();
      });
      writeStream.on('error', (err: Error) => {
        console.error('Write stream error:', err);
        reject(err);
      });
    });

  } catch (error: any) {
    console.error(`Failed to download ${bucket}/${key}:`, error);
    throw new Error(`Download failed: ${error.message}`);
  }
}