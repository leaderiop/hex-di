/**
 * Tracing Integration Tests - Verify tracing container captures service resolutions.
 *
 * These tests verify that:
 * 1. createTracingContainer properly wraps a container with tracing capabilities
 * 2. Service resolutions are captured as trace entries
 * 3. TracingAPI provides access to trace data
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach } from "./setup.js";
import { TRACING_ACCESS } from "@hex-di/runtime";
import { createTracingContainer } from "@hex-di/devtools";
import { appGraph, type AppPorts } from "../src/di/graph.js";
import { UserSessionPort } from "../src/di/ports.js";
import { setCurrentUserSelection } from "../src/di/adapters.js";

// =============================================================================
// Tracing Integration Tests
// =============================================================================

describe("Tracing Integration", () => {
  // Reset user selection before each test
  beforeEach(() => {
    setCurrentUserSelection("alice");
  });

  describe("createTracingContainer", () => {
    it("should add TRACING_ACCESS Symbol to wrapped container", () => {
      const tracingContainer = createTracingContainer<AppPorts>(appGraph);

      // Container should have TRACING_ACCESS Symbol
      expect(TRACING_ACCESS in tracingContainer).toBe(true);

      // Clean up
      void tracingContainer.dispose();
    });

    it("should provide TracingAPI via TRACING_ACCESS", () => {
      const tracingContainer = createTracingContainer<AppPorts>(appGraph);

      const tracingAPI = tracingContainer[TRACING_ACCESS];

      // TracingAPI should have expected methods
      expect(tracingAPI).toBeDefined();
      expect(typeof tracingAPI.getTraces).toBe("function");
      expect(typeof tracingAPI.getStats).toBe("function");
      expect(typeof tracingAPI.subscribe).toBe("function");
      expect(typeof tracingAPI.clear).toBe("function");
      expect(typeof tracingAPI.pause).toBe("function");
      expect(typeof tracingAPI.resume).toBe("function");

      // Clean up
      void tracingContainer.dispose();
    });
  });

  describe("trace recording", () => {
    it("should record traces when services are resolved", () => {
      const tracingContainer = createTracingContainer<AppPorts>(appGraph);
      const scope = tracingContainer.createScope();

      // Initially no traces
      const tracingAPI = tracingContainer[TRACING_ACCESS];
      expect(tracingAPI.getTraces()).toHaveLength(0);

      // Resolve a service
      scope.resolve(UserSessionPort);

      // Should have at least one trace
      const traces = tracingAPI.getTraces();
      expect(traces.length).toBeGreaterThan(0);

      // First trace should be for UserSession
      const userSessionTrace = traces.find(
        (t) => t.portName === "UserSession"
      );
      expect(userSessionTrace).toBeDefined();

      // Clean up
      void scope.dispose();
      void tracingContainer.dispose();
    });

    it("should capture trace metadata correctly", () => {
      const tracingContainer = createTracingContainer<AppPorts>(appGraph);
      const scope = tracingContainer.createScope();

      scope.resolve(UserSessionPort);

      const tracingAPI = tracingContainer[TRACING_ACCESS];
      const traces = tracingAPI.getTraces();
      const trace = traces[0];

      // Trace should have required properties
      expect(trace).toBeDefined();
      expect(trace!.id).toBeDefined();
      expect(trace!.portName).toBeDefined();
      expect(trace!.lifetime).toBeDefined();
      expect(typeof trace!.duration).toBe("number");
      expect(typeof trace!.isCacheHit).toBe("boolean");

      // Clean up
      void scope.dispose();
      void tracingContainer.dispose();
    });
  });
});
