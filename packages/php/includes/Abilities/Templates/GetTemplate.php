<?php

declare(strict_types=1);

namespace WordForge\Abilities\Templates;

use WordForge\Abilities\AbstractAbility;

class GetTemplate extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-templates';
	}

	protected function is_read_only(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'Get Template', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Retrieve a specific block template or template part with complete content and block structure. Can fetch by template ID (as string) or slug. ' .
			'Supports "full" (complete block data) and "simplified" (clean structure) parse modes. ' .
			'TIP: Call this BEFORE using wordforge/update-template to understand the current layout. Then modify only what you need and submit the complete structure back. FSE-only.',
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
						'content'     => array( 'type' => 'string' ),
						'blocks'      => array( 'type' => 'array' ),
						'status'      => array( 'type' => 'string' ),
						'type'        => array( 'type' => 'string' ),
						'modified'    => array( 'type' => 'string' ),
						'area'        => array( 'type' => 'string' ),
					),
				),
			),
		);
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'required'   => array( 'id' ),
			'properties' => array(
			'id'         => array(
				'type'        => 'string',
				'description' => 'Template post ID (as string) or slug. Numeric strings are treated as IDs.',
			),
				'type'       => array(
					'type'        => 'string',
					'description' => 'Template type (required when using slug).',
					'enum'        => array( 'wp_template', 'wp_template_part' ),
					'default'     => 'wp_template',
				),
				'parse_mode' => array(
					'type'        => 'string',
					'description' => 'How to return blocks.',
					'enum'        => array( 'full', 'simplified' ),
					'default'     => 'full',
				),
			),
		);
	}

	public function execute( array $args ): array {
		$template = $this->get_template( $args );

		if ( ! $template ) {
			return $this->error( 'Template not found.', 'not_found' );
		}

		$blocks     = parse_blocks( $template->post_content );
		$parse_mode = $args['parse_mode'] ?? 'full';

		if ( 'simplified' === $parse_mode ) {
			$blocks = $this->simplify_blocks( $blocks );
		}

		$data = array(
			'id'          => $template->ID,
			'slug'        => $template->post_name,
			'title'       => $template->post_title ?: $template->post_name,
			'description' => $template->post_excerpt,
			'content'     => $template->post_content,
			'blocks'      => $blocks,
			'status'      => $template->post_status,
			'type'        => $template->post_type,
			'modified'    => $template->post_modified,
		);

		if ( 'wp_template_part' === $template->post_type ) {
			$data['area'] = get_post_meta( $template->ID, 'wp_template_part_area', true ) ?: 'uncategorized';
		}

		return $this->success( $data );
	}

	private function get_template( array $args ): ?\WP_Post {
		$id = $args['id'];

		if ( is_numeric( $id ) ) {
			$template = get_post( (int) $id );
			if ( $template && in_array( $template->post_type, array( 'wp_template', 'wp_template_part' ), true ) ) {
				return $template;
			}
			return null;
		}

		$type      = $args['type'] ?? 'wp_template';
		$templates = get_posts(
			array(
				'post_type'      => $type,
				'post_status'    => array( 'publish', 'auto-draft' ),
				'name'           => $id,
				'posts_per_page' => 1,
			)
		);

		return ! empty( $templates ) ? $templates[0] : null;
	}

	private function simplify_blocks( array $blocks ): array {
		// array_values() re-indexes the array to ensure sequential keys (0, 1, 2...)
		// This is required because array_filter preserves keys, and non-sequential
		// keys cause PHP to encode the array as a JSON object instead of array.
		return array_values(
			array_map(
				function ( $block ) {
					$simplified = array(
						'name'  => $block['blockName'],
						'attrs' => $block['attrs'] ?? array(),
					);

					if ( ! empty( $block['innerBlocks'] ) ) {
						$simplified['innerBlocks'] = $this->simplify_blocks( $block['innerBlocks'] );
					}

					return $simplified;
				},
				array_filter( $blocks, fn( $b ) => ! empty( $b['blockName'] ) )
			)
		);
	}
}
