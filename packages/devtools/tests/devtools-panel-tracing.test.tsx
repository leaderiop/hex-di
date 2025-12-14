/**
 * Tests for DevToolsPanel tracing integration.
 *
 * Verifies that DevToolsPanel correctly extracts TRACING_ACCESS from
 * the container and passes tracingAPI to ResolutionTracingSection.
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { DevToolsPanel } from "../src/react/devtools-panel.js";
import { TRACING_ACCESS } from "@hex-di/runtime";
import type { TracingAPI, TraceStats } from "../src/tracing/types.js";

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Creates a mock TracingAPI for testing.
 */
function createMockTracingAPI(): TracingAPI {
  const mockStats: TraceStats = {
    totalResolutions: 0,
    averageDuration: 0,
    cacheHitRate: 0,
    slowCount: 0,
    sessionStart: Date.now(),
    totalDuration: 0,
  };

  return {
    getTraces: vi.fn(() => []),
    getStats: vi.fn(() => mockStats),
    subscribe: vi.fn(() => () => {}),
    pause: vi.fn(),
    resume: vi.fn(),
    clear: vi.fn(),
    isPaused: vi.fn(() => false),
    pin: vi.fn(),
    unpin: vi.fn(),
  };
}

/**
 * Creates a mock container with TRACING_ACCESS.
 */
function createMockTracingContainer(tracingAPI: TracingAPI) {
  return {
    resolve: vi.fn(),
    createScope: vi.fn(),
    dispose: vi.fn(() => Promise.resolve()),
    isDisposed: false,
    [TRACING_ACCESS]: tracingAPI,
  };
}

/**
 * Creates a minimal mock graph for testing.
 */
function createMockGraph() {
  return {
    adapters: [],
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("DevToolsPanel tracing integration", () => {
  // Cleanup DOM after each test to ensure proper isolation
  afterEach(() => {
    cleanup();
  });

  describe("tabs mode", () => {
    it("should extract tracingAPI from container and pass to ResolutionTracingSection", () => {
      const mockTracingAPI = createMockTracingAPI();
      const mockContainer = createMockTracingContainer(mockTracingAPI);
      const mockGraph = createMockGraph();

      render(
        <DevToolsPanel
          graph={mockGraph as never}
          container={mockContainer as never}
          initialTab="tracing"
        />
      );

      // When tracingAPI is passed, getTraces should be called to load initial data
      // If tracingAPI is NOT passed, getTraces won't be called
      expect(mockTracingAPI.getTraces).toHaveBeenCalled();
    });

    it("should subscribe to trace updates when tracingAPI is provided", () => {
      const mockTracingAPI = createMockTracingAPI();
      const mockContainer = createMockTracingContainer(mockTracingAPI);
      const mockGraph = createMockGraph();

      render(
        <DevToolsPanel
          graph={mockGraph as never}
          container={mockContainer as never}
          initialTab="tracing"
        />
      );

      // ResolutionTracingSection subscribes to trace updates when tracingAPI is provided
      expect(mockTracingAPI.subscribe).toHaveBeenCalled();
    });
  });

  describe("sections mode", () => {
    it("should extract tracingAPI from container in sections mode when section is expanded", async () => {
      const mockTracingAPI = createMockTracingAPI();
      const mockContainer = createMockTracingContainer(mockTracingAPI);
      const mockGraph = createMockGraph();

      render(
        <DevToolsPanel
          graph={mockGraph as never}
          container={mockContainer as never}
          mode="sections"
        />
      );

      // In sections mode, ResolutionTracingSection is inside a CollapsibleSection
      // that starts collapsed. We need to expand it to trigger the mount.
      // The testIdPrefix="resolution-tracing" creates "resolution-tracing-header"
      const tracingHeader = screen.getByTestId("resolution-tracing-header");
      fireEvent.click(tracingHeader);

      // After expanding, getTraces should be called (wait for state update)
      await waitFor(() => {
        expect(mockTracingAPI.getTraces).toHaveBeenCalled();
      });
    });
  });

  describe("without container", () => {
    it("should render without error when no container is provided", () => {
      const mockGraph = createMockGraph();

      render(
        <DevToolsPanel
          graph={mockGraph as never}
          initialTab="tracing"
        />
      );

      // Should render empty state without errors (may have multiple instances)
      expect(screen.getAllByText(/no resolution traces recorded/i).length).toBeGreaterThan(0);
    });
  });
});
