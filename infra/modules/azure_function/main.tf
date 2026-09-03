terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.0.0"
    }
  }
}

# Storage Account required for Function App internal operations
resource "azurerm_storage_account" "func_storage" {
  name                     = var.storage_account_name
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  tags = var.tags
}

# App Service Plan (Consumption Y1 tier for Linux Function App / Student free plan)
resource "azurerm_service_plan" "asp" {
  name                = var.service_plan_name
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = var.sku_name

  tags = var.tags
}

# Application Insights for telemetry and centralized logging
resource "azurerm_application_insights" "app_insights" {
  name                = var.app_insights_name
  location            = var.location
  resource_group_name = var.resource_group_name
  application_type    = "web"

  tags = var.tags
}

# Linux Function App running Python runtime
resource "azurerm_linux_function_app" "function_app" {
  name                        = var.function_app_name
  resource_group_name         = var.resource_group_name
  location                    = var.location
  service_plan_id             = azurerm_service_plan.asp.id
  storage_account_name        = azurerm_storage_account.func_storage.name
  storage_account_access_key  = azurerm_storage_account.func_storage.primary_access_key
  functions_extension_version = "~4"

  site_config {
    application_insights_connection_string = azurerm_application_insights.app_insights.connection_string
    application_insights_key               = azurerm_application_insights.app_insights.instrumentation_key

    application_stack {
      python_version = var.python_version
    }
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"              = "python"
    "SAFE_BROWSING"                         = var.safe_browsing_key
    "REDIS_HOST"                            = var.redis_host
    "REDIS_PORT"                            = var.redis_port
    "COSMOS_ENDPOINT"                       = var.cosmos_endpoint
    "COSMOS_KEY"                            = var.cosmos_key
    "COSMOS_DATABASE"                       = var.cosmos_database
    "COSMOS_CONTAINER"                      = var.cosmos_container
    "APPLICATIONINSIGHTS_CONNECTION_STRING" = azurerm_application_insights.app_insights.connection_string
  }

  identity {
    type = "SystemAssigned"
  }

  tags = var.tags
}
