/**
 * Tests for DevTools Tabbed Interface.
 *
 * These tests verify:
 * 1. mode="tabs" renders tab navigation
 * 2. mode="sections" preserves CollapsibleSection behavior
 * 3. Tab switching changes active view
 * 4. Default tab selection
 * 5. Backward compatibility with existing props
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { DevToolsPanel } from "../../src/react/devtools-panel.js";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import type { Graph } from "@hex-di/graph";
import type { Port } from "@hex-di/ports";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Simple logger interface for test fixtures.
 */
interface Logger {
  log(message: string): void;
}

/**
 * Port for logger service.
 */
const LoggerPort = createPort<"Logger", Logger>("Logger");

/**
 * Create a minimal test graph for testing.
 */
function createTestGraph(): Graph<Port<unknown, string>> {
  const LoggerAdapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: () => {} }),
  });

  return GraphBuilder.create().provide(LoggerAdapter).build();
}

/**
 * Create an empty graph for testing.
 */
function createEmptyGraph(): Graph<Port<unknown, string>> {
  return GraphBuilder.create().build();
}

// =============================================================================
// Test Suite
// =============================================================================

describe("DevToolsPanel Tabbed Interface", () => {
  let testGraph: Graph<Port<unknown, string>>;

  beforeEach(() => {
    testGraph = createTestGraph();
  });

  afterEach(() => {
    cleanup();
  });

  // ---------------------------------------------------------------------------
  // Test 1: mode="tabs" renders tab navigation
  // ---------------------------------------------------------------------------
  describe("mode='tabs' rendering", () => {
    it("renders tab navigation when mode is 'tabs'", () => {
      render(<DevToolsPanel graph={testGraph} mode="tabs" />);

      // Should render the tab navigation container
      expect(screen.getByTestId("tab-navigation")).toBeDefined();

      // Should render the four main tabs
      expect(screen.getByRole("tab", { name: /graph/i })).toBeDefined();
      expect(screen.getByRole("tab", { name: /services/i })).toBeDefined();
      expect(screen.getByRole("tab", { name: /tracing/i })).toBeDefined();
      // Inspector tab is shown only when container is provided - we don't have container here
    });

    it("does not render CollapsibleSections when mode is 'tabs'", () => {
      render(<DevToolsPanel graph={testGraph} mode="tabs" />);

      // CollapsibleSection headers should not be present
      expect(screen.queryByTestId("graph-view-header")).toBeNull();
      expect(screen.queryByTestId("container-browser-header")).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: mode="sections" preserves CollapsibleSection behavior
  // ---------------------------------------------------------------------------
  describe("mode='sections' rendering", () => {
    it("renders CollapsibleSections when mode is 'sections'", () => {
      render(<DevToolsPanel graph={testGraph} mode="sections" />);

      // Should render the section headers (existing behavior)
      expect(screen.getByTestId("graph-view-header")).toBeDefined();
      expect(screen.getByTestId("container-browser-header")).toBeDefined();
    });

    it("does not render tab navigation when mode is 'sections'", () => {
      render(<DevToolsPanel graph={testGraph} mode="sections" />);

      // Tab navigation should not be present
      expect(screen.queryByTestId("tab-navigation")).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Tab switching changes active view
  // ---------------------------------------------------------------------------
  describe("tab switching", () => {
    it("changes active view when clicking different tabs", () => {
      render(<DevToolsPanel graph={testGraph} mode="tabs" />);

      // Initially, Graph tab should be active (first tab)
      const graphTab = screen.getByRole("tab", { name: /graph/i });
      expect(graphTab.getAttribute("aria-selected")).toBe("true");

      // Click on Services tab
      const servicesTab = screen.getByRole("tab", { name: /services/i });
      fireEvent.click(servicesTab);

      // Services tab should now be selected
      expect(servicesTab.getAttribute("aria-selected")).toBe("true");
      expect(graphTab.getAttribute("aria-selected")).toBe("false");
    });

    it("renders the correct content for the active tab", () => {
      render(<DevToolsPanel graph={testGraph} mode="tabs" />);

      // Graph view content should be visible initially
      expect(screen.getByTestId("tab-content-graph")).toBeDefined();

      // Click on Tracing tab
      const tracingTab = screen.getByRole("tab", { name: /tracing/i });
      fireEvent.click(tracingTab);

      // Tracing view content should now be visible
      expect(screen.getByTestId("tab-content-tracing")).toBeDefined();
      expect(screen.queryByTestId("tab-content-graph")).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Default tab selection
  // ---------------------------------------------------------------------------
  describe("default tab selection", () => {
    it("defaults to 'tabs' mode when mode prop is not specified", () => {
      render(<DevToolsPanel graph={testGraph} />);

      // Should render tab navigation (default mode is tabs)
      expect(screen.getByTestId("tab-navigation")).toBeDefined();
    });

    it("selects the first tab (Graph) by default", () => {
      render(<DevToolsPanel graph={testGraph} mode="tabs" />);

      const graphTab = screen.getByRole("tab", { name: /graph/i });
      expect(graphTab.getAttribute("aria-selected")).toBe("true");
    });

    it("respects initialTab prop for initial tab selection", () => {
      render(<DevToolsPanel graph={testGraph} mode="tabs" initialTab="tracing" />);

      const tracingTab = screen.getByRole("tab", { name: /tracing/i });
      expect(tracingTab.getAttribute("aria-selected")).toBe("true");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 5: Backward compatibility
  // ---------------------------------------------------------------------------
  describe("backward compatibility", () => {
    it("preserves existing graph prop behavior", () => {
      render(<DevToolsPanel graph={testGraph} mode="sections" />);

      // Should render the panel with graph prop
      expect(screen.getByTestId("devtools-panel")).toBeDefined();
    });

    it("works with empty graph", () => {
      const emptyGraph = createEmptyGraph();
      render(<DevToolsPanel graph={emptyGraph} mode="tabs" />);

      // Panel should still render
      expect(screen.getByTestId("devtools-panel")).toBeDefined();
      expect(screen.getByTestId("tab-navigation")).toBeDefined();
    });
  });
});

// =============================================================================
// TabNavigation Component Tests
// =============================================================================

describe("TabNavigation Component", () => {
  let testGraph: Graph<Port<unknown, string>>;

  beforeEach(() => {
    testGraph = createTestGraph();
  });

  afterEach(() => {
    cleanup();
  });

  it("supports keyboard navigation between tabs", () => {
    render(<DevToolsPanel graph={testGraph} mode="tabs" />);

    const graphTab = screen.getByRole("tab", { name: /graph/i });
    graphTab.focus();

    // Press ArrowRight to move to next tab
    fireEvent.keyDown(graphTab, { key: "ArrowRight" });

    // After keyboard navigation, Services tab should have focus and be selected
    const servicesTab = screen.getByRole("tab", { name: /services/i });
    expect(servicesTab.getAttribute("aria-selected")).toBe("true");
  });

  it("has proper ARIA attributes for accessibility", () => {
    render(<DevToolsPanel graph={testGraph} mode="tabs" />);

    const tabList = screen.getByRole("tablist");
    expect(tabList).toBeDefined();

    const tabs = screen.getAllByRole("tab");
    tabs.forEach((tab) => {
      expect(tab.hasAttribute("aria-selected")).toBe(true);
    });
  });
});
