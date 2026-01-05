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
	 * Get the input schema for a blocks array property.
	 *
	 * @return array<string, mixed>
	 */
	protected function get_blocks_input_schema(): array {
		return array(
			'type'        => 'array',
			'description' => 'Flat list of blocks. Use clientId and parentClientId to define nesting hierarchy. Root blocks have empty parentClientId.',
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
						'description' => 'REQUIRED. Block name (e.g., core/paragraph, core/group).',
					),
					'attrs'          => array(
						'type'                 => 'object',
						'description'          => 'Block attributes as key-value pairs.',
						'additionalProperties' => true,
					),
					'innerHTML'      => array(
						'type'        => 'string',
						'description' => 'Block HTML content.',
					),
				),
			),
		);
	}

	/**
	 * Validate that all blocks have required fields.
	 *
	 * @param array $blocks Array of block objects.
	 * @return string|null Error message if validation fails, null if valid.
	 */
	protected function validate_blocks( array $blocks ): ?string {
		if ( empty( $blocks ) ) {
			return 'The "blocks" array is empty. Provide at least one block with "clientId" and "name" fields.';
		}

		foreach ( $blocks as $index => $block ) {
			$position = $index + 1;

			if ( empty( $block['clientId'] ) ) {
				return sprintf(
					'Block #%d is missing required "clientId" field. Each block must have a unique clientId (e.g., "b1", "b2").',
					$position
				);
			}

			if ( empty( $block['name'] ) ) {
				return sprintf(
					'Block #%d (clientId: "%s") is missing required "name" field. Provide a block name like "core/paragraph" or "core/group".',
					$position,
					$block['clientId']
				);
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

		if ( empty( $inner_blocks ) && empty( $inner_html ) ) {
			return "<!-- wp:{$name}{$attrs_json} /-->\n";
		}

		$inner_content = $inner_html;
		if ( ! empty( $inner_blocks ) ) {
			$inner_content = '';
			foreach ( $inner_blocks as $inner_block ) {
				$inner_content .= $this->serialize_block( $inner_block );
			}
		}

		return "<!-- wp:{$name}{$attrs_json} -->\n{$inner_content}\n<!-- /wp:{$name} -->\n";
	}
}
