<?php

declare(strict_types=1);

namespace WordForge;

use WordForge\Abilities\Content\ListContent;
use WordForge\Abilities\Content\GetContent;
use WordForge\Abilities\Content\SaveContent;
use WordForge\Abilities\Content\DeleteContent;
use WordForge\Abilities\Blocks\GetPageBlocks;
use WordForge\Abilities\Blocks\UpdatePageBlocks;
use WordForge\Abilities\Styles\GetGlobalStyles;
use WordForge\Abilities\Styles\UpdateGlobalStyles;
use WordForge\Abilities\Styles\GetBlockStyles;
use WordForge\Abilities\Media\ListMedia;
use WordForge\Abilities\Media\GetMedia;
use WordForge\Abilities\Media\UploadMedia;
use WordForge\Abilities\Media\UpdateMedia;
use WordForge\Abilities\Media\DeleteMedia;
use WordForge\Abilities\Taxonomy\ListTerms;
use WordForge\Abilities\Taxonomy\SaveTerm;
use WordForge\Abilities\Taxonomy\DeleteTerm;
use WordForge\Abilities\Templates\ListTemplates;
use WordForge\Abilities\Templates\GetTemplate;
use WordForge\Abilities\Templates\UpdateTemplate;
use WordForge\Abilities\Prompts\ContentGeneratorPrompt;
use WordForge\Abilities\Prompts\ContentReviewPrompt;
use WordForge\Abilities\Prompts\SEOOptimizationPrompt;
use WordForge\Abilities\WooCommerce\ListProducts;
use WordForge\Abilities\WooCommerce\GetProduct;
use WordForge\Abilities\WooCommerce\SaveProduct;
use WordForge\Abilities\WooCommerce\DeleteProduct;
use WordForge\Abilities\Users\ListUsers;
use WordForge\Abilities\Users\GetUser;
use WordForge\Abilities\Comments\ListComments;
use WordForge\Abilities\Comments\GetComment;
use WordForge\Abilities\Comments\ModerateComment;
use WordForge\Abilities\Comments\ReplyToComment;
use WordForge\Abilities\Settings\GetSettings;
use WordForge\Abilities\Settings\UpdateSettings;
use WordForge\Abilities\Analytics\GetSiteStats;
use WordForge\Abilities\Orders\ListOrders;
use WordForge\Abilities\Orders\GetOrder;
use WordForge\Abilities\Orders\UpdateOrderStatus;

class AbilityRegistry {

	private const CORE_ABILITIES = array(
		'wordforge/list-content'         => ListContent::class,
		'wordforge/get-content'          => GetContent::class,
		'wordforge/save-content'         => SaveContent::class,
		'wordforge/delete-content'       => DeleteContent::class,
		'wordforge/get-page-blocks'      => GetPageBlocks::class,
		'wordforge/update-page-blocks'   => UpdatePageBlocks::class,
		'wordforge/get-global-styles'    => GetGlobalStyles::class,
		'wordforge/update-global-styles' => UpdateGlobalStyles::class,
		'wordforge/get-block-styles'     => GetBlockStyles::class,
	);

	private const MEDIA_ABILITIES = array(
		'wordforge/list-media'   => ListMedia::class,
		'wordforge/get-media'    => GetMedia::class,
		'wordforge/upload-media' => UploadMedia::class,
		'wordforge/update-media' => UpdateMedia::class,
		'wordforge/delete-media' => DeleteMedia::class,
	);

	private const TAXONOMY_ABILITIES = array(
		'wordforge/list-terms'  => ListTerms::class,
		'wordforge/save-term'   => SaveTerm::class,
		'wordforge/delete-term' => DeleteTerm::class,
	);

	private const TEMPLATE_ABILITIES = array(
		'wordforge/list-templates'  => ListTemplates::class,
		'wordforge/get-template'    => GetTemplate::class,
		'wordforge/update-template' => UpdateTemplate::class,
	);

	private const CORE_PROMPTS = array(
		'wordforge/generate-content' => ContentGeneratorPrompt::class,
		'wordforge/review-content'   => ContentReviewPrompt::class,
		'wordforge/seo-optimization' => SEOOptimizationPrompt::class,
	);

	private const WOOCOMMERCE_ABILITIES = array(
		'wordforge/list-products'  => ListProducts::class,
		'wordforge/get-product'    => GetProduct::class,
		'wordforge/save-product'   => SaveProduct::class,
		'wordforge/delete-product' => DeleteProduct::class,
	);

	private const USER_ABILITIES = array(
		'wordforge/list-users' => ListUsers::class,
		'wordforge/get-user'   => GetUser::class,
	);

	private const COMMENT_ABILITIES = array(
		'wordforge/list-comments'    => ListComments::class,
		'wordforge/get-comment'      => GetComment::class,
		'wordforge/moderate-comment' => ModerateComment::class,
		'wordforge/reply-to-comment' => ReplyToComment::class,
	);

	private const SETTINGS_ABILITIES = array(
		'wordforge/get-settings'    => GetSettings::class,
		'wordforge/update-settings' => UpdateSettings::class,
	);

	private const ANALYTICS_ABILITIES = array(
		'wordforge/get-site-stats' => GetSiteStats::class,
	);

	private const ORDER_ABILITIES = array(
		'wordforge/list-orders'         => ListOrders::class,
		'wordforge/get-order'           => GetOrder::class,
		'wordforge/update-order-status' => UpdateOrderStatus::class,
	);

	private array $registered_names = array();

	public function register_all(): void {
		$this->register_abilities( self::CORE_ABILITIES );
		$this->register_abilities( self::MEDIA_ABILITIES );
		$this->register_abilities( self::TAXONOMY_ABILITIES );
		$this->register_abilities( self::TEMPLATE_ABILITIES );
		$this->register_abilities( self::CORE_PROMPTS );
		$this->register_abilities( self::USER_ABILITIES );
		$this->register_abilities( self::COMMENT_ABILITIES );
		$this->register_abilities( self::SETTINGS_ABILITIES );
		$this->register_abilities( self::ANALYTICS_ABILITIES );

		if ( is_woocommerce_active() ) {
			$this->register_abilities( self::WOOCOMMERCE_ABILITIES );
			$this->register_abilities( self::ORDER_ABILITIES );
		}
	}

	public function get_ability_names(): array {
		$names = array_merge(
			array_keys( self::CORE_ABILITIES ),
			array_keys( self::MEDIA_ABILITIES ),
			array_keys( self::TAXONOMY_ABILITIES ),
			array_keys( self::TEMPLATE_ABILITIES ),
			array_keys( self::CORE_PROMPTS ),
			array_keys( self::USER_ABILITIES ),
			array_keys( self::COMMENT_ABILITIES ),
			array_keys( self::SETTINGS_ABILITIES ),
			array_keys( self::ANALYTICS_ABILITIES )
		);

		if ( is_woocommerce_active() ) {
			$names = array_merge(
				$names,
				array_keys( self::WOOCOMMERCE_ABILITIES ),
				array_keys( self::ORDER_ABILITIES )
			);
		}

		return $names;
	}

	private function register_abilities( array $abilities ): void {
		foreach ( $abilities as $name => $class ) {
			if ( class_exists( $class ) ) {
				$ability = new $class();
				$ability->register( $name );
				$this->registered_names[] = $name;
			}
		}
	}
}
