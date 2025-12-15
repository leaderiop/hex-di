import type { ReactNode } from 'react';
import styles from './styles.module.css';

export interface FeatureCardProps {
  /**
   * Icon component or element to display at the top of the card
   */
  icon: ReactNode;
  /**
   * Title of the feature
   */
  title: string;
  /**
   * Description of the feature
   */
  description: string | ReactNode;
}

/**
 * FeatureCard component displays a feature with an icon, title, and description.
 * Includes hover animation with transform and shadow effects.
 *
 * @example
 * ```tsx
 * <FeatureCard
 *   icon={<CheckIcon />}
 *   title="Compile-Time Validation"
 *   description="Missing dependencies cause TypeScript errors, not runtime crashes."
 * />
 * ```
 */
export default function FeatureCard({
  icon,
  title,
  description,
}: FeatureCardProps): ReactNode {
  return (
    <article className={styles.card}>
      <div className={styles.iconWrapper}>{icon}</div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
    </article>
  );
}
