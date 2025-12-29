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

# WordPress plugin (header + constant)
echo "  - wordforge.php"
sed -i '' "s/Version: .*/Version: $VERSION/" wordforge.php
sed -i '' "s/define( 'WORDFORGE_VERSION', '.*' );/define( 'WORDFORGE_VERSION', '$VERSION' );/" wordforge.php

# Claude extension manifest
echo "  - claude-extension/manifest.json"
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" claude-extension/manifest.json

# Claude extension package.json
echo "  - claude-extension/package.json"
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" claude-extension/package.json

# Claude extension source (MCP server version)
echo "  - claude-extension/src/index.ts"
sed -i '' "s/version: \".*\",/version: \"$VERSION\",/" claude-extension/src/index.ts

echo ""
echo "Done! Updated version to $VERSION in:"
echo "  - wordforge.php (plugin header + WORDFORGE_VERSION)"
echo "  - claude-extension/manifest.json"
echo "  - claude-extension/package.json"
echo "  - claude-extension/src/index.ts"
