<?php
/**
 * Upsert Pattern Trait - Shared upsert pattern for save abilities.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Traits;

/**
 * Provides common upsert (create or update) pattern helpers for save abilities.
 *
 * The upsert pattern uses the presence of 'id' to determine operation:
 * - id present → update existing entity
 * - id absent → create new entity
 *
 * Usage:
 * - Call get_id_input_schema() and merge into your input schema
 * - Call is_upsert_update($args) to check operation type
 * - Call upsert_success() or upsert_error() for consistent responses
 */
trait UpsertPatternTrait {

	/**
	 * Get the ID input schema property for upsert operations.
	 *
	 * @param string $entity_name Human-readable entity name (e.g., 'Post', 'Product', 'Term').
	 * @return array<string, array<string, mixed>>
	 */
	protected function get_id_input_schema( string $entity_name = 'item' ): array {
		return array(
			'id' => array(
				'type'        => 'integer',
				'description' => sprintf( '%s ID to update. Omit to create new.', $entity_name ),
				'minimum'     => 1,
			),
		);
	}

	/**
	 * Check if this is an update operation (id present) or create (id absent).
	 *
	 * @param array<string, mixed> $args Input arguments.
	 * @return bool True if updating existing entity, false if creating new.
	 */
	protected function is_upsert_update( array $args ): bool {
		return ! empty( $args['id'] );
	}

	/**
	 * Get the ID from args, or null if creating new.
	 *
	 * @param array<string, mixed> $args Input arguments.
	 * @return int|null Entity ID or null.
	 */
	protected function get_upsert_id( array $args ): ?int {
		return isset( $args['id'] ) ? (int) $args['id'] : null;
	}

	/**
	 * Create a not found error response for upsert operations.
	 *
	 * @param int    $id          The ID that was not found.
	 * @param string $entity_name Human-readable entity name.
	 * @return array<string, mixed>
	 */
	protected function upsert_not_found( int $id, string $entity_name = 'Item' ): array {
		return $this->error(
			sprintf( "%s #%d not found. Omit 'id' to create new.", $entity_name, $id ),
			'not_found'
		);
	}

	/**
	 * Create a success response for upsert operations.
	 *
	 * @param array<string, mixed> $data        Response data (should include 'id').
	 * @param bool                 $is_update   True if this was an update, false if create.
	 * @param string               $entity_name Human-readable entity name.
	 * @return array<string, mixed>
	 */
	protected function upsert_success( array $data, bool $is_update, string $entity_name = 'Item' ): array {
		$data['created'] = ! $is_update;

		$message = $is_update
			? sprintf( '%s updated successfully.', $entity_name )
			: sprintf( '%s created successfully.', $entity_name );

		return $this->success( $data, $message );
	}

	/**
	 * Create an error response for failed upsert operations.
	 *
	 * @param bool   $is_update   True if this was an update attempt, false if create.
	 * @param string $entity_name Human-readable entity name.
	 * @param string $details     Optional additional error details.
	 * @return array<string, mixed>
	 */
	protected function upsert_error( bool $is_update, string $entity_name = 'Item', string $details = '' ): array {
		$message = $is_update
			? sprintf( 'Failed to update %s.', strtolower( $entity_name ) )
			: sprintf( 'Failed to create %s.', strtolower( $entity_name ) );

		if ( $details ) {
			$message .= ' ' . $details;
		}

		$code = $is_update ? 'update_failed' : 'create_failed';

		return $this->error( $message, $code );
	}

	/**
	 * Get common upsert output schema.
	 *
	 * @param array<string, array<string, mixed>> $entity_properties Additional entity-specific properties.
	 * @return array<string, mixed>
	 */
	protected function get_upsert_output_schema( array $entity_properties = array() ): array {
		$properties = array_merge(
			array(
				'id'      => array(
					'type'        => 'integer',
					'description' => 'Entity ID.',
				),
				'created' => array(
					'type'        => 'boolean',
					'description' => 'True if new entity was created, false if existing was updated.',
				),
			),
			$entity_properties
		);

		return array(
			'type'       => 'object',
			'properties' => array(
				'success' => array( 'type' => 'boolean' ),
				'data'    => array(
					'type'       => 'object',
					'properties' => $properties,
				),
				'message' => array( 'type' => 'string' ),
			),
		);
	}
}
