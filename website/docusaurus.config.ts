import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  // SEO: Main site title (under 60 characters)
  title: 'HexDI',
  // SEO: Site tagline used in meta descriptions
  tagline: 'Type-Safe Dependency Injection for TypeScript',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Markdown configuration - use CommonMark format to avoid MDX parsing issues
  // with TypeScript generic syntax like <T, TName> in prose
  markdown: {
    format: 'detect',
  },

  // Set the production url of your site here
  url: 'https://leaderiop.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/hex-di/',

  // GitHub pages deployment config.
  organizationName: 'leaderiop', // GitHub org/user name
  projectName: 'hex-di', // repo name

  onBrokenLinks: 'throw',

  // SEO: HTML lang attribute for accessibility and search engines
  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang.
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // SEO: Site-wide head tags for meta description and keywords
  headTags: [
    // Primary meta description (150-160 characters for optimal SEO)
    {
      tagName: 'meta',
      attributes: {
        name: 'description',
        content:
          'HexDI is a type-safe dependency injection framework for TypeScript. Catch dependency errors at compile time with full type inference and zero runtime overhead.',
      },
    },
    // SEO keywords
    {
      tagName: 'meta',
      attributes: {
        name: 'keywords',
        content:
          'dependency injection, TypeScript, type-safe, DI, IoC, inversion of control, hexagonal architecture, ports and adapters, React DI, compile-time validation',
      },
    },
    // Author meta tag
    {
      tagName: 'meta',
      attributes: {
        name: 'author',
        content: 'HexDI Contributors',
      },
    },
    // Robots meta tag
    {
      tagName: 'meta',
      attributes: {
        name: 'robots',
        content: 'index, follow',
      },
    },
    // Theme color for browser UI
    {
      tagName: 'meta',
      attributes: {
        name: 'theme-color',
        content: '#5E35B1',
      },
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../docs',
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
          editUrl: 'https://github.com/leaderiop/hex-di/tree/main/docs/',
          // Enable showLineNumbers globally for code blocks
          // Users can still use showLineNumbers={false} to disable per-block
        },
        // Disable blog
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        // SEO: Sitemap generation for search engines
        sitemap: {
          lastmod: 'date',
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
        },
      } satisfies Preset.Options,
    ],
  ],

  // Local search plugin
  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        // Index settings
        hashed: true,
        language: ['en'],
        indexDocs: true,
        indexPages: true,
        indexBlog: false,

        // Search result behavior
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,

        // Route configuration
        docsRouteBasePath: '/docs',

        // Search bar configuration
        searchBarShortcut: true,
        searchBarShortcutHint: true,
        searchBarPosition: 'right',

        // Result limits
        searchResultLimits: 8,
        searchResultContextMaxLength: 50,

        // Remove default stop words for better search results
        removeDefaultStopWordFilter: false,
        removeDefaultStemmer: false,
      },
    ],
  ],

  themeConfig: {
    // SEO: Open Graph and Twitter Card social sharing image
    image: 'img/hexdi-social-card.png',

    // SEO: Open Graph metadata
    metadata: [
      // Open Graph tags
      {name: 'og:type', content: 'website'},
      {name: 'og:site_name', content: 'HexDI'},
      {
        name: 'og:title',
        content: 'HexDI - Type-Safe Dependency Injection for TypeScript',
      },
      {
        name: 'og:description',
        content:
          'Catch dependency errors at compile time, not runtime. Build robust TypeScript applications with full type inference and zero runtime overhead.',
      },
      // Twitter Card tags
      {name: 'twitter:card', content: 'summary_large_image'},
      {
        name: 'twitter:title',
        content: 'HexDI - Type-Safe Dependency Injection for TypeScript',
      },
      {
        name: 'twitter:description',
        content:
          'Catch dependency errors at compile time, not runtime. Build robust TypeScript applications with full type inference and zero runtime overhead.',
      },
    ],

    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    // Table of Contents configuration
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
    },
    navbar: {
      title: 'HexDI',
      logo: {
        alt: 'HexDI Logo',
        src: 'img/logo.svg',
        width: 40,
        height: 40,
      },
      hideOnScroll: false,
      items: [
        // Left-side navigation items
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/api',
          position: 'left',
          label: 'API',
        },
        {
          to: '/docs/examples',
          position: 'left',
          label: 'Examples',
        },
        // Right-side items
        {
          type: 'search',
          position: 'right',
        },
        {
          href: 'https://github.com/leaderiop/hex-di',
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub repository',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started',
            },
            {
              label: 'API Reference',
              to: '/docs/api',
            },
            {
              label: 'Guides',
              to: '/docs/guides',
            },
            {
              label: 'Examples',
              to: '/docs/examples',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/leaderiop/hex-di',
            },
            {
              label: 'Discussions',
              href: 'https://github.com/leaderiop/hex-di/discussions',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'Changelog',
              href: 'https://github.com/leaderiop/hex-di/blob/main/CHANGELOG.md',
            },
            {
              label: 'Roadmap',
              href: 'https://github.com/leaderiop/hex-di/blob/main/ROADMAP.md',
            },
          ],
        },
        {
          title: 'Legal',
          items: [
            {
              label: 'License',
              href: 'https://github.com/leaderiop/hex-di/blob/main/LICENSE',
            },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} HexDI Contributors. MIT License. Built with Docusaurus.`,
    },
    prism: {
      // Light theme: GitHub-style
      theme: prismThemes.github,
      // Dark theme: Dracula-style (customized via CSS for brand colors)
      darkTheme: prismThemes.dracula,
      // Additional languages for TypeScript ecosystem
      additionalLanguages: [
        'bash',
        'json',
        'typescript',
        'tsx',
        'jsx',
        'diff',
        'shell-session',
      ],
      // Enable magic comments for line highlighting
      magicComments: [
        {
          className: 'theme-code-block-highlighted-line',
          line: 'highlight-next-line',
          block: {start: 'highlight-start', end: 'highlight-end'},
        },
        {
          className: 'code-block-error-line',
          line: 'error-line',
          block: {start: 'error-start', end: 'error-end'},
        },
        {
          className: 'code-block-success-line',
          line: 'success-line',
          block: {start: 'success-start', end: 'success-end'},
        },
      ],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
