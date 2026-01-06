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
		return __( 'Media', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Get a single media item by ID (full details with all sizes, EXIF metadata) or list media library items with filtering. ' .
			'USE: Get media details, browse library, find attachment IDs for content. ' .
			'NOT FOR: Uploading (use upload-media), updating (use update-media).',
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
					'id'         => array(
						'type'        => 'integer',
						'description' => 'Media/attachment ID. When provided, returns full details for that single item (all sizes, EXIF metadata). Omit to list media.',
					),
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
		if ( ! empty( $args['id'] ) ) {
			return $this->get_single_media( (int) $args['id'] );
		}

		return $this->list_media( $args );
	}

	protected function get_single_media( int $attachment_id ): array {
		$attachment = get_post( $attachment_id );

		if ( ! $attachment || 'attachment' !== $attachment->post_type ) {
			return $this->error( 'Media not found.', 'not_found' );
		}

		$metadata  = wp_get_attachment_metadata( $attachment_id );
		$file_path = get_attached_file( $attachment_id );

		$sizes = array();
		if ( wp_attachment_is_image( $attachment_id ) ) {
			$registered_sizes = get_intermediate_image_sizes();
			foreach ( $registered_sizes as $size ) {
				$image_data = wp_get_attachment_image_src( $attachment_id, $size );
				if ( $image_data ) {
					$sizes[ $size ] = array(
						'url'    => $image_data[0],
						'width'  => $image_data[1],
						'height' => $image_data[2],
					);
				}
			}
			$full_data = wp_get_attachment_image_src( $attachment_id, 'full' );
			if ( $full_data ) {
				$sizes['full'] = array(
					'url'    => $full_data[0],
					'width'  => $full_data[1],
					'height' => $full_data[2],
				);
			}
		}

		$data = array(
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
			'sizes'       => $sizes,
			'metadata'    => array(
				'image_meta' => $metadata['image_meta'] ?? array(),
			),
		);

		if ( isset( $metadata['width'] ) ) {
			$data['width'] = $metadata['width'];
		}
		if ( isset( $metadata['height'] ) ) {
			$data['height'] = $metadata['height'];
		}
		if ( file_exists( $file_path ) ) {
			$data['filesize'] = filesize( $file_path );
		}

		return $this->paginated_success(
			array( $data ),
			1,
			1,
			array(
				'page'     => 1,
				'per_page' => 1,
			)
		);
	}

	protected function list_media( array $args ): array {
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
