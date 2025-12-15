import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * Sidebar configuration for HexDI documentation.
 *
 * Organized into logical sections that guide users from introduction
 * through advanced patterns and API reference.
 */
const sidebars: SidebarsConfig = {
  docsSidebar: [
    // -------------------------------------------------------------------------
    // Getting Started - First and most prominent, expanded by default
    // -------------------------------------------------------------------------
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      collapsible: true,
      link: {
        type: 'doc',
        id: 'getting-started/README',
      },
      items: [
        {
          type: 'doc',
          id: 'getting-started/installation',
          label: 'Installation',
        },
        {
          type: 'doc',
          id: 'getting-started/core-concepts',
          label: 'Core Concepts',
        },
        {
          type: 'doc',
          id: 'getting-started/first-application',
          label: 'First Application',
        },
        {
          type: 'doc',
          id: 'getting-started/lifetimes',
          label: 'Lifetimes',
        },
        {
          type: 'doc',
          id: 'getting-started/typescript-integration',
          label: 'TypeScript Integration',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Guides - Practical integration guides
    // -------------------------------------------------------------------------
    {
      type: 'category',
      label: 'Guides',
      collapsed: true,
      collapsible: true,
      link: {
        type: 'doc',
        id: 'guides/README',
      },
      items: [
        {
          type: 'doc',
          id: 'guides/react-integration',
          label: 'React Integration',
        },
        {
          type: 'doc',
          id: 'guides/testing-strategies',
          label: 'Testing Strategies',
        },
        {
          type: 'doc',
          id: 'guides/devtools-usage',
          label: 'DevTools Usage',
        },
        {
          type: 'doc',
          id: 'guides/error-handling',
          label: 'Error Handling',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Patterns - Advanced patterns and best practices
    // -------------------------------------------------------------------------
    {
      type: 'category',
      label: 'Patterns',
      collapsed: true,
      collapsible: true,
      link: {
        type: 'doc',
        id: 'patterns/README',
      },
      items: [
        {
          type: 'doc',
          id: 'patterns/project-structure',
          label: 'Project Structure',
        },
        {
          type: 'doc',
          id: 'patterns/composing-graphs',
          label: 'Composing Graphs',
        },
        {
          type: 'doc',
          id: 'patterns/scoped-services',
          label: 'Scoped Services',
        },
        {
          type: 'doc',
          id: 'patterns/finalizers-and-cleanup',
          label: 'Finalizers and Cleanup',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // API Reference - Package-specific documentation
    // -------------------------------------------------------------------------
    {
      type: 'category',
      label: 'API Reference',
      collapsed: true,
      collapsible: true,
      link: {
        type: 'doc',
        id: 'api/README',
      },
      items: [
        {
          type: 'doc',
          id: 'api/ports',
          label: '@hex-di/ports',
        },
        {
          type: 'doc',
          id: 'api/graph',
          label: '@hex-di/graph',
        },
        {
          type: 'doc',
          id: 'api/runtime',
          label: '@hex-di/runtime',
        },
        {
          type: 'doc',
          id: 'api/react',
          label: '@hex-di/react',
        },
        {
          type: 'doc',
          id: 'api/devtools',
          label: '@hex-di/devtools',
        },
        {
          type: 'doc',
          id: 'api/testing',
          label: '@hex-di/testing',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Examples - Real-world examples and demos
    // -------------------------------------------------------------------------
    {
      type: 'category',
      label: 'Examples',
      collapsed: true,
      collapsible: true,
      link: {
        type: 'doc',
        id: 'examples/README',
      },
      items: [],
    },
  ],
};

export default sidebars;
