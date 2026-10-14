<#
.SYNOPSIS
    [!] DANGEROUS: Emergency infrastructure rollback / teardown script.
.DESCRIPTION
    Permanently destroys all cloud resources for a selected environment (dev or prod).
    Requires explicit manual typing to prevent accidental execution.
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "prod")]
    [string]$Environment
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Red
Write-Host " [!] DANGEROUS: EMERGENCY CLOUD TEARDOWN SCRIPT" -ForegroundColor Red
Write-Host " This will PERMANENTLY delete all Azure resources for the" -ForegroundColor Red
Write-Host " selected environment (Cosmos DB, Functions, Storage, SWA)." -ForegroundColor Red
Write-Host "==========================================================" -ForegroundColor Red
Write-Host ""

if (-not $Environment) {
    $Environment = Read-Host "Which environment do you want to NUKE? (dev / prod)"
}

if ($Environment -notin @("dev", "prod")) {
    Write-Host "Invalid environment. Aborting." -ForegroundColor Yellow
    exit 1
}

$ResourceGroupName = "rg-urlmagic-$Environment"
$StaticWebAppName = "swa-urlmagic-$Environment"

Write-Host ""
Write-Host "Target Resource Group : $ResourceGroupName" -ForegroundColor Yellow
Write-Host "Target Static Web App : $StaticWebAppName" -ForegroundColor Yellow
Write-Host ""

# Safety Gate: User must type the confirmation string
$Confirmation = Read-Host "Type 'DESTROY $Environment' to confirm permanent deletion"
if ($Confirmation -ne "DESTROY $Environment") {
    Write-Host "Confirmation mismatch ('$Confirmation' != 'DESTROY $Environment'). Aborting safely." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "[1/3] Deleting Azure Static Web App ($StaticWebAppName)..." -ForegroundColor Cyan
az staticwebapp delete --name $StaticWebAppName --resource-group $ResourceGroupName --yes 2>$null

Write-Host "[2/3] Deleting Resource Group ($ResourceGroupName)..." -ForegroundColor Cyan
az group delete --name $ResourceGroupName --yes

Write-Host "[3/3] Synchronizing Terraform state..." -ForegroundColor Cyan
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvDir = Join-Path $ScriptDir "..\environments\$Environment"

if (Test-Path $EnvDir) {
    Push-Location $EnvDir
    try {
        terraform refresh
        Write-Host "Terraform state refreshed successfully." -ForegroundColor Green
    } catch {
        Write-Host "Warning: Could not refresh Terraform state: $_" -ForegroundColor Yellow
    } finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " Teardown complete. Clean slate ready for fresh deployment." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
