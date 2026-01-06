<?php

declare(strict_types=1);

namespace WordForge\Abilities\Blocks;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\BlockResolutionTrait;

class GetBlocks extends AbstractAbility {

	use BlockResolutionTrait;

	public function get_category(): string {
		return 'wordforge-blocks';
	}

	protected function is_read_only(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'Get Blocks', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Get Gutenberg blocks from any block-enabled entity (post, page, template, template part). Auto-detects entity type from ID/slug. ' .
			'USE: Read block structure before editing with update-blocks. ' .
			'NOT FOR: Content metadata (use get-content), template metadata (use get-template).',
			'wordforge'
		);
	}

	public function get_capability(): string|array {
		return array( 'edit_posts', 'edit_theme_options' );
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
						'type'        => array( 'type' => 'string' ),
						'status'      => array( 'type' => 'string' ),
						'modified'    => array( 'type' => 'string' ),
						'blocks'      => array( 'type' => 'array' ),
						'block_count' => array( 'type' => 'integer' ),
						'source'      => array( 'type' => 'string' ),
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
			'properties' => array_merge(
				$this->get_block_id_input_schema(),
				array(
					'parse_mode' => array(
						'type'        => 'string',
						'description' => 'full=complete block data, simplified=clean structure (name, attrs, innerBlocks only).',
						'enum'        => array( 'full', 'simplified' ),
						'default'     => 'simplified',
					),
				)
			),
		);
	}

	public function execute( array $args ): array {
		$resolution = $this->resolve_block_entity( $args['id'], $args['type'] ?? null );

		if ( $resolution['error'] ) {
			$code = $resolution['ambiguous'] ? 'ambiguous_entity' : 'not_found';
			return $this->error( $resolution['error'], $code );
		}

		$post      = $resolution['post'];
		$post_type = $resolution['type'];

		$capability = $this->get_edit_capability_for_type( $post_type );
		if ( $this->is_template_type( $post_type ) ) {
			if ( ! current_user_can( $capability ) ) {
				return $this->error( 'You do not have permission to view this template.', 'forbidden' );
			}
		} elseif ( ! current_user_can( $capability, $post->ID ) ) {
			return $this->error( 'You do not have permission to view this content.', 'forbidden' );
		}

		$blocks     = parse_blocks( $post->post_content );
		$parse_mode = $args['parse_mode'] ?? 'simplified';

		if ( 'simplified' === $parse_mode ) {
			$blocks = $this->simplify_blocks( $blocks );
		}

		$data = array(
			'id'          => $post->ID,
			'slug'        => $post->post_name,
			'title'       => $post->post_title ?: $post->post_name,
			'type'        => $post_type,
			'status'      => $post->post_status,
			'modified'    => $post->post_modified,
			'blocks'      => $blocks,
			'block_count' => $this->count_blocks( $blocks ),
		);

		if ( $this->is_template_type( $post_type ) ) {
			$data['source'] = 'auto-draft' === $post->post_status ? 'theme' : 'custom';
			if ( 'wp_template_part' === $post_type ) {
				$data['area'] = get_post_meta( $post->ID, 'wp_template_part_area', true ) ?: 'uncategorized';
			}
		}

		return $this->success( $data );
	}

	private function simplify_blocks( array $blocks ): array {
		return array_values(
			array_map(
				function ( $block ) {
					$simplified = array(
						'name'  => $block['blockName'],
						'attrs' => $block['attrs'] ?? array(),
					);

					if ( ! empty( $block['innerHTML'] ) ) {
						$html = trim( $block['innerHTML'] );
						if ( $html ) {
							$simplified['innerHTML'] = $html;
						}
					}

					if ( ! empty( $block['innerBlocks'] ) ) {
						$simplified['innerBlocks'] = $this->simplify_blocks( $block['innerBlocks'] );
					}

					return $simplified;
				},
				array_filter( $blocks, fn( $b ) => ! empty( $b['blockName'] ) )
			)
		);
	}

	private function count_blocks( array $blocks ): int {
		$count = 0;
		foreach ( $blocks as $block ) {
			if ( ! empty( $block['blockName'] ) || ! empty( $block['name'] ) ) {
				++$count;
			}
			$inner = $block['innerBlocks'] ?? array();
			if ( ! empty( $inner ) ) {
				$count += $this->count_blocks( $inner );
			}
		}
		return $count;
	}
}
