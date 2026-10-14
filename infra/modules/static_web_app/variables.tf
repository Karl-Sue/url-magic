variable "resource_group_name" {
  type        = string
  description = "Resource group name."
}

variable "location" {
  type        = string
  description = "Azure region for Static Web App"
  default     = "eastasia"
}

variable "static_web_app_name" {
  type        = string
  description = "Static Web App name."
}

variable "sku_tier" {
  type        = string
  description = "SKU tier for Static Web App (Free or Standard)."
  default     = "Free"
}

variable "sku_size" {
  type        = string
  description = "SKU size for Static Web App (Free or Standard)."
  default     = "Free"
}

variable "tags" {
  type        = map(string)
  description = "Tags to assign to the Static Web App."
  default     = {}
}
