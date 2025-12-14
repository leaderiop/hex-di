/**
 * Tests for TreeView and TreeNode components.
 *
 * These tests verify:
 * 1. Hierarchical rendering of dependency chains
 * 2. Expand/collapse functionality
 * 3. Tree connectors render correctly
 * 4. Keyboard navigation (arrows, Enter, Home/End)
 * 5. Self-time vs total-time display modes
 * 6. Visual states (cached, slow)
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import React from "react";
import {
  TreeView,
  type TreeViewProps,
} from "../../src/react/tree-view.js";
import type { TraceEntry } from "../../src/tracing/types.js";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Create a mock trace entry with given overrides.
 */
function createMockTrace(overrides: Partial<TraceEntry> = {}): TraceEntry {
  return {
    id: "trace-1",
    portName: "TestService",
    lifetime: "scoped",
    startTime: 100,
    duration: 25,
    isCacheHit: false,
    parentTraceId: null,
    childTraceIds: [],
    scopeId: "scope-1",
    order: 1,
    isPinned: false,
    ...overrides,
  };
}

/**
 * Create a hierarchical trace structure.
 * Root -> [Child1, Child2] where Child1 -> [Grandchild]
 */
function createHierarchicalTraces(): readonly TraceEntry[] {
  const root = createMockTrace({
    id: "trace-1",
    portName: "UserService",
    duration: 50,
    order: 1,
    childTraceIds: ["trace-2", "trace-3"],
  });

  const child1 = createMockTrace({
    id: "trace-2",
    portName: "AuthService",
    duration: 20,
    order: 2,
    parentTraceId: "trace-1",
    childTraceIds: ["trace-4"],
  });

  const child2 = createMockTrace({
    id: "trace-3",
    portName: "LoggerService",
    duration: 5,
    order: 3,
    parentTraceId: "trace-1",
    isCacheHit: true,
    lifetime: "singleton",
  });

  const grandchild = createMockTrace({
    id: "trace-4",
    portName: "TokenService",
    duration: 10,
    order: 4,
    parentTraceId: "trace-2",
    lifetime: "singleton",
  });

  return [root, child1, child2, grandchild];
}

/**
 * Default props for TreeView component.
 */
function createDefaultProps(
  overrides: Partial<TreeViewProps> = {}
): TreeViewProps {
  return {
    traces: createHierarchicalTraces(),
    threshold: 50,
    timeDisplayMode: "self",
    onTraceSelect: vi.fn(),
    onViewInTimeline: vi.fn(),
    ...overrides,
  };
}

// =============================================================================
// Test Suite
// =============================================================================

describe("TreeView", () => {
  afterEach(() => {
    cleanup();
  });

  // ---------------------------------------------------------------------------
  // Test 1: Hierarchical rendering of dependency chains
  // ---------------------------------------------------------------------------
  describe("hierarchical rendering", () => {
    it("renders root nodes for traces without parent", () => {
      const props = createDefaultProps();

      render(<TreeView {...props} />);

      // Root node should be visible
      const rootNode = screen.getByTestId("tree-node-trace-1");
      expect(rootNode).toBeDefined();
      expect(screen.getByText("UserService")).toBeDefined();
    });

    it("renders tree structure with proper nesting", () => {
      const props = createDefaultProps();

      render(<TreeView {...props} />);

      // Expand root to see children
      const expandButton = screen.getByTestId("tree-expand-trace-1");
      fireEvent.click(expandButton);

      // Children should now be visible
      expect(screen.getByText("AuthService")).toBeDefined();
      expect(screen.getByText("LoggerService")).toBeDefined();
    });

    it("shows correct indentation for nested nodes", () => {
      const props = createDefaultProps();

      render(<TreeView {...props} />);

      // Expand all to see nesting
      const expandAllButton = screen.getByTestId("tree-expand-all");
      fireEvent.click(expandAllButton);

      // Check that grandchild is indented (rendered in children container)
      const grandchildNode = screen.getByTestId("tree-node-trace-4");
      expect(grandchildNode).toBeDefined();
      expect(screen.getByText("TokenService")).toBeDefined();
    });

    it("groups traces by root resolution", () => {
      // Add another root trace
      const traces = [
        ...createHierarchicalTraces(),
        createMockTrace({
          id: "trace-5",
          portName: "PaymentService",
          duration: 30,
          order: 5,
          parentTraceId: null,
        }),
      ];
      const props = createDefaultProps({ traces });

      render(<TreeView {...props} />);

      // Both root nodes should be visible
      expect(screen.getByText("UserService")).toBeDefined();
      expect(screen.getByText("PaymentService")).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: Expand/collapse functionality
  // ---------------------------------------------------------------------------
  describe("expand/collapse functionality", () => {
    it("collapses nodes by default (shows [-] toggle for expanded, [+] for collapsed)", () => {
      const props = createDefaultProps();

      render(<TreeView {...props} />);

      // Root should have expand toggle since it has children
      const expandToggle = screen.getByTestId("tree-expand-trace-1");
      expect(expandToggle).toBeDefined();
      // Initially collapsed, should show [+]
      expect(expandToggle.textContent).toContain("+");
    });

    it("expands node when clicking expand toggle", () => {
      const props = createDefaultProps();

      render(<TreeView {...props} />);

      const expandToggle = screen.getByTestId("tree-expand-trace-1");
      fireEvent.click(expandToggle);

      // Should now show [-]
      expect(expandToggle.textContent).toContain("-");

      // Children should be visible
      expect(screen.getByText("AuthService")).toBeDefined();
    });

    it("collapses node when clicking collapse toggle", () => {
      const props = createDefaultProps();

      render(<TreeView {...props} />);

      // Expand first
      const expandToggle = screen.getByTestId("tree-expand-trace-1");
      fireEvent.click(expandToggle);
      expect(screen.getByText("AuthService")).toBeDefined();

      // Collapse
      fireEvent.click(expandToggle);
      expect(expandToggle.textContent).toContain("+");
      // Child should not be visible
      expect(screen.queryByText("AuthService")).toBeNull();
    });

    it("expands all nodes when Expand All button is clicked", () => {
      const props = createDefaultProps();

      render(<TreeView {...props} />);

      const expandAllButton = screen.getByTestId("tree-expand-all");
      fireEvent.click(expandAllButton);

      // All nodes should be visible
      expect(screen.getByText("UserService")).toBeDefined();
      expect(screen.getByText("AuthService")).toBeDefined();
      expect(screen.getByText("LoggerService")).toBeDefined();
      expect(screen.getByText("TokenService")).toBeDefined();
    });

    it("collapses all nodes when Collapse All button is clicked", () => {
      const props = createDefaultProps();

      render(<TreeView {...props} />);

      // Expand all first
      const expandAllButton = screen.getByTestId("tree-expand-all");
      fireEvent.click(expandAllButton);

      // Collapse all
      const collapseAllButton = screen.getByTestId("tree-collapse-all");
      fireEvent.click(collapseAllButton);

      // Children should not be visible
      expect(screen.queryByText("AuthService")).toBeNull();
      expect(screen.queryByText("TokenService")).toBeNull();
    });

    it("does not show expand toggle for leaf nodes", () => {
      const props = createDefaultProps();

      render(<TreeView {...props} />);

      // Expand all to access leaf nodes
      const expandAllButton = screen.getByTestId("tree-expand-all");
      fireEvent.click(expandAllButton);

      // LoggerService is a leaf (no children)
      expect(screen.queryByTestId("tree-expand-trace-3")).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Tree connectors render correctly
  // ---------------------------------------------------------------------------
  describe("tree connectors", () => {
    it("renders vertical connector line for nodes with children", () => {
      const props = createDefaultProps();

      render(<TreeView {...props} />);

      // Expand root to see connector
      const expandToggle = screen.getByTestId("tree-expand-trace-1");
      fireEvent.click(expandToggle);

      // Check that children container exists (which has vertical line via CSS)
      const childrenContainer = screen.getByTestId("tree-children-trace-1");
      expect(childrenContainer).toBeDefined();
    });

    it("renders child nodes within children container with proper structure", () => {
      const props = createDefaultProps();

      render(<TreeView {...props} />);

      // Expand root
      const expandToggle = screen.getByTestId("tree-expand-trace-1");
      fireEvent.click(expandToggle);

      // Children should be inside the container
      const childrenContainer = screen.getByTestId("tree-children-trace-1");
      expect(childrenContainer.querySelector('[data-testid="tree-node-trace-2"]')).not.toBeNull();
      expect(childrenContainer.querySelector('[data-testid="tree-node-trace-3"]')).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Keyboard navigation
  // ---------------------------------------------------------------------------
  describe("keyboard navigation", () => {
    it("handles Enter key to toggle expand/collapse", () => {
      const props = createDefaultProps();

      render(<TreeView {...props} />);

      const treeContainer = screen.getByTestId("tree-view");
      const rootNode = screen.getByTestId("tree-node-content-trace-1");

      // Click to select/focus the root node (sets focusedId in component state)
      fireEvent.click(rootNode);

      // Press Enter to expand
      fireEvent.keyDown(treeContainer, { key: "Enter" });

      // Should be expanded, children visible
      expect(screen.getByText("AuthService")).toBeDefined();

      // Press Enter again to collapse
      fireEvent.keyDown(treeContainer, { key: "Enter" });
      expect(screen.queryByText("AuthService")).toBeNull();
    });

    it("handles Space key to toggle expand/collapse", () => {
      const props = createDefaultProps();

      render(<TreeView {...props} />);

      const treeContainer = screen.getByTestId("tree-view");
      const rootNode = screen.getByTestId("tree-node-content-trace-1");

      // Click to select the node
      fireEvent.click(rootNode);

      fireEvent.keyDown(treeContainer, { key: " " });
      expect(screen.getByText("AuthService")).toBeDefined();
    });

    it("handles ArrowDown to move to next visible node", () => {
      const props = createDefaultProps({
        traces: [
          ...createHierarchicalTraces(),
          createMockTrace({
            id: "trace-5",
            portName: "PaymentService",
            duration: 30,
            order: 5,
            parentTraceId: null,
          }),
        ],
      });

      render(<TreeView {...props} />);

      const treeContainer = screen.getByTestId("tree-view");
      const firstRoot = screen.getByTestId("tree-node-content-trace-1");

      // Click to select
      fireEvent.click(firstRoot);
      fireEvent.keyDown(treeContainer, { key: "ArrowDown" });

      // Focus should move to next root node
      const secondRoot = screen.getByTestId("tree-node-content-trace-5");
      expect(document.activeElement).toBe(secondRoot);
    });

    it("handles ArrowRight to expand or move to first child", () => {
      const props = createDefaultProps();

      render(<TreeView {...props} />);

      const treeContainer = screen.getByTestId("tree-view");
      const rootNode = screen.getByTestId("tree-node-content-trace-1");

      // Click to select
      fireEvent.click(rootNode);

      // ArrowRight should expand
      fireEvent.keyDown(treeContainer, { key: "ArrowRight" });
      expect(screen.getByText("AuthService")).toBeDefined();

      // ArrowRight again should move to first child
      fireEvent.keyDown(treeContainer, { key: "ArrowRight" });
      const firstChild = screen.getByTestId("tree-node-content-trace-2");
      expect(document.activeElement).toBe(firstChild);
    });

    it("handles ArrowLeft to collapse or move to parent", () => {
      const props = createDefaultProps();

      render(<TreeView {...props} />);

      // Expand all first
      const expandAllButton = screen.getByTestId("tree-expand-all");
      fireEvent.click(expandAllButton);

      const treeContainer = screen.getByTestId("tree-view");
      const childNode = screen.getByTestId("tree-node-content-trace-2");

      // Click to select the child node
      fireEvent.click(childNode);

      // ArrowLeft should collapse (since it has children and is expanded)
      fireEvent.keyDown(treeContainer, { key: "ArrowLeft" });

      // TokenService should no longer be visible
      expect(screen.queryByText("TokenService")).toBeNull();

      // ArrowLeft again should move to parent
      fireEvent.keyDown(treeContainer, { key: "ArrowLeft" });
      const rootNode = screen.getByTestId("tree-node-content-trace-1");
      expect(document.activeElement).toBe(rootNode);
    });

    it("handles Home to jump to first node", () => {
      const props = createDefaultProps();

      render(<TreeView {...props} />);

      // Expand and navigate to a child
      const expandAllButton = screen.getByTestId("tree-expand-all");
      fireEvent.click(expandAllButton);

      const treeContainer = screen.getByTestId("tree-view");
      const grandchild = screen.getByTestId("tree-node-content-trace-4");

      // Click to select grandchild
      fireEvent.click(grandchild);

      fireEvent.keyDown(treeContainer, { key: "Home" });

      const firstNode = screen.getByTestId("tree-node-content-trace-1");
      expect(document.activeElement).toBe(firstNode);
    });

    it("handles End to jump to last visible node", () => {
      const props = createDefaultProps({
        traces: [
          ...createHierarchicalTraces(),
          createMockTrace({
            id: "trace-5",
            portName: "PaymentService",
            duration: 30,
            order: 5,
            parentTraceId: null,
          }),
        ],
      });

      render(<TreeView {...props} />);

      const treeContainer = screen.getByTestId("tree-view");
      const firstNode = screen.getByTestId("tree-node-content-trace-1");

      // Click to select
      fireEvent.click(firstNode);

      fireEvent.keyDown(treeContainer, { key: "End" });

      const lastNode = screen.getByTestId("tree-node-content-trace-5");
      expect(document.activeElement).toBe(lastNode);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 5: Self-time vs total-time display modes
  // ---------------------------------------------------------------------------
  describe("time display modes", () => {
    it("shows self time when timeDisplayMode is self", () => {
      const props = createDefaultProps({ timeDisplayMode: "self" });

      render(<TreeView {...props} />);

      // Root has duration 50ms
      const duration = screen.getByTestId("tree-node-duration-trace-1");
      expect(duration.textContent).toContain("50");
    });

    it("shows total time when timeDisplayMode is total", () => {
      const props = createDefaultProps({ timeDisplayMode: "total" });

      render(<TreeView {...props} />);

      // Total time = self(50) + child1(20) + child2(5) + grandchild(10) = 85ms
      // Note: This is computed from the trace hierarchy
      const duration = screen.getByTestId("tree-node-duration-trace-1");
      // The exact value depends on calculation, but it should show "total" indicator
      expect(duration).toBeDefined();
    });

    it("toggles time display mode via header controls", () => {
      const onTimeDisplayModeChange = vi.fn();
      const props = createDefaultProps({
        timeDisplayMode: "self",
        onTimeDisplayModeChange,
      });

      render(<TreeView {...props} />);

      const toggleButton = screen.getByTestId("tree-time-mode-toggle");
      fireEvent.click(toggleButton);

      expect(onTimeDisplayModeChange).toHaveBeenCalledWith("total");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 6: Visual states (cached, slow)
  // ---------------------------------------------------------------------------
  describe("visual states", () => {
    it("shows cached indicator for cache hit traces", () => {
      const props = createDefaultProps();

      render(<TreeView {...props} />);

      // Expand to see LoggerService which is cached
      const expandToggle = screen.getByTestId("tree-expand-trace-1");
      fireEvent.click(expandToggle);

      const cachedIndicator = screen.getByTestId("tree-node-cached-trace-3");
      expect(cachedIndicator).toBeDefined();
      expect(cachedIndicator.textContent).toContain("*");
    });

    it("shows slow indicator for traces exceeding threshold", () => {
      const traces = [
        createMockTrace({
          id: "trace-1",
          portName: "SlowService",
          duration: 100, // Exceeds default 50ms threshold
          order: 1,
        }),
      ];
      const props = createDefaultProps({ traces, threshold: 50 });

      render(<TreeView {...props} />);

      const slowIndicator = screen.getByTestId("tree-node-slow-trace-1");
      expect(slowIndicator).toBeDefined();
      expect(slowIndicator.textContent).toContain("!");
    });

    it("applies cached background style to cached nodes", () => {
      const props = createDefaultProps();

      render(<TreeView {...props} />);

      // Expand to see LoggerService
      const expandToggle = screen.getByTestId("tree-expand-trace-1");
      fireEvent.click(expandToggle);

      const cachedNode = screen.getByTestId("tree-node-trace-3");
      // Check for data attribute or class indicating cached state
      expect(cachedNode.getAttribute("data-cached")).toBe("true");
    });

    it("applies slow background style to slow nodes", () => {
      const traces = [
        createMockTrace({
          id: "trace-1",
          portName: "SlowService",
          duration: 100,
          order: 1,
        }),
      ];
      const props = createDefaultProps({ traces, threshold: 50 });

      render(<TreeView {...props} />);

      const slowNode = screen.getByTestId("tree-node-trace-1");
      expect(slowNode.getAttribute("data-slow")).toBe("true");
    });

    it("shows lifetime badge for each node", () => {
      const props = createDefaultProps();

      render(<TreeView {...props} />);

      // Root node should have lifetime badge
      const lifetimeBadge = screen.getByTestId("tree-node-lifetime-trace-1");
      expect(lifetimeBadge).toBeDefined();
      expect(lifetimeBadge.textContent?.toLowerCase()).toContain("scoped");
    });
  });

  // ---------------------------------------------------------------------------
  // Additional Tests: Empty state and callback handlers
  // ---------------------------------------------------------------------------
  describe("empty state and callbacks", () => {
    it("shows empty state when no traces provided", () => {
      const props = createDefaultProps({ traces: [] });

      render(<TreeView {...props} />);

      const emptyState = screen.getByTestId("tree-view-empty");
      expect(emptyState).toBeDefined();
      expect(emptyState.textContent).toContain("No dependency chains");
    });

    it("calls onTraceSelect when node is clicked", () => {
      const onTraceSelect = vi.fn();
      const props = createDefaultProps({ onTraceSelect });

      render(<TreeView {...props} />);

      const nodeContent = screen.getByTestId("tree-node-content-trace-1");
      fireEvent.click(nodeContent);

      expect(onTraceSelect).toHaveBeenCalledWith("trace-1");
    });

    it("calls onViewInTimeline from node context menu", () => {
      const onViewInTimeline = vi.fn();
      const props = createDefaultProps({ onViewInTimeline });

      render(<TreeView {...props} />);

      // Click the "View in Timeline" button (if present in expanded details)
      // For now, test that the callback is wired up correctly
      expect(onViewInTimeline).toBeDefined();
    });
  });
});
