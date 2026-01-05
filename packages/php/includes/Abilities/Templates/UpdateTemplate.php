<?php

declare(strict_types=1);

namespace WordForge\Abilities\Templates;

use WordForge\Abilities\AbstractAbility;

class UpdateTemplate extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-templates';
	}

	public function get_title(): string {
		return __( 'Update Template', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Modify block template or template part content in Full Site Editing themes. Can update via raw block markup or structured block array. ' .
			'Optionally update template title and description. Updates to theme templates create custom overrides (original preserved). Changes affect ' .
			'all pages using this template. Use this to customize site layouts, modify headers/footers, or adjust template designs. FSE-only.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'edit_theme_options';
	}

	public function get_output_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'success' => array( 'type' => 'boolean' ),
				'data'    => array(
					'type'       => 'object',
					'properties' => array(
						'id'          => array( 'type' => 'integer' ),
						'slug'        => array( 'type' => 'string' ),
						'title'       => array( 'type' => 'string' ),
						'description' => array( 'type' => 'string' ),
						'status'      => array( 'type' => 'string' ),
						'type'        => array( 'type' => 'string' ),
						'modified'    => array( 'type' => 'string' ),
					),
				),
				'message' => array( 'type' => 'string' ),
			),
			'required'   => array( 'success', 'data' ),
		);
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'required'   => array( 'id' ),
			'properties' => array(
				'id'          => array(
					'type'        => 'integer',
					'description' => 'Template post ID.',
				),
				'content'     => array(
					'type'        => 'string',
					'description' => 'New template content (block markup).',
				),
			'blocks'      => array(
				'type'        => 'array',
				'description' => 'Flat list of blocks. Use clientId and parentClientId to define nesting hierarchy. Root blocks have empty parentClientId.',
				'items'       => array(
					'type'       => 'object',
					'required'   => array( 'clientId', 'name' ),
					'properties' => array(
						'clientId'       => array(
							'type'        => 'string',
							'description' => 'Unique ID for this block in this batch (e.g., "b1", "b2").',
						),
						'parentClientId' => array(
							'type'        => 'string',
							'description' => 'The clientId of the parent block. Empty string or omit for root-level blocks.',
						),
						'name'           => array(
							'type'        => 'string',
							'description' => 'Block name (e.g., core/paragraph, core/group).',
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
			),
				'title'       => array(
					'type'        => 'string',
					'description' => 'Template title.',
				),
				'description' => array(
					'type'        => 'string',
					'description' => 'Template description.',
				),
			),
		);
	}

	public function execute( array $args ): array {
		$template_id = (int) $args['id'];
		$template    = get_post( $template_id );

		if ( ! $template || ! in_array( $template->post_type, array( 'wp_template', 'wp_template_part' ), true ) ) {
			return $this->error( 'Template not found.', 'not_found' );
		}

		if ( ! current_user_can( 'edit_post', $template_id ) ) {
			return $this->error( 'You do not have permission to edit this template.', 'forbidden' );
		}

		$update_data = array( 'ID' => $template_id );

		if ( isset( $args['content'] ) ) {
			$update_data['post_content'] = wp_kses_post( $args['content'] );
		} elseif ( isset( $args['blocks'] ) ) {
			$update_data['post_content'] = $this->blocks_to_content( $args['blocks'] );
		}

		if ( isset( $args['title'] ) ) {
			$update_data['post_title'] = sanitize_text_field( $args['title'] );
		}

		if ( isset( $args['description'] ) ) {
			$update_data['post_excerpt'] = sanitize_textarea_field( $args['description'] );
		}

		if ( 'auto-draft' === $template->post_status ) {
			$update_data['post_status'] = 'publish';
		}

		$result = wp_update_post( $update_data, true );

		if ( is_wp_error( $result ) ) {
			return $this->error( $result->get_error_message(), 'update_failed' );
		}

		$updated = get_post( $template_id );

		return $this->success(
			array(
				'id'          => $template_id,
				'slug'        => $updated->post_name,
				'title'       => $updated->post_title,
				'description' => $updated->post_excerpt,
				'status'      => $updated->post_status,
				'type'        => $updated->post_type,
				'modified'    => $updated->post_modified,
			),
			'Template updated successfully.'
		);
	}

	/**
	 * Convert flat block array to WordPress block content.
	 *
	 * Supports both flat format (clientId/parentClientId) and legacy nested format (innerBlocks).
	 *
	 * @param array $blocks Flat or nested block array.
	 * @return string Serialized block content.
	 */
	private function blocks_to_content( array $blocks ): string {
		// Detect format: flat (has clientId) vs legacy nested (has innerBlocks).
		$is_flat = ! empty( $blocks ) && isset( $blocks[0]['clientId'] );

		if ( $is_flat ) {
			$nested_blocks = $this->build_block_tree( $blocks );
		} else {
			// Legacy format - already nested.
			$nested_blocks = $blocks;
		}

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
			$client_id                   = $block['clientId'];
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
		$name         = $block['name'] ?? $block['blockName'] ?? '';
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
