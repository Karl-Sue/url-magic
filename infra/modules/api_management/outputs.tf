output "apim_id" {
  value       = azurerm_api_management.apim.id
  description = "The ID of the API Management service."
}

output "gateway_url" {
  value       = azurerm_api_management.apim.gateway_url
  description = "The Gateway URL of the API Management service."
}

output "api_endpoint" {
  value       = "${azurerm_api_management.apim.gateway_url}/${azurerm_api_management_api.api.path}"
  description = "The full public HTTPS endpoint for the frontend to call."
}
