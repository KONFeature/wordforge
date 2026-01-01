<?php
/**
 * Update Settings Ability - Update WordPress site options.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Settings;

use WordForge\Abilities\AbstractAbility;

class UpdateSettings extends AbstractAbility {

	private const WRITABLE_OPTIONS = array(
		'blogname'                     => 'string',
		'blogdescription'              => 'string',
		'admin_email'                  => 'email',
		'users_can_register'           => 'bool',
		'default_role'                 => 'string',
		'timezone_string'              => 'string',
		'date_format'                  => 'string',
		'time_format'                  => 'string',
		'start_of_week'                => 'int',
		'posts_per_page'               => 'int',
		'posts_per_rss'                => 'int',
		'rss_use_excerpt'              => 'bool',
		'show_on_front'                => 'string',
		'page_on_front'                => 'int',
		'page_for_posts'               => 'int',
		'blog_public'                  => 'bool',
		'default_pingback_flag'        => 'bool',
		'default_ping_status'          => 'string',
		'default_comment_status'       => 'string',
		'require_name_email'           => 'bool',
		'comment_registration'         => 'bool',
		'close_comments_for_old_posts' => 'bool',
		'close_comments_days_old'      => 'int',
		'thread_comments'              => 'bool',
		'thread_comments_depth'        => 'int',
		'page_comments'                => 'bool',
		'comments_per_page'            => 'int',
		'default_comments_page'        => 'string',
		'comment_order'                => 'string',
		'moderation_notify'            => 'bool',
		'comments_notify'              => 'bool',
		'comment_moderation'           => 'bool',
		'comment_previously_approved'  => 'bool',
		'show_avatars'                 => 'bool',
		'avatar_rating'                => 'string',
		'avatar_default'               => 'string',
		'thumbnail_size_w'             => 'int',
		'thumbnail_size_h'             => 'int',
		'medium_size_w'                => 'int',
		'medium_size_h'                => 'int',
		'large_size_w'                 => 'int',
		'large_size_h'                 => 'int',
	);

	public function get_category(): string {
		return 'wordforge-settings';
	}

	protected function is_read_only(): bool {
		return false;
	}

	public function get_title(): string {
		return __( 'Update Settings', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Update WordPress site settings and options. Modify site configuration values including site title, tagline, ' .
			'timezone, date/time formats, reading settings, discussion settings, and media sizes. Only safe, non-destructive ' .
			'options can be modified. URL options (siteurl, home) and permalink structure are excluded for safety.',
			'wordforge'
		);
	}

	public function get_capability(): string {
		return 'manage_options';
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'required'   => array( 'settings' ),
			'properties' => array(
				'settings' => array(
					'type'                 => 'object',
					'description'          => 'Key-value pairs of settings to update.',
					'additionalProperties' => true,
				),
			),
		);
	}

	public function execute( array $args ): array {
		$settings = $args['settings'] ?? array();

		if ( empty( $settings ) ) {
			return $this->error( 'No settings provided.', 'empty_settings' );
		}

		$updated  = array();
		$skipped  = array();
		$previous = array();

		foreach ( $settings as $key => $value ) {
			if ( ! isset( self::WRITABLE_OPTIONS[ $key ] ) ) {
				$skipped[] = array(
					'key'    => $key,
					'reason' => 'Option not allowed',
				);
				continue;
			}

			$sanitized = $this->sanitize_value( $value, self::WRITABLE_OPTIONS[ $key ] );

			if ( null === $sanitized ) {
				$skipped[] = array(
					'key'    => $key,
					'reason' => 'Invalid value type',
				);
				continue;
			}

			$previous[ $key ] = get_option( $key );
			$result           = update_option( $key, $sanitized );

			if ( $result || $previous[ $key ] === $sanitized ) {
				$updated[ $key ] = $sanitized;
			} else {
				$skipped[] = array(
					'key'    => $key,
					'reason' => 'Update failed',
				);
			}
		}

		$message = sprintf( '%d setting(s) updated.', count( $updated ) );
		if ( ! empty( $skipped ) ) {
			$message .= sprintf( ' %d skipped.', count( $skipped ) );
		}

		return $this->success(
			array(
				'updated'  => $updated,
				'previous' => $previous,
				'skipped'  => $skipped,
			),
			$message
		);
	}

	private function sanitize_value( mixed $value, string $type ): mixed {
		switch ( $type ) {
			case 'string':
				return is_string( $value ) ? sanitize_text_field( $value ) : null;

			case 'email':
				return is_string( $value ) ? sanitize_email( $value ) : null;

			case 'int':
				return is_numeric( $value ) ? (int) $value : null;

			case 'bool':
				return is_bool( $value ) || is_numeric( $value ) ? ( $value ? '1' : '0' ) : null;

			default:
				return null;
		}
	}
}
