<?php

declare(strict_types=1);

namespace WordForge\Abilities\Blocks;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\BlockResolutionTrait;
use WordForge\Abilities\Traits\BlockSerializerTrait;

class UpdateBlocks extends AbstractAbility {

	use BlockResolutionTrait;
	use BlockSerializerTrait;

	public function get_category(): string {
		return 'wordforge-blocks';
	}

	public function get_title(): string {
		return __( 'Update Blocks', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Update Gutenberg blocks on any block-enabled entity (post, page, template, template part). Replaces entire block content. ' .
			'WORKFLOW: Call get-blocks first, modify needed blocks, submit complete structure. Auto-creates revision for posts/pages. ' .
			'NOT FOR: Simple text updates (use save-content), template metadata (use update-template).',
			'wordforge'
		);
	}

	public function get_capability(): string|array {
		return array( 'edit_posts', 'edit_theme_options' );
	}

	protected function is_destructive(): bool {
		return true;
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
						'type'             => array( 'type' => 'string' ),
						'block_count'      => array( 'type' => 'integer' ),
						'revision_created' => array( 'type' => 'boolean' ),
					),
				),
				'message' => array( 'type' => 'string' ),
			),
		);
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'required'   => array( 'id', 'blocks' ),
			'properties' => array_merge(
				$this->get_block_id_input_schema(),
				array(
					'blocks'          => $this->get_blocks_input_schema(),
					'create_revision' => array(
						'type'        => 'boolean',
						'description' => 'Create revision before updating (posts/pages only, ignored for templates).',
						'default'     => true,
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
				return $this->error( 'You do not have permission to edit this template.', 'forbidden' );
			}
		} elseif ( ! current_user_can( $capability, $post->ID ) ) {
			return $this->error( 'You do not have permission to edit this content.', 'forbidden' );
		}

		$validation_error = $this->validate_blocks( $args['blocks'] ?? array() );
		if ( $validation_error ) {
			return $this->error( $validation_error, 'invalid_blocks' );
		}

		$create_revision = ( $args['create_revision'] ?? true ) && ! $this->is_template_type( $post_type );
		if ( $create_revision ) {
			wp_save_post_revision( $post->ID );
		}

		$content = $this->blocks_to_content( $args['blocks'] );

		$update_data = array(
			'ID'           => $post->ID,
			'post_content' => $content,
		);

		if ( $this->is_template_type( $post_type ) && 'auto-draft' === $post->post_status ) {
			$update_data['post_status'] = 'publish';
		}

		$result = wp_update_post( $update_data, true );

		if ( is_wp_error( $result ) ) {
			return $this->error( $result->get_error_message(), 'update_failed' );
		}

		$updated_post = get_post( $post->ID );
		$new_blocks   = parse_blocks( $updated_post->post_content );

		return $this->success(
			array(
				'id'               => $post->ID,
				'title'            => $updated_post->post_title ?: $updated_post->post_name,
				'type'             => $post_type,
				'block_count'      => $this->count_blocks( $new_blocks ),
				'revision_created' => $create_revision,
			),
			'Blocks updated successfully.'
		);
	}

	private function count_blocks( array $blocks ): int {
		$count = 0;
		foreach ( $blocks as $block ) {
			if ( ! empty( $block['blockName'] ) ) {
				++$count;
			}
			if ( ! empty( $block['innerBlocks'] ) ) {
				$count += $this->count_blocks( $block['innerBlocks'] );
			}
		}
		return $count;
	}
}
