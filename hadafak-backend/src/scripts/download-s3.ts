import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: ts-node src/scripts/download-s3.ts <s3-key> <local-destination-path>');
    console.error('Example: ts-node src/scripts/download-s3.ts datasets/RAW_recipes.csv /tmp/RAW_recipes.csv');
    process.exit(1);
  }

  const s3Key = args[0];
  const localPath = args[1];

  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_S3_REGION || 'us-east-1';

  if (!bucketName) {
    console.error('Error: AWS_S3_BUCKET_NAME environment variable is not defined.');
    process.exit(1);
  }

  console.log(`Initializing S3 client (Region: ${region})...`);
  const s3Client = new S3Client({ region });

  console.log(`Downloading object "${s3Key}" from bucket "${bucketName}"...`);

  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      })
    );

    if (!response.Body) {
      throw new Error('S3 response body is empty');
    }

    // Ensure parent directories of target destination exist
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const fileStream = fs.createWriteStream(localPath);
    const s3Stream = response.Body as Readable;

    await new Promise<void>((resolve, reject) => {
      s3Stream
        .pipe(fileStream)
        .on('error', (err) => {
          fileStream.close();
          reject(err);
        })
        .on('finish', () => {
          fileStream.close();
          resolve();
        });
    });

    console.log(`Success: File downloaded to "${localPath}"`);
  } catch (err) {
    console.error(`Error downloading file: ${err.message}`);
    process.exit(1);
  }
}

run();
