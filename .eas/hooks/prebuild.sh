#!/bin/bash
set -e

echo "🔧 Running custom dependency installation with legacy peer deps..."

# Install dependencies with legacy peer deps
npm install --legacy-peer-deps

echo "✅ Dependencies installed successfully with legacy peer deps"
echo "📦 Applying patches..."

# Apply patches
npx patch-package

echo "✅ All patches applied successfully"
echo "🚀 Prebuild hook completed!" 