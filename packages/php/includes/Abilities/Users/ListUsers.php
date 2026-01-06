<?php
/**
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Users;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\PaginationSchemaTrait;

class ListUsers extends AbstractAbility {

	use PaginationSchemaTrait;

	public function get_category(): string {
		return 'wordforge-users';
	}

	protected function is_read_only(): bool {
		return true;
	}

	public function get_title(): string {
		return __( 'Users', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Get a single user by ID, login, or email (with optional metadata/capabilities) or list users with filtering. ' .
			'USE: View user details, browse users, check roles. ' .
			'NOT FOR: Creating/editing users (not supported).',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'list_users';
	}

	public function get_output_schema(): array {
		return $this->get_pagination_output_schema(
			$this->get_user_item_schema(),
			'Array of users matching the query filters. Empty array if no matches found.'
		);
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array_merge(
				array(
					'id'           => array(
						'type'        => 'integer',
						'description' => 'User ID. When provided, returns full details for that single user. Omit to list users.',
						'minimum'     => 1,
					),
					'login'        => array(
						'type'        => 'string',
						'description' => 'Username to look up (alternative to id for single user).',
						'minLength'   => 1,
					),
					'email'        => array(
						'type'        => 'string',
						'description' => 'Email to look up (alternative to id for single user).',
						'format'      => 'email',
					),
					'include_meta' => array(
						'type'        => 'boolean',
						'description' => 'When fetching single user, include user metadata.',
						'default'     => false,
					),
					'include_caps' => array(
						'type'        => 'boolean',
						'description' => 'When fetching single user, include capabilities list.',
						'default'     => false,
					),
					'role'         => array(
						'type'        => 'string',
						'description' => 'Filter by user role slug (e.g., "administrator", "editor").',
					),
					'search'       => array(
						'type'        => 'string',
						'description' => 'Search users by name, email, or username.',
						'minLength'   => 1,
						'maxLength'   => 200,
					),
					'include'      => array(
						'type'        => 'array',
						'items'       => array( 'type' => 'integer' ),
						'description' => 'Array of specific user IDs to include.',
					),
					'exclude'      => array(
						'type'        => 'array',
						'items'       => array( 'type' => 'integer' ),
						'description' => 'Array of user IDs to exclude from results.',
					),
				),
				$this->get_pagination_input_schema(
					array( 'registered', 'display_name', 'login', 'email', 'id' )
				)
			),
		);
	}

	public function execute( array $args ): array {
		if ( ! empty( $args['id'] ) || ! empty( $args['login'] ) || ! empty( $args['email'] ) ) {
			return $this->get_single_user( $args );
		}

		return $this->list_users( $args );
	}

	protected function get_single_user( array $args ): array {
		$user = $this->find_user( $args );

		if ( ! $user ) {
			return $this->error( 'User not found.', 'not_found' );
		}

		$data = $this->format_user_detailed( $user );

		if ( ! empty( $args['include_meta'] ) ) {
			$data['meta'] = $this->get_user_meta( $user->ID );
		}

		if ( ! empty( $args['include_caps'] ) ) {
			$data['capabilities'] = array_keys( array_filter( $user->allcaps ) );
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

	protected function find_user( array $args ): ?\WP_User {
		if ( ! empty( $args['id'] ) ) {
			$user = get_user_by( 'id', (int) $args['id'] );
			return $user instanceof \WP_User ? $user : null;
		}

		if ( ! empty( $args['login'] ) ) {
			$user = get_user_by( 'login', sanitize_user( $args['login'] ) );
			return $user instanceof \WP_User ? $user : null;
		}

		if ( ! empty( $args['email'] ) ) {
			$user = get_user_by( 'email', sanitize_email( $args['email'] ) );
			return $user instanceof \WP_User ? $user : null;
		}

		return null;
	}

	protected function format_user_detailed( \WP_User $user ): array {
		return array(
			'id'           => $user->ID,
			'login'        => $user->user_login,
			'email'        => $user->user_email,
			'display_name' => $user->display_name,
			'first_name'   => $user->first_name,
			'last_name'    => $user->last_name,
			'nickname'     => $user->nickname,
			'description'  => $user->description,
			'roles'        => $user->roles,
			'registered'   => $user->user_registered,
			'url'          => $user->user_url,
			'avatar_url'   => get_avatar_url( $user->ID, array( 'size' => 96 ) ),
			'post_count'   => (int) count_user_posts( $user->ID ),
			'locale'       => get_user_locale( $user->ID ),
		);
	}

	protected function get_user_meta( int $user_id ): array {
		$all_meta = get_user_meta( $user_id );
		$filtered = array();

		$excluded_keys = array(
			'wp_capabilities',
			'wp_user_level',
			'session_tokens',
			'rich_editing',
			'syntax_highlighting',
			'comment_shortcuts',
			'admin_color',
			'use_ssl',
			'show_admin_bar_front',
			'locale',
			'dismissed_wp_pointers',
			'show_welcome_panel',
			'meta-box-order_dashboard',
			'metaboxhidden_dashboard',
			'closedpostboxes_dashboard',
			'managenav-menuscolumnshidden',
		);

		foreach ( $all_meta as $key => $value ) {
			if ( str_starts_with( $key, '_' ) ) {
				continue;
			}

			if ( in_array( $key, $excluded_keys, true ) ) {
				continue;
			}

			if ( preg_match( '/^[a-z0-9_]+_capabilities$/', $key ) || preg_match( '/^[a-z0-9_]+_user_level$/', $key ) ) {
				continue;
			}

			$filtered[ $key ] = maybe_unserialize( $value[0] ?? '' );
		}

		return $filtered;
	}

	protected function list_users( array $args ): array {
		$pagination = $this->normalize_pagination_args( $args );

		$query_args = array(
			'number'  => $pagination['per_page'],
			'paged'   => $pagination['page'],
			'orderby' => $this->map_orderby( $pagination['orderby'] ),
			'order'   => $pagination['order'],
		);

		if ( ! empty( $args['role'] ) ) {
			$query_args['role'] = sanitize_text_field( $args['role'] );
		}

		if ( ! empty( $args['search'] ) ) {
			$query_args['search']         = '*' . sanitize_text_field( $args['search'] ) . '*';
			$query_args['search_columns'] = array( 'user_login', 'user_email', 'user_nicename', 'display_name' );
		}

		if ( ! empty( $args['include'] ) ) {
			$query_args['include'] = array_map( 'absint', $args['include'] );
		}

		if ( ! empty( $args['exclude'] ) ) {
			$query_args['exclude'] = array_map( 'absint', $args['exclude'] );
		}

		$query = new \WP_User_Query( $query_args );

		$items = array_map(
			fn( \WP_User $user ) => $this->format_user( $user ),
			$query->get_results()
		);

		$total       = $query->get_total();
		$total_pages = (int) ceil( $total / $pagination['per_page'] );

		return $this->paginated_success( $items, $total, $total_pages, $pagination );
	}

	private function map_orderby( string $orderby ): string {
		$map = array(
			'registered'   => 'registered',
			'display_name' => 'display_name',
			'login'        => 'login',
			'email'        => 'email',
			'id'           => 'ID',
		);

		return $map[ $orderby ] ?? 'registered';
	}

	private function format_user( \WP_User $user ): array {
		return array(
			'id'           => $user->ID,
			'login'        => $user->user_login,
			'email'        => $user->user_email,
			'display_name' => $user->display_name,
			'first_name'   => $user->first_name,
			'last_name'    => $user->last_name,
			'nickname'     => $user->nickname,
			'roles'        => $user->roles,
			'registered'   => $user->user_registered,
			'url'          => $user->user_url,
			'avatar_url'   => get_avatar_url( $user->ID, array( 'size' => 96 ) ),
			'post_count'   => (int) count_user_posts( $user->ID ),
		);
	}

	private function get_user_item_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'id'           => array(
					'type'        => 'integer',
					'description' => 'Unique user ID',
				),
				'login'        => array(
					'type'        => 'string',
					'description' => 'User login/username',
				),
				'email'        => array(
					'type'        => 'string',
					'description' => 'User email address',
				),
				'display_name' => array(
					'type'        => 'string',
					'description' => 'Public display name',
				),
				'first_name'   => array(
					'type'        => 'string',
					'description' => 'First name',
				),
				'last_name'    => array(
					'type'        => 'string',
					'description' => 'Last name',
				),
				'nickname'     => array(
					'type'        => 'string',
					'description' => 'User nickname',
				),
				'roles'        => array(
					'type'        => 'array',
					'items'       => array( 'type' => 'string' ),
					'description' => 'Assigned roles',
				),
				'registered'   => array(
					'type'        => 'string',
					'description' => 'Registration date',
				),
				'url'          => array(
					'type'        => 'string',
					'description' => 'User website URL',
				),
				'avatar_url'   => array(
					'type'        => 'string',
					'description' => 'Avatar image URL',
				),
				'post_count'   => array(
					'type'        => 'integer',
					'description' => 'Number of published posts',
				),
			),
		);
	}
}
