/**
 * TabNavigation React component for DevTools panel.
 *
 * Provides a tabbed navigation interface for switching between
 * Graph, Services, Tracing, and Inspector views.
 *
 * @packageDocumentation
 */

import React, { useCallback, useRef, type ReactElement, type KeyboardEvent } from "react";
import type { CSSProperties } from "react";
import { tracingStyles } from "./styles.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Tab identifiers for the DevTools panel.
 */
export type TabId = "graph" | "services" | "tracing" | "inspector";

/**
 * Configuration for a single tab.
 */
interface TabConfig {
  readonly id: TabId;
  readonly label: string;
}

/**
 * Props for the TabNavigation component.
 */
export interface TabNavigationProps {
  /** The currently active tab */
  readonly activeTab: TabId;
  /** Callback when a tab is selected */
  readonly onTabChange: (tabId: TabId) => void;
  /** Whether to show the Inspector tab (requires container) */
  readonly showInspector?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Tab configuration for the DevTools panel.
 */
const TAB_CONFIGS: readonly TabConfig[] = [
  { id: "graph", label: "Graph" },
  { id: "services", label: "Services" },
  { id: "tracing", label: "Tracing" },
  { id: "inspector", label: "Inspector" },
] as const;

/**
 * Styles for the tab navigation.
 */
const tabNavigationStyles: {
  readonly container: CSSProperties;
  readonly tab: CSSProperties;
  readonly tabActive: CSSProperties;
} = {
  container: {
    ...tracingStyles.viewToggleContainer,
    display: "flex",
    borderBottom: "1px solid var(--hex-devtools-border, #45475a)",
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    margin: 0,
    padding: 0,
  },
  tab: {
    ...tracingStyles.viewToggleTab,
    flex: 1,
    textAlign: "center",
    padding: "10px 16px",
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer",
    transition: "color 0.15s ease, border-color 0.15s ease",
    outline: "none",
  },
  tabActive: {
    ...tracingStyles.viewToggleTabActive,
    color: "var(--hex-devtools-accent, #89b4fa)",
    borderBottom: "2px solid var(--hex-devtools-accent, #89b4fa)",
  },
};

// =============================================================================
// TabNavigation Component
// =============================================================================

/**
 * TabNavigation component for the DevTools panel.
 *
 * Features:
 * - Four tabs: Graph, Services, Tracing, Inspector
 * - Keyboard navigation (Arrow keys, Home, End)
 * - ARIA-compliant tab pattern
 * - Visual indication of active tab
 *
 * @param props - The component props
 * @returns A React element containing the tab navigation
 *
 * @example
 * ```tsx
 * function DevTools() {
 *   const [activeTab, setActiveTab] = useState<TabId>('graph');
 *   return (
 *     <TabNavigation
 *       activeTab={activeTab}
 *       onTabChange={setActiveTab}
 *       showInspector={true}
 *     />
 *   );
 * }
 * ```
 */
export function TabNavigation({
  activeTab,
  onTabChange,
  showInspector = true,
}: TabNavigationProps): ReactElement {
  const tabRefs = useRef<Map<TabId, HTMLButtonElement | null>>(new Map());

  // Filter tabs based on showInspector prop
  const visibleTabs = showInspector
    ? TAB_CONFIGS
    : TAB_CONFIGS.filter((tab) => tab.id !== "inspector");

  /**
   * Handle keyboard navigation between tabs.
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, currentTabId: TabId) => {
      const currentIndex = visibleTabs.findIndex((tab) => tab.id === currentTabId);
      let nextIndex: number | null = null;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          nextIndex = (currentIndex + 1) % visibleTabs.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          nextIndex = (currentIndex - 1 + visibleTabs.length) % visibleTabs.length;
          break;
        case "Home":
          event.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          event.preventDefault();
          nextIndex = visibleTabs.length - 1;
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          onTabChange(currentTabId);
          return;
        default:
          return;
      }

      if (nextIndex !== null) {
        const nextTab = visibleTabs[nextIndex];
        if (nextTab !== undefined) {
          const nextTabElement = tabRefs.current.get(nextTab.id);
          if (nextTabElement !== null && nextTabElement !== undefined) {
            nextTabElement.focus();
            onTabChange(nextTab.id);
          }
        }
      }
    },
    [visibleTabs, onTabChange]
  );

  /**
   * Set ref for a tab element.
   */
  const setTabRef = useCallback(
    (tabId: TabId) => (element: HTMLButtonElement | null) => {
      tabRefs.current.set(tabId, element);
    },
    []
  );

  return (
    <div
      data-testid="tab-navigation"
      role="tablist"
      aria-label="DevTools panels"
      style={tabNavigationStyles.container}
    >
      {visibleTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const tabStyle: CSSProperties = {
          ...tabNavigationStyles.tab,
          ...(isActive ? tabNavigationStyles.tabActive : {}),
        };

        return (
          <button
            key={tab.id}
            ref={setTabRef(tab.id)}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            style={tabStyle}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
