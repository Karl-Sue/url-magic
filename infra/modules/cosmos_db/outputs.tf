output "account_id" {
  value       = azurerm_cosmosdb_account.cosmos_account.id
  description = "The ID of the Cosmos DB account."
}

output "endpoint" {
  value       = azurerm_cosmosdb_account.cosmos_account.endpoint
  description = "The endpoint URI of the Cosmos DB account."
}

output "primary_key" {
  value       = azurerm_cosmosdb_account.cosmos_account.primary_key
  description = "The primary key of the Cosmos DB account."
  sensitive   = true
}

output "secondary_key" {
  value       = azurerm_cosmosdb_account.cosmos_account.secondary_key
  description = "The secondary key of the Cosmos DB account."
  sensitive   = true
}

output "database_name" {
  value       = azurerm_cosmosdb_sql_database.db.name
  description = "The name of the SQL Database."
}

output "container_name" {
  value       = azurerm_cosmosdb_sql_container.container.name
  description = "The name of the SQL Container."
}

output "primary_sql_connection_string" {
  value       = azurerm_cosmosdb_account.cosmos_account.primary_sql_connection_string
  description = "The primary SQL connection string."
  sensitive   = true
}
