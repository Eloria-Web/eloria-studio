# Script de Integración para Eloria Studio
# Este script ayuda a verificar que todos los archivos estén listos

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ELORIA STUDIO - VERIFICACIÓN DE ARCHIVOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$archivosRequeridos = @(
    "index.html",
    "signup.html",
    "login.html",
    "reset-password.html",
    "checkout.html",
    "dashboard.html",
    "pricing.html",
    "js\firebase-init.js",
    "js\auth-guard.js",
    "js\signup.js",
    "js\login.js",
    "js\reset-password.js",
    "js\checkout.js",
    "js\dashboard.js",
    "js\payments.js",
    "css\auth.css",
    "css\checkout.css",
    "css\dashboard.css",
    "css\pricing.css",
    "netlify\functions\stripe-webhook.js",
    "netlify.toml",
    "package.json"
)

$archivosEncontrados = 0
$archivosFaltantes = @()

Write-Host "Verificando archivos..." -ForegroundColor Yellow
Write-Host ""

foreach ($archivo in $archivosRequeridos) {
    $rutaCompleta = Join-Path $PSScriptRoot $archivo
    if (Test-Path $rutaCompleta) {
        Write-Host "✓ $archivo" -ForegroundColor Green
        $archivosEncontrados++
    } else {
        Write-Host "✗ $archivo - FALTANTE" -ForegroundColor Red
        $archivosFaltantes += $archivo
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESUMEN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
$colorResumen = if ($archivosEncontrados -eq $archivosRequeridos.Count) { "Green" } else { "Yellow" }
Write-Host "Archivos encontrados: $archivosEncontrados de $($archivosRequeridos.Count)" -ForegroundColor $colorResumen

if ($archivosFaltantes.Count -gt 0) {
    Write-Host ""
    Write-Host "Archivos faltantes:" -ForegroundColor Red
    foreach ($archivo in $archivosFaltantes) {
        Write-Host "  - $archivo" -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "¡Todos los archivos están presentes!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos pasos:" -ForegroundColor Cyan
    Write-Host "1. Subir archivos a Netlify" -ForegroundColor White
    Write-Host "2. Configurar variables de entorno" -ForegroundColor White
    Write-Host "3. Crear tablas en Supabase" -ForegroundColor White
    Write-Host "4. Configurar webhook de Stripe" -ForegroundColor White
    Write-Host ""
    Write-Host "Ver INTEGRACION_SITIO_REAL.md para instrucciones detalladas" -ForegroundColor Yellow
}

Write-Host ""
