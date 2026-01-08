<?php
/**
 * Block Serializer Trait - Shared block handling for Gutenberg abilities.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Traits;

/**
 * Provides common block schema, validation, and serialization for block abilities.
 *
 * Usage:
 * - Call get_blocks_input_schema() in get_input_schema() for the blocks property
 * - Call validate_blocks() in execute() before processing blocks
 * - Call blocks_to_content() to convert flat blocks to WordPress block markup
 */
trait BlockSerializerTrait {

	/**
	 * Wrapper HTML templates for common container blocks.
	 * {classes} = generated CSS classes, {styles} = inline styles, {children} = child content.
	 *
	 * @var array<string, string>
	 */
	private static array $container_wrappers = array(
		// Layout blocks.
		'core/group'      => '<div class="wp-block-group{classes}"{styles}>{children}</div>',
		'core/columns'    => '<div class="wp-block-columns{classes}"{styles}>{children}</div>',
		'core/column'     => '<div class="wp-block-column{classes}"{styles}>{children}</div>',
		'core/row'        => '<div class="wp-block-row{classes}"{styles}>{children}</div>',
		'core/stack'      => '<div class="wp-block-stack{classes}"{styles}>{children}</div>',
		'core/grid'       => '<div class="wp-block-grid{classes}"{styles}>{children}</div>',

		// Content containers.
		'core/cover'      => '<div class="wp-block-cover{classes}"{styles}><span aria-hidden="true" class="wp-block-cover__background{bg_classes}"></span><div class="wp-block-cover__inner-container">{children}</div></div>',
		'core/media-text' => '<div class="wp-block-media-text{classes}"{styles}><figure class="wp-block-media-text__media"></figure><div class="wp-block-media-text__content">{children}</div></div>',

		// Interactive blocks.
		'core/buttons'    => '<div class="wp-block-buttons{classes}"{styles}>{children}</div>',
		'core/details'    => '<details class="wp-block-details{classes}"{styles}><summary>Details</summary>{children}</details>',

		// Text containers.
		'core/quote'      => '<blockquote class="wp-block-quote{classes}"{styles}>{children}</blockquote>',
		'core/pullquote'  => '<figure class="wp-block-pullquote{classes}"{styles}><blockquote>{children}</blockquote></figure>',
		'core/list'       => '<ul class="wp-block-list{classes}"{styles}>{children}</ul>',
		'core/list-item'  => '<li>{children}</li>',

		// Navigation.
		'core/navigation' => '<nav class="wp-block-navigation{classes}"{styles}>{children}</nav>',
	);

	/**
	 * Get the input schema for a blocks array property.
	 *
	 * @return array<string, mixed>
	 */
	protected function get_blocks_input_schema(): array {
		return array(
			'type'        => 'array',
			'description' => implode(
				' ',
				array(
					'Flat list of blocks with clientId/parentClientId for hierarchy.',
					'LEAF BLOCKS (paragraph, heading, image, spacer): Provide innerHTML with the actual content HTML.',
					'CONTAINER BLOCKS (group, cover, columns, column, buttons): Either omit innerHTML (wrapper auto-generated from attrs) OR provide innerHTML with <!-- CHILDREN --> placeholder marking where children go.',
					'EDITING EXISTING: Call get-blocks first, modify the structure, submit complete block list.',
				)
			),
			'items'       => array(
				'type'       => 'object',
				'properties' => array(
					'clientId'       => array(
						'type'        => 'string',
						'description' => 'REQUIRED. Unique ID for this block in this batch (e.g., "b1", "b2").',
					),
					'parentClientId' => array(
						'type'        => 'string',
						'description' => 'The clientId of the parent block. Empty string or omit for root-level blocks.',
					),
					'name'           => array(
						'type'        => 'string',
						'description' => 'REQUIRED. Block name (e.g., core/paragraph, core/group, core/cover).',
					),
					'attrs'          => array(
						'type'                 => 'object',
						'description'          => 'Block attributes. Check list-block-types for available attributes per block type.',
						'additionalProperties' => true,
					),
					'innerHTML'      => array(
						'type'        => 'string',
						'description' => 'Block HTML. LEAF blocks: the content (e.g., "<p>Hello</p>"). CONTAINER blocks: omit to auto-generate wrapper, OR provide custom wrapper with <!-- CHILDREN --> placeholder.',
					),
				),
			),
		);
	}

	/**
	 * Validate that all blocks have required fields and are registered block types.
	 *
	 * @param array $blocks Array of block objects.
	 * @return string|null Error message if validation fails, null if valid.
	 */
	protected function validate_blocks( array $blocks ): ?string {
		if ( empty( $blocks ) ) {
			return 'The "blocks" array is empty. Provide at least one block with "clientId" and "name" fields.';
		}

		$registry     = \WP_Block_Type_Registry::get_instance();
		$client_ids   = array();
		$parent_refs  = array();
		$warnings     = array();

		foreach ( $blocks as $index => $block ) {
			$position = $index + 1;

			if ( empty( $block['clientId'] ) ) {
				return sprintf(
					'Block #%d is missing required "clientId" field. Each block must have a unique clientId (e.g., "b1", "b2").',
					$position
				);
			}

			$client_id = $block['clientId'];

			// Check for duplicate clientIds.
			if ( isset( $client_ids[ $client_id ] ) ) {
				return sprintf(
					'Duplicate clientId "%s" found at block #%d (first seen at #%d). Each block must have a unique clientId.',
					$client_id,
					$position,
					$client_ids[ $client_id ]
				);
			}
			$client_ids[ $client_id ] = $position;

			if ( empty( $block['name'] ) ) {
				return sprintf(
					'Block #%d (clientId: "%s") is missing required "name" field. Provide a block name like "core/paragraph" or "core/group".',
					$position,
					$client_id
				);
			}

			// Validate block type is registered.
			$block_name = $block['name'];
			if ( ! $registry->is_registered( $block_name ) ) {
				$warnings[] = sprintf(
					'Block "%s" (clientId: "%s") is not a registered block type. It may not render correctly.',
					$block_name,
					$client_id
				);
			}

			// Track parent references for later validation.
			if ( ! empty( $block['parentClientId'] ) ) {
				$parent_refs[ $client_id ] = $block['parentClientId'];
			}
		}

		// Validate all parent references point to existing blocks.
		foreach ( $parent_refs as $child_id => $parent_id ) {
			if ( ! isset( $client_ids[ $parent_id ] ) ) {
				return sprintf(
					'Block "%s" references parentClientId "%s" which does not exist. Check your clientId values.',
					$child_id,
					$parent_id
				);
			}
		}

		// Return first warning if no errors (allows saving but informs about issues).
		// Actually, warnings shouldn't block - just log them if WP_DEBUG is on.
		if ( ! empty( $warnings ) && defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			foreach ( $warnings as $warning ) {
				// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
				error_log( 'WordForge block validation warning: ' . $warning );
			}
		}

		return null;
	}

	/**
	 * Convert flat block array to WordPress block content.
	 *
	 * @param array $blocks Flat array of blocks with clientId/parentClientId.
	 * @return string Serialized block content.
	 */
	protected function blocks_to_content( array $blocks ): string {
		$nested_blocks = $this->build_block_tree( $blocks );

		$content = '';
		foreach ( $nested_blocks as $block ) {
			$content .= $this->serialize_block( $block );
		}

		return $content;
	}

	/**
	 * Build nested block tree from flat clientId/parentClientId structure.
	 *
	 * @param array $flat_blocks Flat array of blocks with clientId and parentClientId.
	 * @return array Nested block tree.
	 */
	private function build_block_tree( array $flat_blocks ): array {
		// Index blocks by clientId.
		$blocks_by_id = array();
		foreach ( $flat_blocks as $block ) {
			$client_id                  = $block['clientId'];
			$blocks_by_id[ $client_id ] = array(
				'name'        => $block['name'] ?? '',
				'attrs'       => $block['attrs'] ?? array(),
				'innerHTML'   => $block['innerHTML'] ?? '',
				'innerBlocks' => array(),
			);
		}

		// Build tree by linking children to parents.
		$root_blocks = array();
		foreach ( $flat_blocks as $block ) {
			$client_id        = $block['clientId'];
			$parent_client_id = $block['parentClientId'] ?? '';

			if ( empty( $parent_client_id ) ) {
				// Root block.
				$root_blocks[] = &$blocks_by_id[ $client_id ];
			} elseif ( isset( $blocks_by_id[ $parent_client_id ] ) ) {
				// Add as child of parent.
				$blocks_by_id[ $parent_client_id ]['innerBlocks'][] = &$blocks_by_id[ $client_id ];
			} else {
				// Parent not found, treat as root.
				$root_blocks[] = &$blocks_by_id[ $client_id ];
			}
		}

		return $root_blocks;
	}

	/**
	 * Serialize a single block to WordPress block markup.
	 *
	 * @param array $block Block data with name, attrs, innerHTML, innerBlocks.
	 * @return string Serialized block markup.
	 */
	private function serialize_block( array $block ): string {
		$name         = $block['name'] ?? '';
		$attrs        = $block['attrs'] ?? array();
		$inner_html   = $block['innerHTML'] ?? '';
		$inner_blocks = $block['innerBlocks'] ?? array();

		if ( empty( $name ) ) {
			return $inner_html;
		}

		$attrs_json = ! empty( $attrs ) ? ' ' . wp_json_encode( $attrs ) : '';

		// Self-closing block (no content, no children).
		if ( empty( $inner_blocks ) && empty( $inner_html ) ) {
			return "<!-- wp:{$name}{$attrs_json} /-->\n";
		}

		// Leaf block (content but no children).
		if ( empty( $inner_blocks ) ) {
			return "<!-- wp:{$name}{$attrs_json} -->\n{$inner_html}\n<!-- /wp:{$name} -->\n";
		}

		// Serialize all child blocks.
		$serialized_children = '';
		foreach ( $inner_blocks as $inner_block ) {
			$serialized_children .= $this->serialize_block( $inner_block );
		}

		// Container block with children - determine how to wrap them.
		$inner_content = $this->wrap_children( $name, $inner_html, $serialized_children, $attrs );

		return "<!-- wp:{$name}{$attrs_json} -->\n{$inner_content}<!-- /wp:{$name} -->\n";
	}

	/**
	 * Wrap serialized children in appropriate container HTML.
	 *
	 * Priority:
	 * 1. If innerHTML has <!-- CHILDREN --> placeholder, use it
	 * 2. If innerHTML provided, integrate children using heuristics
	 * 3. If no innerHTML but known container, use wrapper mapping with generated classes
	 * 4. Fallback to generic div wrapper
	 *
	 * @param string $block_name Block name (e.g., 'core/group').
	 * @param string $inner_html User-provided innerHTML (may be empty).
	 * @param string $children   Serialized child blocks.
	 * @param array  $attrs      Block attributes for class/style generation.
	 * @return string Wrapped content.
	 */
	private function wrap_children( string $block_name, string $inner_html, string $children, array $attrs = array() ): string {
		// Priority 1: Explicit placeholder.
		if ( ! empty( $inner_html ) && false !== strpos( $inner_html, '<!-- CHILDREN -->' ) ) {
			return str_replace( '<!-- CHILDREN -->', $children, $inner_html ) . "\n";
		}

		// Priority 2: innerHTML provided - integrate children into it.
		if ( ! empty( $inner_html ) ) {
			return $this->integrate_children_into_html( $inner_html, $children );
		}

		// Priority 3: Known container block - use wrapper mapping with generated classes.
		if ( isset( self::$container_wrappers[ $block_name ] ) ) {
			return $this->build_wrapper_from_template( $block_name, $children, $attrs );
		}

		// Priority 4: Unknown container - generic div wrapper with generated classes.
		$css_class    = 'wp-block-' . str_replace( '/', '-', $block_name );
		$extra_classes = $this->generate_classes_from_attrs( $attrs );
		$styles       = $this->generate_styles_from_attrs( $attrs );

		$class_attr = $css_class . ( $extra_classes ? ' ' . $extra_classes : '' );
		$style_attr = $styles ? " style=\"{$styles}\"" : '';

		return "<div class=\"{$class_attr}\"{$style_attr}>\n{$children}</div>\n";
	}

	/**
	 * Build wrapper HTML from template with generated classes and styles.
	 *
	 * @param string $block_name Block name.
	 * @param string $children   Serialized child blocks.
	 * @param array  $attrs      Block attributes.
	 * @return string Built wrapper HTML.
	 */
	private function build_wrapper_from_template( string $block_name, string $children, array $attrs ): string {
		$template = self::$container_wrappers[ $block_name ];

		$classes    = $this->generate_classes_from_attrs( $attrs, $block_name );
		$styles     = $this->generate_styles_from_attrs( $attrs );
		$bg_classes = $this->generate_background_classes( $block_name, $attrs );

		$replacements = array(
			'{classes}'    => $classes ? ' ' . $classes : '',
			'{styles}'     => $styles ? " style=\"{$styles}\"" : '',
			'{bg_classes}' => $bg_classes ? ' ' . $bg_classes : '',
			'{children}'   => "\n" . $children,
		);

		return str_replace( array_keys( $replacements ), array_values( $replacements ), $template ) . "\n";
	}

	/**
	 * Generate CSS classes from block attributes.
	 *
	 * Maps common WordPress block attrs to their corresponding CSS classes.
	 *
	 * @param array  $attrs      Block attributes.
	 * @param string $block_name Optional block name for block-specific logic.
	 * @return string Space-separated CSS classes.
	 */
	private function generate_classes_from_attrs( array $attrs, string $block_name = '' ): string {
		$classes = array();

		// Background color (not for cover - it uses overlayColor).
		if ( ! empty( $attrs['backgroundColor'] ) && 'core/cover' !== $block_name ) {
			$classes[] = 'has-' . $attrs['backgroundColor'] . '-background-color';
			$classes[] = 'has-background';
		}

		// Text color.
		if ( ! empty( $attrs['textColor'] ) ) {
			$classes[] = 'has-' . $attrs['textColor'] . '-color';
			$classes[] = 'has-text-color';
		}

		// Gradient.
		if ( ! empty( $attrs['gradient'] ) ) {
			$classes[] = 'has-' . $attrs['gradient'] . '-gradient-background';
			$classes[] = 'has-background';
		}

		// Font size.
		if ( ! empty( $attrs['fontSize'] ) ) {
			$classes[] = 'has-' . $attrs['fontSize'] . '-font-size';
		}

		// Text alignment.
		if ( ! empty( $attrs['textAlign'] ) ) {
			$classes[] = 'has-text-align-' . $attrs['textAlign'];
		}

		// Block alignment (wide, full, center, left, right).
		if ( ! empty( $attrs['align'] ) ) {
			$classes[] = 'align' . $attrs['align'];
		}

		// Vertical alignment.
		if ( ! empty( $attrs['verticalAlignment'] ) ) {
			$classes[] = 'is-vertically-aligned-' . $attrs['verticalAlignment'];
		}

		// Layout type.
		if ( ! empty( $attrs['layout']['type'] ) ) {
			$classes[] = 'is-layout-' . $attrs['layout']['type'];
		}

		return implode( ' ', $classes );
	}

	/**
	 * Generate inline styles from block attributes.
	 *
	 * @param array $attrs Block attributes.
	 * @return string CSS style string (without style="" wrapper).
	 */
	private function generate_styles_from_attrs( array $attrs ): string {
		$styles = array();

		// Custom background color.
		if ( ! empty( $attrs['style']['color']['background'] ) ) {
			$styles[] = 'background-color:' . $attrs['style']['color']['background'];
		}

		// Custom text color.
		if ( ! empty( $attrs['style']['color']['text'] ) ) {
			$styles[] = 'color:' . $attrs['style']['color']['text'];
		}

		// Custom gradient.
		if ( ! empty( $attrs['style']['color']['gradient'] ) ) {
			$styles[] = 'background:' . $attrs['style']['color']['gradient'];
		}

		// Padding.
		if ( ! empty( $attrs['style']['spacing']['padding'] ) ) {
			$padding = $attrs['style']['spacing']['padding'];
			if ( is_array( $padding ) ) {
				foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
					if ( ! empty( $padding[ $side ] ) ) {
						$styles[] = "padding-{$side}:" . $padding[ $side ];
					}
				}
			} else {
				$styles[] = 'padding:' . $padding;
			}
		}

		// Margin.
		if ( ! empty( $attrs['style']['spacing']['margin'] ) ) {
			$margin = $attrs['style']['spacing']['margin'];
			if ( is_array( $margin ) ) {
				foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
					if ( ! empty( $margin[ $side ] ) ) {
						$styles[] = "margin-{$side}:" . $margin[ $side ];
					}
				}
			} else {
				$styles[] = 'margin:' . $margin;
			}
		}

		// Border radius.
		if ( ! empty( $attrs['style']['border']['radius'] ) ) {
			$styles[] = 'border-radius:' . $attrs['style']['border']['radius'];
		}

		return implode( ';', $styles );
	}

	/**
	 * Generate background-span-specific classes for cover blocks.
	 *
	 * The cover block's background span gets overlay color and dim classes.
	 *
	 * @param string $block_name Block name.
	 * @param array  $attrs      Block attributes.
	 * @return string Space-separated CSS classes.
	 */
	private function generate_background_classes( string $block_name, array $attrs ): string {
		if ( 'core/cover' !== $block_name ) {
			return '';
		}

		$classes = array();

		// Overlay color goes on the background span.
		if ( ! empty( $attrs['overlayColor'] ) ) {
			$classes[] = 'has-' . $attrs['overlayColor'] . '-background-color';
		}

		// Dim ratio classes go on the background span.
		if ( isset( $attrs['dimRatio'] ) ) {
			$dim = (int) $attrs['dimRatio'];
			if ( $dim > 0 ) {
				$classes[] = 'has-background-dim';
				if ( $dim < 100 ) {
					$classes[] = 'has-background-dim-' . $dim;
				}
			}
		} else {
			// Default dim ratio is 100 (full dim).
			$classes[] = 'has-background-dim';
		}

		return implode( ' ', $classes );
	}

	/**
	 * Integrate serialized child blocks into container wrapper HTML.
	 *
	 * Used when innerHTML is provided but doesn't have an explicit placeholder.
	 * Attempts to find the appropriate insertion point using heuristics.
	 *
	 * @param string $html     The container's innerHTML (wrapper HTML).
	 * @param string $children Serialized child blocks.
	 * @return string HTML with children integrated.
	 */
	private function integrate_children_into_html( string $html, string $children ): string {
		// Strategy 1: Consecutive newlines (WordPress's marker for child content location).
		if ( preg_match( '/\n\s*\n/', $html, $matches, PREG_OFFSET_CAPTURE ) ) {
			$pos = $matches[0][1];
			$len = strlen( $matches[0][0] );
			return substr( $html, 0, $pos ) . "\n" . $children . substr( $html, $pos + $len );
		}

		// Strategy 2: Empty inner-container div (common in cover, media-text, etc.).
		if ( preg_match( '/(<div[^>]*class="[^"]*inner[^"]*"[^>]*>)\s*(<\/div>)/i', $html, $matches, PREG_OFFSET_CAPTURE ) ) {
			$insert_pos = $matches[1][1] + strlen( $matches[1][0] );
			return substr( $html, 0, $insert_pos ) . "\n" . $children . substr( $html, $insert_pos );
		}

		// Strategy 3: Insert before the last closing tag sequence.
		if ( preg_match( '/^(.*?)((?:<\/[a-z][a-z0-9]*>\s*)+)$/is', $html, $matches ) ) {
			return $matches[1] . "\n" . $children . $matches[2];
		}

		// Fallback: Append children after HTML.
		return $html . "\n" . $children;
	}
}
