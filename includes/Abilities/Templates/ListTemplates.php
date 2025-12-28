<?php

declare(strict_types=1);

namespace WordForge\Abilities\Templates;

use WordForge\Abilities\AbstractAbility;

class ListTemplates extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-templates';
	}

	protected function is_read_only(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'List Templates', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'List block templates and template parts for Full Site Editing (FSE) themes. Templates define page layouts (index, single, archive, etc.). ' .
			'Template parts are reusable sections (header, footer, sidebar). Shows both theme-provided and custom user templates. Filter template ' .
			'parts by area (header/footer/sidebar). Use this to discover available templates or template parts before editing. Requires FSE theme support.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'edit_theme_options';
	}

	public function get_input_schema(): array {
		return [
			'type'       => 'object',
			'properties' => [
				'type' => [
					'type'        => 'string',
					'description' => 'Template type.',
					'enum'        => [ 'wp_template', 'wp_template_part' ],
					'default'     => 'wp_template',
				],
				'area' => [
					'type'        => 'string',
					'description' => 'Filter template parts by area (header, footer, sidebar, etc.).',
				],
			],
		];
	}

	public function execute( array $args ): array {
		$type = $args['type'] ?? 'wp_template';

		if ( ! current_theme_supports( 'block-templates' ) ) {
			return $this->error( 'Current theme does not support block templates.', 'not_supported' );
		}

		$query_args = [
			'post_type'      => $type,
			'post_status'    => [ 'publish', 'auto-draft' ],
			'posts_per_page' => 100,
			'orderby'        => 'title',
			'order'          => 'ASC',
		];

		$templates = get_posts( $query_args );
		$items = [];

		foreach ( $templates as $template ) {
			$item = [
				'id'          => $template->ID,
				'slug'        => $template->post_name,
				'title'       => $template->post_title ?: $template->post_name,
				'description' => $template->post_excerpt,
				'status'      => $template->post_status,
				'type'        => $type,
				'modified'    => $template->post_modified,
				'source'      => $this->get_template_source( $template ),
			];

			if ( 'wp_template_part' === $type ) {
				$area = get_post_meta( $template->ID, 'wp_template_part_area', true );
				$item['area'] = $area ?: 'uncategorized';
			}

			if ( ! empty( $args['area'] ) && isset( $item['area'] ) && $item['area'] !== $args['area'] ) {
				continue;
			}

			$items[] = $item;
		}

		return $this->success( [
			'type'  => $type,
			'items' => $items,
			'total' => count( $items ),
		] );
	}

	private function get_template_source( \WP_Post $template ): string {
		if ( 'auto-draft' === $template->post_status ) {
			return 'theme';
		}
		return 'custom';
	}
}
