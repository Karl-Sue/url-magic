output "resource_group_name" {
  value       = azurerm_resource_group.rg.name
  description = "The name of the Resource Group."
}

output "cosmos_endpoint" {
  value       = module.cosmos_db.endpoint
  description = "Cosmos DB account endpoint."
}

output "cosmos_database_name" {
  value       = module.cosmos_db.database_name
  description = "Cosmos DB database name."
}

output "cosmos_container_name" {
  value       = module.cosmos_db.container_name
  description = "Cosmos DB container name."
}

output "function_app_name" {
  value       = module.azure_function.function_app_name
  description = "Azure Function App name."
}

output "function_app_default_hostname" {
  value       = module.azure_function.default_hostname
  description = "Default hostname of the deployed Azure Function App."
}
