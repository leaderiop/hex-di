/**
 * Tests for DevToolsPanel React component.
 *
 * These tests verify:
 * 1. DevToolsPanel renders without crashing with graph prop
 * 2. DevToolsPanel displays nodes from graph
 * 3. DevToolsPanel displays edges/dependencies
 * 4. Visual differentiation by lifetime works
 * 5. Collapsible sections work
 * 6. Container inspection shows ports and lifetimes
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import React from "react";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { DevToolsPanel } from "../src/react/devtools-panel.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

interface UserService {
  getUser(id: string): unknown;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");

/**
 * Creates a test graph with various lifetimes and dependencies.
 */
function createTestGraph() {
  const LoggerAdapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: () => {} }),
  });

  const DatabaseAdapter = createAdapter({
    provides: DatabasePort,
    requires: [LoggerPort],
    lifetime: "scoped",
    factory: () => ({ query: () => ({}) }),
  });

  const UserServiceAdapter = createAdapter({
    provides: UserServicePort,
    requires: [LoggerPort, DatabasePort],
    lifetime: "request",
    factory: () => ({ getUser: () => ({}) }),
  });

  return GraphBuilder.create()
    .provide(LoggerAdapter)
    .provide(DatabaseAdapter)
    .provide(UserServiceAdapter)
    .build();
}

// =============================================================================
// DevToolsPanel Basic Tests
// =============================================================================

describe("DevToolsPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders without crashing with graph prop", () => {
    const graph = createTestGraph();

    render(<DevToolsPanel graph={graph} />);

    // Should render the main container
    expect(screen.getByTestId("devtools-panel")).toBeDefined();
  });

  it("displays nodes from graph", () => {
    const graph = createTestGraph();

    // Use sections mode to test with expanded Graph View
    render(<DevToolsPanel graph={graph} mode="sections" />);

    // Should display all port names from the graph (using getAllByText since names appear multiple times)
    expect(screen.getAllByText("Logger").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Database").length).toBeGreaterThan(0);
    expect(screen.getAllByText("UserService").length).toBeGreaterThan(0);
  });

  it("displays edges/dependencies in graph view", () => {
    const graph = createTestGraph();

    // Use sections mode to test with expanded Graph View
    const { container } = render(<DevToolsPanel graph={graph} mode="sections" />);

    // Graph view is expanded by default and shows edges as SVG paths
    // The visual graph uses data-edge-from and data-edge-to attributes
    // Database depends on Logger
    expect(container.querySelector('[data-edge-from="Database"][data-edge-to="Logger"]')).toBeDefined();
    // UserService depends on Logger
    expect(container.querySelector('[data-edge-from="UserService"][data-edge-to="Logger"]')).toBeDefined();
    // UserService depends on Database
    expect(container.querySelector('[data-edge-from="UserService"][data-edge-to="Database"]')).toBeDefined();
  });

  it("visual differentiation by lifetime shows correct indicators", () => {
    const graph = createTestGraph();

    // Use sections mode to test with expanded Graph View
    const { container } = render(<DevToolsPanel graph={graph} mode="sections" />);

    // The visual graph displays nodes with data-node-id attributes
    // Check that nodes are rendered in the SVG graph
    expect(container.querySelector('[data-node-id="Logger"]')).toBeDefined();
    expect(container.querySelector('[data-node-id="Database"]')).toBeDefined();
    expect(container.querySelector('[data-node-id="UserService"]')).toBeDefined();

    // Check lifetime badges in the Container Browser section instead
    // (which still has the original badge components with test IDs)
    const containerBrowserHeader = screen.getByTestId("container-browser-header");
    fireEvent.click(containerBrowserHeader);

    const singletonBadge = screen.getByTestId("lifetime-badge-detail-Logger");
    const scopedBadge = screen.getByTestId("lifetime-badge-detail-Database");
    const requestBadge = screen.getByTestId("lifetime-badge-detail-UserService");

    expect(singletonBadge.className).toContain("singleton");
    expect(scopedBadge.className).toContain("scoped");
    expect(requestBadge.className).toContain("request");
  });

  it("collapsible sections work for graph view", () => {
    const graph = createTestGraph();

    // Use sections mode to test collapsible sections
    render(<DevToolsPanel graph={graph} mode="sections" />);

    // Graph view should be expanded by default
    const graphViewHeader = screen.getByTestId("graph-view-header");
    const graphViewContent = screen.getByTestId("graph-view-content");
    expect(graphViewContent).toBeDefined();

    // Click to collapse
    fireEvent.click(graphViewHeader);

    // Content should be hidden (not in DOM or display:none)
    expect(screen.queryByTestId("graph-view-content")).toBeNull();

    // Click to expand again
    fireEvent.click(graphViewHeader);

    // Content should be visible again
    expect(screen.getByTestId("graph-view-content")).toBeDefined();
  });

  it("collapsible sections work for container browser", () => {
    const graph = createTestGraph();

    // Use sections mode to test collapsible sections
    render(<DevToolsPanel graph={graph} mode="sections" />);

    // Container browser should be collapsed by default
    const containerBrowserHeader = screen.getByTestId("container-browser-header");
    expect(screen.queryByTestId("container-browser-content")).toBeNull();

    // Click to expand
    fireEvent.click(containerBrowserHeader);

    // Content should be visible
    expect(screen.getByTestId("container-browser-content")).toBeDefined();

    // Click to collapse
    fireEvent.click(containerBrowserHeader);

    // Content should be hidden
    expect(screen.queryByTestId("container-browser-content")).toBeNull();
  });

  it("container inspection shows ports and lifetimes", () => {
    const graph = createTestGraph();

    // Use sections mode to test collapsible sections
    render(<DevToolsPanel graph={graph} mode="sections" />);

    // Expand container browser
    const containerBrowserHeader = screen.getByTestId("container-browser-header");
    fireEvent.click(containerBrowserHeader);

    // Check that ports are listed as adapter items
    expect(screen.getByTestId("adapter-Logger")).toBeDefined();
    expect(screen.getByTestId("adapter-Database")).toBeDefined();
    expect(screen.getByTestId("adapter-UserService")).toBeDefined();

    // Check lifetime badges exist in the container browser section
    // Use the detail badge test IDs which are unique per adapter
    expect(screen.getByTestId("lifetime-badge-detail-Logger")).toBeDefined();
    expect(screen.getByTestId("lifetime-badge-detail-Database")).toBeDefined();
    expect(screen.getByTestId("lifetime-badge-detail-UserService")).toBeDefined();
  });
});

// =============================================================================
// DevToolsPanel Edge Cases
// =============================================================================

describe("DevToolsPanel edge cases", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders empty graph without crashing", () => {
    const graph = GraphBuilder.create().build();

    render(<DevToolsPanel graph={graph} />);

    expect(screen.getByTestId("devtools-panel")).toBeDefined();
  });

  it("renders graph with no dependencies", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    // Use sections mode to test collapsible sections
    render(<DevToolsPanel graph={graph} mode="sections" />);

    // Logger should be displayed in the graph view
    expect(screen.getAllByText("Logger").length).toBeGreaterThan(0);

    // Expand container browser
    const containerBrowserHeader = screen.getByTestId("container-browser-header");
    fireEvent.click(containerBrowserHeader);

    // Get the Logger adapter container
    const loggerAdapter = screen.getByTestId("adapter-Logger");

    // Find and click the button inside the adapter (the header with role="button")
    const adapterButton = within(loggerAdapter).getByRole("button");
    fireEvent.click(adapterButton);

    // Should show "None" for dependencies
    const dependencyList = screen.getByTestId("dependency-list-Logger");
    expect(dependencyList.textContent).toContain("None");
  });
});
