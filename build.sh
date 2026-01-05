#!/bin/bash
set -e

echo "Building WordForge monorepo..."

echo "Installing dependencies..."
bun install

echo "Building @wordforge/ui..."
bun run --filter @wordforge/ui build

echo "Building PHP package..."
cd packages/php
./build.sh
cd ../..

echo ""
echo "Build complete!"
echo "  - PHP plugin: packages/php/dist/wordforge.zip"
