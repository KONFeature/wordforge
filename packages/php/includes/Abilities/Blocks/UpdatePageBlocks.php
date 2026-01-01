<?php

declare(strict_types=1);

namespace WordForge\Abilities\Blocks;

use WordForge\Abilities\AbstractAbility;

class UpdatePageBlocks extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-blocks';
	}

	public function get_title(): string {
		return __( 'Update Page Blocks', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Update the Gutenberg block structure of a page or post. Replaces entire block content with new block array. Automatically creates ' .
			'revisions for safety (can be disabled). Blocks must be provided as structured array with name, attributes, and content. Use this ' .
			'to programmatically modify page layouts, replace specific blocks, or restructure content. More precise than updating raw HTML content.',
			'wordforge'
		);
	}

	public function get_output_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'success' => array( 'type' => 'boolean' ),
				'data'    => array(
					'type'       => 'object',
					'properties' => array(
						'id'               => array( 'type' => 'integer' ),
						'title'            => array( 'type' => 'string' ),
						'blocks'           => array( 'type' => 'array' ),
						'revision_created' => array( 'type' => 'boolean' ),
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
			'required'   => array( 'id', 'blocks' ),
			'properties' => array(
				'id'              => array(
					'type'        => 'integer',
					'description' => 'The post/page ID.',
				),
				'blocks'          => array(
					'type'        => 'array',
					'description' => 'Array of block objects to set as page content.',
					'items'       => array(
						'type'       => 'object',
						'properties' => array(
							'name'        => array(
								'type'        => 'string',
								'description' => 'Block name (e.g., core/paragraph).',
							),
							'attrs'       => array(
								'type'        => 'object',
								'description' => 'Block attributes.',
							),
							'innerBlocks' => array(
								'type'        => 'array',
								'description' => 'Nested blocks.',
							),
							'innerHTML'   => array(
								'type'        => 'string',
								'description' => 'Block HTML content.',
							),
						),
					),
				),
				'create_revision' => array(
					'type'        => 'boolean',
					'description' => 'Create a revision before updating.',
					'default'     => true,
				),
			),
		);
	}

	public function execute( array $args ): array {
		$post_id = (int) $args['id'];
		$post    = get_post( $post_id );

		if ( ! $post ) {
			return $this->error( 'Content not found.', 'not_found' );
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return $this->error( 'You do not have permission to edit this content.', 'forbidden' );
		}

		$create_revision = $args['create_revision'] ?? true;
		if ( $create_revision ) {
			wp_save_post_revision( $post_id );
		}

		$content = $this->blocks_to_content( $args['blocks'] );

		$result = wp_update_post(
			array(
				'ID'           => $post_id,
				'post_content' => $content,
			),
			true
		);

		if ( is_wp_error( $result ) ) {
			return $this->error( $result->get_error_message(), 'update_failed' );
		}

		$updated_post = get_post( $post_id );
		$new_blocks   = parse_blocks( $updated_post->post_content );

		return $this->success(
			array(
				'id'               => $post_id,
				'title'            => $updated_post->post_title,
				'blocks'           => $new_blocks,
				'revision_created' => $create_revision,
			),
			'Blocks updated successfully.'
		);
	}

	private function blocks_to_content( array $blocks ): string {
		$content = '';

		foreach ( $blocks as $block ) {
			$content .= $this->serialize_block( $block );
		}

		return $content;
	}

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
