#!/bin/bash
set -e

# Usage: ./update-version.sh <version>
# Example: ./update-version.sh 1.2.0

if [ -z "$1" ]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 1.2.0"
    exit 1
fi

VERSION="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Updating version to $VERSION..."

# Helper function for portable sed (works on both BSD and GNU sed)
sed_i() {
    if sed --version &>/dev/null; then
        sed -i "$@"
    else
        sed -i '' "$@"
    fi
}

# WordPress plugin (header + constant)
echo "  - packages/php/wordforge.php"
sed_i "s/Version: .*/Version: $VERSION/" packages/php/wordforge.php
sed_i "s/define( 'WORDFORGE_VERSION', '.*' );/define( 'WORDFORGE_VERSION', '$VERSION' );/" packages/php/wordforge.php

# MCP manifest
echo "  - packages/mcp/manifest.json"
sed_i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" packages/mcp/manifest.json

# MCP package.json
echo "  - packages/mcp/package.json"
sed_i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" packages/mcp/package.json

# MCP source (server version)
echo "  - packages/mcp/src/index.ts"
sed_i "s/version: \".*\",/version: \"$VERSION\",/" packages/mcp/src/index.ts

# Desktop app package.json
echo "  - packages/desktop/package.json"
sed_i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" packages/desktop/package.json

# Desktop Tauri config
echo "  - packages/desktop/src-tauri/tauri.conf.json"
sed_i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" packages/desktop/src-tauri/tauri.conf.json

# Desktop Cargo.toml
echo "  - packages/desktop/src-tauri/Cargo.toml"
sed_i "s/^version = \".*\"/version = \"$VERSION\"/" packages/desktop/src-tauri/Cargo.toml

echo ""
echo "Done! Updated version to $VERSION in:"
echo "  - packages/php/wordforge.php (plugin header + WORDFORGE_VERSION)"
echo "  - packages/mcp/manifest.json"
echo "  - packages/mcp/package.json"
echo "  - packages/mcp/src/index.ts"
echo "  - packages/desktop/package.json"
echo "  - packages/desktop/src-tauri/tauri.conf.json"
echo "  - packages/desktop/src-tauri/Cargo.toml"
