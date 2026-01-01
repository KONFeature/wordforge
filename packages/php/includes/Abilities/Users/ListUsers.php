<?php
/**
 * List Users Ability - List WordPress users with filtering.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Users;

use WordForge\Abilities\AbstractAbility;
use WordForge\Abilities\Traits\PaginationSchemaTrait;

/**
 * List WordPress users with role filtering, search, and pagination.
 */
class ListUsers extends AbstractAbility {

	use PaginationSchemaTrait;

	/**
	 * Get the category slug.
	 *
	 * @return string
	 */
	public function get_category(): string {
		return 'wordforge-users';
	}

	/**
	 * This ability only reads data.
	 *
	 * @return bool
	 */
	protected function is_read_only(): bool {
		return true;
	}

	/**
	 * Get the ability title.
	 *
	 * @return string
	 */
	public function get_title(): string {
		return __( 'List Users', 'wordforge' );
	}

	/**
	 * Get the ability description.
	 *
	 * @return string
	 */
	public function get_description(): string {
		return __(
			'Retrieve a list of WordPress users with powerful filtering options. Filter by role (administrator, editor, author, ' .
			'contributor, subscriber, or custom roles), search by name/email, and sort by various fields. Supports pagination for ' .
			'sites with many users. Use this to browse user accounts, find specific users, or audit role assignments. Returns up ' .
			'to 100 users per page with user details excluding sensitive information like passwords.',
			'wordforge'
		);
	}

	/**
	 * Get the required capability.
	 *
	 * @return string
	 */
	public function get_capability(): string {
		return 'list_users';
	}

	/**
	 * Get the output schema.
	 *
	 * @return array<string, mixed>
	 */
	public function get_output_schema(): array {
		return $this->get_pagination_output_schema(
			$this->get_user_item_schema(),
			'Array of users matching the query filters. Empty array if no matches found.'
		);
	}

	/**
	 * Get the input schema.
	 *
	 * @return array<string, mixed>
	 */
	public function get_input_schema(): array {
		return [
			'type'       => 'object',
			'properties' => array_merge(
				[
					'role'   => [
						'type'        => 'string',
						'description' => 'Filter by user role slug (e.g., "administrator", "editor", "author", "subscriber").',
					],
					'search' => [
						'type'        => 'string',
						'description' => 'Search users by name, email, or username. Searches across display name, user login, email, and nicename.',
						'minLength'   => 1,
						'maxLength'   => 200,
					],
					'include' => [
						'type'        => 'array',
						'items'       => [ 'type' => 'integer' ],
						'description' => 'Array of specific user IDs to include.',
					],
					'exclude' => [
						'type'        => 'array',
						'items'       => [ 'type' => 'integer' ],
						'description' => 'Array of user IDs to exclude from results.',
					],
				],
				$this->get_pagination_input_schema(
					[ 'registered', 'display_name', 'login', 'email', 'id' ]
				)
			),
		];
	}

	/**
	 * Execute the ability.
	 *
	 * @param array<string, mixed> $args The input arguments.
	 * @return array<string, mixed>
	 */
	public function execute( array $args ): array {
		$pagination = $this->normalize_pagination_args( $args );

		$query_args = [
			'number'  => $pagination['per_page'],
			'paged'   => $pagination['page'],
			'orderby' => $this->map_orderby( $pagination['orderby'] ),
			'order'   => $pagination['order'],
		];

		if ( ! empty( $args['role'] ) ) {
			$query_args['role'] = sanitize_text_field( $args['role'] );
		}

		if ( ! empty( $args['search'] ) ) {
			$query_args['search']         = '*' . sanitize_text_field( $args['search'] ) . '*';
			$query_args['search_columns'] = [ 'user_login', 'user_email', 'user_nicename', 'display_name' ];
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

	/**
	 * Map orderby field to WP_User_Query format.
	 *
	 * @param string $orderby The orderby field.
	 * @return string
	 */
	private function map_orderby( string $orderby ): string {
		$map = [
			'registered'   => 'registered',
			'display_name' => 'display_name',
			'login'        => 'login',
			'email'        => 'email',
			'id'           => 'ID',
		];

		return $map[ $orderby ] ?? 'registered';
	}

	/**
	 * Format a user for response.
	 *
	 * @param \WP_User $user The user object.
	 * @return array<string, mixed>
	 */
	private function format_user( \WP_User $user ): array {
		return [
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
			'avatar_url'   => get_avatar_url( $user->ID, [ 'size' => 96 ] ),
			'post_count'   => count_user_posts( $user->ID ),
		];
	}

	/**
	 * Get the user item schema.
	 *
	 * @return array<string, mixed>
	 */
	private function get_user_item_schema(): array {
		return [
			'type'       => 'object',
			'properties' => [
				'id'           => [ 'type' => 'integer', 'description' => 'Unique user ID' ],
				'login'        => [ 'type' => 'string', 'description' => 'User login/username' ],
				'email'        => [ 'type' => 'string', 'description' => 'User email address' ],
				'display_name' => [ 'type' => 'string', 'description' => 'Public display name' ],
				'first_name'   => [ 'type' => 'string', 'description' => 'First name' ],
				'last_name'    => [ 'type' => 'string', 'description' => 'Last name' ],
				'nickname'     => [ 'type' => 'string', 'description' => 'User nickname' ],
				'roles'        => [ 'type' => 'array', 'items' => [ 'type' => 'string' ], 'description' => 'Assigned roles' ],
				'registered'   => [ 'type' => 'string', 'description' => 'Registration date' ],
				'url'          => [ 'type' => 'string', 'description' => 'User website URL' ],
				'avatar_url'   => [ 'type' => 'string', 'description' => 'Avatar image URL' ],
				'post_count'   => [ 'type' => 'integer', 'description' => 'Number of published posts' ],
			],
		];
	}
}
