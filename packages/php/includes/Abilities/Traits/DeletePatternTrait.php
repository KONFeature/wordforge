<?php
/**
 * Delete Pattern Trait - Shared delete pattern for delete abilities.
 *
 * @package WordForge
 */

declare(strict_types=1);

namespace WordForge\Abilities\Traits;

/**
 * Provides common delete pattern helpers for delete abilities.
 *
 * The delete pattern includes:
 * - Required 'id' parameter
 * - Optional 'force' parameter for permanent vs trash deletion
 * - Consistent response format with deleted entity info
 *
 * Usage:
 * - Use get_delete_input_schema() in get_input_schema()
 * - Use get_delete_output_schema() in get_output_schema()
 * - Override is_destructive() to return true (or use the trait's implementation)
 * - Call delete_success() for consistent response format
 */
trait DeletePatternTrait {

	/**
	 * Whether this ability may perform destructive operations.
	 * Delete operations are always destructive.
	 *
	 * @return bool
	 */
	protected function is_destructive(): bool {
		return true;
	}

	/**
	 * Get common delete input schema.
	 *
	 * @param bool   $supports_trash Whether the entity supports trash (soft delete).
	 * @param string $entity_name    Human-readable entity name for descriptions.
	 * @return array<string, mixed>
	 */
	protected function get_delete_input_schema( bool $supports_trash = true, string $entity_name = 'item' ): array {
		$schema = [
			'type'       => 'object',
			'required'   => [ 'id' ],
			'properties' => [
				'id' => [
					'type'        => 'integer',
					'description' => sprintf( '%s ID to delete.', ucfirst( $entity_name ) ),
					'minimum'     => 1,
				],
			],
		];

		if ( $supports_trash ) {
			$schema['properties']['force'] = [
				'type'        => 'boolean',
				'description' => sprintf(
					'Permanent deletion flag. false (default) = move to trash (recoverable), true = permanently delete (cannot be undone). Use true with extreme caution.',
				),
				'default'     => false,
			];
		}

		return $schema;
	}

	/**
	 * Get common delete output schema.
	 *
	 * @param array<string, array<string, mixed>> $entity_properties Additional entity-specific properties to include in response.
	 * @param bool                                $supports_trash    Whether the entity supports trash.
	 * @return array<string, mixed>
	 */
	protected function get_delete_output_schema( array $entity_properties = [], bool $supports_trash = true ): array {
		$data_properties = array_merge(
			[
				'id' => [
					'type'        => 'integer',
					'description' => 'ID of the deleted entity.',
				],
				'deleted' => [
					'type'        => 'boolean',
					'description' => 'Confirmation that entity was deleted.',
				],
			],
			$entity_properties
		);

		if ( $supports_trash ) {
			$data_properties['force'] = [
				'type'        => 'boolean',
				'description' => 'Whether permanent deletion was used (true) or entity was trashed (false).',
			];
		}

		return [
			'type'       => 'object',
			'properties' => [
				'success' => [ 'type' => 'boolean' ],
				'data'    => [
					'type'       => 'object',
					'properties' => $data_properties,
				],
				'message' => [ 'type' => 'string' ],
			],
			'required' => [ 'success', 'data' ],
		];
	}

	/**
	 * Check if force delete is requested.
	 *
	 * @param array<string, mixed> $args Input arguments.
	 * @return bool
	 */
	protected function is_force_delete( array $args ): bool {
		return (bool) ( $args['force'] ?? false );
	}

	/**
	 * Create a success response for delete operations.
	 *
	 * @param int                  $id          Deleted entity ID.
	 * @param string               $entity_name Human-readable entity name.
	 * @param string               $title       Entity title/name for the message.
	 * @param bool                 $force       Whether permanent deletion was used.
	 * @param array<string, mixed> $extra_data  Additional data to include in response.
	 * @return array<string, mixed>
	 */
	protected function delete_success(
		int $id,
		string $entity_name,
		string $title,
		bool $force = false,
		array $extra_data = []
	): array {
		$action = $force ? 'permanently deleted' : 'moved to trash';

		$data = array_merge(
			[
				'id'      => $id,
				'deleted' => true,
				'force'   => $force,
			],
			$extra_data
		);

		$message = sprintf( '%s "%s" %s.', ucfirst( $entity_name ), $title, $action );

		return $this->success( $data, $message );
	}

	/**
	 * Create a not found error for delete operations.
	 *
	 * @param string $entity_name Human-readable entity name.
	 * @return array<string, mixed>
	 */
	protected function delete_not_found( string $entity_name = 'Item' ): array {
		return $this->error( sprintf( '%s not found.', $entity_name ), 'not_found' );
	}

	/**
	 * Create a failed error for delete operations.
	 *
	 * @param string $entity_name Human-readable entity name.
	 * @return array<string, mixed>
	 */
	protected function delete_failed( string $entity_name = 'item' ): array {
		return $this->error( sprintf( 'Failed to delete %s.', strtolower( $entity_name ) ), 'delete_failed' );
	}

	/**
	 * Create a permission denied error for delete operations.
	 *
	 * @param string $entity_name Human-readable entity name.
	 * @return array<string, mixed>
	 */
	protected function delete_forbidden( string $entity_name = 'this item' ): array {
		return $this->error(
			sprintf( 'You do not have permission to delete %s.', strtolower( $entity_name ) ),
			'forbidden'
		);
	}
}
