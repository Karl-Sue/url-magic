terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.0.0"
    }
  }
}

# 1. API Management Service (Consumption Serverless Tier - 1M free calls/month, $0 idle cost)
resource "azurerm_api_management" "apim" {
  name                = var.apim_name
  location            = var.location
  resource_group_name = var.resource_group_name
  publisher_name      = var.publisher_name
  publisher_email     = var.publisher_email
  sku_name            = "Consumption_0"

  tags = var.tags
}

# 2. Fetch the Host Keys from the secured Azure Function App
# depends_on azurerm_api_management.apim defers evaluation until apply-time,
# ensuring the Function App exists before Azure is queried for its keys.
data "azurerm_function_app_host_keys" "func_keys" {
  name                = var.function_app_name
  resource_group_name = var.resource_group_name
  depends_on          = [azurerm_api_management.apim]
}

# 3. Secure Backend link attaching the secret x-functions-key header
resource "azurerm_api_management_backend" "func_backend" {
  name                = "azure-function-backend"
  resource_group_name = var.resource_group_name
  api_management_name = azurerm_api_management.apim.name
  protocol            = "http"
  url                 = "https://${var.function_app_default_hostname}/api/v1"

  credentials {
    header = {
      "x-functions-key" = data.azurerm_function_app_host_keys.func_keys.default_function_key
    }
  }
}

# 4. API Definition
resource "azurerm_api_management_api" "api" {
  name                = "url-magic-api"
  resource_group_name = var.resource_group_name
  api_management_name = azurerm_api_management.apim.name
  revision            = "1"
  display_name        = "URL Magic API"
  path                = "api/v1"
  protocols           = ["https"]
  service_url         = "https://${var.function_app_default_hostname}/api/v1"
}

# 5. Wildcard Operation forwarding all paths (/shorten, /qr, /health, etc.)
resource "azurerm_api_management_api_operation" "all_ops" {
  operation_id        = "all-operations"
  api_name            = azurerm_api_management_api.api.name
  api_management_name = azurerm_api_management.apim.name
  resource_group_name = var.resource_group_name
  display_name        = "All Operations"
  method              = "*"
  url_template        = "/*"
}

# 6. Policy forwarding traffic to backend with rate limiting and strict CORS
resource "azurerm_api_management_api_policy" "api_policy" {
  api_name            = azurerm_api_management_api.api.name
  api_management_name = azurerm_api_management.apim.name
  resource_group_name = var.resource_group_name

  xml_content = <<XML
<policies>
    <inbound>
        <base />
        <set-backend-service backend-id="${azurerm_api_management_backend.func_backend.name}" />
        <!-- Edge Rate Limiting: 60 requests per minute per client IP -->
        <rate-limit-by-key calls="60" renewal-period="60" counter-key="@(context.Request.IpAddress)" />
        <cors allow-credentials="true">
            <allowed-origins>
%{ for origin in var.allowed_origins ~}
                <origin>${origin}</origin>
%{ endfor ~}
            </allowed-origins>
            <allowed-methods preflight-result-max-age="300">
                <method>*</method>
            </allowed-methods>
            <allowed-headers>
                <header>*</header>
            </allowed-headers>
        </cors>
    </inbound>
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
XML
}
