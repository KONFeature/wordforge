#!/bin/bash
set -e

PLUGIN_SLUG="wordforge"
BUILD_DIR="build"
DIST_DIR="dist"

echo "🔨 Building WordForge..."

rm -rf "$BUILD_DIR" "$DIST_DIR"
mkdir -p "$BUILD_DIR/$PLUGIN_SLUG"
mkdir -p "$DIST_DIR"

echo "📦 Installing production dependencies..."
composer install --no-dev --optimize-autoloader --quiet

if [ ! -d "vendor" ]; then
    echo "❌ Composer install failed. Make sure composer is installed."
    exit 1
fi

echo "📁 Copying files..."
cp -r includes "$BUILD_DIR/$PLUGIN_SLUG/"
cp -r vendor "$BUILD_DIR/$PLUGIN_SLUG/"
cp wordforge.php "$BUILD_DIR/$PLUGIN_SLUG/"
cp composer.json "$BUILD_DIR/$PLUGIN_SLUG/"
cp README.md "$BUILD_DIR/$PLUGIN_SLUG/"

if [ -d "assets" ]; then
    cp -r assets "$BUILD_DIR/$PLUGIN_SLUG/"
fi

if [ -d "languages" ]; then
    cp -r languages "$BUILD_DIR/$PLUGIN_SLUG/"
fi

echo "🗜️  Creating zip..."
cd "$BUILD_DIR"
zip -rq "../$DIST_DIR/$PLUGIN_SLUG.zip" "$PLUGIN_SLUG"
cd ..

rm -rf "$BUILD_DIR"

ZIP_SIZE=$(du -h "$DIST_DIR/$PLUGIN_SLUG.zip" | cut -f1)

echo ""
echo "✅ Build complete!"
echo "   📦 $DIST_DIR/$PLUGIN_SLUG.zip ($ZIP_SIZE)"
echo ""
echo "Upload to WordPress via Plugins → Add New → Upload Plugin"
