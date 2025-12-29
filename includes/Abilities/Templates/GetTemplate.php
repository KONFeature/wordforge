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
			'Retrieve a specific block template or template part with complete content and block structure. Can fetch by template ID or slug. Returns ' .
			'block composition, metadata, and source (theme vs custom). Supports both "full" (complete block data) and "simplified" (clean structure) ' .
			'parse modes. Use this to view template details before modifications or to extract template content. FSE-only.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'edit_theme_options';
	}

	public function get_output_schema(): array {
		return [
			'type'       => 'object',
			'properties' => [
				'success' => [ 'type' => 'boolean' ],
				'data'    => [
					'type'       => 'object',
					'properties' => [
						'id'          => [ 'type' => 'integer' ],
						'slug'        => [ 'type' => 'string' ],
						'title'       => [ 'type' => 'string' ],
						'description' => [ 'type' => 'string' ],
						'content'     => [ 'type' => 'string' ],
						'blocks'      => [ 'type' => 'array' ],
						'status'      => [ 'type' => 'string' ],
						'type'        => [ 'type' => 'string' ],
						'modified'    => [ 'type' => 'string' ],
						'area'        => [ 'type' => 'string' ],
					],
				],
			],
			'required' => [ 'success', 'data' ],
		];
	}

	public function get_input_schema(): array {
		return [
			'type'       => 'object',
			'required'   => [ 'id' ],
			'properties' => [
				'id' => [
					'oneOf' => [
						[ 'type' => 'integer', 'description' => 'Template post ID.' ],
						[ 'type' => 'string', 'description' => 'Template slug.' ],
					],
					'description' => 'Template ID or slug.',
				],
				'type' => [
					'type'        => 'string',
					'description' => 'Template type (required when using slug).',
					'enum'        => [ 'wp_template', 'wp_template_part' ],
					'default'     => 'wp_template',
				],
				'parse_mode' => [
					'type'        => 'string',
					'description' => 'How to return blocks.',
					'enum'        => [ 'full', 'simplified' ],
					'default'     => 'full',
				],
			],
		];
	}

	public function execute( array $args ): array {
		$template = $this->get_template( $args );

		if ( ! $template ) {
			return $this->error( 'Template not found.', 'not_found' );
		}

		$blocks = parse_blocks( $template->post_content );
		$parse_mode = $args['parse_mode'] ?? 'full';

		if ( 'simplified' === $parse_mode ) {
			$blocks = $this->simplify_blocks( $blocks );
		}

		$data = [
			'id'          => $template->ID,
			'slug'        => $template->post_name,
			'title'       => $template->post_title ?: $template->post_name,
			'description' => $template->post_excerpt,
			'content'     => $template->post_content,
			'blocks'      => $blocks,
			'status'      => $template->post_status,
			'type'        => $template->post_type,
			'modified'    => $template->post_modified,
		];

		if ( 'wp_template_part' === $template->post_type ) {
			$data['area'] = get_post_meta( $template->ID, 'wp_template_part_area', true ) ?: 'uncategorized';
		}

		return $this->success( $data );
	}

	private function get_template( array $args ): ?\WP_Post {
		$id = $args['id'];

		if ( is_numeric( $id ) ) {
			$template = get_post( (int) $id );
			if ( $template && in_array( $template->post_type, [ 'wp_template', 'wp_template_part' ], true ) ) {
				return $template;
			}
			return null;
		}

		$type = $args['type'] ?? 'wp_template';
		$templates = get_posts( [
			'post_type'      => $type,
			'post_status'    => [ 'publish', 'auto-draft' ],
			'name'           => $id,
			'posts_per_page' => 1,
		] );

		return ! empty( $templates ) ? $templates[0] : null;
	}

	private function simplify_blocks( array $blocks ): array {
		return array_map( function ( $block ) {
			$simplified = [
				'name'  => $block['blockName'],
				'attrs' => $block['attrs'] ?? [],
			];

			if ( ! empty( $block['innerBlocks'] ) ) {
				$simplified['innerBlocks'] = $this->simplify_blocks( $block['innerBlocks'] );
			}

			return $simplified;
		}, array_filter( $blocks, fn( $b ) => ! empty( $b['blockName'] ) ) );
	}
}
