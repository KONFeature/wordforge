<?php
/**
 * List Media Ability - List media library items with filtering.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Media;

use WordForge\Abilities\AbstractAbility;

/**
 * Ability to list media library items.
 */
class ListMedia extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-media';
	}

	protected function is_read_only(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'List Media', 'wordforge' );
	}

	public function get_description(): string {
		return __( 'List media library items (images, documents, videos) with filtering and pagination.', 'wordforge' );
	}

	public function get_capability(): string {
		return 'upload_files';
	}

	public function get_input_schema(): array {
		return [
			'type'       => 'object',
			'properties' => [
				'mime_type' => [
					'type'        => 'string',
					'description' => 'Filter by MIME type (image, video, audio, application, or specific like image/jpeg).',
				],
				'search' => [
					'type'        => 'string',
					'description' => 'Search term to filter media by title or filename.',
				],
				'per_page' => [
					'type'        => 'integer',
					'description' => 'Number of items per page.',
					'default'     => 20,
					'minimum'     => 1,
					'maximum'     => 100,
				],
				'page' => [
					'type'        => 'integer',
					'description' => 'Page number.',
					'default'     => 1,
					'minimum'     => 1,
				],
				'orderby' => [
					'type'        => 'string',
					'description' => 'Field to order by.',
					'enum'        => [ 'date', 'title', 'modified', 'id' ],
					'default'     => 'date',
				],
				'order' => [
					'type'        => 'string',
					'description' => 'Order direction.',
					'enum'        => [ 'asc', 'desc' ],
					'default'     => 'desc',
				],
				'author' => [
					'type'        => 'integer',
					'description' => 'Filter by author ID.',
				],
				'parent' => [
					'type'        => 'integer',
					'description' => 'Filter by parent post ID (attached to).',
				],
				'unattached' => [
					'type'        => 'boolean',
					'description' => 'Only show unattached media.',
					'default'     => false,
				],
			],
		];
	}

	public function execute( array $args ): array {
		$query_args = [
			'post_type'      => 'attachment',
			'post_status'    => 'inherit',
			'posts_per_page' => min( (int) ( $args['per_page'] ?? 20 ), 100 ),
			'paged'          => max( (int) ( $args['page'] ?? 1 ), 1 ),
			'orderby'        => $args['orderby'] ?? 'date',
			'order'          => strtoupper( $args['order'] ?? 'desc' ),
		];

		// MIME type filter.
		if ( ! empty( $args['mime_type'] ) ) {
			$query_args['post_mime_type'] = $args['mime_type'];
		}

		// Search filter.
		if ( ! empty( $args['search'] ) ) {
			$query_args['s'] = sanitize_text_field( $args['search'] );
		}

		// Author filter.
		if ( ! empty( $args['author'] ) ) {
			$query_args['author'] = (int) $args['author'];
		}

		// Parent filter.
		if ( ! empty( $args['parent'] ) ) {
			$query_args['post_parent'] = (int) $args['parent'];
		}

		// Unattached filter.
		if ( ! empty( $args['unattached'] ) && $args['unattached'] ) {
			$query_args['post_parent'] = 0;
		}

		$query = new \WP_Query( $query_args );

		$items = array_map(
			fn( \WP_Post $attachment ) => $this->format_attachment( $attachment ),
			$query->posts
		);

		return $this->success( [
			'items'       => $items,
			'total'       => $query->found_posts,
			'total_pages' => $query->max_num_pages,
			'page'        => $query_args['paged'],
			'per_page'    => $query_args['posts_per_page'],
		] );
	}

	/**
	 * Format attachment for response.
	 *
	 * @param \WP_Post $attachment The attachment post.
	 * @return array<string, mixed>
	 */
	protected function format_attachment( \WP_Post $attachment ): array {
		$metadata = wp_get_attachment_metadata( $attachment->ID );

		return [
			'id'          => $attachment->ID,
			'title'       => $attachment->post_title,
			'filename'    => basename( get_attached_file( $attachment->ID ) ),
			'url'         => wp_get_attachment_url( $attachment->ID ),
			'alt'         => get_post_meta( $attachment->ID, '_wp_attachment_image_alt', true ),
			'caption'     => $attachment->post_excerpt,
			'description' => $attachment->post_content,
			'mime_type'   => $attachment->post_mime_type,
			'date'        => $attachment->post_date,
			'modified'    => $attachment->post_modified,
			'author'      => (int) $attachment->post_author,
			'parent'      => $attachment->post_parent,
			'width'       => $metadata['width'] ?? null,
			'height'      => $metadata['height'] ?? null,
			'filesize'    => $metadata['filesize'] ?? null,
		];
	}
}
