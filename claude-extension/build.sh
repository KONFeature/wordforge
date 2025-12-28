#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Installing dependencies..."
cd server
npm install --omit=dev
cd ..

echo "Creating .mcpb package..."
rm -f wordforge.mcpb

zip -r wordforge.mcpb \
  manifest.json \
  server/index.js \
  server/package.json \
  server/node_modules

echo "Created: $SCRIPT_DIR/wordforge.mcpb"
echo ""
echo "To install:"
echo "1. Double-click wordforge.mcpb to open with Claude Desktop"
echo "2. Configure your WordPress MCP endpoint URL"
echo "3. Enter your WordPress username and application password"
