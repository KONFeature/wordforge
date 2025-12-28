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
use WordForge\Abilities\Blocks\CreateRevision;
use WordForge\Abilities\Styles\GetGlobalStyles;
use WordForge\Abilities\Styles\UpdateGlobalStyles;
use WordForge\Abilities\Styles\GetBlockStyles;
use WordForge\Abilities\Styles\UpdateBlockStyles;
use WordForge\Abilities\Prompts\ContentGeneratorPrompt;
use WordForge\Abilities\Prompts\ContentReviewPrompt;
use WordForge\Abilities\Prompts\SEOOptimizationPrompt;
use WordForge\Abilities\Prompts\ProductDescriptionPrompt;
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
        'wordforge/create-revision'    => CreateRevision::class,
        'wordforge/get-global-styles'    => GetGlobalStyles::class,
        'wordforge/update-global-styles' => UpdateGlobalStyles::class,
        'wordforge/get-block-styles'     => GetBlockStyles::class,
        'wordforge/update-block-styles'  => UpdateBlockStyles::class,
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

    private const WOOCOMMERCE_PROMPTS = [
        'wordforge/product-description' => ProductDescriptionPrompt::class,
    ];

    private array $registered_names = [];

    public function register_all(): void {
        $this->register_abilities( self::CORE_ABILITIES );
        $this->register_abilities( self::CORE_PROMPTS );

        if ( is_woocommerce_active() ) {
            $this->register_abilities( self::WOOCOMMERCE_ABILITIES );
            $this->register_abilities( self::WOOCOMMERCE_PROMPTS );
        }
    }

    public function get_ability_names(): array {
        $names = array_merge(
            array_keys( self::CORE_ABILITIES ),
            array_keys( self::CORE_PROMPTS )
        );

        if ( is_woocommerce_active() ) {
            $names = array_merge(
                $names,
                array_keys( self::WOOCOMMERCE_ABILITIES ),
                array_keys( self::WOOCOMMERCE_PROMPTS )
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
