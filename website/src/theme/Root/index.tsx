/**
 * Custom Root component for HexDI documentation website.
 *
 * This component wraps the entire Docusaurus site and adds accessibility
 * enhancements including a skip-to-main-content link for keyboard navigation.
 *
 * @see https://www.w3.org/WAI/WCAG21/Techniques/general/G1
 */

import type { ReactNode } from 'react';

interface RootProps {
  children: ReactNode;
}

/**
 * Root component that adds accessibility features to the entire site.
 *
 * Features:
 * - Skip-to-main-content link for keyboard users
 * - Properly structured landmark regions
 */
export default function Root({ children }: RootProps): ReactNode {
  return (
    <>
      {/* Skip to main content link for keyboard navigation */}
      <a
        href="#__docusaurus_skipToContent_fallback"
        className="skip-to-content"
      >
        Skip to main content
      </a>
      {children}
    </>
  );
}
