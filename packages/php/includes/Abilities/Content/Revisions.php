<?php
/**
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Content;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\BlockResolutionTrait;

class Revisions extends AbstractAbility {

	use BlockResolutionTrait;

	public function get_category(): string {
		return 'wordforge-content';
	}

	public function get_title(): string {
		return __( 'Revisions', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'List, view, restore, or compare revisions for any entity (posts, pages, templates, navigations). ' .
			'USE: Undo changes, view edit history, compare versions, recover from AI edits. ' .
			'ACTIONS: list=all revisions, get=single revision content, restore=revert to revision, compare=diff two versions.',
			'wordforge'
		);
	}

	public function get_capability(): string|array {
		return array( 'edit_posts', 'edit_theme_options' );
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
						'slug'      => array( 'type' => 'string' ),
						'type'      => array( 'type' => 'string' ),
						'action'    => array( 'type' => 'string' ),
						'revisions' => array(
							'type'  => 'array',
							'items' => array(
								'type'       => 'object',
								'properties' => array(
									'id'      => array( 'type' => 'integer' ),
									'author'  => array( 'type' => 'integer' ),
									'date'    => array( 'type' => 'string' ),
									'title'   => array( 'type' => 'string' ),
									'excerpt' => array( 'type' => 'string' ),
								),
							),
						),
						'revision'  => array(
							'type'       => 'object',
							'properties' => array(
								'id'      => array( 'type' => 'integer' ),
								'author'  => array( 'type' => 'integer' ),
								'date'    => array( 'type' => 'string' ),
								'title'   => array( 'type' => 'string' ),
								'content' => array( 'type' => 'string' ),
								'excerpt' => array( 'type' => 'string' ),
								'blocks'  => array( 'type' => 'array' ),
							),
						),
						'diff'      => array(
							'type'       => 'object',
							'properties' => array(
								'from_id'         => array( 'type' => 'integer' ),
								'to_id'           => array( 'type' => 'integer' ),
								'title_changed'   => array( 'type' => 'boolean' ),
								'content_changed' => array( 'type' => 'boolean' ),
								'changes'         => array(
									'type'  => 'array',
									'items' => array(
										'type'       => 'object',
										'properties' => array(
											'field' => array( 'type' => 'string' ),
											'from'  => array( 'type' => 'string' ),
											'to'    => array( 'type' => 'string' ),
										),
									),
								),
							),
						),
						'restored'  => array( 'type' => 'boolean' ),
						'total'     => array( 'type' => 'integer' ),
					),
				),
				'message' => array( 'type' => 'string' ),
			),
		);
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'required'   => array( 'id' ),
			'properties' => array(
				'id'             => array(
					'type'        => 'string',
					'description' => 'Entity ID (numeric) or slug. Works with posts, pages, templates, navigations.',
				),
				'type'           => array(
					'type'        => 'string',
					'description' => 'Entity type. Required only if ID/slug is ambiguous.',
					'enum'        => array( 'post', 'page', 'wp_template', 'wp_template_part', 'wp_navigation', 'wp_block' ),
				),
				'revision_id'    => array(
					'type'        => 'integer',
					'description' => 'Specific revision ID. Required for get, restore, compare.',
					'minimum'     => 1,
				),
				'action'         => array(
					'type'        => 'string',
					'enum'        => array( 'list', 'get', 'restore', 'compare' ),
					'default'     => 'list',
					'description' => 'list=all revisions, get=single with content, restore=revert entity, compare=diff vs current or another revision.',
				),
				'compare_to'     => array(
					'type'        => 'integer',
					'description' => 'Revision ID to compare against. Defaults to current entity if omitted.',
					'minimum'     => 1,
				),
				'include_blocks' => array(
					'type'        => 'boolean',
					'description' => 'Include parsed blocks in get response.',
					'default'     => false,
				),
			),
		);
	}

	public function execute( array $args ): array {
		$resolution = $this->resolve_block_entity( (string) $args['id'], $args['type'] ?? null );

		if ( $resolution['error'] ) {
			$code = $resolution['ambiguous'] ? 'ambiguous_entity' : 'not_found';
			return $this->error( $resolution['error'], $code );
		}

		$post      = $resolution['post'];
		$post_type = $resolution['type'];

		if ( ! post_type_supports( $post_type, 'revisions' ) ) {
			return $this->error( "Post type '{$post_type}' does not support revisions.", 'revisions_not_supported' );
		}

		$capability = $this->get_edit_capability_for_type( $post_type );
		if ( $this->is_template_type( $post_type ) || $this->is_special_block_type( $post_type ) ) {
			if ( ! current_user_can( $capability ) ) {
				return $this->error( 'You do not have permission to view revisions for this entity.', 'forbidden' );
			}
		} elseif ( ! current_user_can( $capability, $post->ID ) ) {
			return $this->error( 'You do not have permission to view revisions for this entity.', 'forbidden' );
		}

		$action = $args['action'] ?? 'list';

		return match ( $action ) {
			'list'    => $this->list_revisions( $post, $post_type ),
			'get'     => $this->get_revision( $post, $post_type, $args ),
			'restore' => $this->restore_revision( $post, $post_type, $args ),
			'compare' => $this->compare_revisions( $post, $post_type, $args ),
			default   => $this->error( "Unknown action: {$action}", 'invalid_action' ),
		};
	}

	private function list_revisions( \WP_Post $post, string $post_type ): array {
		$revisions = wp_get_post_revisions(
			$post->ID,
			array(
				'order'          => 'DESC',
				'posts_per_page' => 50,
			)
		);

		$items = array();
		foreach ( $revisions as $revision ) {
			$items[] = array(
				'id'      => $revision->ID,
				'author'  => (int) $revision->post_author,
				'date'    => $revision->post_date,
				'title'   => $revision->post_title ?: '(no title)',
				'excerpt' => wp_trim_words( wp_strip_all_tags( $revision->post_content ), 20, '...' ),
			);
		}

		return $this->success(
			array(
				'id'        => $post->ID,
				'slug'      => $post->post_name,
				'type'      => $post_type,
				'action'    => 'list',
				'revisions' => $items,
				'total'     => count( $items ),
			),
			count( $items ) > 0
				? sprintf( 'Found %d revisions.', count( $items ) )
				: 'No revisions found.'
		);
	}

	private function get_revision( \WP_Post $post, string $post_type, array $args ): array {
		if ( empty( $args['revision_id'] ) ) {
			return $this->error( 'revision_id is required for action=get.', 'missing_revision_id' );
		}

		$revision_id = (int) $args['revision_id'];
		$revision    = wp_get_post_revision( $revision_id );

		if ( ! $revision ) {
			return $this->error( "Revision #{$revision_id} not found.", 'not_found' );
		}

		if ( (int) $revision->post_parent !== $post->ID ) {
			return $this->error( "Revision #{$revision_id} does not belong to this entity.", 'invalid_revision' );
		}

		$data = array(
			'id'      => $revision->ID,
			'author'  => (int) $revision->post_author,
			'date'    => $revision->post_date,
			'title'   => $revision->post_title,
			'content' => $revision->post_content,
			'excerpt' => $revision->post_excerpt,
		);

		if ( ! empty( $args['include_blocks'] ) ) {
			$data['blocks'] = parse_blocks( $revision->post_content );
		}

		return $this->success(
			array(
				'id'       => $post->ID,
				'slug'     => $post->post_name,
				'type'     => $post_type,
				'action'   => 'get',
				'revision' => $data,
			),
			"Retrieved revision #{$revision_id}."
		);
	}

	private function restore_revision( \WP_Post $post, string $post_type, array $args ): array {
		if ( empty( $args['revision_id'] ) ) {
			return $this->error( 'revision_id is required for action=restore.', 'missing_revision_id' );
		}

		$revision_id = (int) $args['revision_id'];
		$revision    = wp_get_post_revision( $revision_id );

		if ( ! $revision ) {
			return $this->error( "Revision #{$revision_id} not found.", 'not_found' );
		}

		if ( (int) $revision->post_parent !== $post->ID ) {
			return $this->error( "Revision #{$revision_id} does not belong to this entity.", 'invalid_revision' );
		}

		wp_save_post_revision( $post->ID );
		$restored = wp_restore_post_revision( $revision_id );

		if ( ! $restored ) {
			return $this->error( 'Failed to restore revision.', 'restore_failed' );
		}

		return $this->success(
			array(
				'id'       => $post->ID,
				'slug'     => $post->post_name,
				'type'     => $post_type,
				'action'   => 'restore',
				'restored' => true,
				'revision' => array(
					'id'   => $revision_id,
					'date' => $revision->post_date,
				),
			),
			"Restored to revision #{$revision_id}. Previous state saved as new revision."
		);
	}

	private function compare_revisions( \WP_Post $post, string $post_type, array $args ): array {
		if ( empty( $args['revision_id'] ) ) {
			return $this->error( 'revision_id is required for action=compare.', 'missing_revision_id' );
		}

		$revision_id = (int) $args['revision_id'];
		$revision    = wp_get_post_revision( $revision_id );

		if ( ! $revision ) {
			return $this->error( "Revision #{$revision_id} not found.", 'not_found' );
		}

		if ( (int) $revision->post_parent !== $post->ID ) {
			return $this->error( "Revision #{$revision_id} does not belong to this entity.", 'invalid_revision' );
		}

		$compare_to_id = $args['compare_to'] ?? null;
		if ( $compare_to_id ) {
			$compare_to = wp_get_post_revision( (int) $compare_to_id );
			if ( ! $compare_to ) {
				return $this->error( "Comparison revision #{$compare_to_id} not found.", 'not_found' );
			}
			if ( (int) $compare_to->post_parent !== $post->ID ) {
				return $this->error( "Comparison revision #{$compare_to_id} does not belong to this entity.", 'invalid_revision' );
			}
		} else {
			$compare_to    = $post;
			$compare_to_id = $post->ID;
		}

		$changes       = array();
		$title_changed = $revision->post_title !== $compare_to->post_title;
		if ( $title_changed ) {
			$changes[] = array(
				'field' => 'title',
				'from'  => $revision->post_title,
				'to'    => $compare_to->post_title,
			);
		}

		$content_changed = $revision->post_content !== $compare_to->post_content;
		if ( $content_changed ) {
			$changes[] = array(
				'field' => 'content',
				'from'  => wp_trim_words( wp_strip_all_tags( $revision->post_content ), 50, '...' ),
				'to'    => wp_trim_words( wp_strip_all_tags( $compare_to->post_content ), 50, '...' ),
			);
		}

		$excerpt_changed = $revision->post_excerpt !== $compare_to->post_excerpt;
		if ( $excerpt_changed ) {
			$changes[] = array(
				'field' => 'excerpt',
				'from'  => $revision->post_excerpt,
				'to'    => $compare_to->post_excerpt,
			);
		}

		return $this->success(
			array(
				'id'     => $post->ID,
				'slug'   => $post->post_name,
				'type'   => $post_type,
				'action' => 'compare',
				'diff'   => array(
					'from_id'         => $revision_id,
					'to_id'           => $compare_to_id,
					'title_changed'   => $title_changed,
					'content_changed' => $content_changed,
					'changes'         => $changes,
				),
			),
			count( $changes ) > 0
				? sprintf( 'Found %d field(s) changed.', count( $changes ) )
				: 'No differences found.'
		);
	}

	protected function is_read_only(): bool {
		return false;
	}

	protected function is_destructive(): bool {
		return true;
	}
}
