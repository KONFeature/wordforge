<?php
/**
 * Delete Media Ability - Delete a media item from the library.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Media;

use WordForge\Abilities\AbstractAbility;

/**
 * Ability to delete media items.
 */
class DeleteMedia extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-media';
	}

	protected function is_destructive(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'Delete Media', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Permanently delete a media file from the WordPress media library. This action deletes the physical file from the server ' .
			'and removes all metadata. WARNING: This is irreversible and cannot be undone. If the media is used in posts, pages, or as ' .
			'a featured image, those references will break. Media files are always permanently deleted (no trash). Use with caution - ' .
			'consider checking where media is used before deletion.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'delete_posts';
	}

	public function get_output_schema(): array {
		return [
			'type'       => 'object',
			'properties' => [
				'success' => [ 'type' => 'boolean' ],
				'data'    => [
					'type'       => 'object',
					'properties' => [
						'id'       => [ 'type' => 'integer' ],
						'title'    => [ 'type' => 'string' ],
						'filename' => [ 'type' => 'string' ],
						'url'      => [ 'type' => 'string' ],
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
					'description' => 'The media/attachment ID to delete.',
				],
				'force' => [
					'type'        => 'boolean',
					'description' => 'Force permanent deletion (attachments are always permanently deleted).',
					'default'     => true,
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

		if ( ! current_user_can( 'delete_post', $attachment_id ) ) {
			return $this->error( 'You do not have permission to delete this media.', 'forbidden' );
		}

		// Store info before deletion.
		$deleted_info = [
			'id'       => $attachment_id,
			'title'    => $attachment->post_title,
			'filename' => basename( get_attached_file( $attachment_id ) ),
			'url'      => wp_get_attachment_url( $attachment_id ),
		];

		// Delete the attachment (always force delete for media).
		$result = wp_delete_attachment( $attachment_id, true );

		if ( ! $result ) {
			return $this->error( 'Failed to delete media.', 'delete_failed' );
		}

		return $this->success( $deleted_info, 'Media deleted successfully.' );
	}
}
