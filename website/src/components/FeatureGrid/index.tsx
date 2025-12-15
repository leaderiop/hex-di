import type { ReactNode } from 'react';
import styles from './styles.module.css';

export interface FeatureGridProps {
  /**
   * Child elements to display in the grid (typically FeatureCard components)
   */
  children: ReactNode;
  /**
   * Optional CSS class name to add to the grid container
   */
  className?: string;
}

/**
 * FeatureGrid component provides a responsive CSS Grid layout for feature cards.
 *
 * Layout (based on design specifications):
 * - 3 columns on desktop (>=1024px)
 * - 2 columns on tablet (768px-1023px)
 * - 1 column on mobile (<768px)
 * - Gap: 24px between cards
 *
 * @example
 * ```tsx
 * <FeatureGrid>
 *   <FeatureCard icon={<CheckIcon />} title="Feature 1" description="..." />
 *   <FeatureCard icon={<ZapIcon />} title="Feature 2" description="..." />
 *   <FeatureCard icon={<LayersIcon />} title="Feature 3" description="..." />
 * </FeatureGrid>
 * ```
 */
export default function FeatureGrid({
  children,
  className = '',
}: FeatureGridProps): ReactNode {
  const classes = [styles.grid, className].filter(Boolean).join(' ');

  return <div className={classes}>{children}</div>;
}
