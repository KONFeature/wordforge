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
		return __( 'Update a block template or template part content.', 'wordforge' );
	}

	public function get_capability(): string {
		return 'edit_theme_options';
	}

	public function get_input_schema(): array {
		return [
			'type'       => 'object',
			'required'   => [ 'id' ],
			'properties' => [
				'id' => [
					'type'        => 'integer',
					'description' => 'Template post ID.',
				],
				'content' => [
					'type'        => 'string',
					'description' => 'New template content (block markup).',
				],
				'blocks' => [
					'type'        => 'array',
					'description' => 'Array of block objects to set as template content.',
					'items'       => [
						'type'       => 'object',
						'properties' => [
							'name'        => [ 'type' => 'string' ],
							'attrs'       => [ 'type' => 'object' ],
							'innerBlocks' => [ 'type' => 'array' ],
							'innerHTML'   => [ 'type' => 'string' ],
						],
					],
				],
				'title' => [
					'type'        => 'string',
					'description' => 'Template title.',
				],
				'description' => [
					'type'        => 'string',
					'description' => 'Template description.',
				],
			],
		];
	}

	public function execute( array $args ): array {
		$template_id = (int) $args['id'];
		$template = get_post( $template_id );

		if ( ! $template || ! in_array( $template->post_type, [ 'wp_template', 'wp_template_part' ], true ) ) {
			return $this->error( 'Template not found.', 'not_found' );
		}

		if ( ! current_user_can( 'edit_post', $template_id ) ) {
			return $this->error( 'You do not have permission to edit this template.', 'forbidden' );
		}

		$update_data = [ 'ID' => $template_id ];

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

		return $this->success( [
			'id'          => $template_id,
			'slug'        => $updated->post_name,
			'title'       => $updated->post_title,
			'description' => $updated->post_excerpt,
			'status'      => $updated->post_status,
			'type'        => $updated->post_type,
			'modified'    => $updated->post_modified,
		], 'Template updated successfully.' );
	}

	private function blocks_to_content( array $blocks ): string {
		$content = '';
		foreach ( $blocks as $block ) {
			$content .= $this->serialize_block( $block );
		}
		return $content;
	}

	private function serialize_block( array $block ): string {
		$name = $block['name'] ?? $block['blockName'] ?? '';
		$attrs = $block['attrs'] ?? [];
		$inner_html = $block['innerHTML'] ?? '';
		$inner_blocks = $block['innerBlocks'] ?? [];

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
