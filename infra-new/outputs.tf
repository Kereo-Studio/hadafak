output "s3_bucket_name" {
  value       = aws_s3_bucket.uploads.id
  description = "New S3 bucket name — update AWS_S3_BUCKET_NAME in .env with this value"
}

output "s3_bucket_arn" {
  value = aws_s3_bucket.uploads.arn
}
