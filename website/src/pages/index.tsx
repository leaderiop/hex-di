import type { ReactNode } from 'react';
import { useState, useCallback } from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';

import FeatureCard from '@site/src/components/FeatureCard';
import FeatureGrid from '@site/src/components/FeatureGrid';
import PackageCard from '@site/src/components/PackageCard';
import LifetimeBadge from '@site/src/components/LifetimeBadge';
import styles from './index.module.css';

/**
 * NPM install command to copy
 */
const NPM_INSTALL_COMMAND =
  'npm install @hex-di/ports @hex-di/graph @hex-di/runtime';

/**
 * Quick start code example
 * Demonstrates HexDI's core concepts in a concise, readable format
 */
const QUICK_START_CODE = `import { createPort } from '@hex-di/ports';
import { createAdapter, GraphBuilder } from '@hex-di/graph';
import { createContainer } from '@hex-di/runtime';

// highlight-next-line
// 1. Define your service interface
interface Logger {
  log(message: string): void;
}

// highlight-next-line
// 2. Create a port (contract + runtime token)
const LoggerPort = createPort<'Logger', Logger>('Logger');

// highlight-next-line
// 3. Create an adapter (implementation)
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({
    log: (msg) => console.log(\`[App] \${msg}\`)
  })
});

// highlight-next-line
// 4. Build the graph (validated at compile time!)
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .build();

// highlight-next-line
// 5. Create container and resolve services
const container = createContainer(graph);
const logger = container.resolve(LoggerPort);
logger.log('Hello, HexDI!');`;

/**
 * Code example for compile-time error demonstration in "Why HexDI?" section
 */
const COMPILE_TIME_ERROR_CODE = `import { createPort, createAdapter, GraphBuilder } from '@hex-di/graph';

// Define ports
const DatabasePort = createPort<'Database', Database>('Database');
const UserServicePort = createPort<'UserService', UserService>('UserService');

// UserService requires Database
const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [DatabasePort],  // Declares dependency on Database
  lifetime: 'scoped',
  factory: ({ Database }) => new UserServiceImpl(Database)
});

// highlight-start
// Missing dependency - TypeScript error at compile time!
const graph = GraphBuilder.create()
  .provide(UserServiceAdapter)  // Error: DatabasePort is required but not provided
  .build();
// highlight-end`;

/**
 * Copy icon SVG component
 */
function CopyIcon(): ReactNode {
  return (
    <svg
      className={styles.copyIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/**
 * Check icon SVG component (shown after successful copy)
 */
function CheckIcon(): ReactNode {
  return (
    <svg
      className={styles.checkIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/**
 * Shield/Checkmark icon for Compile-Time Validation feature
 */
function ShieldCheckIcon(): ReactNode {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

/**
 * Lightning bolt icon for Zero Runtime Overhead feature
 */
function ZapIcon(): ReactNode {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

/**
 * Layers icon for Type-Safe Resolution feature
 */
function LayersIcon(): ReactNode {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

/**
 * React logo icon for React Integration feature
 */
function ReactIcon(): ReactNode {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
    </svg>
  );
}

/**
 * Wrench/Tool icon for DevTools Integration feature
 */
function WrenchIcon(): ReactNode {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

/**
 * Hexagon icon for Three Lifetime Scopes feature
 */
function HexagonIcon(): ReactNode {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}

/**
 * Hero hexagon visual component
 * Renders the hero illustration as an inline SVG for better control
 */
function HeroVisual(): ReactNode {
  return (
    <svg
      className={styles.heroVisual}
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="HexDI dependency injection visualization showing Container, Port, Adapter, and Service nodes connected in a hexagonal pattern"
      focusable="false"
    >
      <defs>
        {/* Main gradient for outer hexagon */}
        <linearGradient
          id="heroHexGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#7E57C2" />
          <stop offset="50%" stopColor="#5E35B1" />
          <stop offset="100%" stopColor="#4527A0" />
        </linearGradient>
        {/* TypeScript blue gradient for inner hexagon */}
        <linearGradient
          id="heroInnerGradient"
          x1="0%"
          y1="100%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#1976D2" />
          <stop offset="50%" stopColor="#2196F3" />
          <stop offset="100%" stopColor="#64B5F6" />
        </linearGradient>
        {/* Glow filter */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Subtle shadow for depth */}
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="8"
            floodColor="#5E35B1"
            floodOpacity="0.3"
          />
        </filter>
      </defs>

      {/* Background glow circles */}
      <circle cx="160" cy="160" r="140" fill="#5E35B1" opacity="0.08" />
      <circle cx="160" cy="160" r="120" fill="#5E35B1" opacity="0.05" />

      {/* Outer hexagon with shadow */}
      <g filter="url(#shadow)">
        <path
          d="M160 20L293.28 96V248L160 324L26.72 248V96L160 20Z"
          fill="url(#heroHexGradient)"
          transform="translate(0, -12) scale(0.96)"
        />
      </g>

      {/* Inner hexagon */}
      <path
        d="M160 60L253.56 114V222L160 276L66.44 222V114L160 60Z"
        fill="url(#heroInnerGradient)"
        fillOpacity="0.95"
        transform="translate(0, -4) scale(0.98)"
      />

      {/* Dependency injection visualization - nodes and connections */}
      <g filter="url(#glow)">
        {/* Central node (Container) */}
        <circle cx="160" cy="120" r="16" fill="white" />
        <circle cx="160" cy="120" r="10" fill="#5E35B1" />

        {/* Left node (Port) */}
        <circle cx="100" cy="200" r="14" fill="white" />
        <circle cx="100" cy="200" r="8" fill="#00897B" />

        {/* Right node (Adapter) */}
        <circle cx="220" cy="200" r="14" fill="white" />
        <circle cx="220" cy="200" r="8" fill="#2196F3" />

        {/* Bottom center node (Service) */}
        <circle cx="160" cy="240" r="12" fill="white" />
        <circle cx="160" cy="240" r="6" fill="#FF8F00" />
      </g>

      {/* Connection lines */}
      <g
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.9"
      >
        {/* Container to Port */}
        <path d="M150 132L108 188" strokeDasharray="4 4" />
        {/* Container to Adapter */}
        <path d="M170 132L212 188" strokeDasharray="4 4" />
        {/* Port to Service */}
        <path d="M108 212L148 234" />
        {/* Adapter to Service */}
        <path d="M212 212L172 234" />
      </g>

      {/* Labels */}
      <g
        fill="white"
        fontFamily="Inter, -apple-system, sans-serif"
        fontSize="11"
        fontWeight="600"
        textAnchor="middle"
      >
        <text x="160" y="88" opacity="0.9">
          Container
        </text>
        <text x="100" y="178" opacity="0.9">
          Port
        </text>
        <text x="220" y="178" opacity="0.9">
          Adapter
        </text>
        <text x="160" y="270" opacity="0.9">
          Service
        </text>
      </g>

      {/* TypeScript badge */}
      <g transform="translate(240, 50)">
        <rect x="0" y="0" width="48" height="24" rx="4" fill="#2196F3" />
        <text
          x="24"
          y="16"
          fill="white"
          fontFamily="Fira Code, monospace"
          fontSize="10"
          fontWeight="600"
          textAnchor="middle"
        >
          TS
        </text>
      </g>
    </svg>
  );
}

/**
 * NPM install command component with copy to clipboard functionality
 */
function NpmInstallCommand(): ReactNode {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(NPM_INSTALL_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = NPM_INSTALL_COMMAND;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error('Failed to copy:', e);
      }
      document.body.removeChild(textArea);
    }
  }, []);

  return (
    <div className={styles.npmCommand} role="group" aria-label="NPM install command">
      <span className={styles.npmPrefix} aria-hidden="true">$</span>
      <code className={styles.npmText}>{NPM_INSTALL_COMMAND}</code>
      <button
        type="button"
        className={`${styles.npmCopyButton} ${copied ? styles.copied : ''}`}
        onClick={handleCopy}
        aria-label={copied ? 'Copied to clipboard' : 'Copy install command to clipboard'}
        aria-live="polite"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        <span className="sr-only">{copied ? 'Copied!' : 'Copy'}</span>
      </button>
    </div>
  );
}

/**
 * Hero section component
 * Contains the main headline, subtitle, CTAs, and npm install command
 */
function HeroSection(): ReactNode {
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        {/* Hero Visual */}
        <HeroVisual />

        {/* Main Title */}
        <Heading as="h1" className={styles.heroTitle}>
          Type-Safe Dependency Injection for TypeScript
        </Heading>

        {/* Subtitle */}
        <p className={styles.heroSubtitle}>
          Catch dependency errors at compile time, not at runtime. Build
          robust applications with full type inference and zero runtime
          overhead.
        </p>

        {/* CTA Buttons */}
        <nav className={styles.ctaButtons} aria-label="Primary actions">
          <Link to="/docs/getting-started" className={styles.ctaPrimary}>
            Get Started
          </Link>
          <Link to="/docs" className={styles.ctaSecondary}>
            View Documentation
          </Link>
        </nav>

        {/* NPM Install Command */}
        <NpmInstallCommand />
      </div>
    </header>
  );
}

/**
 * Feature data for the 6 feature cards
 */
const FEATURES = [
  {
    icon: <ShieldCheckIcon />,
    title: 'Compile-Time Validation',
    description:
      'Missing dependencies cause TypeScript errors, not runtime crashes.',
  },
  {
    icon: <ZapIcon />,
    title: 'Zero Runtime Overhead',
    description: 'Phantom types and optional features add no cost.',
  },
  {
    icon: <LayersIcon />,
    title: 'Type-Safe Resolution',
    description: 'Full type inference, no explicit annotations needed.',
  },
  {
    icon: <ReactIcon />,
    title: 'React Integration',
    description:
      'Typed hooks and providers with automatic scope lifecycle.',
  },
  {
    icon: <WrenchIcon />,
    title: 'DevTools Integration',
    description: 'Visualize dependency graphs and trace services.',
  },
  {
    icon: <HexagonIcon />,
    title: 'Three Lifetime Scopes',
    description: 'Singleton, scoped, and request with proper isolation.',
  },
];

/**
 * Features section component
 * Displays 6 feature cards in a responsive grid layout
 */
function FeaturesSection(): ReactNode {
  return (
    <section className={styles.featuresSection} aria-labelledby="features-heading">
      <div className={styles.featuresInner}>
        <Heading as="h2" id="features-heading" className={styles.sectionTitle}>
          Key Features
        </Heading>
        <p className={styles.sectionSubtitle}>
          Everything you need for type-safe dependency injection in TypeScript
        </p>
        <FeatureGrid>
          {FEATURES.map((feature) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </FeatureGrid>
      </div>
    </section>
  );
}

/**
 * Code Example section component
 * Displays a comprehensive HexDI code example with syntax highlighting
 */
function CodeExampleSection(): ReactNode {
  return (
    <section className={styles.codeExampleSection} aria-labelledby="code-example-heading">
      <div className={styles.codeExampleInner}>
        <Heading as="h2" id="code-example-heading" className={styles.sectionTitle}>
          See It In Action
        </Heading>
        <p className={styles.sectionSubtitle}>
          A simple example showing HexDI's core concepts
        </p>

        <div className={styles.codeBlockWrapper}>
          <CodeBlock
            language="typescript"
            title="quick-start.ts"
            showLineNumbers
          >
            {QUICK_START_CODE}
          </CodeBlock>
        </div>

        <div className={styles.codeExampleCta}>
          <Link
            to="/docs/getting-started/first-application"
            className={styles.ctaPrimary}
          >
            Explore Full Tutorial
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Package data for the 6 package cards
 * Core packages appear in the first row, optional packages in the second row
 */
const PACKAGES = {
  core: [
    {
      name: '@hex-di/ports',
      badge: 'Core' as const,
      description: 'Port token system for defining service contracts',
      features: [
        'Type-safe port definitions',
        'Branded types for uniqueness',
        'Zero runtime overhead',
      ],
      link: '/docs/api/ports',
    },
    {
      name: '@hex-di/graph',
      badge: 'Core' as const,
      description: 'GraphBuilder with compile-time dependency validation',
      features: [
        'Immutable builder pattern',
        'Type-safe composition',
        'Compile-time validation',
      ],
      link: '/docs/api/graph',
    },
    {
      name: '@hex-di/runtime',
      badge: 'Core' as const,
      description: 'Container creation and service resolution',
      features: [
        'Lazy service instantiation',
        'Lifetime scope management',
        'Hierarchical containers',
      ],
      link: '/docs/api/runtime',
    },
  ],
  optional: [
    {
      name: '@hex-di/react',
      badge: 'Optional' as const,
      description: 'React hooks and providers with automatic scope lifecycle',
      features: [
        'useService hook',
        'DIProvider component',
        'Scope-aware context',
      ],
      link: '/docs/api/react',
    },
    {
      name: '@hex-di/devtools',
      badge: 'Optional' as const,
      description: 'Graph visualization and service tracing',
      features: [
        'Dependency graph viewer',
        'Service call tracing',
        'Runtime inspection',
      ],
      link: '/docs/api/devtools',
    },
    {
      name: '@hex-di/testing',
      badge: 'Optional' as const,
      description: 'Testing utilities and mock helpers',
      features: [
        'Mock service creation',
        'Test container setup',
        'Isolation helpers',
      ],
      link: '/docs/api/testing',
    },
  ],
};

/**
 * Package Architecture Diagram component
 * Shows core and optional packages with dependency arrows
 */
function PackageDiagram(): ReactNode {
  return (
    <svg
      className={styles.packageDiagram}
      viewBox="0 0 600 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="HexDI package architecture diagram showing three core packages (ports, graph, runtime) on the left and three optional packages (react, devtools, testing) on the right, with dependency arrows showing how optional packages depend on core packages"
      focusable="false"
    >
      <defs>
        {/* Core package gradient */}
        <linearGradient id="coreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7E57C2" />
          <stop offset="100%" stopColor="#5E35B1" />
        </linearGradient>
        {/* Optional package gradient */}
        <linearGradient id="optionalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#42A5F5" />
          <stop offset="100%" stopColor="#1976D2" />
        </linearGradient>
        {/* Arrow marker */}
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="var(--hexdi-text-tertiary, #6A737D)"
          />
        </marker>
      </defs>

      {/* Section labels */}
      <text
        x="150"
        y="30"
        fill="var(--hexdi-text-primary, #24292E)"
        fontFamily="var(--font-headings, 'Manrope', sans-serif)"
        fontSize="14"
        fontWeight="600"
        textAnchor="middle"
      >
        Core Packages
      </text>
      <text
        x="450"
        y="30"
        fill="var(--hexdi-text-primary, #24292E)"
        fontFamily="var(--font-headings, 'Manrope', sans-serif)"
        fontSize="14"
        fontWeight="600"
        textAnchor="middle"
      >
        Optional Packages
      </text>

      {/* Core packages column */}
      {/* @hex-di/ports */}
      <g transform="translate(50, 50)">
        <rect
          x="0"
          y="0"
          width="200"
          height="60"
          rx="8"
          fill="url(#coreGradient)"
        />
        <text
          x="100"
          y="28"
          fill="white"
          fontFamily="var(--font-code, 'Fira Code', monospace)"
          fontSize="12"
          fontWeight="500"
          textAnchor="middle"
        >
          @hex-di/ports
        </text>
        <text
          x="100"
          y="46"
          fill="rgba(255, 255, 255, 0.8)"
          fontFamily="var(--font-primary, 'Inter', sans-serif)"
          fontSize="10"
          textAnchor="middle"
        >
          Port token system
        </text>
      </g>

      {/* @hex-di/graph */}
      <g transform="translate(50, 130)">
        <rect
          x="0"
          y="0"
          width="200"
          height="60"
          rx="8"
          fill="url(#coreGradient)"
        />
        <text
          x="100"
          y="28"
          fill="white"
          fontFamily="var(--font-code, 'Fira Code', monospace)"
          fontSize="12"
          fontWeight="500"
          textAnchor="middle"
        >
          @hex-di/graph
        </text>
        <text
          x="100"
          y="46"
          fill="rgba(255, 255, 255, 0.8)"
          fontFamily="var(--font-primary, 'Inter', sans-serif)"
          fontSize="10"
          textAnchor="middle"
        >
          Builder + validation
        </text>
      </g>

      {/* @hex-di/runtime */}
      <g transform="translate(50, 210)">
        <rect
          x="0"
          y="0"
          width="200"
          height="60"
          rx="8"
          fill="url(#coreGradient)"
        />
        <text
          x="100"
          y="28"
          fill="white"
          fontFamily="var(--font-code, 'Fira Code', monospace)"
          fontSize="12"
          fontWeight="500"
          textAnchor="middle"
        >
          @hex-di/runtime
        </text>
        <text
          x="100"
          y="46"
          fill="rgba(255, 255, 255, 0.8)"
          fontFamily="var(--font-primary, 'Inter', sans-serif)"
          fontSize="10"
          textAnchor="middle"
        >
          Container + resolution
        </text>
      </g>

      {/* Optional packages column */}
      {/* @hex-di/react */}
      <g transform="translate(350, 50)">
        <rect
          x="0"
          y="0"
          width="200"
          height="60"
          rx="8"
          fill="url(#optionalGradient)"
        />
        <text
          x="100"
          y="28"
          fill="white"
          fontFamily="var(--font-code, 'Fira Code', monospace)"
          fontSize="12"
          fontWeight="500"
          textAnchor="middle"
        >
          @hex-di/react
        </text>
        <text
          x="100"
          y="46"
          fill="rgba(255, 255, 255, 0.8)"
          fontFamily="var(--font-primary, 'Inter', sans-serif)"
          fontSize="10"
          textAnchor="middle"
        >
          React integration
        </text>
      </g>

      {/* @hex-di/devtools */}
      <g transform="translate(350, 130)">
        <rect
          x="0"
          y="0"
          width="200"
          height="60"
          rx="8"
          fill="url(#optionalGradient)"
        />
        <text
          x="100"
          y="28"
          fill="white"
          fontFamily="var(--font-code, 'Fira Code', monospace)"
          fontSize="12"
          fontWeight="500"
          textAnchor="middle"
        >
          @hex-di/devtools
        </text>
        <text
          x="100"
          y="46"
          fill="rgba(255, 255, 255, 0.8)"
          fontFamily="var(--font-primary, 'Inter', sans-serif)"
          fontSize="10"
          textAnchor="middle"
        >
          Graph visualization
        </text>
      </g>

      {/* @hex-di/testing */}
      <g transform="translate(350, 210)">
        <rect
          x="0"
          y="0"
          width="200"
          height="60"
          rx="8"
          fill="url(#optionalGradient)"
        />
        <text
          x="100"
          y="28"
          fill="white"
          fontFamily="var(--font-code, 'Fira Code', monospace)"
          fontSize="12"
          fontWeight="500"
          textAnchor="middle"
        >
          @hex-di/testing
        </text>
        <text
          x="100"
          y="46"
          fill="rgba(255, 255, 255, 0.8)"
          fontFamily="var(--font-primary, 'Inter', sans-serif)"
          fontSize="10"
          textAnchor="middle"
        >
          Mocking & utilities
        </text>
      </g>

      {/* Dependency arrows - Core internal */}
      <path
        d="M150 110 L150 130"
        stroke="var(--hexdi-text-tertiary, #6A737D)"
        strokeWidth="2"
        strokeDasharray="4 2"
        markerEnd="url(#arrowhead)"
      />
      <path
        d="M150 190 L150 210"
        stroke="var(--hexdi-text-tertiary, #6A737D)"
        strokeWidth="2"
        strokeDasharray="4 2"
        markerEnd="url(#arrowhead)"
      />

      {/* Dependency arrows - Optional to Core */}
      <path
        d="M350 80 L250 80"
        stroke="var(--hexdi-text-tertiary, #6A737D)"
        strokeWidth="1.5"
        strokeDasharray="4 2"
        markerEnd="url(#arrowhead)"
      />
      <path
        d="M350 160 L250 160"
        stroke="var(--hexdi-text-tertiary, #6A737D)"
        strokeWidth="1.5"
        strokeDasharray="4 2"
        markerEnd="url(#arrowhead)"
      />
      <path
        d="M350 240 L250 240"
        stroke="var(--hexdi-text-tertiary, #6A737D)"
        strokeWidth="1.5"
        strokeDasharray="4 2"
        markerEnd="url(#arrowhead)"
      />

      {/* Legend */}
      <g transform="translate(220, 295)">
        <rect x="0" y="0" width="12" height="12" rx="2" fill="url(#coreGradient)" />
        <text
          x="18"
          y="10"
          fill="var(--hexdi-text-secondary, #586069)"
          fontFamily="var(--font-primary, 'Inter', sans-serif)"
          fontSize="10"
        >
          Core
        </text>
        <rect x="60" y="0" width="12" height="12" rx="2" fill="url(#optionalGradient)" />
        <text
          x="78"
          y="10"
          fill="var(--hexdi-text-secondary, #586069)"
          fontFamily="var(--font-primary, 'Inter', sans-serif)"
          fontSize="10"
        >
          Optional
        </text>
        <line
          x1="130"
          y1="6"
          x2="150"
          y2="6"
          stroke="var(--hexdi-text-tertiary, #6A737D)"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />
        <text
          x="155"
          y="10"
          fill="var(--hexdi-text-secondary, #586069)"
          fontFamily="var(--font-primary, 'Inter', sans-serif)"
          fontSize="10"
        >
          depends on
        </text>
      </g>
    </svg>
  );
}

/**
 * Package Architecture section component
 * Displays package diagram and 6 package cards in a 3x2 grid
 */
function PackageArchitectureSection(): ReactNode {
  return (
    <section className={styles.packageSection} aria-labelledby="packages-heading">
      <div className={styles.packageInner}>
        <Heading as="h2" id="packages-heading" className={styles.sectionTitle}>
          Package Architecture
        </Heading>
        <p className={styles.sectionSubtitle}>
          HexDI is designed with modularity in mind
        </p>

        {/* Package Diagram */}
        <div className={styles.packageDiagramWrapper}>
          <PackageDiagram />
        </div>

        {/* Package Cards Grid - 3x2 layout */}
        <div className={styles.packageGrid} role="list" aria-label="HexDI packages">
          {/* Core packages - first row */}
          {PACKAGES.core.map((pkg) => (
            <div key={pkg.name} role="listitem">
              <PackageCard
                name={pkg.name}
                badge={pkg.badge}
                description={pkg.description}
                features={pkg.features}
                link={pkg.link}
              />
            </div>
          ))}
          {/* Optional packages - second row */}
          {PACKAGES.optional.map((pkg) => (
            <div key={pkg.name} role="listitem">
              <PackageCard
                name={pkg.name}
                badge={pkg.badge}
                description={pkg.description}
                features={pkg.features}
                link={pkg.link}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Lifetime scope data for the three lifetime cards
 */
const LIFETIME_SCOPES = [
  {
    type: 'singleton' as const,
    title: 'Singleton',
    description: 'Created once per container',
    useCases: [
      'Configuration services',
      'Shared resources',
      'Stateless services',
      'Connection pools',
    ],
    code: `const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  lifetime: 'singleton',  // One instance shared
  factory: () => loadConfig()
});`,
  },
  {
    type: 'scoped' as const,
    title: 'Scoped',
    description: 'Once per scope context',
    useCases: [
      'User sessions',
      'HTTP request handlers',
      'Database transactions',
      'Component-level state',
    ],
    code: `const SessionAdapter = createAdapter({
  provides: SessionPort,
  lifetime: 'scoped',  // One per scope
  factory: () => createSession()
});`,
  },
  {
    type: 'request' as const,
    title: 'Request',
    description: 'Fresh instance every time',
    useCases: [
      'Notification services',
      'Ephemeral handlers',
      'Fresh state per use',
      'Isolated operations',
    ],
    code: `const NotificationAdapter = createAdapter({
  provides: NotificationPort,
  lifetime: 'request',  // New each time
  factory: () => new Notification()
});`,
  },
];

/**
 * Lifetime Scopes section component
 * Displays the three lifetime scopes with badges, descriptions, and use cases
 */
function LifetimeScopesSection(): ReactNode {
  return (
    <section className={styles.lifetimeSection} aria-labelledby="lifetime-heading">
      <div className={styles.lifetimeInner}>
        <Heading as="h2" id="lifetime-heading" className={styles.sectionTitle}>
          Understanding Lifetime Scopes
        </Heading>
        <p className={styles.sectionSubtitle}>
          Control service lifecycle with three distinct scopes
        </p>

        <div className={styles.lifetimeGrid} role="list" aria-label="Lifetime scopes">
          {LIFETIME_SCOPES.map((scope) => (
            <article key={scope.type} className={styles.lifetimeCard} role="listitem">
              <div className={styles.lifetimeHeader}>
                <LifetimeBadge type={scope.type} />
              </div>
              <p className={styles.lifetimeDescription}>{scope.description}</p>
              <ul className={styles.lifetimeUseCases} aria-label={`${scope.title} use cases`}>
                {scope.useCases.map((useCase) => (
                  <li key={useCase}>{useCase}</li>
                ))}
              </ul>
              <div className={styles.lifetimeCodeWrapper}>
                <CodeBlock language="typescript">{scope.code}</CodeBlock>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * "Why Choose HexDI?" section component
 * Displays a quote about compile-time safety and a code example showing error detection
 */
function WhyHexDISection(): ReactNode {
  return (
    <section className={styles.whySection} aria-labelledby="why-heading">
      <div className={styles.whyInner}>
        <Heading as="h2" id="why-heading" className={styles.sectionTitle}>
          Why Choose HexDI?
        </Heading>

        <div className={styles.whyContent}>
          {/* Quote/Callout about compile-time safety */}
          <blockquote className={styles.whyQuote}>
            <p>
              "Most DI libraries fail at runtime. HexDI catches errors at
              compile time with TypeScript's type system."
            </p>
          </blockquote>

          {/* Code example showing compile-time error detection */}
          <div className={styles.whyCodeWrapper}>
            <div className={styles.whyCodeHeader}>
              <span className={styles.whyCodeLabel}>Compile-Time Error Detection</span>
              <span className={styles.whyCodeBadge}>TypeScript</span>
            </div>
            <CodeBlock
              language="typescript"
              title="missing-dependency.ts"
              showLineNumbers
            >
              {COMPILE_TIME_ERROR_CODE}
            </CodeBlock>
            <div className={styles.whyErrorHighlight} role="alert" aria-live="polite">
              <span className={styles.errorIcon} aria-hidden="true">!</span>
              <span className={styles.errorText}>
                Error: Property 'DatabasePort' is missing in type but required
              </span>
            </div>
          </div>

          {/* Benefits cards */}
          <div className={styles.whyBenefits}>
            <article className={styles.whyBenefitCard}>
              <h3>Effect-TS Inspired Design</h3>
              <p>
                Immutable builder pattern enables safe composition and graph
                branching without mutation concerns.
              </p>
            </article>
            <article className={styles.whyBenefitCard}>
              <h3>Framework Agnostic</h3>
              <p>
                Core packages work anywhere - React is optional, not required.
                Use HexDI in any TypeScript project.
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * "Ready to Get Started?" CTA section component
 * Displays a call-to-action with links to documentation and examples
 */
function CTASection(): ReactNode {
  return (
    <section className={styles.ctaSection} aria-labelledby="cta-heading">
      <div className={styles.ctaInner}>
        <Heading as="h2" id="cta-heading" className={styles.ctaSectionTitle}>
          Ready to Get Started?
        </Heading>
        <p className={styles.ctaSectionSubtitle}>
          Build type-safe applications today
        </p>
        <nav className={styles.ctaSectionButtons} aria-label="Get started actions">
          <Link to="/docs" className={styles.ctaPrimary}>
            Read Documentation
          </Link>
          <Link to="/docs/examples" className={styles.ctaSecondary}>
            View Examples
          </Link>
        </nav>
      </div>
    </section>
  );
}

/**
 * Homepage component
 * Main entry point for the HexDI documentation website homepage
 */
export default function Home(): ReactNode {
  return (
    <Layout
      title="Type-Safe Dependency Injection for TypeScript"
      description="HexDI is a type-safe dependency injection framework for TypeScript with compile-time validation. Catch dependency errors at compile time, not at runtime."
    >
      <HeroSection />
      <main className={styles.main} id="main-content">
        <FeaturesSection />
        <CodeExampleSection />
        <PackageArchitectureSection />
        <LifetimeScopesSection />
        <WhyHexDISection />
        <CTASection />
      </main>
    </Layout>
  );
}
