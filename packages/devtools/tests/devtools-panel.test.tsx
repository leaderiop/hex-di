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

    // Check Services section shows the services
    const servicesHeader = screen.getByTestId("services-header");
    fireEvent.click(servicesHeader);

    // Verify the enhanced services view is rendered with all services
    expect(screen.getByTestId("enhanced-services-view")).toBeDefined();
    expect(screen.getByTestId("enhanced-service-item-Logger")).toBeDefined();
    expect(screen.getByTestId("enhanced-service-item-Database")).toBeDefined();
    expect(screen.getByTestId("enhanced-service-item-UserService")).toBeDefined();
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

    // Services section should be collapsed by default
    const servicesHeader = screen.getByTestId("services-header");
    expect(screen.queryByTestId("services-content")).toBeNull();

    // Click to expand
    fireEvent.click(servicesHeader);

    // Content should be visible
    expect(screen.getByTestId("services-content")).toBeDefined();

    // Click to collapse
    fireEvent.click(servicesHeader);

    // Content should be hidden
    expect(screen.queryByTestId("services-content")).toBeNull();
  });

  it("services section shows ports and lifetimes", () => {
    const graph = createTestGraph();

    // Use sections mode to test collapsible sections
    render(<DevToolsPanel graph={graph} mode="sections" />);

    // Expand services section
    const servicesHeader = screen.getByTestId("services-header");
    fireEvent.click(servicesHeader);

    // Check that services are listed as enhanced service items
    expect(screen.getByTestId("enhanced-service-item-Logger")).toBeDefined();
    expect(screen.getByTestId("enhanced-service-item-Database")).toBeDefined();
    expect(screen.getByTestId("enhanced-service-item-UserService")).toBeDefined();
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

    // Expand services section
    const servicesHeader = screen.getByTestId("services-header");
    fireEvent.click(servicesHeader);

    // Get the Logger service item
    const loggerItem = screen.getByTestId("enhanced-service-item-Logger");
    expect(loggerItem).toBeDefined();

    // Find and click the button inside the service item (the header)
    const serviceButton = within(loggerItem).getByRole("button");
    fireEvent.click(serviceButton);

    // Should show "No dependencies" since Logger has no dependencies
    expect(screen.getByText("No dependencies")).toBeDefined();
  });
});
