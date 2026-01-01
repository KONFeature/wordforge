<?php

declare(strict_types=1);

namespace WordForge\Abilities\Content;

use WordForge\Abilities\AbstractAbility;

class SaveContent extends AbstractAbility {

	public function get_category(): string {
		return 'wordforge-content';
	}

	public function get_title(): string {
		return __( 'Save Content', 'wordforge' );
	}

	public function get_description(): string {
		return __( 'Create or update a post, page, or custom post type. Provide "id" to update, omit to create.', 'wordforge' );
	}

	public function get_capability(): string|array {
		return array( 'edit_posts', 'publish_posts' );
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
						'created'   => array(
							'type'        => 'boolean',
							'description' => 'True if new content was created.',
						),
						'title'     => array( 'type' => 'string' ),
						'slug'      => array( 'type' => 'string' ),
						'status'    => array( 'type' => 'string' ),
						'type'      => array( 'type' => 'string' ),
						'permalink' => array( 'type' => 'string' ),
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
			'required'   => array( 'title' ),
			'properties' => array(
				'id'             => array(
					'type'        => 'integer',
					'description' => 'Post ID to update. Omit to create new.',
					'minimum'     => 1,
				),
				'title'          => array(
					'type' => 'string',
				),
				'content'        => array(
					'type'        => 'string',
					'description' => 'HTML or Gutenberg blocks.',
				),
				'excerpt'        => array(
					'type'        => 'string',
					'description' => 'Short summary for archives.',
				),
				'post_type'      => array(
					'type'        => 'string',
					'description' => '"post", "page", or custom post type slug.',
					'default'     => 'post',
				),
				'status'         => array(
					'type'    => 'string',
					'enum'    => array( 'publish', 'draft', 'pending', 'private', 'trash' ),
					'default' => 'draft',
				),
				'slug'           => array(
					'type'        => 'string',
					'description' => 'URL slug. Auto-generated if omitted.',
				),
				'parent'         => array(
					'type'        => 'integer',
					'description' => 'Parent post ID for hierarchical types (pages).',
					'minimum'     => 0,
				),
				'menu_order'     => array(
					'type'        => 'integer',
					'description' => 'Sort order for pages.',
					'default'     => 0,
				),
				'featured_image' => array(
					'type'        => 'integer',
					'description' => 'Attachment ID. Set 0 to remove.',
					'minimum'     => 0,
				),
				'categories'     => array(
					'type'        => 'array',
					'description' => 'Category IDs or slugs. Replaces existing.',
					'items'       => array(
						'oneOf' => array(
							array(
								'type'    => 'integer',
								'minimum' => 1,
							),
							array( 'type' => 'string' ),
						),
					),
				),
				'tags'           => array(
					'type'        => 'array',
					'description' => 'Tag names or slugs. Replaces existing.',
					'items'       => array( 'type' => 'string' ),
				),
				'meta'           => array(
					'type'                 => 'object',
					'description'          => 'Custom fields. Set value to null to delete.',
					'additionalProperties' => true,
				),
			),
		);
	}

	public function execute( array $args ): array {
		$id        = $args['id'] ?? null;
		$is_update = (bool) $id;

		if ( $is_update ) {
			$post = get_post( (int) $id );
			if ( ! $post ) {
				return $this->error(
					"Content #{$id} not found. Omit 'id' to create new.",
					'not_found'
				);
			}

			if ( ! current_user_can( 'edit_post', $id ) ) {
				return $this->error( 'You do not have permission to edit this content.', 'forbidden' );
			}

			$post_type = $post->post_type;
		} else {
			$post_type = $args['post_type'] ?? 'post';

			if ( ! post_type_exists( $post_type ) ) {
				return $this->error( sprintf( 'Post type "%s" does not exist.', $post_type ), 'invalid_post_type' );
			}

			$post_type_obj = get_post_type_object( $post_type );
			if ( ! current_user_can( $post_type_obj->cap->publish_posts ) ) {
				return $this->error( 'You do not have permission to create this content type.', 'forbidden' );
			}
		}

		$post_data = $is_update ? array( 'ID' => (int) $id ) : array(
			'post_type'   => $post_type,
			'post_status' => $args['status'] ?? 'draft',
			'post_author' => get_current_user_id(),
		);

		if ( isset( $args['title'] ) ) {
			$post_data['post_title'] = sanitize_text_field( $args['title'] );
		}

		if ( isset( $args['content'] ) ) {
			$post_data['post_content'] = wp_kses_post( $args['content'] );
		}

		if ( isset( $args['excerpt'] ) ) {
			$post_data['post_excerpt'] = sanitize_textarea_field( $args['excerpt'] );
		}

		if ( isset( $args['status'] ) ) {
			$post_data['post_status'] = $args['status'];
		}

		if ( isset( $args['slug'] ) ) {
			$post_data['post_name'] = sanitize_title( $args['slug'] );
		}

		if ( isset( $args['parent'] ) ) {
			$post_data['post_parent'] = (int) $args['parent'];
		}

		if ( isset( $args['menu_order'] ) ) {
			$post_data['menu_order'] = (int) $args['menu_order'];
		}

		$result = $is_update
			? wp_update_post( $post_data, true )
			: wp_insert_post( $post_data, true );

		if ( is_wp_error( $result ) ) {
			return $this->error( $result->get_error_message(), $is_update ? 'update_failed' : 'insert_failed' );
		}

		$post_id = $is_update ? (int) $id : $result;

		if ( array_key_exists( 'featured_image', $args ) ) {
			if ( $args['featured_image'] === 0 || $args['featured_image'] === null ) {
				delete_post_thumbnail( $post_id );
			} else {
				set_post_thumbnail( $post_id, (int) $args['featured_image'] );
			}
		}

		$effective_post_type = $is_update ? $post_type : ( $args['post_type'] ?? 'post' );

		if ( isset( $args['categories'] ) && 'post' === $effective_post_type ) {
			$this->set_categories( $post_id, $args['categories'] );
		}

		if ( isset( $args['tags'] ) && 'post' === $effective_post_type ) {
			wp_set_post_tags( $post_id, $args['tags'] );
		}

		if ( ! empty( $args['meta'] ) && is_array( $args['meta'] ) ) {
			foreach ( $args['meta'] as $key => $value ) {
				if ( $value === null ) {
					delete_post_meta( $post_id, sanitize_key( $key ) );
				} else {
					update_post_meta( $post_id, sanitize_key( $key ), $value );
				}
			}
		}

		$saved_post = get_post( $post_id );

		return $this->success(
			array(
				'id'        => $saved_post->ID,
				'created'   => ! $is_update,
				'title'     => $saved_post->post_title,
				'slug'      => $saved_post->post_name,
				'status'    => $saved_post->post_status,
				'type'      => $saved_post->post_type,
				'permalink' => get_permalink( $saved_post->ID ),
			),
			$is_update ? 'Content updated successfully.' : 'Content created successfully.'
		);
	}

	private function set_categories( int $post_id, array $categories ): void {
		$category_ids = array();

		foreach ( $categories as $cat ) {
			if ( is_numeric( $cat ) ) {
				$category_ids[] = (int) $cat;
			} else {
				$term = get_term_by( 'slug', $cat, 'category' );
				if ( $term ) {
					$category_ids[] = $term->term_id;
				}
			}
		}

		wp_set_post_categories( $post_id, $category_ids );
	}
}
