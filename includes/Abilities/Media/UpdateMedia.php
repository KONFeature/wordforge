<?php
/**
 * Update Media Ability - Update media metadata (alt text, title, caption).
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Media;

use WordForge\Abilities\AbstractAbility;

/**
 * Ability to update media metadata.
 */
class UpdateMedia extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-media';
	}

	public function get_title(): string {
		return __( 'Update Media', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Update media metadata including alt text, title, caption, description, and parent attachment. Supports partial updates - ' .
			'only provide fields you want to change. Alt text is CRITICAL for SEO and accessibility (screen readers). Captions appear ' .
			'below images in content. Use this to improve SEO, add accessibility information, or reorganize media by changing attachments. ' .
			'Cannot modify the actual file - only metadata.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'upload_files';
	}

	public function get_output_schema(): array {
		return [
			'type'       => 'object',
			'properties' => [
				'success' => [ 'type' => 'boolean' ],
				'data'    => [
					'type'       => 'object',
					'properties' => [
						'id'             => [ 'type' => 'integer' ],
						'title'          => [ 'type' => 'string' ],
						'alt'            => [ 'type' => 'string' ],
						'caption'        => [ 'type' => 'string' ],
						'description'    => [ 'type' => 'string' ],
						'parent'         => [ 'type' => 'integer' ],
						'updated_fields' => [ 'type' => 'array', 'items' => [ 'type' => 'string' ] ],
					],
				],
				'message' => [ 'type' => 'string' ],
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
					'type'        => 'integer',
					'description' => 'The media/attachment ID.',
				],
				'title' => [
					'type'        => 'string',
					'description' => 'Media title.',
				],
				'alt' => [
					'type'        => 'string',
					'description' => 'Alt text for images (critical for SEO and accessibility).',
				],
				'caption' => [
					'type'        => 'string',
					'description' => 'Media caption (displayed below images).',
				],
				'description' => [
					'type'        => 'string',
					'description' => 'Media description.',
				],
				'parent_id' => [
					'type'        => 'integer',
					'description' => 'Post ID to attach the media to (0 to detach).',
				],
			],
		];
	}

	public function execute( array $args ): array {
		$attachment_id = (int) $args['id'];
		$attachment = get_post( $attachment_id );

		if ( ! $attachment || 'attachment' !== $attachment->post_type ) {
			return $this->error( 'Media not found.', 'not_found' );
		}

		if ( ! current_user_can( 'edit_post', $attachment_id ) ) {
			return $this->error( 'You do not have permission to edit this media.', 'forbidden' );
		}

		$update_data = [ 'ID' => $attachment_id ];
		$updated_fields = [];

		// Update title.
		if ( isset( $args['title'] ) ) {
			$update_data['post_title'] = sanitize_text_field( $args['title'] );
			$updated_fields[] = 'title';
		}

		// Update caption (excerpt).
		if ( isset( $args['caption'] ) ) {
			$update_data['post_excerpt'] = sanitize_textarea_field( $args['caption'] );
			$updated_fields[] = 'caption';
		}

		// Update description (content).
		if ( isset( $args['description'] ) ) {
			$update_data['post_content'] = wp_kses_post( $args['description'] );
			$updated_fields[] = 'description';
		}

		// Update parent.
		if ( isset( $args['parent_id'] ) ) {
			$update_data['post_parent'] = (int) $args['parent_id'];
			$updated_fields[] = 'parent';
		}

		// Update post data.
		if ( count( $update_data ) > 1 ) {
			$result = wp_update_post( $update_data, true );
			if ( is_wp_error( $result ) ) {
				return $this->error( $result->get_error_message(), 'update_failed' );
			}
		}

		// Update alt text (stored as post meta).
		if ( isset( $args['alt'] ) ) {
			update_post_meta( $attachment_id, '_wp_attachment_image_alt', sanitize_text_field( $args['alt'] ) );
			$updated_fields[] = 'alt';
		}

		// Get updated attachment.
		$updated = get_post( $attachment_id );

		return $this->success( [
			'id'             => $attachment_id,
			'title'          => $updated->post_title,
			'alt'            => get_post_meta( $attachment_id, '_wp_attachment_image_alt', true ),
			'caption'        => $updated->post_excerpt,
			'description'    => $updated->post_content,
			'parent'         => $updated->post_parent,
			'updated_fields' => $updated_fields,
		], 'Media updated successfully.' );
	}
}
