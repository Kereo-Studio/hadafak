variable "aws_region" {
  type        = string
  description = "AWS Region to deploy resources"
  default     = "eu-central-1"
}

variable "project_name" {
  type        = string
  description = "Project name prefix for resources"
  default     = "hadafak"
}

variable "environment" {
  type        = string
  description = "Environment name (production, staging, dev)"
  default     = "production"
}

variable "db_username" {
  type        = string
  description = "Master username for RDS Postgres"
  default     = "hadafak_admin"
}

variable "db_password" {
  type        = string
  description = "Master password for RDS Postgres"
  sensitive   = true
  default     = ""
}

variable "db_name" {
  type        = string
  description = "Database name for the application"
  default     = "hadafak_db"
}

variable "jwt_secret" {
  type        = string
  description = "JWT Secret for application authentication"
  sensitive   = true
}

variable "database_url" {
  type        = string
  description = "Connection string for Neon Postgres database"
  sensitive   = true
}

variable "fatsecret_client_id" {
  type        = string
  description = "FatSecret Client ID"
  default     = ""
}

variable "fatsecret_client_secret" {
  type        = string
  description = "FatSecret Client Secret"
  sensitive   = true
  default     = ""
}

variable "gemini_api_key" {
  type        = string
  description = "Gemini API Key for AI nutrition and recipe services"
  sensitive   = true
  default     = ""
}


