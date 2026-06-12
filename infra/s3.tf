resource "random_string" "s3_suffix" {
  length  = 6
  special = false
  upper   = false
}

resource "aws_s3_bucket" "uploads" {
  bucket        = "${var.project_name}-uploads-${var.environment}-${random_string.s3_suffix.result}"
  force_destroy = true

  tags = {
    Name        = "${var.project_name}-uploads-${var.environment}"
    Environment = var.environment
  }
}

# Explicitly disable block public access settings so we can allow public read of images
resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Bucket policy allowing public read access to uploaded files
resource "aws_s3_bucket_policy" "public_read" {
  bucket = aws_s3_bucket.uploads.id

  # Ensure the public access block is updated before we apply the policy
  depends_on = [aws_s3_bucket_public_access_block.uploads]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.uploads.arn}/*"
      }
    ]
  })
}
