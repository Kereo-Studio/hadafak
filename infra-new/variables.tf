variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-central-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "hadafak"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}
