# RDS Resources are commented out in favor of using an external Neon Postgres Database.
# To provision RDS in the future, uncomment the code below.

# resource "aws_db_subnet_group" "rds" {
#   name       = "${var.project_name}-${var.environment}-rds-subnet-group"
#   subnet_ids = [aws_subnet.private_1.id, aws_subnet.private_2.id]
# 
#   tags = {
#     Name        = "${var.project_name}-${var.environment}-rds-subnet-group"
#     Environment = var.environment
#   }
# }
# 
# resource "aws_db_instance" "postgres" {
#   identifier             = "${var.project_name}-${var.environment}-db"
#   allocated_storage      = 20
#   max_allocated_storage  = 20
#   storage_type           = "gp3"
#   engine                 = "postgres"
#   engine_version         = "16.1"
#   instance_class         = "db.t4g.micro"
#   db_name                = var.db_name
#   username               = var.db_username
#   password               = var.db_password
#   db_subnet_group_name   = aws_db_subnet_group.rds.name
#   vpc_security_group_ids = [aws_security_group.rds.id]
#   skip_final_snapshot    = true
#   publicly_accessible    = false
#   backup_retention_period = 0
# 
#   tags = {
#     Name        = "${var.project_name}-${var.environment}-db"
#     Environment = var.environment
#   }
# }
