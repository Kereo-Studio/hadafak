output "ecr_repository_url" {
  value       = aws_ecr_repository.app.repository_url
  description = "The URL of the ECR repository to push Docker images to"
}

output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "The public DNS name of the Application Load Balancer"
}

# output "rds_endpoint" {
#   value       = aws_db_instance.postgres.endpoint
#   description = "The endpoint of the RDS Postgres database"
# }

output "ecs_cluster_name" {
  value       = aws_ecs_cluster.main.name
  description = "The name of the ECS cluster"
}

output "ecs_service_name" {
  value       = aws_ecs_service.app.name
  description = "The name of the ECS service"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.uploads.id
  description = "The name of the S3 bucket for progress photo uploads"
}
