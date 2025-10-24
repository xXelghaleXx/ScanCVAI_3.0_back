#!/usr/bin/env bash
# Script de construcción para Render.com

set -e

echo "🔧 Instalando dependencias de npm..."
npm install

echo "🌐 Instalando Chromium para Puppeteer..."
# Instalar chromium para Puppeteer
apt-get update
apt-get install -y chromium-browser

echo "✅ Build completado exitosamente"
