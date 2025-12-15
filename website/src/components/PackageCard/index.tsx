import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

export type PackageBadgeType = 'Core' | 'Optional';

export interface PackageCardProps {
  /**
   * Package name (e.g., '@hex-di/graph')
   */
  name: string;
  /**
   * Badge type indicating if the package is Core or Optional
   */
  badge: PackageBadgeType;
  /**
   * Short description of the package
   */
  description: string;
  /**
   * List of key features for the package
   */
  features: string[];
  /**
   * Link to the package documentation
   */
  link: string;
}

/**
 * PackageCard component displays a package with its badge, description, features, and link.
 * Badge styling uses gradient background for Core (Primary) and Optional (TypeScript Blue).
 *
 * @example
 * ```tsx
 * <PackageCard
 *   name="@hex-di/graph"
 *   badge="Core"
 *   description="GraphBuilder with compile-time dependency validation"
 *   features={[
 *     "Immutable builder pattern",
 *     "Type-safe composition",
 *     "Graph validation",
 *   ]}
 *   link="/docs/api/graph"
 * />
 * ```
 */
export default function PackageCard({
  name,
  badge,
  description,
  features,
  link,
}: PackageCardProps): ReactNode {
  const badgeClass = badge === 'Core' ? styles.badgeCore : styles.badgeOptional;
  // Create a clean ID from the package name for aria-labelledby
  const headingId = `package-${name.replace(/[@/]/g, '-').replace(/^-/, '')}`;

  return (
    <article className={styles.card} aria-labelledby={headingId}>
      <div className={styles.header}>
        <h3 id={headingId} className={styles.name}>{name}</h3>
        <span
          className={`${styles.badge} ${badgeClass}`}
          aria-label={`${badge} package`}
        >
          {badge}
        </span>
      </div>
      <p className={styles.description}>{description}</p>
      <ul className={styles.features} aria-label={`${name} features`}>
        {features.map((feature, index) => (
          <li key={index} className={styles.feature}>
            {feature}
          </li>
        ))}
      </ul>
      <Link
        to={link}
        className={styles.link}
        aria-label={`View ${name} documentation`}
      >
        View Documentation <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
