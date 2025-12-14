/**
 * DevToolsFloating React component for HexDI graph visualization.
 *
 * Provides a floating toggle button that expands to show the full
 * DevToolsPanel. Follows the TanStack DevTools pattern with a small
 * toggle button that can be positioned in any corner of the viewport.
 *
 * Features:
 * - Fixed-position toggle button (40x40px)
 * - Configurable position: bottom-right, bottom-left, top-right, top-left
 * - localStorage persistence for open/closed state
 * - Auto-hides in production mode (NODE_ENV === 'production')
 *
 * @packageDocumentation
 */

import React, { useState, useEffect, type ReactElement } from "react";
import type { Port } from "@hex-di/ports";
import type { Graph } from "@hex-di/graph";
import type { Container } from "@hex-di/runtime";
import { DevToolsPanel } from "./devtools-panel.js";
import { floatingStyles, getPositionStyles } from "./styles.js";

// Declare process.env for TypeScript
declare const process: { env: { NODE_ENV?: string } } | undefined;

// =============================================================================
// Constants
// =============================================================================

/** localStorage key for open/closed state persistence */
const STORAGE_KEY = "hex-di-devtools-open";

// =============================================================================
// Types
// =============================================================================

/**
 * Position options for the floating DevTools.
 */
export type DevToolsPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

/**
 * Props for the DevToolsFloating component.
 *
 * @remarks
 * - `graph` is required and provides the dependency graph data
 * - `container` is optional and enables additional runtime inspection features
 * - `position` controls which corner the toggle button appears in (default: 'bottom-right')
 *
 * @example Basic usage
 * ```tsx
 * import { DevToolsFloating } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 *
 * function App() {
 *   return (
 *     <>
 *       <MainApp />
 *       <DevToolsFloating graph={appGraph} />
 *     </>
 *   );
 * }
 * ```
 *
 * @example With position and container
 * ```tsx
 * import { DevToolsFloating } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 * import { container } from './container';
 *
 * function App() {
 *   return (
 *     <>
 *       <MainApp />
 *       <DevToolsFloating
 *         graph={appGraph}
 *         container={container}
 *         position="top-left"
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export interface DevToolsFloatingProps {
  /** The dependency graph to visualize */
  readonly graph: Graph<Port<unknown, string>>;
  /** Optional container for runtime inspection */
  readonly container?: Container<Port<unknown, string>>;
  /** Position of the toggle button. Default: 'bottom-right' */
  readonly position?: DevToolsPosition;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Safely read from localStorage with error handling.
 */
function getStoredState(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "true";
  } catch {
    // localStorage may not be available (SSR, privacy mode, etc.)
    return false;
  }
}

/**
 * Safely write to localStorage with error handling.
 */
function setStoredState(isOpen: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(isOpen));
  } catch {
    // localStorage may not be available (SSR, privacy mode, etc.)
  }
}

// =============================================================================
// DevToolsFloating Component
// =============================================================================

/**
 * DevToolsFloating component for toggle-able DevTools overlay.
 *
 * Renders a small floating toggle button that expands to show the full
 * DevToolsPanel when clicked. The open/closed state is persisted in
 * localStorage so it remembers across page reloads.
 *
 * In production mode (when `process.env.NODE_ENV === 'production'`),
 * this component returns `null` to ensure DevTools are not visible
 * in production builds.
 *
 * @param props - The component props
 * @returns A React element containing the floating DevTools, or null in production
 *
 * @example Basic usage
 * ```tsx
 * import { DevToolsFloating } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 *
 * function App() {
 *   return (
 *     <>
 *       <MainApp />
 *       <DevToolsFloating graph={appGraph} position="bottom-right" />
 *     </>
 *   );
 * }
 * ```
 *
 * @example All corner positions
 * ```tsx
 * // Bottom-right (default)
 * <DevToolsFloating graph={graph} position="bottom-right" />
 *
 * // Bottom-left
 * <DevToolsFloating graph={graph} position="bottom-left" />
 *
 * // Top-right
 * <DevToolsFloating graph={graph} position="top-right" />
 *
 * // Top-left
 * <DevToolsFloating graph={graph} position="top-left" />
 * ```
 */
export function DevToolsFloating({
  graph,
  container,
  position = "bottom-right",
}: DevToolsFloatingProps): ReactElement | null {
  // Production mode check - return null to ensure tree-shaking
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
    return null;
  }

  // State for open/closed panel
  const [isOpen, setIsOpen] = useState(() => getStoredState());

  // Persist state changes to localStorage
  useEffect(() => {
    setStoredState(isOpen);
  }, [isOpen]);

  // Toggle handler
  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  // Close handler
  const handleClose = () => {
    setIsOpen(false);
  };

  // Get position-specific styles
  const positionStyles = getPositionStyles(position);

  return (
    <div
      data-testid="devtools-floating-container"
      style={{
        ...floatingStyles.container,
        ...positionStyles,
      }}
    >
      {isOpen ? (
        // Expanded panel view
        <div style={floatingStyles.panelWrapper}>
          <div style={floatingStyles.panelHeader}>
            <button
              data-testid="devtools-floating-close"
              style={floatingStyles.closeButton}
              onClick={handleClose}
              aria-label="Close DevTools"
            >
              x
            </button>
          </div>
          <div style={floatingStyles.panelContent}>
            <DevToolsPanel graph={graph} {...(container ? { container } : {})} />
          </div>
        </div>
      ) : (
        // Collapsed toggle button
        <button
          data-testid="devtools-floating-toggle"
          style={floatingStyles.toggleButton}
          onClick={handleToggle}
          aria-label="Open HexDI DevTools"
        >
          <span style={floatingStyles.toggleIcon}>{"{ }"}</span>
        </button>
      )}
    </div>
  );
}
