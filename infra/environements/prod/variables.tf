variable "location" {
  type        = string
  description = "Azure region for prod environment resources."
  default     = "eastus"
}

variable "environment" {
  type        = string
  description = "Environment name."
  default     = "prod"
}

variable "cosmos_account_name" {
  type        = string
  description = "Cosmos DB account name (must be globally unique)."
  default     = "cosmos-urlmagic-prod"
}

variable "enable_cosmos_free_tier" {
  type        = bool
  description = "Enable Cosmos DB Free Tier allocation (Set false if free tier is already allocated in dev)."
  default     = false
}

variable "function_app_name" {
  type        = string
  description = "Azure Function App name (must be globally unique)."
  default     = "func-urlmagic-prod"
}

variable "storage_account_name" {
  type        = string
  description = "Storage account name for Function App (globally unique, lowercase alphanumeric)."
  default     = "sturlmagicprod"
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

