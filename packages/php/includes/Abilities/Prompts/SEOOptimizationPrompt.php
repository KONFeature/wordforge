<?php

declare(strict_types=1);

namespace WordForge\Abilities\Prompts;

class SEOOptimizationPrompt extends AbstractPrompt {

	public function get_title(): string {
		return __( 'SEO Optimization', 'wordforge' );
	}

	public function get_description(): string {
		return __( 'Analyze content for SEO and provide optimization recommendations.', 'wordforge' );
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'content'                  => array(
					'type'        => 'string',
					'description' => 'The content to analyze (HTML or plain text).',
				),
				'target_keyword'           => array(
					'type'        => 'string',
					'description' => 'Primary keyword to optimize for.',
				),
				'secondary_keywords'       => array(
					'type'        => 'array',
					'items'       => array( 'type' => 'string' ),
					'description' => 'Secondary/related keywords.',
				),
				'current_title'            => array(
					'type'        => 'string',
					'description' => 'Current page/post title.',
				),
				'current_meta_description' => array(
					'type'        => 'string',
					'description' => 'Current meta description.',
				),
				'url_slug'                 => array(
					'type'        => 'string',
					'description' => 'Current or planned URL slug.',
				),
			),
			'required'   => array( 'content', 'target_keyword' ),
		);
	}

	public function execute( array $args ): array {
		$content            = $args['content'];
		$target_keyword     = $args['target_keyword'];
		$secondary_keywords = $args['secondary_keywords'] ?? array();
		$current_title      = $args['current_title'] ?? '';
		$current_meta       = $args['current_meta_description'] ?? '';
		$url_slug           = $args['url_slug'] ?? '';

		$prompt  = "Perform a comprehensive SEO analysis for the following content.\n\n";
		$prompt .= "Target keyword: {$target_keyword}\n";

		if ( ! empty( $secondary_keywords ) ) {
			$prompt .= 'Secondary keywords: ' . implode( ', ', $secondary_keywords ) . "\n";
		}

		if ( ! empty( $current_title ) ) {
			$prompt .= "Current title: {$current_title}\n";
		}

		if ( ! empty( $current_meta ) ) {
			$prompt .= "Current meta description: {$current_meta}\n";
		}

		if ( ! empty( $url_slug ) ) {
			$prompt .= "URL slug: {$url_slug}\n";
		}

		$prompt .= "\n---\nCONTENT:\n{$content}\n---\n\n";

		$prompt .= "Analyze and provide:\n\n";

		$prompt .= "1. KEYWORD ANALYSIS\n";
		$prompt .= "   - Keyword density and placement\n";
		$prompt .= "   - Usage in headings (H1, H2, H3)\n";
		$prompt .= "   - First paragraph presence\n";
		$prompt .= "   - Natural vs forced usage\n\n";

		$prompt .= "2. TITLE TAG OPTIMIZATION\n";
		$prompt .= "   - Current title assessment\n";
		$prompt .= "   - 3 optimized title suggestions (50-60 characters)\n\n";

		$prompt .= "3. META DESCRIPTION\n";
		$prompt .= "   - Current assessment\n";
		$prompt .= "   - 2 optimized suggestions (150-160 characters)\n\n";

		$prompt .= "4. CONTENT STRUCTURE\n";
		$prompt .= "   - Heading hierarchy analysis\n";
		$prompt .= "   - Readability score estimate\n";
		$prompt .= "   - Content length assessment\n\n";

		$prompt .= "5. ON-PAGE SEO CHECKLIST\n";
		$prompt .= "   - Internal linking opportunities\n";
		$prompt .= "   - Image alt text recommendations\n";
		$prompt .= "   - Schema markup suggestions\n\n";

		$prompt .= "6. ACTIONABLE IMPROVEMENTS\n";
		$prompt .= "   - Prioritized list of changes\n";
		$prompt .= '   - Quick wins vs long-term improvements';

		return $this->messages(
			array(
				$this->user_message( $prompt ),
			)
		);
	}

	protected function get_priority(): float {
		return 0.8;
	}
}
