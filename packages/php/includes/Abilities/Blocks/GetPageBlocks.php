<?php

declare(strict_types=1);

namespace WordForge\Abilities\Blocks;

use WordForge\Abilities\AbstractAbility;

class GetPageBlocks extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-blocks';
	}

	protected function is_read_only(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'Get Page Blocks', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Retrieve the Gutenberg block structure of a page or post. Returns blocks as structured data showing block names, attributes, ' .
			'nesting, and content. Supports both "full" mode (complete block data including markup) and "simplified" mode (clean structure ' .
			'without extra fields). Use this to analyze page layout, extract content from blocks, or understand block composition before making changes.',
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
						'id'     => array( 'type' => 'integer' ),
						'title'  => array( 'type' => 'string' ),
						'blocks' => array( 'type' => 'array' ),
					),
				),
			),
			'required'   => array( 'success', 'data' ),
		);
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'required'   => array( 'id' ),
			'properties' => array(
				'id'         => array(
					'type'        => 'integer',
					'description' => 'The post/page ID.',
				),
				'parse_mode' => array(
					'type'        => 'string',
					'description' => 'How to parse blocks.',
					'enum'        => array( 'full', 'simplified' ),
					'default'     => 'full',
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
			return $this->error( 'You do not have permission to view this content.', 'forbidden' );
		}

		$blocks     = parse_blocks( $post->post_content );
		$parse_mode = $args['parse_mode'] ?? 'full';

		if ( 'simplified' === $parse_mode ) {
			$blocks = $this->simplify_blocks( $blocks );
		}

		return $this->success(
			array(
				'id'     => $post_id,
				'title'  => $post->post_title,
				'blocks' => $blocks,
			)
		);
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

					if ( ! empty( $block['innerHTML'] ) && null === $block['blockName'] ) {
							$simplified['html'] = trim( $block['innerHTML'] );
					}

					return $simplified;
				},
				array_filter( $blocks, fn( $b ) => ! empty( $b['blockName'] ) || ! empty( trim( $b['innerHTML'] ?? '' ) ) )
			)
		);
	}
}
