import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as path from 'path';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private s3Client: S3Client | null = null;
  private bucketName: string | null = null;
  private region: string | null = null;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME') || null;
    this.region = this.configService.get<string>('AWS_S3_REGION') || null;

    if (this.bucketName && this.region) {
      this.s3Client = new S3Client({
        region: this.region,
      });
      this.logger.log(`S3 Client initialized in region ${this.region} with bucket ${this.bucketName}`);
    } else {
      this.logger.warn('AWS S3 configuration missing. S3 uploads will be disabled. Set AWS_S3_BUCKET_NAME and AWS_S3_REGION to enable S3.');
    }
  }

  isConfigured(): boolean {
    return this.s3Client !== null && this.bucketName !== null && this.region !== null;
  }

  async uploadFile(file: any, folder = 'uploads'): Promise<string> {
    if (!this.s3Client || !this.bucketName || !this.region) {
      throw new InternalServerErrorException('AWS S3 upload service is not configured');
    }

    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const key = `${folder}/${uniqueSuffix}${ext}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
    } catch (error) {
      this.logger.error(`S3 Upload failed for file ${file.originalname}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`S3 Upload failed: ${error.message}`);
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (!this.s3Client || !this.bucketName || !this.region) {
      this.logger.warn(`S3 not configured; skipping file delete for: ${fileUrl}`);
      return;
    }

    const s3UrlPrefix = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/`;
    if (!fileUrl.startsWith(s3UrlPrefix)) {
      this.logger.warn(`File URL is not an S3 object URL: ${fileUrl}`);
      return;
    }

    const key = fileUrl.replace(s3UrlPrefix, '');

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      this.logger.log(`Successfully deleted S3 file: ${key}`);
    } catch (error) {
      this.logger.error(`S3 Delete failed for key ${key}: ${error.message}`, error.stack);
    }
  }
}
