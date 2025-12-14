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

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactElement,
  type CSSProperties,
} from "react";
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

/** localStorage key for panel size persistence */
const STORAGE_KEY_SIZE = "hex-di-devtools-size";

/** localStorage key for fullscreen state persistence */
const STORAGE_KEY_FULLSCREEN = "hex-di-devtools-fullscreen";

/** Panel size configuration */
interface PanelSize {
  width: number;
  height: number;
}

/** Default panel dimensions */
const DEFAULT_SIZE: PanelSize = { width: 400, height: 500 };

/** Minimum panel dimensions */
const MIN_SIZE: PanelSize = { width: 300, height: 300 };

/** Maximum panel dimensions */
const MAX_SIZE: PanelSize = { width: 1200, height: 900 };

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

/**
 * Safely read panel size from localStorage.
 */
function getStoredSize(): PanelSize {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SIZE);
    if (stored) {
      const parsed = JSON.parse(stored) as PanelSize;
      // Validate parsed values
      if (
        typeof parsed.width === "number" &&
        typeof parsed.height === "number" &&
        parsed.width >= MIN_SIZE.width &&
        parsed.width <= MAX_SIZE.width &&
        parsed.height >= MIN_SIZE.height &&
        parsed.height <= MAX_SIZE.height
      ) {
        return parsed;
      }
    }
  } catch {
    // localStorage may not be available or data is invalid
  }
  return DEFAULT_SIZE;
}

/**
 * Safely write panel size to localStorage.
 */
function setStoredSize(size: PanelSize): void {
  try {
    localStorage.setItem(STORAGE_KEY_SIZE, JSON.stringify(size));
  } catch {
    // localStorage may not be available
  }
}

/**
 * Safely read fullscreen state from localStorage.
 */
function getStoredFullscreen(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_FULLSCREEN);
    return stored === "true";
  } catch {
    return false;
  }
}

/**
 * Safely write fullscreen state to localStorage.
 */
function setStoredFullscreen(isFullscreen: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_FULLSCREEN, String(isFullscreen));
  } catch {
    // localStorage may not be available
  }
}

/**
 * Get resize cursor based on position.
 */
function getResizeCursor(position: DevToolsPosition): CSSProperties["cursor"] {
  switch (position) {
    case "bottom-right":
      return "nwse-resize";
    case "bottom-left":
      return "nesw-resize";
    case "top-right":
      return "nesw-resize";
    case "top-left":
      return "nwse-resize";
    default:
      return "nwse-resize";
  }
}

/**
 * Get resize handle position styles based on panel position.
 */
function getResizeHandlePosition(position: DevToolsPosition): CSSProperties {
  switch (position) {
    case "bottom-right":
      return { bottom: 0, right: 0 };
    case "bottom-left":
      return { bottom: 0, left: 0 };
    case "top-right":
      return { top: 0, right: 0 };
    case "top-left":
      return { top: 0, left: 0 };
    default:
      return { bottom: 0, right: 0 };
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

  // State for panel size
  const [size, setSize] = useState<PanelSize>(() => getStoredSize());

  // State for fullscreen mode
  const [isFullscreen, setIsFullscreen] = useState(() => getStoredFullscreen());

  // Track if currently resizing
  const isResizing = useRef(false);
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });

  // Persist state changes to localStorage
  useEffect(() => {
    setStoredState(isOpen);
  }, [isOpen]);

  useEffect(() => {
    setStoredSize(size);
  }, [size]);

  useEffect(() => {
    setStoredFullscreen(isFullscreen);
  }, [isFullscreen]);

  // Toggle handler
  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  // Close handler
  const handleClose = () => {
    setIsOpen(false);
  };

  // Reset handler
  const handleReset = () => {
    setSize(DEFAULT_SIZE);
    setIsFullscreen(false);
  };

  // Fullscreen toggle handler
  const handleFullscreenToggle = () => {
    setIsFullscreen((prev) => !prev);
  };

  // Resize handlers
  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      isResizing.current = true;

      const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;

      resizeStartPos.current = { x: clientX, y: clientY };
      resizeStartSize.current = { width: size.width, height: size.height };

      // Add global event listeners
      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
      document.addEventListener("touchmove", handleResizeMove);
      document.addEventListener("touchend", handleResizeEnd);
    },
    [size.width, size.height]
  );

  const handleResizeMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isResizing.current) return;

      const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;

      const deltaX = clientX - resizeStartPos.current.x;
      const deltaY = clientY - resizeStartPos.current.y;

      // Calculate resize direction based on position
      let newWidth = resizeStartSize.current.width;
      let newHeight = resizeStartSize.current.height;

      switch (position) {
        case "bottom-right":
          // Resize from top-left corner (opposite of position)
          newWidth = resizeStartSize.current.width - deltaX;
          newHeight = resizeStartSize.current.height - deltaY;
          break;
        case "bottom-left":
          // Resize from top-right corner
          newWidth = resizeStartSize.current.width + deltaX;
          newHeight = resizeStartSize.current.height - deltaY;
          break;
        case "top-right":
          // Resize from bottom-left corner
          newWidth = resizeStartSize.current.width - deltaX;
          newHeight = resizeStartSize.current.height + deltaY;
          break;
        case "top-left":
          // Resize from bottom-right corner
          newWidth = resizeStartSize.current.width + deltaX;
          newHeight = resizeStartSize.current.height + deltaY;
          break;
      }

      // Clamp to min/max bounds
      newWidth = Math.min(MAX_SIZE.width, Math.max(MIN_SIZE.width, newWidth));
      newHeight = Math.min(MAX_SIZE.height, Math.max(MIN_SIZE.height, newHeight));

      setSize({ width: newWidth, height: newHeight });
    },
    [position]
  );

  const handleResizeEnd = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeEnd);
    document.removeEventListener("touchmove", handleResizeMove);
    document.removeEventListener("touchend", handleResizeEnd);
  }, [handleResizeMove]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
      document.removeEventListener("touchmove", handleResizeMove);
      document.removeEventListener("touchend", handleResizeEnd);
    };
  }, [handleResizeMove, handleResizeEnd]);

  // Get position-specific styles
  const positionStyles = getPositionStyles(position);

  // Compute panel wrapper styles based on state
  const panelWrapperStyle: CSSProperties = isFullscreen
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "var(--hex-devtools-bg, #1e1e2e)",
        border: "none",
        borderRadius: 0,
        boxShadow: "none",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        zIndex: 100000,
      }
    : {
        ...floatingStyles.panelWrapper,
        width: size.width,
        height: size.height,
      };

  // Get resize handle position and cursor
  const resizeHandleStyle: CSSProperties = {
    ...floatingStyles.resizeHandle,
    ...getResizeHandlePosition(position),
    cursor: getResizeCursor(position),
  };

  return (
    <div
      data-testid="devtools-floating-container"
      style={{
        ...floatingStyles.container,
        ...(isFullscreen ? { position: "fixed", top: 0, left: 0 } : positionStyles),
      }}
    >
      {isOpen ? (
        // Expanded panel view
        <div style={panelWrapperStyle} data-testid="devtools-panel-wrapper">
          <div style={floatingStyles.panelHeader}>
            <div style={floatingStyles.headerControls}>
              <button
                data-testid="devtools-floating-reset"
                style={floatingStyles.controlButton}
                onClick={handleReset}
                aria-label="Reset panel size"
                title="Reset size"
              >
                ↺
              </button>
              <button
                data-testid="devtools-floating-fullscreen"
                style={floatingStyles.controlButton}
                onClick={handleFullscreenToggle}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? "⊡" : "□"}
              </button>
            </div>
            <button
              data-testid="devtools-floating-close"
              style={floatingStyles.closeButton}
              onClick={handleClose}
              aria-label="Close DevTools"
            >
              ×
            </button>
          </div>
          <div style={floatingStyles.panelContent}>
            <DevToolsPanel graph={graph} {...(container ? { container } : {})} />
          </div>
          {/* Resize handle - only show when not fullscreen */}
          {!isFullscreen && (
            <div
              data-testid="devtools-resize-handle"
              style={resizeHandleStyle}
              onMouseDown={handleResizeStart}
              onTouchStart={handleResizeStart}
              aria-label="Resize panel"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="currentColor"
                style={{ opacity: 0.5 }}
              >
                <path d="M 0 10 L 10 0 L 10 10 Z" />
              </svg>
            </div>
          )}
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
