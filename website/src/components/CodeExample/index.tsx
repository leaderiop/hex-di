import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

export interface CodeExampleProps {
  /**
   * Title displayed in the header of the code example
   */
  title: string;
  /**
   * Optional link to the full tutorial
   */
  tutorialLink?: string;
  /**
   * Text for the tutorial link (defaults to "View Full Tutorial")
   */
  tutorialLinkText?: string;
  /**
   * The code block children (typically Docusaurus CodeBlock or pre/code elements)
   */
  children: ReactNode;
  /**
   * Optional description text displayed below the title
   */
  description?: string;
}

/**
 * CodeExample component wraps standard code blocks with a header containing
 * a title and an optional "View Full Tutorial" link.
 *
 * This component is useful for showcasing code examples on the homepage
 * or in other contexts where you want to provide additional context.
 *
 * @example
 * ```tsx
 * <CodeExample
 *   title="Quick Start Example"
 *   description="A simple example showing HexDI's core concepts"
 *   tutorialLink="/docs/getting-started/quick-start"
 * >
 *   <CodeBlock language="typescript">
 *     {`const port = createPort<'Logger', Logger>('Logger');`}
 *   </CodeBlock>
 * </CodeExample>
 * ```
 */
export default function CodeExample({
  title,
  tutorialLink,
  tutorialLinkText = 'View Full Tutorial',
  children,
  description,
}: CodeExampleProps): ReactNode {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h3 className={styles.title}>{title}</h3>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {tutorialLink && (
          <Link to={tutorialLink} className={styles.link}>
            {tutorialLinkText} <span aria-hidden="true">→</span>
          </Link>
        )}
      </header>
      <div className={styles.codeWrapper}>{children}</div>
    </div>
  );
}
