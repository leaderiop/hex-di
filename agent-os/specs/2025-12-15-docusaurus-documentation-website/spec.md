# Specification: HexDI Docusaurus Documentation Website

## Goal

Create a comprehensive Docusaurus v3 documentation website for HexDI, a type-safe dependency injection library for TypeScript, featuring a custom-themed homepage with hexagonal architecture visual language, dark mode support, and integration with existing documentation content from the `docs/` folder.

## User Stories

- As a developer evaluating HexDI, I want to quickly understand its value proposition through a visually compelling homepage so that I can decide if it fits my project needs
- As a new HexDI user, I want clear getting-started documentation with code examples so that I can integrate the library into my project quickly

---

## Specific Requirements

**Docusaurus Project Setup**
- Initialize Docusaurus v3.x in `website/` folder at monorepo root
- Configure to read documentation content from existing `docs/` folder (no content duplication)
- Add `website` as a workspace in `pnpm-workspace.yaml`
- Use TypeScript configuration throughout (`docusaurus.config.ts`)
- Configure base URL for GitHub Pages deployment (`/hex-di/`)

**Homepage Implementation**
- Hero section with animated hexagonal architecture diagram as central visual element
- Six feature cards: Compile-Time Validation, Zero Runtime Overhead, Type-Safe Resolution, React Integration, DevTools Integration, Three Lifetime Scopes
- Quick Start code example section with syntax-highlighted TypeScript
- Package Architecture section showing core vs optional packages with hexagon diagram
- Lifetime Scopes section with color-coded badges (Singleton=Teal, Scoped=Amber, Request=Purple)
- "Why HexDI" section with compile-time error demonstration
- Call-to-action section linking to docs and examples
- Footer with documentation links, community links, and legal sections

**Custom Theme and Styling**
- Implement brand color palette with CSS custom properties (Primary Purple #5E35B1, TypeScript Blue #2196F3)
- Override Docusaurus Infima variables for consistent branding
- Typography: Manrope for headings, Inter for body, Fira Code for code blocks with ligatures
- Create custom SCSS/CSS in `src/css/custom.css` extending Infima variables
- Ensure all colors meet WCAG 2.1 AA contrast requirements (4.5:1 minimum)

**Dark Mode Support**
- Enable dark mode toggle with system preference detection by default
- Define complete color palette for both light and dark modes via CSS custom properties
- Store user preference in localStorage
- Provide smooth transition between modes (no flash on page load)

**Documentation Layout**
- Three-column desktop layout: sidebar (280px), content (flexible, max 900px), TOC (280px)
- Two-column tablet layout: toggleable sidebar overlay, content only
- Single-column mobile layout with hamburger menu
- Sticky navigation bar (64px height) with logo, nav links, GitHub icon, search, dark mode toggle
- Previous/Next navigation at bottom of each doc page
- Breadcrumb navigation at top of each doc page

**Navigation Structure**
- Sidebar sections: Getting Started, Core Packages (Ports, Graph, Runtime), Optional Packages (React, DevTools, Testing), Guides, Patterns, API Reference, Examples
- Configure sidebar auto-generation from `docs/` folder structure with custom ordering
- Implement collapsible sidebar categories with chevron indicators
- Right-side TOC with scroll spy highlighting current section

**Code Block Enhancements**
- Enable copy button on all code blocks via Docusaurus plugin
- Configure line numbers display
- Enable filename header display for code blocks
- Use Prism themes: GitHub (light) and Dracula (dark) customized to match brand colors
- Support line highlighting with `highlight-next-line` and `highlight-start/end` comments

**Custom Components**
- Callout/admonition boxes: INFO (blue), TIP (teal), WARNING (orange), DANGER (red) with consistent styling
- Package cards component showing package name, badge (Core/Optional), description, features, and link
- Lifetime scope badges as inline components with gradient backgrounds
- Feature cards with icon, title, and description for homepage grid

**Search Implementation**
- Configure local search plugin initially (`@easyops-cn/docusaurus-search-local` or similar)
- Display keyboard shortcut hint (Cmd+K / Ctrl+K) in search bar
- Search modal overlay with results grouped by category

**GitHub Pages Deployment**
- Configure GitHub Actions workflow for automated deployment on push to main
- Build website and deploy to `gh-pages` branch
- Set custom domain configuration if applicable
- Configure 404 page with SPA redirect for client-side routing

---

## Visual Design

**`planning/visuals/design-specifications.md`**
- Complete color palette with Primary (purple), TypeScript Blue, Success Green, Warning Orange, Error Red, and Lifetime Scope colors (Singleton Teal, Scoped Amber, Request Purple)
- Typography scale from Display (60px) down to Caption (12px) with specific line heights and weights
- Homepage wireframe showing Hero, Features (6-card grid), Code Example, Package Architecture, Lifetime Scopes, Why HexDI, CTA, and Footer sections
- Documentation page wireframe showing three-column layout with sidebar, main content, and TOC
- API Reference wireframe showing function signature, parameters table, returns, examples, and see-also sections
- Component specifications for Navigation Bar, Code Blocks, Callout Boxes, Feature Cards, Package Cards, Lifetime Badges, Search, Sidebar, TOC, Buttons, Breadcrumbs, Prev/Next Navigation
- Responsive breakpoints: Mobile (<640px), Tablet (640-1023px), Desktop (>=1024px)
- Animation patterns: Hover effects (transform, shadow), Focus indicators (2px outline), Page transitions (fade, slide), Loading states (skeleton shimmer)

---

## Existing Code to Leverage

**Existing Documentation Content (`docs/` folder)**
- 25 markdown files already written covering Getting Started, Guides, Patterns, API Reference, and Examples
- Package overview diagram in ASCII art format that can be converted to interactive SVG
- Code examples throughout documentation that use consistent TypeScript patterns
- Follows established structure: getting-started/, guides/, patterns/, api/, examples/

**Package Architecture (`packages/` folder)**
- Six packages to document: ports (foundation), graph (core), runtime (core), react (optional), devtools (optional), testing (optional)
- Each package has consistent API patterns that inform documentation structure
- Real code examples can be pulled from `examples/react-showcase/` for realistic usage

**Monorepo Configuration**
- PNPM workspaces already configured in `pnpm-workspace.yaml`
- TypeScript configuration (`tsconfig.json`) can be extended for website
- Vitest configuration pattern can inform any website testing setup

**Existing README**
- Root `README.md` contains value propositions and quick start that can inform homepage content
- Package dependency diagram can be converted to interactive visual

---

## Out of Scope

- Blog section (skip initially, focus on documentation)
- Internationalization (i18n) - English only for initial release
- Documentation versioning (implement after stable v1.0 release)
- Algolia DocSearch integration (start with local search, upgrade later)
- TypeDoc auto-generated API documentation (use handwritten API docs initially)
- Custom 500/error pages beyond basic 404
- Analytics integration (Google Analytics, Plausible, etc.)
- Newsletter signup or email capture forms
- Community Discord/Slack integration widgets
- Sponsor tier display or OpenCollective integration
