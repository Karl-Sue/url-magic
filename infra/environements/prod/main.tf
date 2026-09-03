locals {
  tags = {
    Environment = var.environment
    Project     = "url-magic"
    ManagedBy   = "Terraform"
  }
  resource_group_name = "rg-urlmagic-${var.environment}"
}

resource "azurerm_resource_group" "rg" {
  name     = local.resource_group_name
  location = var.location
  tags     = local.tags
}

module "cosmos_db" {
  source              = "../../modules/cosmos_db"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  account_name        = var.cosmos_account_name
  database_name       = var.cosmos_database_name
  container_name      = var.cosmos_container_name
  partition_key_path  = var.partition_key_path
  default_ttl         = 31536000 # 1 year native TTL
  enable_free_tier    = var.enable_cosmos_free_tier
  tags                = local.tags
}

module "azure_function" {
  source               = "../../modules/azure_function"
  resource_group_name  = azurerm_resource_group.rg.name
  location             = azurerm_resource_group.rg.location
  function_app_name    = var.function_app_name
  storage_account_name = var.storage_account_name
  service_plan_name    = "asp-urlmagic-${var.environment}"
  app_insights_name    = "appi-urlmagic-${var.environment}"
  sku_name             = "Y1" # Linux Consumption plan
  python_version       = var.python_version

  cosmos_endpoint   = module.cosmos_db.endpoint
  cosmos_key        = module.cosmos_db.primary_key
  cosmos_database   = module.cosmos_db.database_name
  cosmos_container  = module.cosmos_db.container_name
  safe_browsing_key = var.safe_browsing_key

  tags = local.tags
}

# TODO: Uncomment and configure Static Web App module when production frontend is ready.
# module "static_web_app" {
#   source              = "../../modules/static_web_app"
#   resource_group_name = azurerm_resource_group.rg.name
#   location            = azurerm_resource_group.rg.location
#   static_web_app_name = "swa-urlmagic-${var.environment}"
# }
