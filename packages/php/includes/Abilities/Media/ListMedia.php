<?php
/**
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Media;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\PaginationSchemaTrait;

class ListMedia extends AbstractAbility {

	use PaginationSchemaTrait;

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
		return __(
			'List media library items with filtering by MIME type, author, or parent post. Returns metadata only. ' .
			'USE: Browse media, find attachment IDs for content. ' .
			'NOT FOR: Full media details (use get-media), uploading (use upload-media).',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'upload_files';
	}

	public function get_output_schema(): array {
		return $this->get_pagination_output_schema(
			$this->get_media_item_schema(),
			'Array of media items.'
		);
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array_merge(
				array(
					'mime_type'  => array(
						'type'        => 'string',
						'description' => 'Filter by MIME type (image, video, audio, application, or specific like image/jpeg).',
					),
					'search'     => array(
						'type'        => 'string',
						'description' => 'Search term to filter media by title or filename.',
					),
					'author'     => array(
						'type'        => 'integer',
						'description' => 'Filter by author ID.',
					),
					'parent'     => array(
						'type'        => 'integer',
						'description' => 'Filter by parent post ID (attached to).',
					),
					'unattached' => array(
						'type'        => 'boolean',
						'description' => 'Only show unattached media.',
						'default'     => false,
					),
				),
				$this->get_pagination_input_schema(
					array( 'date', 'title', 'modified', 'id' )
				)
			),
		);
	}

	public function execute( array $args ): array {
		$pagination = $this->normalize_pagination_args( $args );

		$query_args = array(
			'post_type'      => 'attachment',
			'post_status'    => 'inherit',
			'posts_per_page' => $pagination['per_page'],
			'paged'          => $pagination['page'],
			'orderby'        => $pagination['orderby'],
			'order'          => $pagination['order'],
		);

		if ( ! empty( $args['mime_type'] ) ) {
			$query_args['post_mime_type'] = $args['mime_type'];
		}

		if ( ! empty( $args['search'] ) ) {
			$query_args['s'] = sanitize_text_field( $args['search'] );
		}

		if ( ! empty( $args['author'] ) ) {
			$query_args['author'] = (int) $args['author'];
		}

		if ( ! empty( $args['parent'] ) ) {
			$query_args['post_parent'] = (int) $args['parent'];
		}

		if ( ! empty( $args['unattached'] ) && $args['unattached'] ) {
			$query_args['post_parent'] = 0;
		}

		$query = new \WP_Query( $query_args );

		$items = array_map(
			fn( \WP_Post $attachment ) => $this->format_attachment( $attachment ),
			$query->posts
		);

		return $this->paginated_success( $items, $query->found_posts, $query->max_num_pages, $pagination );
	}

	protected function format_attachment( \WP_Post $attachment ): array {
		$metadata = wp_get_attachment_metadata( $attachment->ID );

		return array(
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
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function get_media_item_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'id'          => array( 'type' => 'integer' ),
				'title'       => array( 'type' => 'string' ),
				'filename'    => array( 'type' => 'string' ),
				'url'         => array( 'type' => 'string' ),
				'alt'         => array( 'type' => 'string' ),
				'caption'     => array( 'type' => 'string' ),
				'description' => array( 'type' => 'string' ),
				'mime_type'   => array( 'type' => 'string' ),
				'date'        => array( 'type' => 'string' ),
				'modified'    => array( 'type' => 'string' ),
				'author'      => array( 'type' => 'integer' ),
				'parent'      => array( 'type' => 'integer' ),
				'width'       => array( 'type' => 'integer' ),
				'height'      => array( 'type' => 'integer' ),
				'filesize'    => array( 'type' => 'integer' ),
			),
		);
	}
}
