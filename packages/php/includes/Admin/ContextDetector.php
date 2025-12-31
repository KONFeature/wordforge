<?php

declare(strict_types=1);

namespace WordForge\Admin;

class ContextDetector {

	public static function get_context( string $hook ): ?array {
		if ( self::is_product_edit_page( $hook ) ) {
			return self::get_product_context();
		}

		if ( self::is_product_list_page( $hook ) ) {
			return self::get_product_list_context();
		}

		if ( self::is_post_list_page( $hook ) ) {
			return self::get_post_list_context();
		}

		if ( self::is_page_list_page( $hook ) ) {
			return self::get_page_list_context();
		}

		if ( self::is_media_list_page( $hook ) ) {
			return self::get_media_list_context();
		}

		return null;
	}

	private static function is_product_edit_page( string $hook ): bool {
		if ( 'post.php' !== $hook ) {
			return false;
		}

		$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;
		if ( ! $post_id ) {
			return false;
		}

		return 'product' === get_post_type( $post_id );
	}

	private static function is_product_list_page( string $hook ): bool {
		if ( 'edit.php' !== $hook ) {
			return false;
		}

		$post_type = isset( $_GET['post_type'] ) ? sanitize_key( $_GET['post_type'] ) : 'post';
		return 'product' === $post_type && function_exists( 'wc_get_product' );
	}

	private static function is_post_list_page( string $hook ): bool {
		if ( 'edit.php' !== $hook ) {
			return false;
		}

		$post_type = isset( $_GET['post_type'] ) ? sanitize_key( $_GET['post_type'] ) : 'post';
		return 'post' === $post_type;
	}

	private static function is_page_list_page( string $hook ): bool {
		if ( 'edit.php' !== $hook ) {
			return false;
		}

		$post_type = isset( $_GET['post_type'] ) ? sanitize_key( $_GET['post_type'] ) : 'post';
		return 'page' === $post_type;
	}

	private static function is_media_list_page( string $hook ): bool {
		return 'upload.php' === $hook;
	}

	private static function get_product_context(): ?array {
		if ( ! function_exists( 'wc_get_product' ) ) {
			return null;
		}

		$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;
		$product = wc_get_product( $post_id );

		if ( ! $product ) {
			return null;
		}

		$categories = wp_get_post_terms( $post_id, 'product_cat', [ 'fields' => 'names' ] );

		return [
			'type'        => 'product-editor',
			'productId'   => $post_id,
			'productName' => $product->get_name(),
			'productType' => $product->get_type(),
			'price'       => $product->get_price(),
			'stockStatus' => $product->get_stock_status(),
			'sku'         => $product->get_sku(),
			'categories'  => is_array( $categories ) ? $categories : [],
		];
	}

	private static function get_product_list_context(): ?array {
		if ( ! function_exists( 'wc_get_product' ) ) {
			return null;
		}

		$counts = wp_count_posts( 'product' );
		$total  = isset( $counts->publish ) ? (int) $counts->publish : 0;
		$draft  = isset( $counts->draft ) ? (int) $counts->draft : 0;

		$categories = get_terms(
			[
				'taxonomy'   => 'product_cat',
				'hide_empty' => false,
				'fields'     => 'all',
			]
		);

		$category_list = [];
		if ( is_array( $categories ) ) {
			foreach ( $categories as $cat ) {
				$category_list[] = [
					'id'    => $cat->term_id,
					'name'  => $cat->name,
					'count' => $cat->count,
				];
			}
		}

		return [
			'type'              => 'product-list',
			'totalProducts'     => $total,
			'draftProducts'     => $draft,
			'productCategories' => $category_list,
		];
	}

	private static function get_post_list_context(): array {
		$counts = wp_count_posts( 'post' );
		$total  = isset( $counts->publish ) ? (int) $counts->publish : 0;
		$draft  = isset( $counts->draft ) ? (int) $counts->draft : 0;

		$categories = get_terms(
			[
				'taxonomy'   => 'category',
				'hide_empty' => false,
				'fields'     => 'all',
			]
		);

		$category_list = [];
		if ( is_array( $categories ) ) {
			foreach ( $categories as $cat ) {
				$category_list[] = [
					'id'    => $cat->term_id,
					'name'  => $cat->name,
					'count' => $cat->count,
				];
			}
		}

		return [
			'type'       => 'post-list',
			'postType'   => 'post',
			'totalPosts' => $total,
			'draftPosts' => $draft,
			'categories' => $category_list,
		];
	}

	private static function get_page_list_context(): array {
		$counts = wp_count_posts( 'page' );
		$total  = isset( $counts->publish ) ? (int) $counts->publish : 0;
		$draft  = isset( $counts->draft ) ? (int) $counts->draft : 0;

		return [
			'type'       => 'page-list',
			'postType'   => 'page',
			'totalPosts' => $total,
			'draftPosts' => $draft,
		];
	}

	private static function get_media_list_context(): array {
		$counts = wp_count_attachments();
		$total  = 0;

		if ( is_object( $counts ) ) {
			foreach ( $counts as $mime => $count ) {
				if ( 'trash' !== $mime ) {
					$total += (int) $count;
				}
			}
		}

		$image_count = 0;
		$video_count = 0;
		$audio_count = 0;
		$doc_count   = 0;

		if ( is_object( $counts ) ) {
			foreach ( $counts as $mime => $count ) {
				if ( str_starts_with( $mime, 'image/' ) ) {
					$image_count += (int) $count;
				} elseif ( str_starts_with( $mime, 'video/' ) ) {
					$video_count += (int) $count;
				} elseif ( str_starts_with( $mime, 'audio/' ) ) {
					$audio_count += (int) $count;
				} elseif ( 'trash' !== $mime ) {
					$doc_count += (int) $count;
				}
			}
		}

		return [
			'type'       => 'media-list',
			'totalMedia' => $total,
			'images'     => $image_count,
			'videos'     => $video_count,
			'audio'      => $audio_count,
			'documents'  => $doc_count,
		];
	}
}
