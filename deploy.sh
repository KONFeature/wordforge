#!/bin/bash
set -e

source .env

if [ -z "$SSH_HOST" ] || [ -z "$REMOTE_WP_DIR" ]; then
  echo "Error: Missing required env vars (SSH_HOST, REMOTE_WP_DIR)"
  echo "Create a .env file with:"
  echo "  SSH_CONNECT=ssh -i /path/to/key"
  echo "  SSH_HOST=user@host"
  echo "  REMOTE_WP_DIR=/var/www/html/site"
  exit 1
fi

REMOTE_PLUGIN_DIR="$REMOTE_WP_DIR/wp-content/plugins/wordforge"

echo "==> Building UI..."
cd packages/ui
bun run build
cd ../..

echo "==> Building MCP server..."
cd packages/mcp
bun run build
cd ../..

echo "==> Deploying to $SSH_HOST..."
$SSH_CONNECT $SSH_HOST "rm -rf $REMOTE_PLUGIN_DIR/includes $REMOTE_PLUGIN_DIR/assets"

rsync -avz -e "$SSH_CONNECT" packages/php/includes/ "$SSH_HOST:$REMOTE_PLUGIN_DIR/includes/"
rsync -avz -e "$SSH_CONNECT" packages/php/assets/ "$SSH_HOST:$REMOTE_PLUGIN_DIR/assets/"
rsync -avz -e "$SSH_CONNECT" packages/php/wordforge.php "$SSH_HOST:$REMOTE_PLUGIN_DIR/"

$SSH_CONNECT $SSH_HOST "chown -R www-data:www-data $REMOTE_PLUGIN_DIR"

echo "==> Done!"