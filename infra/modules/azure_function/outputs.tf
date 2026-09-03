output "function_app_id" {
  value       = azurerm_linux_function_app.function_app.id
  description = "The ID of the Linux Function App."
}

output "function_app_name" {
  value       = azurerm_linux_function_app.function_app.name
  description = "The name of the Linux Function App."
}

output "default_hostname" {
  value       = azurerm_linux_function_app.function_app.default_hostname
  description = "The default hostname of the Function App."
}

output "principal_id" {
  value       = azurerm_linux_function_app.function_app.identity[0].principal_id
  description = "Principal ID of the System Assigned Identity."
}

output "app_insights_instrumentation_key" {
  value       = azurerm_application_insights.app_insights.instrumentation_key
  description = "Instrumentation key for Application Insights."
  sensitive   = true
}

output "app_insights_connection_string" {
  value       = azurerm_application_insights.app_insights.connection_string
  description = "Connection string for Application Insights."
  sensitive   = true
}
