import { S3Client } from "@aws-sdk/client-s3";

export function createS3Client() {
    const endpoint = process.env.AWS_ENDPOINT; // http://localhost:9000 for MinIO
  
    return new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      endpoint: endpoint ? { url: new URL(endpoint) } : undefined,
      forcePathStyle: !!endpoint,
    });
  }