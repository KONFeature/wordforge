<?php
/**
 * Get User Ability - Get a single WordPress user.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Users;

use WordForge\Abilities\AbstractAbility;

/**
 * Get detailed information about a WordPress user.
 */
class GetUser extends AbstractAbility {

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
		return __( 'Get User', 'wordforge' );
	}

	/**
	 * Get the ability description.
	 *
	 * @return string
	 */
	public function get_description(): string {
		return __(
			'Retrieve detailed information about a specific WordPress user. Look up by user ID, username (login), or email address. ' .
			'Returns complete profile information including roles, capabilities, registration date, and optional metadata. Use this to ' .
			'view user details, check role assignments, or gather information before making user-related changes. Sensitive data like ' .
			'passwords is never exposed.',
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
	 * Get the input schema.
	 *
	 * @return array<string, mixed>
	 */
	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'oneOf'      => array(
				array( 'required' => array( 'id' ) ),
				array( 'required' => array( 'login' ) ),
				array( 'required' => array( 'email' ) ),
			),
			'properties' => array(
				'id'           => array(
					'type'        => 'integer',
					'description' => 'User ID to retrieve.',
					'minimum'     => 1,
				),
				'login'        => array(
					'type'        => 'string',
					'description' => 'Username (login) to look up.',
					'minLength'   => 1,
				),
				'email'        => array(
					'type'        => 'string',
					'description' => 'Email address to look up.',
					'format'      => 'email',
				),
				'include_meta' => array(
					'type'        => 'boolean',
					'description' => 'Include user metadata (custom fields) in the response.',
					'default'     => false,
				),
				'include_caps' => array(
					'type'        => 'boolean',
					'description' => 'Include detailed capability list in the response.',
					'default'     => false,
				),
			),
		);
	}

	/**
	 * Execute the ability.
	 *
	 * @param array<string, mixed> $args The input arguments.
	 * @return array<string, mixed>
	 */
	public function execute( array $args ): array {
		$user = $this->find_user( $args );

		if ( ! $user ) {
			return $this->error( 'User not found.', 'not_found' );
		}

		$data = $this->format_user( $user );

		if ( ! empty( $args['include_meta'] ) ) {
			$data['meta'] = $this->get_user_meta( $user->ID );
		}

		if ( ! empty( $args['include_caps'] ) ) {
			$data['capabilities'] = array_keys( array_filter( $user->allcaps ) );
		}

		return $this->success( $data );
	}

	/**
	 * Find a user by ID, login, or email.
	 *
	 * @param array<string, mixed> $args The input arguments.
	 * @return \WP_User|null
	 */
	private function find_user( array $args ): ?\WP_User {
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

	/**
	 * Format a user for response.
	 *
	 * @param \WP_User $user The user object.
	 * @return array<string, mixed>
	 */
	private function format_user( \WP_User $user ): array {
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
			'post_count'   => count_user_posts( $user->ID ),
			'locale'       => get_user_locale( $user->ID ),
		);
	}

	/**
	 * Get user metadata (excluding sensitive/internal keys).
	 *
	 * @param int $user_id The user ID.
	 * @return array<string, mixed>
	 */
	private function get_user_meta( int $user_id ): array {
		$all_meta = get_user_meta( $user_id );
		$filtered = array();

		// Keys to exclude (sensitive or internal WordPress data).
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
			// Skip internal WordPress keys.
			if ( str_starts_with( $key, '_' ) ) {
				continue;
			}

			// Skip excluded keys.
			if ( in_array( $key, $excluded_keys, true ) ) {
				continue;
			}

			// Skip capability-related keys.
			if ( preg_match( '/^[a-z0-9_]+_capabilities$/', $key ) || preg_match( '/^[a-z0-9_]+_user_level$/', $key ) ) {
				continue;
			}

			$filtered[ $key ] = maybe_unserialize( $value[0] ?? '' );
		}

		return $filtered;
	}
}
