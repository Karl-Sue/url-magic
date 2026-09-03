variable "location" {
  type        = string
  description = "Default Azure region for global infrastructure."
  default     = "eastus"
}

variable "project_name" {
  type        = string
  description = "Project name identifier."
  default     = "url-magic"
}

variable "tags" {
  type        = map(string)
  description = "Global tags to be applied across foundation infrastructure."
  default     = {}
}
