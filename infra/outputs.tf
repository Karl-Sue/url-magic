output "project_name" {
  value       = local.project_name
  description = "Global project name."
}

output "default_location" {
  value       = var.location
  description = "Default Azure region for infrastructure resources."
}

output "common_tags" {
  value       = local.common_tags
  description = "Common foundation tags."
}
