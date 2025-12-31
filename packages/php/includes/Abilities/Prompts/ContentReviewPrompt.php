<?php

declare(strict_types=1);

namespace WordForge\Abilities\Prompts;

class ContentReviewPrompt extends AbstractPrompt {

    public function get_title(): string {
        return __( 'Review Content', 'wordforge' );
    }

    public function get_description(): string {
        return __( 'Review and improve existing content for clarity, engagement, SEO, and grammar.', 'wordforge' );
    }

    public function get_input_schema(): array {
        return [
            'type'       => 'object',
            'properties' => [
                'content'      => [
                    'type'        => 'string',
                    'description' => 'The content to review (HTML or plain text).',
                ],
                'focus_areas'  => [
                    'type'        => 'array',
                    'items'       => [ 'type' => 'string' ],
                    'description' => 'Areas to focus the review on.',
                    'default'     => [ 'clarity', 'engagement', 'grammar' ],
                ],
                'target_tone'  => [
                    'type'        => 'string',
                    'description' => 'Desired tone for improvements.',
                    'enum'        => [ 'professional', 'casual', 'friendly', 'authoritative', 'playful' ],
                ],
                'seo_keywords' => [
                    'type'        => 'array',
                    'items'       => [ 'type' => 'string' ],
                    'description' => 'Keywords to check for SEO optimization.',
                ],
                'provide_rewrite' => [
                    'type'        => 'boolean',
                    'description' => 'Include a rewritten/improved version.',
                    'default'     => true,
                ],
            ],
            'required'   => [ 'content' ],
        ];
    }

    public function execute( array $args ): array {
        $content         = $args['content'];
        $focus_areas     = $args['focus_areas'] ?? [ 'clarity', 'engagement', 'grammar' ];
        $target_tone     = $args['target_tone'] ?? '';
        $seo_keywords    = $args['seo_keywords'] ?? [];
        $provide_rewrite = $args['provide_rewrite'] ?? true;

        $prompt = "Review the following content and provide detailed feedback:\n\n";
        $prompt .= "---\n{$content}\n---\n\n";

        $prompt .= 'Focus your review on: ' . implode( ', ', $focus_areas ) . "\n\n";

        $prompt .= "For each area, provide:\n";
        $prompt .= "1. Current assessment (what's working well)\n";
        $prompt .= "2. Issues identified (specific problems)\n";
        $prompt .= "3. Recommendations (concrete improvements)\n\n";

        if ( ! empty( $target_tone ) ) {
            $prompt .= "Evaluate if the content matches a '{$target_tone}' tone and suggest adjustments.\n\n";
        }

        if ( ! empty( $seo_keywords ) ) {
            $prompt .= 'Check SEO optimization for these keywords: ' . implode( ', ', $seo_keywords ) . "\n";
            $prompt .= "- Are keywords used naturally?\n";
            $prompt .= "- Are they in headings, first paragraph, and throughout?\n";
            $prompt .= "- Suggest improvements for keyword placement.\n\n";
        }

        if ( $provide_rewrite ) {
            $prompt .= "Finally, provide an improved version of the content that addresses all identified issues.\n";
            $prompt .= "Format the rewritten content using WordPress Gutenberg blocks.";
        }

        return $this->messages( [
            $this->user_message( $prompt ),
        ] );
    }

    protected function get_priority(): float {
        return 0.8;
    }
}
