<?php
/**
 * Get Media Ability - Get details of a specific media item.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Media;

use WordForge\Abilities\AbstractAbility;

/**
 * Ability to get media item details.
 */
class GetMedia extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-media';
	}

	protected function is_read_only(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'Get Media', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Retrieve complete details about a specific media item (image, document, video, etc.) including all available ' .
			'image sizes, dimensions, file information, and EXIF metadata. For images, returns URLs for all registered sizes ' .
			'(thumbnail, medium, large, full, etc.). Use this to get media URLs for inserting into content, check file details, ' .
			'or retrieve metadata before updates.',
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
						'id'          => [ 'type' => 'integer' ],
						'title'       => [ 'type' => 'string' ],
						'filename'    => [ 'type' => 'string' ],
						'url'         => [ 'type' => 'string' ],
						'alt'         => [ 'type' => 'string' ],
						'caption'     => [ 'type' => 'string' ],
						'description' => [ 'type' => 'string' ],
						'mime_type'   => [ 'type' => 'string' ],
						'date'        => [ 'type' => 'string' ],
						'modified'    => [ 'type' => 'string' ],
						'author'      => [ 'type' => 'integer' ],
						'parent'      => [ 'type' => 'integer' ],
						'width'       => [ 'type' => [ 'integer', 'null' ] ],
						'height'      => [ 'type' => [ 'integer', 'null' ] ],
						'filesize'    => [ 'type' => [ 'integer', 'null' ] ],
						'sizes'       => [ 'type' => 'object', 'additionalProperties' => true ],
						'metadata'    => [ 'type' => 'object', 'additionalProperties' => true ],
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
					'type'        => 'integer',
					'description' => 'The media/attachment ID.',
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

		$metadata = wp_get_attachment_metadata( $attachment_id );
		$file_path = get_attached_file( $attachment_id );

		// Get all registered image sizes.
		$sizes = [];
		if ( wp_attachment_is_image( $attachment_id ) ) {
			$registered_sizes = get_intermediate_image_sizes();
			foreach ( $registered_sizes as $size ) {
				$image_data = wp_get_attachment_image_src( $attachment_id, $size );
				if ( $image_data ) {
					$sizes[ $size ] = [
						'url'    => $image_data[0],
						'width'  => $image_data[1],
						'height' => $image_data[2],
					];
				}
			}
			// Add full size.
			$full_data = wp_get_attachment_image_src( $attachment_id, 'full' );
			if ( $full_data ) {
				$sizes['full'] = [
					'url'    => $full_data[0],
					'width'  => $full_data[1],
					'height' => $full_data[2],
				];
			}
		}

		return $this->success( [
			'id'          => $attachment_id,
			'title'       => $attachment->post_title,
			'filename'    => basename( $file_path ),
			'url'         => wp_get_attachment_url( $attachment_id ),
			'alt'         => get_post_meta( $attachment_id, '_wp_attachment_image_alt', true ),
			'caption'     => $attachment->post_excerpt,
			'description' => $attachment->post_content,
			'mime_type'   => $attachment->post_mime_type,
			'date'        => $attachment->post_date,
			'modified'    => $attachment->post_modified,
			'author'      => (int) $attachment->post_author,
			'parent'      => $attachment->post_parent,
			'width'       => $metadata['width'] ?? null,
			'height'      => $metadata['height'] ?? null,
			'filesize'    => file_exists( $file_path ) ? filesize( $file_path ) : null,
			'sizes'       => $sizes,
			'metadata'    => [
				'image_meta' => $metadata['image_meta'] ?? [],
			],
		] );
	}
}
