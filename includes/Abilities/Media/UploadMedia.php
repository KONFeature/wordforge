<?php
/**
 * Upload Media Ability - Upload media from URL or base64.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Media;

use WordForge\Abilities\AbstractAbility;

/**
 * Ability to upload media to the library.
 */
class UploadMedia extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-media';
	}

	public function get_title(): string {
		return __( 'Upload Media', 'wordforge' );
	}

	public function get_description(): string {
		return __( 'Upload media to the library from a URL or base64 encoded data.', 'wordforge' );
	}

	public function get_capability(): string {
		return 'upload_files';
	}

	public function get_input_schema(): array {
		return [
			'type'       => 'object',
			'required'   => [ 'filename' ],
			'properties' => [
				'url' => [
					'type'        => 'string',
					'description' => 'URL to download the media from.',
				],
				'base64' => [
					'type'        => 'string',
					'description' => 'Base64 encoded file content (without data URI prefix).',
				],
				'filename' => [
					'type'        => 'string',
					'description' => 'Desired filename for the uploaded media.',
				],
				'title' => [
					'type'        => 'string',
					'description' => 'Media title.',
				],
				'alt' => [
					'type'        => 'string',
					'description' => 'Alt text for images (important for SEO and accessibility).',
				],
				'caption' => [
					'type'        => 'string',
					'description' => 'Media caption.',
				],
				'description' => [
					'type'        => 'string',
					'description' => 'Media description.',
				],
				'parent_id' => [
					'type'        => 'integer',
					'description' => 'Post ID to attach the media to.',
				],
			],
		];
	}

	public function execute( array $args ): array {
		if ( empty( $args['url'] ) && empty( $args['base64'] ) ) {
			return $this->error( 'Either url or base64 is required.', 'missing_source' );
		}

		$filename = sanitize_file_name( $args['filename'] );

		// Get file content.
		if ( ! empty( $args['url'] ) ) {
			$file_content = $this->download_from_url( $args['url'] );
		} else {
			$file_content = base64_decode( $args['base64'], true );
		}

		if ( false === $file_content || empty( $file_content ) ) {
			return $this->error( 'Failed to get file content.', 'download_failed' );
		}

		// Upload the file.
		$upload = wp_upload_bits( $filename, null, $file_content );

		if ( $upload['error'] ) {
			return $this->error( $upload['error'], 'upload_failed' );
		}

		// Get MIME type.
		$filetype = wp_check_filetype( $upload['file'] );
		if ( ! $filetype['type'] ) {
			wp_delete_file( $upload['file'] );
			return $this->error( 'Invalid file type.', 'invalid_type' );
		}

		// Create attachment post.
		$attachment_data = [
			'post_mime_type' => $filetype['type'],
			'post_title'     => $args['title'] ?? pathinfo( $filename, PATHINFO_FILENAME ),
			'post_content'   => $args['description'] ?? '',
			'post_excerpt'   => $args['caption'] ?? '',
			'post_status'    => 'inherit',
		];

		$parent_id = $args['parent_id'] ?? 0;
		$attachment_id = wp_insert_attachment( $attachment_data, $upload['file'], $parent_id );

		if ( is_wp_error( $attachment_id ) ) {
			wp_delete_file( $upload['file'] );
			return $this->error( $attachment_id->get_error_message(), 'insert_failed' );
		}

		// Generate attachment metadata.
		require_once ABSPATH . 'wp-admin/includes/image.php';
		$metadata = wp_generate_attachment_metadata( $attachment_id, $upload['file'] );
		wp_update_attachment_metadata( $attachment_id, $metadata );

		// Set alt text if provided.
		if ( ! empty( $args['alt'] ) ) {
			update_post_meta( $attachment_id, '_wp_attachment_image_alt', sanitize_text_field( $args['alt'] ) );
		}

		$attachment = get_post( $attachment_id );

		return $this->success( [
			'id'        => $attachment_id,
			'title'     => $attachment->post_title,
			'filename'  => basename( $upload['file'] ),
			'url'       => $upload['url'],
			'mime_type' => $filetype['type'],
			'alt'       => $args['alt'] ?? '',
			'parent'    => $parent_id,
		], 'Media uploaded successfully.' );
	}

	/**
	 * Download file from URL.
	 *
	 * @param string $url The URL to download from.
	 * @return string|false File contents or false on failure.
	 */
	private function download_from_url( string $url ) {
		$response = wp_remote_get( $url, [
			'timeout' => 30,
		] );

		if ( is_wp_error( $response ) ) {
			return false;
		}

		$code = wp_remote_retrieve_response_code( $response );
		if ( 200 !== $code ) {
			return false;
		}

		return wp_remote_retrieve_body( $response );
	}
}
