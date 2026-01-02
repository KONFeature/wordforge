<?php
/**
 * Agent configuration for OpenCode.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\OpenCode;

class AgentConfig {

	public const AGENTS = array(
		'wordpress-manager'          => array(
			'id'          => 'wordpress-manager',
			'name'        => 'WordPress Manager',
			'description' => 'Primary site orchestrator - delegates to specialized subagents',
			'color'       => '#3858E9',
		),
		'wordpress-content-creator'  => array(
			'id'          => 'wordpress-content-creator',
			'name'        => 'Content Creator',
			'description' => 'Blog posts, landing pages, legal pages with SEO optimization',
			'color'       => '#10B981',
		),
		'wordpress-auditor'          => array(
			'id'          => 'wordpress-auditor',
			'name'        => 'Auditor',
			'description' => 'SEO audits, content reviews, performance recommendations',
			'color'       => '#F59E0B',
		),
		'wordpress-commerce-manager' => array(
			'id'          => 'wordpress-commerce-manager',
			'name'        => 'Commerce Manager',
			'description' => 'WooCommerce product management, inventory, pricing',
			'color'       => '#8B5CF6',
			'requires'    => 'woocommerce',
		),
	);

	public const MODEL_RECOMMENDATIONS = array(
		'wordpress-manager'          => array(
			'anthropic/claude-opus-4-5',
			'opencode/big-pickle',
		),
		'wordpress-content-creator'  => array(
			'google/gemini-3-pro-high',
			'google/gemini-3-pro',
			'anthropic/claude-sonnet-4-5',
			'openai/gpt-4o',
			'opencode/big-pickle',
		),
		'wordpress-auditor'          => array(
			'anthropic/claude-haiku-4-5',
			'google/gemini-3-flash',
			'opencode/big-pickle',
		),
		'wordpress-commerce-manager' => array(
			'anthropic/claude-sonnet-4-5',
			'google/gemini-3-pro',
			'opencode/big-pickle',
		),
	);

	private const OPTION_KEY = 'wordforge_agent_models';

	public static function get_agent_models(): array {
		$stored = get_option( self::OPTION_KEY, array() );
		return is_array( $stored ) ? $stored : array();
	}

	public static function save_agent_models( array $mappings ): bool {
		$sanitized = array();
		foreach ( $mappings as $agent_id => $model ) {
			if ( isset( self::AGENTS[ $agent_id ] ) && is_string( $model ) ) {
				$sanitized[ $agent_id ] = sanitize_text_field( $model );
			}
		}
		return update_option( self::OPTION_KEY, $sanitized, false );
	}

	public static function get_model_for_agent( string $agent_id ): ?string {
		$models = self::get_agent_models();
		return $models[ $agent_id ] ?? null;
	}

	public static function get_recommended_model( string $agent_id ): string {
		$recommendations = self::MODEL_RECOMMENDATIONS[ $agent_id ] ?? array( 'opencode/big-pickle' );
		$configured      = ProviderConfig::get_configured_provider_ids();

		foreach ( $recommendations as $model ) {
			$provider = explode( '/', $model )[0];

			if ( 'opencode' === $provider ) {
				return $model;
			}

			if ( in_array( $provider, $configured, true ) ) {
				return $model;
			}
		}

		return 'opencode/big-pickle';
	}

	public static function get_effective_model( string $agent_id ): string {
		$custom = self::get_model_for_agent( $agent_id );
		if ( $custom ) {
			return $custom;
		}
		return self::get_recommended_model( $agent_id );
	}

	public static function get_agents_for_display(): array {
		$stored     = self::get_agent_models();
		$woo_active = class_exists( 'WooCommerce' );
		$result     = array();

		foreach ( self::AGENTS as $agent_id => $meta ) {
			if ( isset( $meta['requires'] ) && 'woocommerce' === $meta['requires'] && ! $woo_active ) {
				continue;
			}

			$current_model     = $stored[ $agent_id ] ?? null;
			$recommended_model = self::get_recommended_model( $agent_id );

			$result[] = array(
				'id'               => $agent_id,
				'name'             => $meta['name'],
				'description'      => $meta['description'],
				'color'            => $meta['color'],
				'currentModel'     => $current_model,
				'effectiveModel'   => $current_model ?? $recommended_model,
				'recommendedModel' => $recommended_model,
				'recommendations'  => self::MODEL_RECOMMENDATIONS[ $agent_id ] ?? array(),
			);
		}

		return $result;
	}

	public static function reset_to_recommended(): bool {
		return delete_option( self::OPTION_KEY );
	}
}
