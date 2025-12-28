<?php

declare(strict_types=1);

namespace WordForge;

use WordForge\Abilities\Content\ListContent;
use WordForge\Abilities\Content\GetContent;
use WordForge\Abilities\Content\CreateContent;
use WordForge\Abilities\Content\UpdateContent;
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
use WordForge\Abilities\Taxonomy\CreateTerm;
use WordForge\Abilities\Taxonomy\UpdateTerm;
use WordForge\Abilities\Taxonomy\DeleteTerm;
use WordForge\Abilities\Templates\ListTemplates;
use WordForge\Abilities\Templates\GetTemplate;
use WordForge\Abilities\Templates\UpdateTemplate;
use WordForge\Abilities\Prompts\ContentGeneratorPrompt;
use WordForge\Abilities\Prompts\ContentReviewPrompt;
use WordForge\Abilities\Prompts\SEOOptimizationPrompt;
use WordForge\Abilities\WooCommerce\ListProducts;
use WordForge\Abilities\WooCommerce\GetProduct;
use WordForge\Abilities\WooCommerce\CreateProduct;
use WordForge\Abilities\WooCommerce\UpdateProduct;
use WordForge\Abilities\WooCommerce\DeleteProduct;

class AbilityRegistry {

	private const CORE_ABILITIES = [
		'wordforge/list-content'       => ListContent::class,
		'wordforge/get-content'        => GetContent::class,
		'wordforge/create-content'     => CreateContent::class,
		'wordforge/update-content'     => UpdateContent::class,
		'wordforge/delete-content'     => DeleteContent::class,
		'wordforge/get-page-blocks'    => GetPageBlocks::class,
		'wordforge/update-page-blocks' => UpdatePageBlocks::class,
		'wordforge/get-global-styles'  => GetGlobalStyles::class,
		'wordforge/update-global-styles' => UpdateGlobalStyles::class,
		'wordforge/get-block-styles'   => GetBlockStyles::class,
	];

	private const MEDIA_ABILITIES = [
		'wordforge/list-media'   => ListMedia::class,
		'wordforge/get-media'    => GetMedia::class,
		'wordforge/upload-media' => UploadMedia::class,
		'wordforge/update-media' => UpdateMedia::class,
		'wordforge/delete-media' => DeleteMedia::class,
	];

	private const TAXONOMY_ABILITIES = [
		'wordforge/list-terms'   => ListTerms::class,
		'wordforge/create-term'  => CreateTerm::class,
		'wordforge/update-term'  => UpdateTerm::class,
		'wordforge/delete-term'  => DeleteTerm::class,
	];

	private const TEMPLATE_ABILITIES = [
		'wordforge/list-templates'  => ListTemplates::class,
		'wordforge/get-template'    => GetTemplate::class,
		'wordforge/update-template' => UpdateTemplate::class,
	];

	private const CORE_PROMPTS = [
		'wordforge/generate-content' => ContentGeneratorPrompt::class,
		'wordforge/review-content'   => ContentReviewPrompt::class,
		'wordforge/seo-optimization' => SEOOptimizationPrompt::class,
	];

	private const WOOCOMMERCE_ABILITIES = [
		'wordforge/list-products'  => ListProducts::class,
		'wordforge/get-product'    => GetProduct::class,
		'wordforge/create-product' => CreateProduct::class,
		'wordforge/update-product' => UpdateProduct::class,
		'wordforge/delete-product' => DeleteProduct::class,
	];

	private array $registered_names = [];

	public function register_all(): void {
		$this->register_abilities( self::CORE_ABILITIES );
		$this->register_abilities( self::MEDIA_ABILITIES );
		$this->register_abilities( self::TAXONOMY_ABILITIES );
		$this->register_abilities( self::TEMPLATE_ABILITIES );
		$this->register_abilities( self::CORE_PROMPTS );

		if ( is_woocommerce_active() ) {
			$this->register_abilities( self::WOOCOMMERCE_ABILITIES );
		}
	}

	public function get_ability_names(): array {
		$names = array_merge(
			array_keys( self::CORE_ABILITIES ),
			array_keys( self::MEDIA_ABILITIES ),
			array_keys( self::TAXONOMY_ABILITIES ),
			array_keys( self::TEMPLATE_ABILITIES ),
			array_keys( self::CORE_PROMPTS )
		);

		if ( is_woocommerce_active() ) {
			$names = array_merge( $names, array_keys( self::WOOCOMMERCE_ABILITIES ) );
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
