<?php

declare(strict_types=1);

namespace WordForge\Abilities\Templates;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\BlockSerializerTrait;

class UpdateTemplate extends AbstractAbility {

	use BlockSerializerTrait;

	public function get_category(): string {
		return 'wordforge-templates';
	}

	public function get_title(): string {
		return __( 'Update Template', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Modify block template or template part content in Full Site Editing themes. ' .
			'CRITICAL WORKFLOW: You MUST call wordforge/get-template FIRST to retrieve the current structure. Analyze the existing blocks, ' .
			'modify only the necessary nodes, then submit the complete flat block list here. Blocks use clientId/parentClientId for nesting. ' .
			'Updates to theme templates create custom overrides (original preserved). Changes affect all pages using this template. FSE-only.',
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
				'blocks'      => $this->get_blocks_input_schema(),
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

		if ( isset( $args['blocks'] ) ) {
			$validation_error = $this->validate_blocks( $args['blocks'] );
			if ( $validation_error ) {
				return $this->error( $validation_error, 'invalid_blocks' );
			}
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
}
