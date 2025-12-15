import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './404.module.css';

/**
 * Hexagon visual for 404 page
 * Uses brand colors and creates a broken/error visual effect
 */
function BrokenHexagonVisual(): ReactNode {
  return (
    <svg
      className={styles.visual}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="404 error illustration"
      focusable="false"
    >
      <defs>
        {/* Error gradient */}
        <linearGradient id="errorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9575CD" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#5E35B1" stopOpacity="0.2" />
        </linearGradient>
        {/* Glow filter */}
        <filter id="errorGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background circle */}
      <circle cx="100" cy="100" r="90" fill="url(#errorGradient)" />

      {/* Broken hexagon outline - dashed to indicate "broken" */}
      <path
        d="M100 20L173.3 62.5V147.5L100 190L26.7 147.5V62.5L100 20Z"
        fill="none"
        stroke="var(--hexdi-primary-400, #7E57C2)"
        strokeWidth="3"
        strokeDasharray="12 8"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* Inner hexagon - solid */}
      <path
        d="M100 45L153.3 75.5V136.5L100 167L46.7 136.5V75.5L100 45Z"
        fill="var(--hexdi-primary-500, #5E35B1)"
        fillOpacity="0.15"
        stroke="var(--hexdi-primary-500, #5E35B1)"
        strokeWidth="2"
        opacity="0.8"
      />

      {/* Question mark icon in center */}
      <g filter="url(#errorGlow)">
        <text
          x="100"
          y="120"
          fill="var(--hexdi-primary-400, #7E57C2)"
          fontFamily="var(--font-headings, 'Manrope', sans-serif)"
          fontSize="60"
          fontWeight="700"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          ?
        </text>
      </g>

      {/* Small decorative elements - scattered "lost" nodes */}
      <circle cx="45" cy="45" r="6" fill="var(--hexdi-ts-500, #2196F3)" opacity="0.4" />
      <circle cx="155" cy="45" r="4" fill="var(--hexdi-singleton-600, #00897B)" opacity="0.4" />
      <circle cx="35" cy="155" r="5" fill="var(--hexdi-scoped-600, #FF8F00)" opacity="0.4" />
      <circle cx="165" cy="155" r="4" fill="var(--hexdi-request-600, #7B1FA2)" opacity="0.4" />
    </svg>
  );
}

/**
 * Custom 404 Not Found page
 * Displays a user-friendly error message with navigation options
 */
export default function NotFound(): ReactNode {
  return (
    <Layout
      title="Page Not Found"
      description="The page you are looking for could not be found. Navigate back to the HexDI documentation."
    >
      <main className={styles.container}>
        <div className={styles.content}>
          {/* Visual element */}
          <BrokenHexagonVisual />

          {/* Error heading */}
          <Heading as="h1" className={styles.title}>
            Page Not Found
          </Heading>

          {/* Error code badge */}
          <span className={styles.errorCode}>404</span>

          {/* Description */}
          <p className={styles.description}>
            The page you are looking for does not exist or has been moved.
            It might have been a dependency that was never resolved.
          </p>

          {/* Navigation suggestions */}
          <nav className={styles.navigation} aria-label="Navigation options">
            <Link to="/" className={styles.primaryButton}>
              Go to Homepage
            </Link>
            <Link to="/docs" className={styles.secondaryButton}>
              Browse Documentation
            </Link>
          </nav>

          {/* Quick links */}
          <div className={styles.quickLinks}>
            <p className={styles.quickLinksTitle}>Popular pages:</p>
            <ul className={styles.linkList}>
              <li>
                <Link to="/docs/getting-started">Getting Started</Link>
              </li>
              <li>
                <Link to="/docs/api">API Reference</Link>
              </li>
              <li>
                <Link to="/docs/examples">Examples</Link>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </Layout>
  );
}
