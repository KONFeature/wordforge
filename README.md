# WordForge

**Forge your WordPress site through conversation.**

WordForge extends the [WordPress MCP Adapter](https://github.com/WordPress/mcp-adapter) with powerful abilities for content management, WooCommerce, Gutenberg blocks, and theme styling — all controllable via AI through the Model Context Protocol.

## Features

### Content Management
- **List, create, update, delete** posts, pages, and custom post types
- Full support for taxonomies, meta fields, and featured images
- Pagination and filtering built-in

### Gutenberg Blocks
- **Get and update** page block structures
- **Create revisions** before making changes
- Parse blocks in full or simplified format

### Theme Styling
- **Global styles** (theme.json) - colors, typography, spacing
- **Block styles** - register and manage custom block variations
- Full Site Editing compatible

### WooCommerce (Optional)
- **Product CRUD** - simple, variable, grouped, external products
- Stock management, pricing, categories, tags
- Automatically detected — abilities only register when WooCommerce is active

## Requirements

- PHP 8.0+
- WordPress 6.4+
- [WordPress MCP Adapter](https://github.com/WordPress/mcp-adapter) plugin

## Installation

### Via Composer (Recommended)

```bash
composer require flavor-studio/wordforge
```

### Manual Installation

1. Download the latest release zip
2. Upload to `/wp-content/plugins/wordforge/`
3. Activate the plugin in WordPress admin
4. Ensure the MCP Adapter plugin is also active

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `wordforge/list-content` | List posts, pages, or custom post types |
| `wordforge/get-content` | Get a single content item by ID or slug |
| `wordforge/create-content` | Create new content |
| `wordforge/update-content` | Update existing content |
| `wordforge/delete-content` | Delete or trash content |
| `wordforge/get-page-blocks` | Get Gutenberg blocks of a page |
| `wordforge/update-page-blocks` | Update page blocks |
| `wordforge/create-revision` | Create a revision before changes |
| `wordforge/get-global-styles` | Get theme.json global styles |
| `wordforge/update-global-styles` | Update global styles |
| `wordforge/get-block-styles` | Get registered block styles |
| `wordforge/update-block-styles` | Register custom block styles |
| `wordforge/list-products` | List WooCommerce products* |
| `wordforge/get-product` | Get product details* |
| `wordforge/create-product` | Create a product* |
| `wordforge/update-product` | Update a product* |
| `wordforge/delete-product` | Delete a product* |

*WooCommerce tools only available when WooCommerce is active.

## Usage Examples

### List Recent Posts
```json
{
  "tool": "wordforge/list-content",
  "arguments": {
    "post_type": "post",
    "status": "publish",
    "per_page": 10,
    "orderby": "date",
    "order": "desc"
  }
}
```

### Create a New Page
```json
{
  "tool": "wordforge/create-content",
  "arguments": {
    "title": "About Us",
    "content": "<!-- wp:paragraph --><p>Welcome to our site!</p><!-- /wp:paragraph -->",
    "post_type": "page",
    "status": "draft"
  }
}
```

### Update Global Styles
```json
{
  "tool": "wordforge/update-global-styles",
  "arguments": {
    "styles": {
      "color": {
        "background": "#ffffff",
        "text": "#1a1a1a"
      },
      "typography": {
        "fontFamily": "Inter, sans-serif"
      }
    },
    "merge": true
  }
}
```

### Create a WooCommerce Product
```json
{
  "tool": "wordforge/create-product",
  "arguments": {
    "name": "Awesome T-Shirt",
    "type": "simple",
    "regular_price": "29.99",
    "description": "A comfortable cotton t-shirt",
    "categories": ["clothing", "t-shirts"],
    "stock_status": "instock",
    "stock_quantity": 100
  }
}
```

## Development

### Local Environment

```bash
# Install dependencies
npm install
composer install

# Start WordPress environment
npm run start

# Stop environment
npm run stop
```

WordPress will be available at `http://localhost:8888` (admin: `admin` / `password`)

### Build for Distribution

```bash
# Create distributable zip
./build.sh
```

This creates `wordforge.zip` ready for upload to any WordPress site.

### Linting

```bash
npm run lint:php
```

## Configuration

Visit **Settings → WordForge** in WordPress admin to:
- View registered abilities
- Check WooCommerce integration status
- See MCP connection information

## Architecture

WordForge follows the WordPress MCP Adapter's ability pattern:

```
wordforge.php              → Plugin bootstrap
includes/
├── AbilityRegistry.php    → Registers all abilities with MCP
└── Abilities/
    ├── AbstractAbility.php → Base class with helpers
    ├── Content/            → Post/page CRUD
    ├── Blocks/             → Gutenberg operations
    ├── Styles/             → Theme styling
    └── WooCommerce/        → Product management
```

Each ability defines:
- `get_title()` / `get_description()` — Metadata for MCP
- `get_input_schema()` — JSON Schema for parameters
- `get_capability()` — Required WordPress capability
- `execute()` — The actual operation

## License

GPL-2.0-or-later

