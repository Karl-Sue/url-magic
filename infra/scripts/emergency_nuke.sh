#!/usr/bin/env bash
# [!] DANGEROUS: Emergency infrastructure rollback / teardown script.
set -euo pipefail

echo -e "\033[0;31m=========================================================="
echo -e " [!] DANGEROUS: EMERGENCY CLOUD TEARDOWN SCRIPT"
echo -e " This will PERMANENTLY delete all Azure resources for the"
echo -e " selected environment (Cosmos DB, Functions, Storage, SWA)."
echo -e "==========================================================\033[0m"
echo ""

ENV="${1:-}"
if [ -z "$ENV" ]; then
    read -rp "Which environment do you want to NUKE? (dev / prod): " ENV
fi

if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
    echo "Invalid environment. Aborting."
    exit 1
fi

RESOURCE_GROUP="rg-urlmagic-$ENV"
STATIC_WEB_APP="swa-urlmagic-$ENV"

echo ""
echo -e "\033[0;33mTarget Resource Group : $RESOURCE_GROUP"
echo -e "Target Static Web App : $STATIC_WEB_APP\033[0m"
echo ""

read -rp "Type 'DESTROY $ENV' to confirm permanent deletion: " CONFIRM
if [ "$CONFIRM" != "DESTROY $ENV" ]; then
    echo -e "\033[0;32mConfirmation mismatch. Aborting safely.\033[0m"
    exit 0
fi

echo ""
echo -e "\033[0;36m[1/3] Deleting Azure Static Web App ($STATIC_WEB_APP)...\033[0m"
az staticwebapp delete --name "$STATIC_WEB_APP" --resource-group "$RESOURCE_GROUP" --yes 2>/dev/null || true

echo -e "\033[0;36m[2/3] Deleting Resource Group ($RESOURCE_GROUP)...\033[0m"
az group delete --name "$RESOURCE_GROUP" --yes

echo -e "\033[0;36m[3/3] Synchronizing Terraform state...\033[0m"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_DIR="$SCRIPT_DIR/../environments/$ENV"

if [ -d "$ENV_DIR" ]; then
    pushd "$ENV_DIR" >/dev/null
    terraform refresh || true
    popd >/dev/null
fi

echo ""
echo -e "\033[0;32m=========================================================="
echo -e " Teardown complete. Clean slate ready for fresh deployment."
echo -e "==========================================================\033[0m"
