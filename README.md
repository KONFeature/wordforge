# WordForge

**Forge your WordPress site through conversation.**

WordForge extends the [WordPress MCP Adapter](https://github.com/WordPress/mcp-adapter) with powerful abilities for content management, WooCommerce, Gutenberg blocks, and theme styling — all controllable via AI through the Model Context Protocol.

## Features

### Content Management
- **List, create, update, delete** posts, pages, and custom post types
- Full support for taxonomies, meta fields, and featured images
- Pagination and filtering built-in

### Media Library
- **List, upload, update, delete** media files
- Update alt text, captions, and descriptions (critical for SEO)
- Support for URL and base64 uploads

### Taxonomy Management
- **List, create, update, delete** terms for any taxonomy
- Categories, tags, and custom taxonomies
- Hierarchical taxonomy support

### Gutenberg Blocks
- **Get and update** page block structures
- Auto-create revisions before changes
- Parse blocks in full or simplified format

### Templates (FSE)
- **List and update** block templates
- Template parts management (headers, footers)
- Full Site Editing compatible

### Theme Styling
- **Global styles** (theme.json) - colors, typography, spacing
- **Block styles** - view registered block variations
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

### Claude Desktop Extension

Download `wordforge.mcpb` from the latest release and double-click to install in Claude Desktop.

### Standalone MCP Server (Other LLM Agents)

For non-Claude MCP clients, download `wordforge-server.js` from the latest release:

```bash
# Run with Node.js 18+
WORDPRESS_URL="https://yoursite.com/wp-json/wp-abilities/v1" \
WORDPRESS_USERNAME="your-username" \
WORDPRESS_APP_PASSWORD="your-app-password" \
node wordforge-server.js
```

Optional environment variables:
- `WORDFORGE_EXCLUDE_CATEGORIES` - Comma-separated categories to exclude (e.g., `woocommerce,prompts`)
- `WORDFORGE_DEBUG` - Set to `true` for verbose logging

## Available MCP Tools

### Content
| Tool | Description |
|------|-------------|
| `wordforge/list-content` | List posts, pages, or custom post types |
| `wordforge/get-content` | Get a single content item by ID or slug |
| `wordforge/save-content` | Create or update content |
| `wordforge/delete-content` | Delete or trash content |

### Media
| Tool | Description |
|------|-------------|
| `wordforge/list-media` | List media library items with filtering |
| `wordforge/get-media` | Get media details including all sizes |
| `wordforge/upload-media` | Upload media from URL or base64 |
| `wordforge/update-media` | Update alt text, title, caption |
| `wordforge/delete-media` | Delete a media item |

### Taxonomy
| Tool | Description |
|------|-------------|
| `wordforge/list-terms` | List terms for any taxonomy |
| `wordforge/save-term` | Create or update a term |
| `wordforge/delete-term` | Delete a term |

### Blocks & Templates
| Tool | Description |
|------|-------------|
| `wordforge/get-page-blocks` | Get Gutenberg blocks of a page |
| `wordforge/update-page-blocks` | Update page blocks (auto-revision) |
| `wordforge/list-templates` | List block templates (FSE) |
| `wordforge/get-template` | Get template with blocks |
| `wordforge/update-template` | Update template content |

### Styles
| Tool | Description |
|------|-------------|
| `wordforge/get-global-styles` | Get theme.json global styles |
| `wordforge/update-global-styles` | Update global styles |
| `wordforge/get-block-styles` | Get registered block styles |

### WooCommerce*
| Tool | Description |
|------|-------------|
| `wordforge/list-products` | List products |
| `wordforge/get-product` | Get product details |
| `wordforge/save-product` | Create or update a product |
| `wordforge/delete-product` | Delete a product |

*WooCommerce tools only available when WooCommerce is active.

### AI Prompts
| Prompt | Description |
|--------|-------------|
| `wordforge/generate-content` | Generate blog posts, pages with SEO |
| `wordforge/review-content` | Review and improve existing content |
| `wordforge/seo-optimization` | Analyze content for SEO optimization |

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

### Save a Page
```json
{
  "tool": "wordforge/save-content",
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

### Save a WooCommerce Product
```json
{
  "tool": "wordforge/save-product",
  "arguments": {
    "name": "Awesome T-Shirt",
    "type": "simple",
    "regular_price": "29.99",
    "description": "A comfortable cotton t-shirt",
    "categories": ["clothing", "t-shirts"],
    "stock_status": "instock"
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
    ├── Media/              → Media library management
    ├── Taxonomy/           → Categories, tags, custom taxonomies
    ├── Blocks/             → Gutenberg operations
    ├── Templates/          → FSE templates management
    ├── Styles/             → Theme styling
    ├── Prompts/            → AI prompt templates
    └── WooCommerce/        → Product management
```

Each ability defines:
- `get_title()` / `get_description()` — Metadata for MCP
- `get_input_schema()` — JSON Schema for parameters
- `get_capability()` — Required WordPress capability
- `execute()` — The actual operation

## License

GPL-2.0-or-later

