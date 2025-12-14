/**
 * Tests for DevToolsFloating React component.
 *
 * These tests verify:
 * 1. DevToolsFloating renders toggle button by default
 * 2. Clicking toggle expands to full panel
 * 3. Position prop affects placement
 * 4. localStorage state persistence works
 * 5. Production mode renders null
 * 6. DevToolsPanel is rendered when expanded
 */

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { DevToolsFloating } from "../src/react/devtools-floating.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");

/**
 * Creates a test graph with basic adapters.
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

  return GraphBuilder.create()
    .provide(LoggerAdapter)
    .provide(DatabaseAdapter)
    .build();
}

// =============================================================================
// localStorage Mock Factory
// =============================================================================

/**
 * Creates a fresh localStorage mock for each test.
 */
function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    // Helper to preset value for tests
    _preset: (key: string, value: string) => {
      store[key] = value;
    },
  };
}

// =============================================================================
// DevToolsFloating Basic Tests
// =============================================================================

describe("DevToolsFloating", () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    // Create fresh mock for each test
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("renders toggle button by default", () => {
    const graph = createTestGraph();

    render(<DevToolsFloating graph={graph} />);

    // Should render the toggle button
    const toggleButton = screen.getByTestId("devtools-floating-toggle");
    expect(toggleButton).toBeDefined();
    // Panel should not be visible initially
    expect(screen.queryByTestId("devtools-panel")).toBeNull();
  });

  it("clicking toggle expands to full panel", () => {
    const graph = createTestGraph();

    render(<DevToolsFloating graph={graph} />);

    // Initially panel should not be visible
    expect(screen.queryByTestId("devtools-panel")).toBeNull();

    // Click the toggle button
    const toggleButton = screen.getByTestId("devtools-floating-toggle");
    fireEvent.click(toggleButton);

    // Panel should now be visible
    expect(screen.getByTestId("devtools-panel")).toBeDefined();

    // Click close button to close
    const closeButton = screen.getByTestId("devtools-floating-close");
    fireEvent.click(closeButton);

    // Panel should be hidden again
    expect(screen.queryByTestId("devtools-panel")).toBeNull();
  });

  it("position prop affects placement - bottom-right (default)", () => {
    const graph = createTestGraph();

    render(<DevToolsFloating graph={graph} position="bottom-right" />);

    const container = screen.getByTestId("devtools-floating-container");
    expect(container.style.bottom).toBe("16px");
    expect(container.style.right).toBe("16px");
  });

  it("position prop affects placement - bottom-left", () => {
    const graph = createTestGraph();

    render(<DevToolsFloating graph={graph} position="bottom-left" />);

    const container = screen.getByTestId("devtools-floating-container");
    expect(container.style.bottom).toBe("16px");
    expect(container.style.left).toBe("16px");
  });

  it("position prop affects placement - top-right", () => {
    const graph = createTestGraph();

    render(<DevToolsFloating graph={graph} position="top-right" />);

    const container = screen.getByTestId("devtools-floating-container");
    expect(container.style.top).toBe("16px");
    expect(container.style.right).toBe("16px");
  });

  it("position prop affects placement - top-left", () => {
    const graph = createTestGraph();

    render(<DevToolsFloating graph={graph} position="top-left" />);

    const container = screen.getByTestId("devtools-floating-container");
    expect(container.style.top).toBe("16px");
    expect(container.style.left).toBe("16px");
  });

  it("localStorage state persistence - saves open state", () => {
    const graph = createTestGraph();

    render(<DevToolsFloating graph={graph} />);

    // Open the panel
    const toggleButton = screen.getByTestId("devtools-floating-toggle");
    fireEvent.click(toggleButton);

    // Should save to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "hex-di-devtools-open",
      "true"
    );
  });

  it("localStorage state persistence - restores open state on mount", () => {
    const graph = createTestGraph();

    // Pre-set localStorage value before mounting
    localStorageMock._preset("hex-di-devtools-open", "true");

    render(<DevToolsFloating graph={graph} />);

    // Panel should be open due to localStorage state
    expect(screen.getByTestId("devtools-panel")).toBeDefined();
  });

  it("localStorage state persistence - saves closed state", () => {
    const graph = createTestGraph();

    // Start with open state
    localStorageMock._preset("hex-di-devtools-open", "true");

    render(<DevToolsFloating graph={graph} />);

    // Close the panel
    const closeButton = screen.getByTestId("devtools-floating-close");
    fireEvent.click(closeButton);

    // Should save closed state to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "hex-di-devtools-open",
      "false"
    );
  });

  it("DevToolsPanel is rendered when expanded with correct props", () => {
    const graph = createTestGraph();

    render(<DevToolsFloating graph={graph} />);

    // Open the panel
    const toggleButton = screen.getByTestId("devtools-floating-toggle");
    fireEvent.click(toggleButton);

    // DevToolsPanel should be rendered
    const panel = screen.getByTestId("devtools-panel");
    expect(panel).toBeDefined();

    // Panel should display nodes from the graph
    expect(screen.getAllByText("Logger").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Database").length).toBeGreaterThan(0);
  });
});

// =============================================================================
// DevToolsFloating Production Mode Tests
// =============================================================================

describe("DevToolsFloating production mode", () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("renders null in production mode", () => {
    vi.stubEnv("NODE_ENV", "production");

    const graph = createTestGraph();

    const { container } = render(<DevToolsFloating graph={graph} />);

    // Should render nothing (container should be empty)
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("devtools-floating-container")).toBeNull();
    expect(screen.queryByTestId("devtools-floating-toggle")).toBeNull();
  });
});

// =============================================================================
// DevToolsFloating Edge Cases
// =============================================================================

describe("DevToolsFloating edge cases", () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("renders with empty graph", () => {
    const graph = GraphBuilder.create().build();

    render(<DevToolsFloating graph={graph} />);

    // Should render the toggle button even with empty graph
    expect(screen.getByTestId("devtools-floating-toggle")).toBeDefined();

    // Open the panel
    const toggleButton = screen.getByTestId("devtools-floating-toggle");
    fireEvent.click(toggleButton);

    // Panel should still be rendered
    expect(screen.getByTestId("devtools-panel")).toBeDefined();
  });

  it("default position is bottom-right when not specified", () => {
    const graph = createTestGraph();

    render(<DevToolsFloating graph={graph} />);

    const container = screen.getByTestId("devtools-floating-container");
    expect(container.style.bottom).toBe("16px");
    expect(container.style.right).toBe("16px");
  });
});
