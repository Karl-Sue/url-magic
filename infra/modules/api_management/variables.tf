variable "resource_group_name" {
  type        = string
  description = "The name of the Resource Group."
}

variable "location" {
  type        = string
  description = "Azure region for APIM."
  default     = "japaneast"
}

variable "apim_name" {
  type        = string
  description = "Name of the API Management service (must be globally unique)."
}

variable "publisher_name" {
  type        = string
  description = "Name of the publisher organization."
  default     = "URL Magic"
}

variable "publisher_email" {
  type        = string
  description = "Email of the publisher."
  default     = "admin@urlmagic.internal"
}

variable "function_app_name" {
  type        = string
  description = "Name of the Azure Function App to secure."
}

variable "function_app_default_hostname" {
  type        = string
  description = "Default hostname of the Azure Function App."
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to resources."
  default     = {}
}

variable "allowed_origins" {
  type        = list(string)
  description = "List of allowed CORS origins for APIM (exact FQDNs, wildcard subdomains not supported by APIM)."
  default     = []
}

