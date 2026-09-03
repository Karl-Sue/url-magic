variable "resource_group_name" {
  type        = string
  description = "The name of the resource group in which to create the Cosmos DB account."
}

variable "location" {
  type        = string
  description = "The Azure location/region where the Cosmos DB account will be created."
}

variable "account_name" {
  type        = string
  description = "The name of the Cosmos DB account. Must be globally unique across Azure."
}

variable "database_name" {
  type        = string
  description = "The name of the Cosmos DB SQL database."
  default     = "urlsdb"
}

variable "container_name" {
  type        = string
  description = "The name of the Cosmos DB SQL container."
  default     = "UrlMagic"
}

variable "partition_key_path" {
  type        = string
  description = "The partition key path for the container."
  default     = "/shortCode"
}

variable "default_ttl" {
  type        = number
  description = "Default Time-To-Live in seconds for container documents. Default is 31536000 (1 year)."
  default     = 31536000
}

variable "enable_free_tier" {
  type        = bool
  description = "Enable Cosmos DB Free Tier for student/free subscription (1 account per subscription)."
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "A mapping of tags to assign to the resource."
  default     = {}
}
