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
		$max_upload_mb = wp_max_upload_size() / 1048576;
		return __(
			sprintf(
				'Upload media (images, documents, videos, audio) to the WordPress media library. Auto-generates thumbnails and metadata. Max size: %.0fMB. ' .
				'STRICT: Provide EITHER "url" (publicly accessible URL to download from) OR "base64" (raw base64 data without data URI prefix). NEVER provide both.',
				$max_upload_mb
			),
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'upload_files';
	}

	public function get_output_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'success' => array( 'type' => 'boolean' ),
				'data'    => array(
					'type'       => 'object',
					'properties' => array(
						'id'        => array( 'type' => 'integer' ),
						'title'     => array( 'type' => 'string' ),
						'filename'  => array( 'type' => 'string' ),
						'url'       => array( 'type' => 'string' ),
						'mime_type' => array( 'type' => 'string' ),
						'alt'       => array( 'type' => 'string' ),
						'parent'    => array( 'type' => 'integer' ),
					),
				),
				'message' => array( 'type' => 'string' ),
			),
		);
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'required'   => array( 'filename' ),
			'properties' => array(
				'url'         => array(
					'type'        => 'string',
					'format'      => 'uri',
					'description' => 'URL to download file from. Must be publicly accessible. Provide "url" OR "base64", not both.',
					'pattern'     => '^https?://',
				),
				'base64'      => array(
					'type'        => 'string',
					'description' => 'Base64-encoded file content WITHOUT data URI prefix. Provide "url" OR "base64", not both.',
				),
				'filename'    => array(
					'type'        => 'string',
					'description' => 'Filename with extension, e.g., "photo.jpg". WordPress sanitizes and adds numbers if duplicate.',
					'pattern'     => '^[^/\\\\?%*:|"<>]+\\.[a-zA-Z0-9]+$',
					'minLength'   => 5,
					'maxLength'   => 255,
				),
				'title'       => array(
					'type'        => 'string',
					'description' => 'Media title shown in library. Auto-generated from filename if omitted.',
					'maxLength'   => 200,
				),
				'alt'         => array(
					'type'        => 'string',
					'description' => 'CRITICAL: Alt text for images (SEO/accessibility). Describe content, not filename.',
					'maxLength'   => 500,
				),
				'caption'     => array(
					'type'        => 'string',
					'description' => 'Caption displayed below image when inserted. Used for credits or context.',
					'maxLength'   => 500,
				),
				'description' => array(
					'type'        => 'string',
					'description' => 'Longer description visible in media library.',
					'maxLength'   => 2000,
				),
				'parent_id'   => array(
					'type'        => 'integer',
					'description' => 'Post/page ID to attach media to. Creates parent-child relationship.',
					'minimum'     => 1,
				),
			),
		);
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
		$attachment_data = array(
			'post_mime_type' => $filetype['type'],
			'post_title'     => $args['title'] ?? pathinfo( $filename, PATHINFO_FILENAME ),
			'post_content'   => $args['description'] ?? '',
			'post_excerpt'   => $args['caption'] ?? '',
			'post_status'    => 'inherit',
		);

		$parent_id     = $args['parent_id'] ?? 0;
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

		return $this->success(
			array(
				'id'        => $attachment_id,
				'title'     => $attachment->post_title,
				'filename'  => basename( $upload['file'] ),
				'url'       => $upload['url'],
				'mime_type' => $filetype['type'],
				'alt'       => $args['alt'] ?? '',
				'parent'    => $parent_id,
			),
			'Media uploaded successfully.'
		);
	}

	/**
	 * Download file from URL.
	 *
	 * @param string $url The URL to download from.
	 * @return string|false File contents or false on failure.
	 */
	private function download_from_url( string $url ) {
		$response = wp_remote_get(
			$url,
			array(
				'timeout' => 30,
			)
		);

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
