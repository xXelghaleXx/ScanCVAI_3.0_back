#!/bin/bash
# Script de build para Render.com

echo "📦 Instalando dependencias npm..."
npm install

echo "🌐 Instalando Chrome para Puppeteer..."
npx puppeteer browsers install chrome

echo "✅ Build completado"
