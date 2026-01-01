# WordForge v2.0 — Vision & Roadmap

> **Purpose**: Transform WordForge from an experimental tool into a polished, production-ready WordPress AI management suite.

---

## The Vision

WordForge should feel like having a senior WordPress developer available 24/7 — one who understands your site's context, can handle complex tasks autonomously, and communicates clearly about what they're doing.

**Target user**: WordPress site owners, content managers, and developers who want to manage their sites through natural conversation instead of clicking through admin panels.

---

## Six Pillars of v2.0

### 1. Codebase Cleanup 🧹

**Why**: The current codebase grew organically. Some files are too large, patterns are inconsistent, and there's duplication across similar abilities.

**What's Wrong**:
- `ServerProcess.php` is 560 lines doing too many things (binary management, process control, config generation)
- `MessageList.tsx` is 521 lines handling all message rendering logic
- List/Save/Delete abilities repeat similar patterns without shared abstractions
- Limited test coverage across all packages
- MCP package has linting errors (type safety issues)

**What We Want**:
- Smaller, focused files with single responsibilities
- Shared base classes and utilities to reduce duplication
- Comprehensive test suites for confidence in changes
- Code that new contributors can understand quickly
- Clean linting across all packages

---

### 2. Performance ⚡

**Why**: Users shouldn't wait. Every second of delay erodes trust in the tool.

**What's Wrong**:
- OpenCode server takes 10-30 seconds to start cold
- Chat bundles are ~200KB each with no code splitting
- Long message lists get sluggish (no virtualization)
- Some PHP queries hit the database repeatedly (N+1 patterns)
- No caching for expensive operations (templates, blocks, styles)

**What We Want**:
- OpenCode startup under 5 seconds
- Bundle sizes under 150KB
- Smooth scrolling with 100+ messages (60fps)
- Snappy response times even on large sites (p95 < 200ms)
- Smart caching where it makes sense

---

### 3. Feature Expansion 🔧

**Why**: WordForge currently covers content, media, and products — but WordPress admins do much more.

**What's Missing**:

| Category | Missing Features |
|----------|------------------|
| **Users** | List users, view profiles, manage roles |
| **Comments** | View comments, moderate (approve/spam/trash), reply |
| **Settings** | Read/update site options and configurations |
| **Menus** | View and manage navigation menus |
| **Analytics** | Site stats, content performance, product insights |
| **Orders** | WooCommerce order management and reporting |
| **Revisions** | Content revision history browsing and restoration |

**What We Want**:
- Coverage for 90%+ of common WordPress admin tasks
- AI can answer questions like "show me unapproved comments" or "what are my best-selling products this month"
- Specialized prompts for site audits (SEO, performance, content quality)
- WooCommerce order visibility and basic management

---

### 4. Chat Experience 💬

**Why**: The chat interface is the primary way users interact with WordForge. It should be delightful, not frustrating.

**What's Wrong**:
- Only using ~70% of OpenCode SDK capabilities
- No way to search through conversation history
- Can't export conversations for reference
- Quick actions are basic and not context-aware enough
- Generic loading spinners instead of meaningful progress
- No visibility into what the AI is "thinking" during complex operations

**What We Want**:
- Full utilization of OpenCode SDK features (file viewing, MCP resources, batch operations, session metadata)
- Searchable message history within conversations
- Export conversations as markdown or JSON
- Smart quick actions that adapt to context (editing a post → offer SEO suggestions; viewing products → offer pricing analysis)
- Clear progress indication for multi-step operations
- Better visibility into tool usage and AI reasoning

---

### 5. Provider Flexibility 🔑

**Why**: Users have different AI provider preferences based on cost, performance, privacy, and existing accounts.

**Currently Supported**:
- Anthropic Claude
- OpenAI GPT
- Google Gemini
- OpenCode Zen (hosted)

**What's Missing**:
- Mistral (European provider, good performance/cost ratio)
- Groq (extremely fast inference)
- Ollama (local/private LLMs for privacy-conscious users)
- Azure OpenAI (enterprise customers)
- AWS Bedrock (enterprise customers)

**What We Want**:
- Easy addition of new providers without major code changes
- Support for different authentication methods (API keys, OAuth, cloud credentials)
- Dynamic model discovery (fetch available models from provider instead of hardcoding)
- Per-agent model selection with smart defaults based on task type
- Clear, intuitive UI for managing multiple providers

---

### 6. Polish & UX ✨

**Why**: WordForge should feel like a finished product, not a developer tool. First impressions matter.

**What's Wrong**:
- Basic spinners instead of skeleton loaders (perceived as slower)
- Generic error messages ("Something went wrong") with no recovery path
- Limited keyboard navigation
- Mobile experience is functional but not optimized
- Inconsistent visual design across components
- Accessibility gaps (screen readers, focus management)

**What We Want**:
- Skeleton loaders that show structure while content loads
- Actionable error messages with recovery options ("Connection lost. Retry?")
- Full keyboard navigation (Ctrl+K to focus, shortcuts for common actions)
- Mobile-first chat widget with proper touch targets
- Consistent design system with refined colors, spacing, typography
- WCAG 2.1 AA accessibility compliance
- Smooth animations and transitions that feel professional

---

## Current State Summary

### Abilities Inventory (29 total)

| Category | Count | Status |
|----------|-------|--------|
| Content (posts, pages, CPTs) | 4 | ✅ Complete |
| Media | 5 | ✅ Complete |
| Taxonomy | 3 | ✅ Complete |
| Gutenberg Blocks | 2 | ✅ Complete |
| Theme Styles | 3 | ✅ Complete |
| FSE Templates | 3 | ✅ Complete |
| WooCommerce Products | 4 | ✅ Complete |
| AI Prompts | 3 | ✅ Complete |
| Users | 0 | ❌ Missing |
| Comments | 0 | ❌ Missing |
| Settings | 0 | ❌ Missing |
| Menus | 0 | ❌ Missing |
| Analytics | 0 | ❌ Missing |
| Orders (Woo) | 0 | ❌ Missing |

### OpenCode SDK Utilization (~70%)

| Feature | Status |
|---------|--------|
| Session management | ✅ Used |
| Message streaming | ✅ Used |
| Tool call display | ✅ Used |
| Model selection | ✅ Used |
| Session abort | ✅ Used |
| File operations | ❌ Not used |
| MCP resources | ❌ Not used |
| Batch operations | ❌ Not used |
| Session metadata | ❌ Not used |

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-4)
**Focus**: Cleanup and performance

- Refactor large files into smaller, focused modules
- Add shared abstractions to reduce duplication
- Implement caching and query optimizations
- Add code splitting and virtualization to UI
- Establish comprehensive test suites
- Fix all linting errors

**Exit Criteria**: Cleaner codebase, measurable performance improvements, clean lint

### Phase 2: Features (Weeks 5-8)
**Focus**: WordPress coverage

- Add Users and Comments abilities
- Add Settings and Analytics abilities
- Implement message search and export
- Enhance quick actions with better context awareness
- Add WooCommerce order abilities

**Exit Criteria**: 10+ new abilities, searchable/exportable conversations

### Phase 3: Providers & Polish (Weeks 9-12)
**Focus**: Flexibility and UX

- Add Mistral, Groq, Ollama support
- Implement dynamic model discovery
- Refine design system (skeletons, errors, transitions)
- Accessibility audit and fixes
- Mobile optimization

**Exit Criteria**: 4+ new providers, WCAG 2.1 AA compliance

### Phase 4: Hardening (Weeks 13-16)
**Focus**: Production readiness

- Comprehensive testing (unit, integration, e2e)
- Security audit
- Documentation and guides
- Beta testing and bug fixes

**Exit Criteria**: 80%+ test coverage, production-ready release

---

## Success Metrics

| Category | Metric | Target |
|----------|--------|--------|
| **Performance** | OpenCode cold start | <5 seconds |
| | Chat bundle size | <150KB |
| | Message list (100+ items) | 60fps smooth |
| | API response (p95) | <200ms |
| **Quality** | Test coverage | >80% |
| | Accessibility | WCAG 2.1 AA |
| **Features** | WordPress admin coverage | >90% |
| | AI providers supported | 8+ |
| | OpenCode SDK utilization | >90% |
| **UX** | Error recovery rate | >95% |
| | Mobile usability | Full feature parity |

---

## Open Questions

1. **Multisite**: Should abilities work across network sites in multisite installations?
2. **Offline mode**: Should we cache recent conversations for offline viewing?
3. **Extensibility**: Should third-party plugins be able to register custom abilities?
4. **Rate limiting**: How do we prevent abuse of AI requests?
5. **Audit logging**: Should we track all AI-initiated changes for compliance?
6. **Localization**: Priority for non-English language support?

---

## Guiding Principles

1. **User-first**: Every decision should make the user's life easier
2. **Progressive disclosure**: Simple by default, powerful when needed
3. **Fail gracefully**: Always provide a way forward when things go wrong
4. **Respect privacy**: User data stays on their server, AI interactions are their business
5. **Stay maintainable**: Code should be understandable by future contributors

---

*Last updated: January 2026*
