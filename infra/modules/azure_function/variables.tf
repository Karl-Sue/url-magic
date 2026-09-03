variable "resource_group_name" {
  type        = string
  description = "Name of the resource group."
}

variable "location" {
  type        = string
  description = "Azure location/region."
}

variable "function_app_name" {
  type        = string
  description = "Globally unique name for the Azure Function App."
}

variable "storage_account_name" {
  type        = string
  description = "Globally unique name for the Storage Account required by Function App (lowercase alphanumeric only, max 24 chars)."
}

variable "service_plan_name" {
  type        = string
  description = "Name of the App Service Plan."
}

variable "app_insights_name" {
  type        = string
  description = "Name of the Application Insights component."
}

variable "sku_name" {
  type        = string
  description = "App Service Plan SKU (e.g. Y1 for Serverless/Consumption dynamic tier, suitable for Student free quota)."
  default     = "Y1"
}

variable "python_version" {
  type        = string
  description = "Python runtime version for Azure Functions Linux app (e.g., 3.11, 3.12)."
  default     = "3.11"
}

variable "cosmos_endpoint" {
  type        = string
  description = "Cosmos DB account endpoint."
}

variable "cosmos_key" {
  type        = string
  description = "Cosmos DB account key."
  sensitive   = true
}

variable "cosmos_database" {
  type        = string
  description = "Cosmos DB database name."
  default     = "urlsdb"
}

variable "cosmos_container" {
  type        = string
  description = "Cosmos DB container name."
  default     = "UrlMagic"
}

variable "safe_browsing_key" {
  type        = string
  description = "Google Safe Browsing API key."
  sensitive   = true
  default     = ""
}

variable "redis_host" {
  type        = string
  description = "Redis cache hostname."
  default     = "localhost"
}

variable "redis_port" {
  type        = string
  description = "Redis cache port."
  default     = "6379"
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to resources."
  default     = {}
}
