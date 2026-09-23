# Azure Web App Deployment Script for AU Group CFS-React SPA
param(
    [Parameter(Mandatory=$false)][string]$AppName = "",
    [Parameter(Mandatory=$false)][string]$ResourceGroup = ""
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " AU Group React SPA — Azure Web App Deployment Tool" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if ([string]::IsNullOrWhiteSpace($AppName)) {
    $AppName = Read-Host "Enter your Azure Web App Name (e.g. sm-cfs-app)"
}

if ([string]::IsNullOrWhiteSpace($ResourceGroup)) {
    $ResourceGroup = Read-Host "Enter your Azure Resource Group Name (e.g. cfs-rg)"
}

Write-Host "`n1. Building production bundle into dist/..." -ForegroundColor Yellow
npm run build

if (-not (Test-Path "dist\index.html")) {
    Write-Host "`n[ERROR] Production build failed or index.html not found in dist/." -ForegroundColor Red
    exit 1
}

Write-Host "`n2. Packaging dist/ folder into dist.zip..." -ForegroundColor Yellow
if (Test-Path "dist.zip") { Remove-Item -Force "dist.zip" }
Compress-Archive -Path "dist\*" -DestinationPath "dist.zip" -Force

Write-Host "`n3. Deploying dist.zip to Azure Web App '$AppName'..." -ForegroundColor Yellow
az webapp deploy --resource-group $ResourceGroup --name $AppName --src-path "dist.zip" --type zip

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host " SUCCESS! App deployed to: https://$AppName.azurewebsites.net" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
} else {
    Write-Host "`n[ERROR] Deployment failed. Please ensure Azure CLI is logged in ('az login')." -ForegroundColor Red
}
