# Top-Level Root & Global Infrastructure Configuration
# Defines global provider configurations, version constraints, backend storage settings, and foundation defaults.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }

  # Azure Storage Account Backend Configuration for Remote State Storage
  # Uncomment and configure when remote backend state storage is provisioned:
  # backend "azurerm" {
  #   resource_group_name  = "rg-urlmagic-tfstate"
  #   storage_account_name = "sturlmagictfstate"
  #   container_name       = "tfstate"
  #   key                  = "global.tfstate"
  # }
}

provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
    key_vault {
      purge_soft_delete_on_destroy = true
    }
  }
}

locals {
  project_name = var.project_name
  common_tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}
