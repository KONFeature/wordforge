#!/bin/bash
set -e

echo "Building WordForge monorepo..."

echo "Installing dependencies..."
bun install

echo "Building @wordforge/ui..."
bun run --filter @wordforge/ui build

echo "Building @wordforge/opencode-plugin..."
bun run --filter @wordforge/opencode-plugin build
mkdir -p packages/php/assets/opencode-plugin
cp packages/opencode-plugin/dist/index.js packages/php/assets/opencode-plugin/gutenberg-bridge.js

echo "Building PHP package..."
cd packages/php
./build.sh
cd ../..

echo ""
echo "Build complete!"
echo "  - PHP plugin: packages/php/dist/wordforge.zip"
