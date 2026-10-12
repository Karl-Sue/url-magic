output "id" {
  value       = azurerm_static_web_app.swa.id
  description = "The ID of the Static Web App."
}

output "name" {
  value       = azurerm_static_web_app.swa.name
  description = "The name of the Static Web App."
}

output "default_hostname" {
  value       = azurerm_static_web_app.swa.default_host_name
  description = "Default URL hostname of the Static Web App."
}

output "api_key" {
  value       = azurerm_static_web_app.swa.api_key
  description = "Static Web App deployment API key / token."
  sensitive   = true
}
