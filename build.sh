#!/bin/bash
set -e

echo "Building WordForge monorepo..."

echo "Installing dependencies..."
bun install

echo "Building @wordforge/ui..."
bun run --filter @wordforge/ui build

echo "Building @wordforge/mcp..."
bun run --filter @wordforge/mcp build

echo "Building PHP package..."
cd packages/php
./build.sh
cd ../..

echo ""
echo "Build complete!"
echo "  - PHP plugin: packages/php/dist/wordforge.zip"
echo "  - MCP extension: packages/mcp/wordforge.mcpb"
