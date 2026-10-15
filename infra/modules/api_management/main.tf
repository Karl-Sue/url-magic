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
  name                  = "url-magic-api"
  resource_group_name   = var.resource_group_name
  api_management_name   = azurerm_api_management.apim.name
  revision              = "1"
  display_name          = "URL Magic API"
  path                  = "api/v1"
  protocols             = ["https"]
  service_url           = "https://${var.function_app_default_hostname}/api/v1"
  subscription_required = false
}

# 5a. Catch-All Operations for nested paths (/session/guest, /shorten, etc.)
resource "azurerm_api_management_api_operation" "catch_all" {
  for_each            = toset(["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"])
  operation_id        = "catch-all-${lower(each.value)}"
  api_name            = azurerm_api_management_api.api.name
  api_management_name = azurerm_api_management.apim.name
  resource_group_name = var.resource_group_name
  display_name        = "Catch-All ${each.value}"
  method              = each.value
  url_template        = "/{*path}"

  template_parameter {
    name     = "path"
    type     = "string"
    required = true
  }
}

# 5b. Root Operations for base path (/api/v1 and /api/v1/)
resource "azurerm_api_management_api_operation" "root_op" {
  for_each            = toset(["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"])
  operation_id        = "root-${lower(each.value)}"
  api_name            = azurerm_api_management_api.api.name
  api_management_name = azurerm_api_management.apim.name
  resource_group_name = var.resource_group_name
  display_name        = "Root ${each.value}"
  method              = each.value
  url_template        = "/"
}

# 6. Policy forwarding traffic to backend with CORS and dynamic path routing
resource "azurerm_api_management_api_policy" "api_policy" {
  api_name            = azurerm_api_management_api.api.name
  api_management_name = azurerm_api_management.apim.name
  resource_group_name = var.resource_group_name

  xml_content = <<XML
<policies>
    <inbound>
        <base />
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
        <set-header name="X-Forwarded-Host" exists-action="override">
            <value>@(context.Request.OriginalUrl.Host)</value>
        </set-header>
        <set-header name="X-Forwarded-Proto" exists-action="override">
            <value>@(context.Request.OriginalUrl.Scheme)</value>
        </set-header>
        <set-backend-service backend-id="${azurerm_api_management_backend.func_backend.name}" />
        <choose>
            <when condition='@(context.Request.MatchedParameters.ContainsKey("path"))'>
                <rewrite-uri template="/{path}" copy-unmatched-params="true" />
            </when>
            <otherwise>
                <rewrite-uri template="/" copy-unmatched-params="true" />
            </otherwise>
        </choose>
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
