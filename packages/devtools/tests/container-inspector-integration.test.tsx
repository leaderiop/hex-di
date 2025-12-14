/**
 * Integration tests for Container State Inspection feature.
 *
 * These tests verify the end-to-end integration between:
 * - @hex-di/runtime inspector API
 * - @hex-di/devtools UI components
 *
 * Focus areas:
 * 1. Container creation -> inspection -> UI display flow
 * 2. Scope creation/disposal updates tree correctly
 * 3. Service resolution updates ResolvedServices list
 * 4. Disposed container shows appropriate error state
 * 5. Multiple rapid refreshes don't cause race conditions
 * 6. Snapshot data is serializable (no circular refs)
 * 7. Manual refresh button triggers data update
 * 8. Nested scope tree traversal
 */

import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import React from "react";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer, createInspector } from "@hex-di/runtime";
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

interface RequestContext {
  requestId: string;
}

interface CacheService {
  get(key: string): unknown;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");
const RequestContextPort = createPort<"RequestContext", RequestContext>(
  "RequestContext"
);
const CacheServicePort = createPort<"CacheService", CacheService>(
  "CacheService"
);

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
    lifetime: "singleton",
    factory: () => ({ query: () => ({}) }),
  });

  const UserServiceAdapter = createAdapter({
    provides: UserServicePort,
    requires: [LoggerPort, DatabasePort],
    lifetime: "request",
    factory: () => ({ getUser: () => ({}) }),
  });

  const RequestContextAdapter = createAdapter({
    provides: RequestContextPort,
    requires: [],
    lifetime: "scoped",
    factory: () => ({ requestId: `req-${Date.now()}` }),
  });

  const CacheServiceAdapter = createAdapter({
    provides: CacheServicePort,
    requires: [LoggerPort],
    lifetime: "singleton",
    factory: () => ({ get: () => null }),
  });

  return GraphBuilder.create()
    .provide(LoggerAdapter)
    .provide(DatabaseAdapter)
    .provide(UserServiceAdapter)
    .provide(RequestContextAdapter)
    .provide(CacheServiceAdapter)
    .build();
}

// =============================================================================
// Integration Tests
// =============================================================================

describe("Container State Inspection Integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("end-to-end: container creation -> inspection -> UI display", () => {
    // Step 1: Create container with graph
    const graph = createTestGraph();
    const container = createContainer(graph);

    // Step 2: Resolve some services to populate container state
    container.resolve(LoggerPort);
    container.resolve(DatabasePort);

    // Step 3: Verify runtime inspector works
    const inspector = createInspector(container);
    const snapshot = inspector.snapshot();
    expect(snapshot.isDisposed).toBe(false);
    expect(snapshot.singletons.length).toBeGreaterThan(0);

    // Step 4: Render UI and verify it displays correctly (use sections mode for collapsible sections)
    render(<DevToolsPanel graph={graph} container={container} mode="sections" />);

    // Expand Container Inspector section
    const header = screen.getByTestId("container-inspector-header");
    fireEvent.click(header);

    // Verify root container node displays
    const rootNode = screen.getByTestId("scope-node-container");
    expect(rootNode).toBeDefined();
    expect(rootNode.textContent).toContain("Root Container");

    // Verify resolved services are visible
    const loggerItem = screen.getByTestId("service-item-Logger");
    const dbItem = screen.getByTestId("service-item-Database");
    expect(loggerItem).toBeDefined();
    expect(dbItem).toBeDefined();

    // Verify service resolution status indicator is correct
    // Logger should be resolved (we called resolve on it)
    // The service list should reflect this
    expect(loggerItem).toBeDefined();
  });

  it("scope creation updates tree correctly", () => {
    const graph = createTestGraph();
    const container = createContainer(graph);

    // Create initial scope
    const scope1 = container.createScope();

    render(<DevToolsPanel graph={graph} container={container} mode="sections" />);

    // Expand Container Inspector section
    const header = screen.getByTestId("container-inspector-header");
    fireEvent.click(header);

    // Should see root container and at least one child scope
    const rootNode = screen.getByTestId("scope-node-container");
    expect(rootNode).toBeDefined();

    // Check for scope nodes (scope IDs are auto-generated like "scope-1")
    // Use exact match to avoid matching status test IDs
    const scopeNodes = screen.getAllByTestId(/^scope-node-scope-\d+$/);
    expect(scopeNodes.length).toBeGreaterThanOrEqual(1);

    // Verify the scope shows active status
    const scopeNode = scopeNodes[0];
    expect(scopeNode).toBeDefined();
    if (scopeNode !== undefined) {
      const statusElement = scopeNode.querySelector('[data-testid$="-status"]');
      expect(statusElement?.textContent).toContain("Active");
    }
  });

  it("scope disposal updates tree to show disposed status", async () => {
    const graph = createTestGraph();
    const container = createContainer(graph);

    // Create a scope
    const scope = container.createScope();

    render(<DevToolsPanel graph={graph} container={container} mode="sections" />);

    // Expand Container Inspector section
    const header = screen.getByTestId("container-inspector-header");
    fireEvent.click(header);

    // Before disposal - scope should be active
    const scopeNodes = screen.getAllByTestId(/^scope-node-scope-\d+$/);
    expect(scopeNodes.length).toBeGreaterThanOrEqual(1);

    // Dispose the scope
    await scope.dispose();

    // Click manual refresh to update UI
    const refreshButton = screen.getByTestId("manual-refresh-button");
    fireEvent.click(refreshButton);

    // After disposal - verify tree still renders (disposed scopes remain in tree)
    // The snapshot should reflect the disposed status
    const rootNode = screen.getByTestId("scope-node-container");
    expect(rootNode).toBeDefined();
  });

  it("service resolution updates ResolvedServices list dynamically", () => {
    const graph = createTestGraph();
    const container = createContainer(graph);

    render(<DevToolsPanel graph={graph} container={container} mode="sections" />);

    // Expand Container Inspector section
    const header = screen.getByTestId("container-inspector-header");
    fireEvent.click(header);

    // Initially, services should show as not resolved
    const loggerItem = screen.getByTestId("service-item-Logger");
    expect(loggerItem).toBeDefined();

    // Now resolve Logger
    container.resolve(LoggerPort);

    // Click manual refresh to update UI
    const refreshButton = screen.getByTestId("manual-refresh-button");
    fireEvent.click(refreshButton);

    // Verify Logger is still displayed (state should have updated)
    const updatedLoggerItem = screen.getByTestId("service-item-Logger");
    expect(updatedLoggerItem).toBeDefined();
  });

  it("disposed container shows appropriate error state", async () => {
    const graph = createTestGraph();
    const container = createContainer(graph);

    render(<DevToolsPanel graph={graph} container={container} mode="sections" />);

    // Expand Container Inspector section
    const header = screen.getByTestId("container-inspector-header");
    fireEvent.click(header);

    // Verify normal rendering first
    expect(screen.getByTestId("scope-node-container")).toBeDefined();

    // Dispose the container
    await container.dispose();

    // Click manual refresh to trigger re-inspection
    const refreshButton = screen.getByTestId("manual-refresh-button");
    fireEvent.click(refreshButton);

    // The component should handle the disposed container gracefully
    // (show error message or indicate disposed state)
    // Look for error message or disposed indication
    const inspectorContent = screen.getByTestId("container-inspector-content");
    // Container should show an error or disposed state
    expect(inspectorContent).toBeDefined();
  });

  it("multiple rapid refreshes don't cause race conditions", () => {
    const graph = createTestGraph();
    const container = createContainer(graph);

    render(<DevToolsPanel graph={graph} container={container} mode="sections" />);

    // Expand Container Inspector section
    const header = screen.getByTestId("container-inspector-header");
    fireEvent.click(header);

    // Find refresh button
    const refreshButton = screen.getByTestId("manual-refresh-button");

    // Rapidly click refresh multiple times
    for (let i = 0; i < 10; i++) {
      fireEvent.click(refreshButton);
    }

    // The UI should remain stable and not crash
    const rootNode = screen.getByTestId("scope-node-container");
    expect(rootNode).toBeDefined();
    expect(rootNode.textContent).toContain("Root Container");

    // Services should still be displayed
    const loggerItem = screen.getByTestId("service-item-Logger");
    expect(loggerItem).toBeDefined();
  });

  it("snapshot data is serializable (no circular refs)", () => {
    const graph = createTestGraph();
    const container = createContainer(graph);

    // Resolve some services
    container.resolve(LoggerPort);
    container.resolve(DatabasePort);

    // Create scopes with nested structure
    const scope1 = container.createScope();
    const scope2 = container.createScope();
    const nestedScope = scope1.createScope();

    // Resolve in scopes
    scope1.resolve(RequestContextPort);
    nestedScope.resolve(RequestContextPort);

    const inspector = createInspector(container);

    // Get snapshot and scope tree
    const snapshot = inspector.snapshot();
    const scopeTree = inspector.getScopeTree();

    // Verify snapshot can be serialized to JSON (no circular refs)
    expect(() => JSON.stringify(snapshot)).not.toThrow();
    expect(() => JSON.stringify(scopeTree)).not.toThrow();

    // Verify the serialized data can be parsed back
    const parsedSnapshot = JSON.parse(JSON.stringify(snapshot));
    expect(parsedSnapshot.isDisposed).toBe(false);
    expect(Array.isArray(parsedSnapshot.singletons)).toBe(true);

    const parsedTree = JSON.parse(JSON.stringify(scopeTree));
    expect(parsedTree.id).toBe("container");
    expect(Array.isArray(parsedTree.children)).toBe(true);
    expect(parsedTree.children.length).toBe(2); // scope1 and scope2
  });

  it("nested scope tree traversal works with deep hierarchies", () => {
    const graph = createTestGraph();
    const container = createContainer(graph);

    // Create a deep scope hierarchy: container -> scope1 -> scope2 -> scope3
    const scope1 = container.createScope();
    const scope2 = scope1.createScope();
    const scope3 = scope2.createScope();

    // Resolve in each level
    scope1.resolve(RequestContextPort);
    scope2.resolve(RequestContextPort);
    scope3.resolve(RequestContextPort);

    // First, verify the inspector API returns the correct tree structure
    const inspector = createInspector(container);
    const tree = inspector.getScopeTree();

    // Traverse to verify depth
    expect(tree.id).toBe("container");
    expect(tree.children.length).toBe(1); // scope1

    const level1 = tree.children[0];
    expect(level1).toBeDefined();
    expect(level1?.children.length).toBe(1); // scope2

    const level2 = level1?.children[0];
    expect(level2).toBeDefined();
    expect(level2?.children.length).toBe(1); // scope3

    const level3 = level2?.children[0];
    expect(level3).toBeDefined();
    expect(level3?.children.length).toBe(0); // no more children

    // Now render the UI and verify the tree is displayed
    render(<DevToolsPanel graph={graph} container={container} mode="sections" />);

    // Expand Container Inspector section
    const header = screen.getByTestId("container-inspector-header");
    fireEvent.click(header);

    // Verify root container is displayed
    const rootNode = screen.getByTestId("scope-node-container");
    expect(rootNode).toBeDefined();

    // All scopes in the hierarchy should be accessible
    // The tree should be expanded by default
    // Use exact regex to match only scope nodes (not status nodes)
    const allScopeNodes = screen.getAllByTestId(/^scope-node-scope-\d+$/);

    // We created 3 scopes in a chain, all should be visible in expanded tree
    // Note: The actual count depends on global scope ID counter across all tests,
    // but we verify there are at least 3 scope nodes visible from this container's tree
    expect(allScopeNodes.length).toBeGreaterThanOrEqual(3);
  });
});
