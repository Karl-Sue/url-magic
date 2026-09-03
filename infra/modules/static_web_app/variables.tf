# TODO: Define Static Web App module variables when frontend development begins.
variable "resource_group_name" {
  type        = string
  description = "Resource group name."
  default     = ""
}

variable "location" {
  type        = string
  description = "Azure region."
  default     = "eastus2"
}

variable "static_web_app_name" {
  type        = string
  description = "Static Web App name."
  default     = ""
}
