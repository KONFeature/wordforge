<?php
/**
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Media;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\DeletePatternTrait;

class DeleteMedia extends AbstractAbility {

	use DeletePatternTrait;

	public function get_category(): string {
		return 'wordforge-media';
	}

	public function get_title(): string {
		return __( 'Delete Media', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Permanently delete a media file. Removes the physical file and all metadata. WARNING: Cannot be undone; ' .
			'references in posts/pages will break. No trash for media - always permanent.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'delete_posts';
	}

	public function get_input_schema(): array {
		return $this->get_delete_input_schema( false, 'media' );
	}

	public function get_output_schema(): array {
		return $this->get_delete_output_schema(
			array(
				'title'    => array( 'type' => 'string' ),
				'filename' => array( 'type' => 'string' ),
				'url'      => array( 'type' => 'string' ),
			),
			false
		);
	}

	public function execute( array $args ): array {
		$attachment_id = (int) $args['id'];
		$attachment    = get_post( $attachment_id );

		if ( ! $attachment || 'attachment' !== $attachment->post_type ) {
			return $this->delete_not_found( 'Media' );
		}

		if ( ! current_user_can( 'delete_post', $attachment_id ) ) {
			return $this->delete_forbidden( 'this media' );
		}

		$deleted_info = array(
			'title'    => $attachment->post_title,
			'filename' => basename( get_attached_file( $attachment_id ) ),
			'url'      => wp_get_attachment_url( $attachment_id ),
		);

		$result = wp_delete_attachment( $attachment_id, true );

		if ( ! $result ) {
			return $this->delete_failed( 'media' );
		}

		return $this->success(
			array_merge(
				array(
					'id'      => $attachment_id,
					'deleted' => true,
				),
				$deleted_info
			),
			'Media deleted successfully.'
		);
	}
}
