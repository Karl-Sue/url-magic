variable "location" {
  type        = string
  description = "Azure region for dev environment resources."
  default     = "eastus"
}

variable "environment" {
  type        = string
  description = "Environment name."
  default     = "dev"
}

variable "cosmos_account_name" {
  type        = string
  description = "Cosmos DB account name (must be globally unique)."
  default     = "cosmos-urlmagic-dev"
}

variable "enable_cosmos_free_tier" {
  type        = bool
  description = "Enable Cosmos DB Free Tier allocation."
  default     = true
}

variable "function_app_name" {
  type        = string
  description = "Azure Function App name (must be globally unique)."
  default     = "func-urlmagic-dev"
}

variable "storage_account_name" {
  type        = string
  description = "Storage account name for Function App (globally unique, lowercase alphanumeric)."
  default     = "sturlmagicdev"
}

variable "safe_browsing_key" {
  type        = string
  description = "Google Safe Browsing API key."
  sensitive   = true
  default     = ""
}

variable "python_version" {
  type        = string
  description = "Python runtime version for Azure Function App."
  default     = "3.11"
}

variable "cosmos_database_name" {
  type        = string
  description = "Cosmos DB database name."
  default     = "urlsdb"
}

variable "cosmos_container_name" {
  type        = string
  description = "Cosmos DB container name."
  default     = "UrlMagic"
}

variable "partition_key_path" {
  type        = string
  description = "Cosmos DB container partition key path."
  default     = "/shortCode"
}

