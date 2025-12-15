# Docusaurus Documentation Website - Requirements Summary

**Spec:** 2025-12-15-docusaurus-documentation-website
**Status:** Requirements Gathered
**Date:** 2025-12-15

---

## Overview

Create a comprehensive Docusaurus documentation website for HexDI - a type-safe dependency injection library for TypeScript designed with Hexagonal Architecture principles and AI-friendly code patterns.

---

## Core Identity & Messaging

### Primary Value Propositions
1. **Type-Safe Dependency Injection** - Compile-time validation catches missing dependencies
2. **Hexagonal Architecture** - Ports and Adapters pattern for clean boundaries
3. **AI-Friendly Design** - Explicit contracts help AI coding agents understand code
4. **Three Lifetime Scopes** - Singleton, scoped, and request with proper isolation
5. **Zero Runtime Overhead** - Phantom types add no cost

### Tagline Options
- "Type-Safe DI for Humans and AI"
- "Compile-Time Validated Dependency Injection"
- "Explicit contracts. Zero ambiguity. AI-readable architecture."

---

## Technical Decisions

### Site Structure
| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Location** | `website/` folder at monorepo root | Standard Docusaurus convention |
| **Content Source** | Read from existing `docs/` folder | No content duplication |
| **Framework** | Docusaurus v3.x | Modern, React-based, MDX support |
| **Styling** | Custom CSS + SCSS | Full brand control |

### Features
| Feature | Decision | Notes |
|---------|----------|-------|
| **Search** | Local search initially | Algolia DocSearch later |
| **Versioning** | Future enhancement | After stable release |
| **Blog** | Skip initially | Focus on docs first |
| **i18n** | Skip initially | English only |
| **TypeDoc** | Future enhancement | Start with handwritten API docs |
| **Dark Mode** | Yes, with system preference | CSS custom properties |

### Deployment
- **Target:** GitHub Pages
- **URL:** `{org}.github.io/hex-di/`
- **CI/CD:** GitHub Actions

---

## Design System

### Brand Colors
| Color | Hex | Usage |
|-------|-----|-------|
| **Primary Purple** | #5E35B1 | Brand, CTAs, links |
| **TypeScript Blue** | #2196F3 | Code highlights, ports |
| **Singleton Teal** | #00897B | Singleton lifetime |
| **Scoped Amber** | #FF8F00 | Scoped lifetime |
| **Request Purple** | #7B1FA2 | Request lifetime |
| **AI Blue** | #00D4FF | AI-friendly features |

### Typography
- **Headings:** Manrope (modern, geometric)
- **Body:** Inter (excellent readability)
- **Code:** Fira Code (ligatures enabled)

### Visual Motifs
1. **Hexagon shapes** - Logo, backgrounds, section dividers
2. **Port/Adapter iconography** - Plug/socket metaphors
3. **Color-coded lifetimes** - Visual differentiation
4. **AI badges** - Subtle indicators of AI-friendliness

---

## Page Structure

### Homepage Sections
1. **Hero** - Animated hexagon with tagline + CTAs
2. **Features** - 6 key features in card grid
3. **Quick Start** - Code example with syntax highlighting
4. **Package Architecture** - Hexagon diagram showing packages
5. **Lifetime Scopes** - Color-coded scope explanation
6. **AI-Friendly** - "Built for Clarity" section (subtle)
7. **CTA** - Get started + view documentation
8. **Footer** - Links, legal, credits

### Documentation Structure
```
docs/
├── getting-started/
│   ├── introduction.md
│   ├── installation.md
│   ├── quick-start.md
│   ├── core-concepts.md
│   └── lifetimes.md
├── guides/
│   ├── react-integration.md
│   ├── testing-strategies.md
│   ├── devtools-usage.md
│   └── error-handling.md
├── patterns/
│   ├── project-structure.md
│   ├── composing-graphs.md
│   └── scoped-services.md
├── api/
│   ├── ports.md
│   ├── graph.md
│   ├── runtime.md
│   ├── react.md
│   ├── devtools.md
│   └── testing.md
└── examples/
    └── README.md
```

### Layout
- **Three-column** on desktop (sidebar + content + TOC)
- **Two-column** on tablet (sidebar + content)
- **Single-column** on mobile (hamburger menu)

---

## Key Visual Components

### Hexagonal Architecture Diagram
- Central hexagon = Application Core
- Left ports = Driving (createPort, usePort)
- Right ports = Driven (factories, adapters)
- Color-coded by layer

### Code Blocks
- Syntax highlighting for TypeScript
- Line numbers
- Copy button
- Filename header
- Highlight specific lines

### Callout Boxes
- **INFO** (blue) - General information
- **TIP** (teal) - Best practices
- **WARNING** (orange) - Important notes
- **DANGER** (red) - Critical warnings
- **AI-TIP** (cyan) - AI-specific guidance

### Package Cards
- Package name + badge (Core/Optional)
- Short description
- Key features list
- Link to documentation

---

## Accessibility Requirements

- **WCAG 2.1 AA** compliance
- Minimum 4.5:1 color contrast
- Keyboard navigation support
- Screen reader optimized
- Reduced motion support
- Focus indicators (2px outline)

---

## Performance Goals

- **Lighthouse Score:** 90+ (all categories)
- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3s
- **Bundle Size:** Minimal JS, optimized images

---

## Research Sources

### Design Inspiration
- [Effect-TS](https://effect.website/) - Dark theme, developer-focused
- [Zod](https://zod.dev/) - Minimalist, badges, sponsor tiers
- [Docusaurus](https://docusaurus.io/) - Feature sections, testimonials

### Hexagonal Architecture
- [Alistair Cockburn - Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [8th Light - Color Coded Guide](https://8thlight.com/insights/a-color-coded-guide-to-ports-and-adapters)

### AI-Friendly Patterns
- [Eugene Yan - LLM Patterns](https://eugeneyan.com/writing/llm-patterns/)
- [Context Engineering for Multi-Agent Systems](https://arxiv.org/html/2508.08322v1)
- [VIKTOR - llms.txt](https://www.viktor.ai/blog/211/how-to-build-engineering-apps-with-ai-and-llms-txt-files)

---

## Deliverables

### Phase 1: Foundation
- [ ] Initialize Docusaurus in `website/` folder
- [ ] Configure to read from `docs/` folder
- [ ] Set up custom theme with brand colors
- [ ] Create homepage with hero section
- [ ] Implement dark mode toggle

### Phase 2: Design System
- [ ] Create hexagon logo and favicon
- [ ] Implement typography system
- [ ] Build code block component
- [ ] Create callout box components
- [ ] Design package cards

### Phase 3: Content & Polish
- [ ] Verify all existing docs render correctly
- [ ] Add homepage sections (features, code, packages)
- [ ] Create hexagonal architecture diagram
- [ ] Add navigation and footer
- [ ] Implement local search

### Phase 4: Deployment
- [ ] Configure GitHub Pages deployment
- [ ] Set up GitHub Actions CI/CD
- [ ] Test responsive design
- [ ] Run accessibility audit
- [ ] Performance optimization

---

## Files Created

| File | Description |
|------|-------------|
| `planning/raw-idea.md` | Original user request |
| `planning/requirements-summary.md` | This document |
| `planning/visuals/design-specifications.md` | Comprehensive design specs (3000+ lines) |

---

## Next Steps

1. Run `/write-spec` to generate detailed specification document
2. Review and approve specification
3. Run `/create-tasks` to generate implementation task list
4. Begin implementation

---

*Generated: 2025-12-15*
