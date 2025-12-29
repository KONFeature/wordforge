#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Installing dependencies..."
bun install

echo "Building TypeScript bundle..."
bun run build

echo "Creating .mcpb package..."
rm -f wordforge.mcpb

zip -r wordforge.mcpb \
  manifest.json \
  dist/index.js

echo "Created: $SCRIPT_DIR/wordforge.mcpb"
echo ""
echo "To install:"
echo "1. Double-click wordforge.mcpb to open with Claude Desktop"
echo "2. Configure your WordPress MCP endpoint URL"
echo "3. Enter your WordPress username and application password"
