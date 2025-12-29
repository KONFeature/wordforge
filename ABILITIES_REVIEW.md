# WordForge Abilities Review & Improvement Recommendations

## Executive Summary

This document reviews all 33 abilities across 8 categories in WordForge and provides recommendations for improving input/output schemas and descriptions to provide cleaner, more actionable information for LLM agents.

## Current State Analysis

### Strengths
✅ **Consistent Base Architecture**: All abilities extend `AbstractAbility` with standardized methods
✅ **Clear Categorization**: Abilities organized into 8 logical categories
✅ **Permission System**: Proper capability checks for WordPress security
✅ **Metadata Annotations**: Read-only, destructive, and idempotent flags for MCP clients
✅ **Standard Response Format**: Consistent success/error response structure

### Areas for Improvement

#### 1. **Inconsistent Input Schema Descriptions**

**Problem**: Many input properties lack detailed descriptions that help LLMs understand:
- Expected formats and examples
- When to use specific fields
- Relationships between fields
- Valid value ranges beyond just enums

**Examples of Issues**:

```php
// ❌ CreateProduct.php - Missing descriptions
'name' => [
    'type' => 'string',
    // NO description!
],
'regular_price' => [
    'type' => 'string',
    // NO description, format unclear
],
'dimensions' => [
    'type' => 'object',
    // NO description of what units to use
],
```

```php
// ❌ ListContent.php - Minimal context
'orderby' => [
    'type' => 'string',
    'description' => 'Field to order by.',
    'enum' => [ 'date', 'title', 'modified', 'menu_order', 'id' ],
    'default' => 'date',
],
// Better: "Sort results by a specific field. Use 'date' for newest first, 'modified' for recently updated, 'title' for alphabetical, 'menu_order' for custom page ordering, or 'id' for creation order."
```

#### 2. **Output Schema Documentation Gaps**

**Problem**: Many abilities override `get_output_schema()` or rely on the default, but don't provide clear documentation of what data structure is actually returned.

**Examples**:

```php
// ListContent returns complex pagination structure
return $this->success( [
    'items'       => $items,
    'total'       => $query->found_posts,
    'total_pages' => $query->max_num_pages,
    'page'        => $query_args['paged'],
    'per_page'    => $query_args['posts_per_page'],
] );
```

**Recommendation**: Override `get_output_schema()` to document the actual data structure:

```php
public function get_output_schema(): array {
    return [
        'type' => 'object',
        'properties' => [
            'success' => [ 'type' => 'boolean' ],
            'data' => [
                'type' => 'object',
                'properties' => [
                    'items' => [
                        'type' => 'array',
                        'description' => 'Array of content items matching the query.',
                        'items' => [ /* post schema */ ],
                    ],
                    'total' => [
                        'type' => 'integer',
                        'description' => 'Total number of items matching the query (across all pages).',
                    ],
                    'total_pages' => [
                        'type' => 'integer',
                        'description' => 'Total number of pages available.',
                    ],
                    'page' => [
                        'type' => 'integer',
                        'description' => 'Current page number.',
                    ],
                    'per_page' => [
                        'type' => 'integer',
                        'description' => 'Number of items per page.',
                    ],
                ],
            ],
        ],
    ];
}
```

#### 3. **Ability-Level Descriptions Too Generic**

**Problem**: Top-level ability descriptions are functional but don't provide enough context for when/why to use them.

**Current Examples**:
- ❌ "Create a new post, page, or custom post type." - Generic
- ❌ "Upload media to the library from a URL or base64 encoded data." - Technical but not contextual

**Recommended Improvements**:
- ✅ "Create new WordPress content including blog posts, pages, and custom post types. Supports full content formatting with HTML/Gutenberg blocks, taxonomy assignment, featured images, and custom fields. Use this when you need to publish or draft new content."
- ✅ "Upload images, documents, videos, and other media files to the WordPress media library. Accepts either a URL to download from or base64-encoded file data. Automatically generates image metadata and thumbnails. Use this before setting featured images or inserting media into content."

#### 4. **Missing Field Context & Examples**

**Problem**: Input schemas don't provide enough context about:
- Expected formats (especially for strings that represent specific data types)
- Example values
- Common use cases
- Field interdependencies

**Examples**:

```php
// ❌ Current - UploadMedia
'filename' => [
    'type' => 'string',
    'description' => 'Desired filename for the uploaded media.',
],

// ✅ Improved
'filename' => [
    'type' => 'string',
    'description' => 'Desired filename for the uploaded media. Must include file extension (e.g., "image.jpg", "document.pdf"). WordPress will sanitize and may modify the filename to ensure uniqueness.',
    'pattern' => '^[^/\\\\]+\\.[a-zA-Z0-9]+$',
],
```

```php
// ❌ Current - CreateContent
'content' => [
    'type' => 'string',
    'description' => 'The content body (supports HTML and Gutenberg blocks).',
    'default' => '',
],

// ✅ Improved
'content' => [
    'type' => 'string',
    'description' => 'The main content body. Supports both HTML markup and Gutenberg block editor syntax (HTML comments). For rich formatting, use block syntax like <!-- wp:paragraph --><p>Content</p><!-- /wp:paragraph -->. Can be left empty to create a placeholder.',
    'default' => '',
],
```

#### 5. **Enum Values Need Better Context**

**Problem**: Enum fields show valid values but don't explain what each option does.

```php
// ❌ Current - CreateContent
'status' => [
    'type' => 'string',
    'description' => 'The post status.',
    'enum' => [ 'publish', 'draft', 'pending', 'private' ],
    'default' => 'draft',
],

// ✅ Improved
'status' => [
    'type' => 'string',
    'description' => 'Publication status: "publish" (publicly visible), "draft" (saved but not published), "pending" (awaiting review), "private" (visible only to logged-in users with permission). Defaults to "draft" for safety.',
    'enum' => [ 'publish', 'draft', 'pending', 'private' ],
    'default' => 'draft',
],
```

#### 6. **Missing Validation Constraints**

**Problem**: Many fields that should have validation constraints (min/max, patterns) don't specify them.

**Examples**:

```php
// ❌ Current - CreateTerm
'name' => [
    'type' => 'string',
    'description' => 'Term name.',
],

// ✅ Improved
'name' => [
    'type' => 'string',
    'description' => 'Term name (e.g., "Technology", "News"). This is the human-readable label displayed in the admin and frontend.',
    'minLength' => 1,
    'maxLength' => 200,
],
```

```php
// ❌ Current - CreateProduct (WooCommerce)
'regular_price' => [
    'type' => 'string',
],

// ✅ Improved
'regular_price' => [
    'type' => 'string',
    'description' => 'Product regular price in store currency (e.g., "19.99"). Use decimal format without currency symbols. Required for most product types.',
    'pattern' => '^\\d+(\\.\\d{1,2})?$',
],
```

## Specific Recommendations by Ability Category

### 1. Content Abilities (5 abilities)

**Priority: HIGH** - These are core abilities that LLMs will use frequently.

#### CreateContent
- ✅ Already well-documented
- 🔧 Add examples for `content` field showing both HTML and Gutenberg block syntax
- 🔧 Clarify `categories` and `tags` can accept IDs or slugs
- 🔧 Add note about `slug` auto-generation from title
- 🔧 Document `meta` field key naming conventions

#### ListContent
- 🔧 Add examples for common queries (e.g., "Get latest 10 published posts")
- 🔧 Explain relationship between `per_page` and `page` for pagination
- 🔧 Add detailed output schema documenting the pagination structure
- 🔧 Clarify what `status: 'any'` includes

#### GetContent
- 🔧 Document what fields are returned in the post object
- 🔧 Clarify error behavior when content not found
- 🔧 Add output schema showing the complete post structure

#### UpdateContent
- 🔧 Clarify which fields are merged vs replaced
- 🔧 Document behavior when omitting optional fields (are they left unchanged or cleared?)
- 🔧 Add examples of partial updates

#### DeleteContent
- 🔧 Add `force_delete` parameter to distinguish between trash and permanent deletion
- 🔧 Document what happens to associated data (comments, meta, revisions)
- 🔧 Clarify permission requirements

### 2. Media Abilities (5 abilities)

**Priority: HIGH** - File handling needs clear documentation.

#### UploadMedia
- 🔧 Add maximum file size constraints
- 🔧 Document supported MIME types
- 🔧 Add examples for both URL and base64 upload methods
- 🔧 Clarify `base64` format (with/without data URI prefix)
- 🔧 Document auto-generation of image sizes/thumbnails
- 🔧 Add validation patterns for filename

#### ListMedia
- 🔧 Add filtering by MIME type parameter
- 🔧 Document output schema with full media object structure
- 🔧 Add date range filtering

#### GetMedia
- 🔧 Document complete media object structure including metadata
- 🔧 Include image size URLs in output schema

#### UpdateMedia
- 🔧 Document which fields are editable vs immutable
- 🔧 Add examples for SEO optimization (alt text, captions)

#### DeleteMedia
- 🔧 Clarify behavior when media is attached to posts
- 🔧 Add `force` parameter for permanent deletion
- 🔧 Document file system cleanup behavior

### 3. Taxonomy Abilities (4 abilities)

**Priority: MEDIUM** - Important for content organization.

#### ListTerms
- 🔧 Add `include_count` parameter to show post counts
- 🔧 Document hierarchical structure in output
- 🔧 Add filtering by parent term

#### CreateTerm
- 🔧 Add length constraints for `name` and `slug`
- 🔧 Document hierarchical taxonomy handling
- 🔧 Clarify slug auto-generation behavior
- 🔧 Add examples for common taxonomies (category, tag, product_cat)

#### UpdateTerm
- 🔧 Document which fields can be updated
- 🔧 Clarify behavior when updating slug (URL implications)
- 🔧 Add warning about changing parent in hierarchical taxonomies

#### DeleteTerm
- 🔧 Add parameter for re-assigning posts to another term
- 🔧 Document behavior with child terms
- 🔧 Clarify what happens to posts using this term

### 4. Block & Style Abilities (5 abilities)

**Priority: MEDIUM** - FSE-specific, growing importance.

#### GetPageBlocks
- 🔧 Document block structure format in output schema
- 🔧 Add examples of common block types
- 🔧 Clarify nested block structure

#### UpdatePageBlocks
- 🔧 Add detailed examples of block syntax
- 🔧 Document revision management behavior
- 🔧 Add validation for block structure

#### GetGlobalStyles
- 🔧 Document theme.json structure in output
- 🔧 Add examples of common style paths

#### UpdateGlobalStyles
- 🔧 Document allowed style properties
- 🔧 Add validation for color formats (hex, rgb, css vars)
- 🔧 Clarify how changes affect frontend

#### GetBlockStyles
- 🔧 Document structure of block style variations
- 🔧 Add filtering by block type

### 5. Template Abilities (3 abilities)

**Priority: LOW-MEDIUM** - FSE-specific, advanced use case.

#### ListTemplates
- 🔧 Add filtering by template type (header, footer, single, archive, etc.)
- 🔧 Document template hierarchy
- 🔧 Clarify theme vs user templates

#### GetTemplate
- 🔧 Document complete template object structure
- 🔧 Include block composition in schema

#### UpdateTemplate
- 🔧 Add validation for template structure
- 🔧 Document required blocks for specific template types
- 🔧 Clarify when changes affect live site

### 6. WooCommerce Abilities (5 abilities)

**Priority: MEDIUM-HIGH** - Complex data structures, needs clear docs.

#### CreateProduct
- ⚠️ **CRITICAL**: Many fields missing descriptions entirely
- 🔧 Add descriptions for ALL input properties
- 🔧 Document relationship between `type` and required/available fields
- 🔧 Add validation patterns for price fields
- 🔧 Document units for weight/dimensions
- 🔧 Clarify boolean field defaults
- 🔧 Add examples for each product type

#### ListProducts
- 🔧 Add filtering by price range, stock status, product type
- 🔧 Document pagination structure
- 🔧 Add sorting by price, sales, rating

#### GetProduct
- 🔧 Document complete product object structure
- 🔧 Include variations for variable products
- 🔧 Add metadata in output schema

#### UpdateProduct
- 🔧 Document which fields can be updated per product type
- 🔧 Clarify partial update behavior
- 🔧 Add examples for common update scenarios

#### DeleteProduct
- 🔧 Add `force` parameter for permanent deletion
- 🔧 Document behavior with product variations
- 🔧 Clarify order history handling

## Detailed Improvement Examples

### Example 1: CreateContent Ability - Enhanced Version

```php
public function get_description(): string {
    return __(
        'Create new WordPress content including blog posts, pages, and custom post types. ' .
        'Supports full content formatting with HTML and Gutenberg blocks, taxonomy assignment ' .
        '(categories/tags), featured images, author attribution, and custom fields. ' .
        'New content defaults to "draft" status for safety. Use this ability when you need ' .
        'to publish new articles, pages, or custom content types.',
        'wordforge'
    );
}

public function get_input_schema(): array {
    return [
        'type' => 'object',
        'required' => [ 'title' ],
        'properties' => [
            'title' => [
                'type' => 'string',
                'description' => 'Content title displayed as the main heading. Will be used to auto-generate the slug if not provided.',
                'minLength' => 1,
                'maxLength' => 255,
            ],
            'content' => [
                'type' => 'string',
                'description' => 'Main content body supporting both HTML markup and Gutenberg block syntax. ' .
                                 'For blocks, use HTML comment syntax: <!-- wp:paragraph --><p>Text</p><!-- /wp:paragraph -->. ' .
                                 'Can be empty to create a placeholder draft.',
                'default' => '',
            ],
            'excerpt' => [
                'type' => 'string',
                'description' => 'Short summary or teaser text shown in archives and search results. Auto-generated from content if not provided.',
                'maxLength' => 500,
            ],
            'post_type' => [
                'type' => 'string',
                'description' => 'Content type: "post" for blog posts, "page" for static pages, or any registered custom post type slug. ' .
                                 'Different post types may have different capabilities and features.',
                'default' => 'post',
            ],
            'status' => [
                'type' => 'string',
                'description' => 'Publication status: "publish" (immediately live and visible to all), ' .
                                 '"draft" (saved privately for editing), "pending" (awaiting editorial review), ' .
                                 '"private" (published but only visible to users with read_private_posts capability). ' .
                                 'Defaults to "draft" for safety.',
                'enum' => [ 'publish', 'draft', 'pending', 'private' ],
                'default' => 'draft',
            ],
            'slug' => [
                'type' => 'string',
                'description' => 'URL-friendly slug used in the permalink (e.g., "my-post" in /my-post/). ' .
                                 'Auto-generated from title if omitted. Use lowercase letters, numbers, and hyphens only.',
                'pattern' => '^[a-z0-9-]+$',
                'maxLength' => 200,
            ],
            'author' => [
                'type' => 'integer',
                'description' => 'WordPress user ID to attribute as content author. Must have appropriate publishing capabilities. ' .
                                 'Defaults to current user if not specified.',
                'minimum' => 1,
            ],
            'parent' => [
                'type' => 'integer',
                'description' => 'Parent content ID for hierarchical post types (e.g., pages). ' .
                                 'Creates a hierarchy visible in navigation and breadcrumbs. Only applicable to hierarchical types.',
                'minimum' => 0,
            ],
            'menu_order' => [
                'type' => 'integer',
                'description' => 'Numeric position for manual sorting (lower numbers appear first). ' .
                                 'Primarily used for pages in navigation menus. 0 means no specific order.',
                'default' => 0,
            ],
            'featured_image' => [
                'type' => 'integer',
                'description' => 'Media attachment ID to use as the featured/thumbnail image. ' .
                                 'Upload media first using the upload-media ability to get an ID. ' .
                                 'Displayed prominently in archives and at the top of single content views.',
                'minimum' => 1,
            ],
            'categories' => [
                'type' => 'array',
                'description' => 'Category assignments for posts. Can provide category IDs (integers) or slugs (strings). ' .
                                 'Creates hierarchical organization. Only applicable to posts and post types supporting categories.',
                'items' => [
                    'oneOf' => [
                        [
                            'type' => 'integer',
                            'description' => 'Category term ID',
                            'minimum' => 1,
                        ],
                        [
                            'type' => 'string',
                            'description' => 'Category slug (e.g., "technology", "news")',
                            'pattern' => '^[a-z0-9-]+$',
                        ],
                    ],
                ],
            ],
            'tags' => [
                'type' => 'array',
                'description' => 'Tag assignments for posts. Provide tag names or slugs as strings. ' .
                                 'Tags are created automatically if they don\'t exist. Used for non-hierarchical content classification.',
                'items' => [
                    'type' => 'string',
                    'description' => 'Tag name or slug',
                    'minLength' => 1,
                    'maxLength' => 200,
                ],
            ],
            'meta' => [
                'type' => 'object',
                'description' => 'Custom field key-value pairs for storing additional metadata. ' .
                                 'Keys should be prefixed to avoid conflicts (e.g., "my_plugin_field"). ' .
                                 'Values can be strings, numbers, booleans, or nested objects/arrays.',
                'additionalProperties' => true,
            ],
        ],
    ];
}

public function get_output_schema(): array {
    return [
        'type' => 'object',
        'properties' => [
            'success' => [
                'type' => 'boolean',
                'description' => 'Whether the content was created successfully.',
            ],
            'data' => [
                'type' => 'object',
                'description' => 'Created content details.',
                'properties' => [
                    'id' => [
                        'type' => 'integer',
                        'description' => 'Unique post ID for the created content.',
                    ],
                    'title' => [
                        'type' => 'string',
                        'description' => 'Content title.',
                    ],
                    'slug' => [
                        'type' => 'string',
                        'description' => 'URL slug (generated or provided).',
                    ],
                    'status' => [
                        'type' => 'string',
                        'description' => 'Current publication status.',
                    ],
                    'type' => [
                        'type' => 'string',
                        'description' => 'Post type.',
                    ],
                    'permalink' => [
                        'type' => 'string',
                        'description' => 'Full URL to view the content on the frontend.',
                    ],
                    'author' => [
                        'type' => 'integer',
                        'description' => 'Author user ID.',
                    ],
                    'date' => [
                        'type' => 'string',
                        'description' => 'Publication date in site timezone (YYYY-MM-DD HH:MM:SS).',
                    ],
                    'featured_image' => [
                        'type' => [ 'integer', 'null' ],
                        'description' => 'Featured image attachment ID, or null if none set.',
                    ],
                ],
            ],
            'message' => [
                'type' => 'string',
                'description' => 'Human-readable success message.',
            ],
        ],
        'required' => [ 'success', 'data' ],
    ];
}
```

### Example 2: UploadMedia Ability - Enhanced Version

```php
public function get_description(): string {
    return __(
        'Upload media files (images, documents, videos, audio) to the WordPress media library. ' .
        'Accepts files either by URL (automatically downloaded) or base64-encoded data. ' .
        'Supports common formats: JPEG, PNG, GIF, WebP, PDF, MP4, MP3, etc. ' .
        'Automatically generates image thumbnails and metadata. ' .
        'Maximum file size: ' . wp_max_upload_size() / 1048576 . 'MB. ' .
        'Use this before setting featured images or inserting media into content.',
        'wordforge'
    );
}

public function get_input_schema(): array {
    $max_upload_mb = wp_max_upload_size() / 1048576;

    return [
        'type' => 'object',
        'required' => [ 'filename' ],
        'properties' => [
            'url' => [
                'type' => 'string',
                'format' => 'uri',
                'description' => 'URL to download the file from. WordPress will fetch and upload the file. ' .
                                 'Must be publicly accessible. Provide either "url" OR "base64", not both.',
                'pattern' => '^https?://',
            ],
            'base64' => [
                'type' => 'string',
                'description' => 'Base64-encoded file content. Provide the encoded data WITHOUT the data URI prefix ' .
                                 '(e.g., just "iVBORw0KGgo..." not "data:image/png;base64,iVBORw0KGgo..."). ' .
                                 'Provide either "url" OR "base64", not both.',
            ],
            'filename' => [
                'type' => 'string',
                'description' => 'Desired filename including extension (e.g., "photo.jpg", "document.pdf"). ' .
                                 'Must include a valid file extension. WordPress will sanitize the name and ' .
                                 'add numbers if a file with this name already exists (e.g., photo-1.jpg).',
                'pattern' => '^[^/\\\\?%*:|"<>]+\\.[a-zA-Z0-9]+$',
                'minLength' => 5,
                'maxLength' => 255,
            ],
            'title' => [
                'type' => 'string',
                'description' => 'Human-readable media title shown in the media library. ' .
                                 'Auto-generated from filename if not provided (e.g., "My Photo" from "my-photo.jpg").',
                'maxLength' => 200,
            ],
            'alt' => [
                'type' => 'string',
                'description' => 'Alternative text for images (CRITICAL for SEO and accessibility). ' .
                                 'Describes the image content for screen readers and search engines. ' .
                                 'Example: "Golden retriever playing in a park" not "image001.jpg". ' .
                                 'Strongly recommended for all images.',
                'maxLength' => 500,
            ],
            'caption' => [
                'type' => 'string',
                'description' => 'Image caption displayed below the image when inserted into content. ' .
                                 'Typically used for photo credits or brief context.',
                'maxLength' => 500,
            ],
            'description' => [
                'type' => 'string',
                'description' => 'Longer description of the media file. Visible in media library and can be ' .
                                 'used by themes/plugins for additional context.',
                'maxLength' => 2000,
            ],
            'parent_id' => [
                'type' => 'integer',
                'description' => 'Post or page ID to attach this media to. Creates a parent-child relationship ' .
                                 'useful for organizing media by the content it belongs to. Optional.',
                'minimum' => 1,
            ],
        ],
        'oneOf' => [
            { 'required' => [ 'url', 'filename' ] },
            { 'required' => [ 'base64', 'filename' ] },
        ],
    ];
}
```

### Example 3: ListContent Ability - Enhanced Output Schema

```php
public function get_output_schema(): array {
    return [
        'type' => 'object',
        'properties' => [
            'success' => [
                'type' => 'boolean',
                'description' => 'Whether the query executed successfully.',
            ],
            'data' => [
                'type' => 'object',
                'description' => 'Query results with pagination metadata.',
                'properties' => [
                    'items' => [
                        'type' => 'array',
                        'description' => 'Array of content items matching the query filters. Empty array if no matches.',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'id' => [ 'type' => 'integer', 'description' => 'Unique post ID' ],
                                'title' => [ 'type' => 'string', 'description' => 'Content title' ],
                                'slug' => [ 'type' => 'string', 'description' => 'URL slug' ],
                                'status' => [ 'type' => 'string', 'description' => 'Publication status' ],
                                'type' => [ 'type' => 'string', 'description' => 'Post type' ],
                                'content' => [ 'type' => 'string', 'description' => 'Full content body' ],
                                'excerpt' => [ 'type' => 'string', 'description' => 'Content excerpt' ],
                                'author' => [ 'type' => 'integer', 'description' => 'Author user ID' ],
                                'date' => [ 'type' => 'string', 'description' => 'Publication date (YYYY-MM-DD HH:MM:SS)' ],
                                'modified' => [ 'type' => 'string', 'description' => 'Last modified date (YYYY-MM-DD HH:MM:SS)' ],
                                'permalink' => [ 'type' => 'string', 'description' => 'Full URL to view content' ],
                                'featured_image' => [
                                    'type' => [ 'integer', 'null' ],
                                    'description' => 'Featured image attachment ID or null'
                                ],
                            ],
                        ],
                    ],
                    'total' => [
                        'type' => 'integer',
                        'description' => 'Total number of items matching the query across all pages. ' .
                                         'Use this with per_page to calculate total pages.',
                    ],
                    'total_pages' => [
                        'type' => 'integer',
                        'description' => 'Total number of pages available based on per_page setting. ' .
                                         'If this is greater than "page", more results are available.',
                    ],
                    'page' => [
                        'type' => 'integer',
                        'description' => 'Current page number (1-indexed).',
                    ],
                    'per_page' => [
                        'type' => 'integer',
                        'description' => 'Number of items per page (max 100).',
                    ],
                ],
                'required' => [ 'items', 'total', 'total_pages', 'page', 'per_page' ],
            ],
        ],
        'required' => [ 'success', 'data' ],
    ];
}
```

## Implementation Priority

### Phase 1: Critical (Complete First)
1. **WooCommerce CreateProduct** - Missing many descriptions
2. **Media Abilities** - File handling needs clear constraints
3. **Content Abilities** - Most frequently used

### Phase 2: High Priority
4. **Taxonomy Abilities** - Content organization
5. **Block/Style Abilities** - Growing importance with FSE

### Phase 3: Medium Priority
6. **Template Abilities** - Advanced FSE users
7. **Prompt Abilities** - Review separately (different structure)

## General Guidelines for All Abilities

### Input Schema Best Practices

1. **Every property must have a description** that includes:
   - What the field does
   - Valid format/examples
   - Default behavior if omitted
   - Relationship to other fields

2. **Add validation constraints** where applicable:
   - `minLength`, `maxLength` for strings
   - `minimum`, `maximum` for numbers
   - `pattern` for formatted strings (URLs, slugs, prices)
   - `minItems`, `maxItems` for arrays

3. **Document defaults clearly**:
   - Use `default` property in schema
   - Mention in description what happens if omitted

4. **Explain enums**:
   - Don't just list options, explain what each does
   - Include use cases

5. **Clarify field dependencies**:
   - Use `oneOf`, `anyOf`, `allOf` for complex requirements
   - Mention in descriptions when fields are related

### Output Schema Best Practices

1. **Override `get_output_schema()` when returning complex structures**
   - Don't rely on generic base class schema
   - Document actual data structure returned

2. **Document all data properties**:
   - Type and description for each field
   - Note nullable fields
   - Explain nested structures

3. **Include pagination metadata** in list queries:
   - `total`, `total_pages`, `page`, `per_page`
   - Explain how to navigate pages

4. **Consistent error structure**:
   - Keep using base class error format
   - Document common error codes per ability

### Description Best Practices

1. **Ability-level descriptions should include**:
   - What the ability does
   - Key features/capabilities
   - When/why to use it
   - Important limitations
   - Related abilities

2. **Use examples** liberally:
   - Show common values
   - Demonstrate usage patterns
   - Clarify complex concepts

3. **Think like an LLM**:
   - Provide context, not just technical specs
   - Explain relationships and workflows
   - Anticipate common questions

4. **Be specific and concrete**:
   - "Maximum file size: 10MB" not "reasonable size"
   - "Use lowercase letters, numbers, and hyphens" not "URL-friendly"
   - "YYYY-MM-DD format" not "date string"

## Testing Recommendations

After implementing improvements:

1. **Test with Claude/GPT-4** - Ask LLM to use abilities and see if it:
   - Understands what each ability does
   - Provides correct input values
   - Handles errors appropriately

2. **Review MCP Tool Listings** - Check how abilities appear in Claude Desktop:
   - Are descriptions helpful?
   - Are required fields clear?
   - Do enum values make sense?

3. **Real-World Scenarios** - Test common workflows:
   - "Create a blog post with featured image"
   - "Upload and attach media to a post"
   - "List products by category"

## Next Steps

1. Review this document with the team
2. Prioritize which abilities to improve first
3. Create updated versions of ability files
4. Test with MCP tools/list and actual LLM agents
5. Iterate based on real-world usage
6. Document any new patterns/standards discovered

---

**Document Version**: 1.0
**Date**: 2025-12-28
**Reviewer**: Claude (Sonnet 4.5)
