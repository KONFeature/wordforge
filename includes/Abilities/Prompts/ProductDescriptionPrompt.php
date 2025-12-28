<?php

declare(strict_types=1);

namespace WordForge\Abilities\Prompts;

class ProductDescriptionPrompt extends AbstractPrompt {

    public function get_title(): string {
        return __( 'Generate Product Description', 'wordforge' );
    }

    public function get_description(): string {
        return __( 'Generate compelling WooCommerce product descriptions optimized for conversions.', 'wordforge' );
    }

    public function get_category(): string {
        return 'wordforge-woocommerce';
    }

    public function get_input_schema(): array {
        return [
            'type'       => 'object',
            'properties' => [
                'product_name'   => [
                    'type'        => 'string',
                    'description' => 'Name of the product.',
                ],
                'product_type'   => [
                    'type'        => 'string',
                    'description' => 'Type of product.',
                    'enum'        => [ 'physical', 'digital', 'service', 'subscription' ],
                    'default'     => 'physical',
                ],
                'features'       => [
                    'type'        => 'array',
                    'items'       => [ 'type' => 'string' ],
                    'description' => 'Key product features and specifications.',
                ],
                'benefits'       => [
                    'type'        => 'array',
                    'items'       => [ 'type' => 'string' ],
                    'description' => 'Benefits to the customer.',
                ],
                'target_audience' => [
                    'type'        => 'string',
                    'description' => 'Who is this product for?',
                ],
                'price_point'    => [
                    'type'        => 'string',
                    'description' => 'Price positioning (budget, mid-range, premium, luxury).',
                    'enum'        => [ 'budget', 'mid-range', 'premium', 'luxury' ],
                ],
                'brand_voice'    => [
                    'type'        => 'string',
                    'description' => 'Brand voice/tone.',
                    'enum'        => [ 'professional', 'casual', 'luxurious', 'playful', 'technical' ],
                    'default'     => 'professional',
                ],
                'seo_keywords'   => [
                    'type'        => 'array',
                    'items'       => [ 'type' => 'string' ],
                    'description' => 'SEO keywords to incorporate.',
                ],
            ],
            'required'   => [ 'product_name' ],
        ];
    }

    public function execute( array $args ): array {
        $product_name    = $args['product_name'];
        $product_type    = $args['product_type'] ?? 'physical';
        $features        = $args['features'] ?? [];
        $benefits        = $args['benefits'] ?? [];
        $target_audience = $args['target_audience'] ?? '';
        $price_point     = $args['price_point'] ?? '';
        $brand_voice     = $args['brand_voice'] ?? 'professional';
        $seo_keywords    = $args['seo_keywords'] ?? [];

        $prompt = "Create a compelling WooCommerce product description for: {$product_name}\n\n";

        $prompt .= "Product type: {$product_type}\n";
        $prompt .= "Brand voice: {$brand_voice}\n";

        if ( ! empty( $price_point ) ) {
            $prompt .= "Price positioning: {$price_point}\n";
        }

        if ( ! empty( $target_audience ) ) {
            $prompt .= "Target audience: {$target_audience}\n";
        }

        if ( ! empty( $features ) ) {
            $prompt .= "\nKey features:\n";
            foreach ( $features as $feature ) {
                $prompt .= "- {$feature}\n";
            }
        }

        if ( ! empty( $benefits ) ) {
            $prompt .= "\nCustomer benefits:\n";
            foreach ( $benefits as $benefit ) {
                $prompt .= "- {$benefit}\n";
            }
        }

        if ( ! empty( $seo_keywords ) ) {
            $prompt .= "\nSEO keywords to incorporate: " . implode( ', ', $seo_keywords ) . "\n";
        }

        $prompt .= "\nGenerate:\n\n";

        $prompt .= "1. SHORT DESCRIPTION (2-3 sentences)\n";
        $prompt .= "   - Hook that captures attention\n";
        $prompt .= "   - Key benefit highlighted\n";
        $prompt .= "   - Suitable for product listings/cards\n\n";

        $prompt .= "2. LONG DESCRIPTION (HTML formatted)\n";
        $prompt .= "   - Engaging opening paragraph\n";
        $prompt .= "   - Features list with benefits\n";
        $prompt .= "   - Use cases or scenarios\n";
        $prompt .= "   - Trust elements (quality, guarantee mentions)\n";
        $prompt .= "   - Clear call-to-action\n";
        $prompt .= "   - Format with WordPress Gutenberg blocks\n\n";

        $prompt .= "3. SEO META\n";
        $prompt .= "   - Optimized product title (if different)\n";
        $prompt .= "   - Meta description (155 characters)\n";
        $prompt .= "   - URL slug suggestion";

        return $this->messages( [
            $this->user_message( $prompt ),
        ] );
    }

    protected function get_priority(): float {
        return 0.85;
    }
}
