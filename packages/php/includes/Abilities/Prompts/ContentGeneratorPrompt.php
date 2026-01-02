<?php

declare(strict_types=1);

namespace WordForge\Abilities\Prompts;

class ContentGeneratorPrompt extends AbstractPrompt {

	public function get_title(): string {
		return __( 'Generate Content', 'wordforge' );
	}

	public function get_description(): string {
		return __(
			'Generate SEO-optimized content (blog posts, pages, landing pages, product descriptions) from a topic and keywords. ' .
			'Outputs Gutenberg block format ready for WordPress. Customize tone, target audience, word count, and call-to-action.',
			'wordforge'
		);
	}

	public function get_input_schema(): array {
		return array(
			'type'       => 'object',
			'properties' => array(
				'topic'        => array(
					'type'        => 'string',
					'description' => 'The main topic or title for the content.',
				),
				'content_type' => array(
					'type'        => 'string',
					'description' => 'Type of content to generate.',
					'enum'        => array( 'blog_post', 'page', 'product_description', 'landing_page' ),
					'default'     => 'blog_post',
				),
				'keywords'     => array(
					'type'        => 'array',
					'items'       => array( 'type' => 'string' ),
					'description' => 'SEO keywords to incorporate naturally.',
				),
				'tone'         => array(
					'type'        => 'string',
					'description' => 'Writing tone/style.',
					'enum'        => array( 'professional', 'casual', 'friendly', 'authoritative', 'playful' ),
					'default'     => 'professional',
				),
				'word_count'   => array(
					'type'        => 'integer',
					'description' => 'Approximate target word count.',
					'default'     => 800,
				),
				'audience'     => array(
					'type'        => 'string',
					'description' => 'Target audience description.',
				),
				'include_cta'  => array(
					'type'        => 'boolean',
					'description' => 'Include a call-to-action at the end.',
					'default'     => false,
				),
			),
			'required'   => array( 'topic' ),
		);
	}

	public function execute( array $args ): array {
		$topic        = $args['topic'];
		$content_type = $args['content_type'] ?? 'blog_post';
		$keywords     = $args['keywords'] ?? array();
		$tone         = $args['tone'] ?? 'professional';
		$word_count   = $args['word_count'] ?? 800;
		$audience     = $args['audience'] ?? '';
		$include_cta  = $args['include_cta'] ?? false;

		$content_type_labels = array(
			'blog_post'           => 'blog post',
			'page'                => 'website page',
			'product_description' => 'product description',
			'landing_page'        => 'landing page',
		);

		$type_label = $content_type_labels[ $content_type ] ?? 'content';

		$prompt  = "Write a {$type_label} about: {$topic}\n\n";
		$prompt .= "Requirements:\n";
		$prompt .= "- Tone: {$tone}\n";
		$prompt .= "- Target length: approximately {$word_count} words\n";

		if ( ! empty( $keywords ) ) {
			$prompt .= '- Naturally incorporate these keywords: ' . implode( ', ', $keywords ) . "\n";
		}

		if ( ! empty( $audience ) ) {
			$prompt .= "- Target audience: {$audience}\n";
		}

		if ( $include_cta ) {
			$prompt .= "- Include a compelling call-to-action at the end\n";
		}

		$prompt .= "\nFormat the content using WordPress Gutenberg blocks (HTML comments like <!-- wp:paragraph -->).\n";
		$prompt .= "Include appropriate headings, paragraphs, and structure for web readability.\n";
		$prompt .= 'Make it engaging and optimized for both readers and search engines.';

		return $this->messages(
			array(
				$this->user_message( $prompt ),
			)
		);
	}

	protected function get_priority(): float {
		return 0.9;
	}
}
