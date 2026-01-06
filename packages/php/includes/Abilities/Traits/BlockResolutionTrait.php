<?php
/**
 * Block Resolution Trait - Resolves ID/slug to block-enabled entities.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Traits;

/**
 * Provides resolution logic for finding block-enabled entities.
 */
trait BlockResolutionTrait {

	private const TEMPLATE_TYPES = array( 'wp_template', 'wp_template_part' );
	private const SPECIAL_BLOCK_TYPES = array( 'wp_block', 'wp_navigation' );

	/**
	 * @param string      $id   The ID (numeric string) or slug.
	 * @param string|null $type Optional explicit type to filter by.
	 * @return array{post: \WP_Post|null, type: string|null, error: string|null, ambiguous: array|null}
	 */
	protected function resolve_block_entity( string $id, ?string $type = null ): array {
		$matches = array();

		if ( is_numeric( $id ) ) {
			$post = get_post( (int) $id );

			if ( $post && $this->supports_blocks( $post->post_type ) ) {
				$matches[] = array(
					'post' => $post,
					'type' => $post->post_type,
				);
			}
		} else {
			$slug = sanitize_title( $id );

			$content_post = $this->find_content_by_slug( $slug, $type );
			if ( $content_post ) {
				$matches[] = array(
					'post' => $content_post,
					'type' => $content_post->post_type,
				);
			}

			$template_post = $this->find_template_by_slug( $slug, $type );
			if ( $template_post ) {
				$matches[] = array(
					'post' => $template_post,
					'type' => $template_post->post_type,
				);
			}

			$special_post = $this->find_special_block_type_by_slug( $slug, $type );
			if ( $special_post ) {
				$matches[] = array(
					'post' => $special_post,
					'type' => $special_post->post_type,
				);
			}
		}

		if ( $type && ! empty( $matches ) ) {
			$matches = array_values(
				array_filter(
					$matches,
					fn( $m ) => $m['type'] === $type || $this->type_matches_category( $m['type'], $type )
				)
			);
		}

		if ( empty( $matches ) ) {
			return array(
				'post'      => null,
				'type'      => null,
				'error'     => sprintf( 'No block-enabled entity found with ID or slug "%s".', $id ),
				'ambiguous' => null,
			);
		}

		if ( count( $matches ) === 1 ) {
			return array(
				'post'      => $matches[0]['post'],
				'type'      => $matches[0]['type'],
				'error'     => null,
				'ambiguous' => null,
			);
		}

		$types = array_map( fn( $m ) => $m['type'], $matches );
		return array(
			'post'      => null,
			'type'      => null,
			'error'     => sprintf(
				'Ambiguous: "%s" matches multiple entities: %s. Specify "type" parameter.',
				$id,
				implode( ', ', $types )
			),
			'ambiguous' => $types,
		);
	}

	/**
	 * Check if a post type supports the block editor.
	 */
	private function supports_blocks( string $post_type ): bool {
		if ( in_array( $post_type, self::TEMPLATE_TYPES, true ) ) {
			return true;
		}
		if ( in_array( $post_type, self::SPECIAL_BLOCK_TYPES, true ) ) {
			return true;
		}
		return post_type_supports( $post_type, 'editor' ) && use_block_editor_for_post_type( $post_type );
	}

	private function find_content_by_slug( string $slug, ?string $type = null ): ?\WP_Post {
		if ( $type && $this->is_non_content_type( $type ) ) {
			return null;
		}

		$post_types = $this->get_block_enabled_post_types();
		if ( $type && in_array( $type, $post_types, true ) ) {
			$post_types = array( $type );
		}

		$posts = get_posts(
			array(
				'name'           => $slug,
				'post_type'      => $post_types,
				'post_status'    => array( 'publish', 'draft', 'pending', 'private' ),
				'posts_per_page' => 1,
			)
		);

		return ! empty( $posts ) ? $posts[0] : null;
	}

	private function find_template_by_slug( string $slug, ?string $type = null ): ?\WP_Post {
		if ( $type && ! in_array( $type, self::TEMPLATE_TYPES, true ) && $type !== 'template' ) {
			return null;
		}

		$template_types = self::TEMPLATE_TYPES;
		if ( $type && in_array( $type, self::TEMPLATE_TYPES, true ) ) {
			$template_types = array( $type );
		}

		$templates = get_posts(
			array(
				'name'           => $slug,
				'post_type'      => $template_types,
				'post_status'    => array( 'publish', 'auto-draft' ),
				'posts_per_page' => 1,
			)
		);

		return ! empty( $templates ) ? $templates[0] : null;
	}

	private function find_special_block_type_by_slug( string $slug, ?string $type = null ): ?\WP_Post {
		if ( $type && ! in_array( $type, self::SPECIAL_BLOCK_TYPES, true ) ) {
			return null;
		}

		$block_types = self::SPECIAL_BLOCK_TYPES;
		if ( $type && in_array( $type, self::SPECIAL_BLOCK_TYPES, true ) ) {
			$block_types = array( $type );
		}

		$posts = get_posts(
			array(
				'name'           => $slug,
				'post_type'      => $block_types,
				'post_status'    => array( 'publish', 'draft' ),
				'posts_per_page' => 1,
			)
		);

		return ! empty( $posts ) ? $posts[0] : null;
	}

	private function get_block_enabled_post_types(): array {
		$types = array();
		foreach ( get_post_types( array( 'public' => true ), 'names' ) as $post_type ) {
			if ( $this->supports_blocks( $post_type ) ) {
				$types[] = $post_type;
			}
		}
		return $types ?: array( 'post', 'page' );
	}

	private function is_non_content_type( string $type ): bool {
		return in_array( $type, self::TEMPLATE_TYPES, true )
			|| in_array( $type, self::SPECIAL_BLOCK_TYPES, true );
	}

	private function type_matches_category( string $post_type, string $category ): bool {
		if ( $category === 'content' ) {
			return ! $this->is_non_content_type( $post_type );
		}
		if ( $category === 'template' ) {
			return in_array( $post_type, self::TEMPLATE_TYPES, true );
		}
		return false;
	}

	protected function get_edit_capability_for_type( string $post_type ): string {
		if ( in_array( $post_type, self::TEMPLATE_TYPES, true ) ) {
			return 'edit_theme_options';
		}
		if ( $post_type === 'wp_navigation' ) {
			return 'edit_theme_options';
		}
		return 'edit_post';
	}

	protected function is_template_type( string $post_type ): bool {
		return in_array( $post_type, self::TEMPLATE_TYPES, true );
	}

	protected function is_special_block_type( string $post_type ): bool {
		return in_array( $post_type, self::SPECIAL_BLOCK_TYPES, true );
	}

	protected function get_block_id_input_schema(): array {
		return array(
			'id'   => array(
				'type'        => 'string',
				'description' => 'Entity ID (numeric string like "123") or slug. Works with posts, pages, templates, reusable blocks, navigation menus.',
			),
			'type' => array(
				'type'        => 'string',
				'description' => 'Entity type. Required only if ID/slug matches multiple entities.',
				'enum'        => array( 'post', 'page', 'wp_template', 'wp_template_part', 'wp_block', 'wp_navigation' ),
			),
		);
	}
}
