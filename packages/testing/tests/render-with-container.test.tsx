/**
 * Unit tests for renderWithContainer helper.
 *
 * These tests verify:
 * 1. Renders element with ContainerProvider wrapping
 * 2. Returns RTL render result
 * 3. Returns DI container reference (named diContainer to avoid RTL collision)
 * 4. usePort hook works in rendered components
 * 5. Custom render options are passed through
 * 6. Works with TestGraphBuilder graphs
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import React from "react";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { usePort } from "@hex-di/react";
import { TestGraphBuilder } from "../src/test-graph-builder.js";
import { renderWithContainer } from "../src/render-with-container.js";

// =============================================================================
// Test Service Interfaces
// =============================================================================

interface Logger {
  log(message: string): void;
  name: string;
}

interface UserService {
  getUser(id: string): { id: string; name: string };
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const UserServicePort = createPort<"UserService", UserService>("UserService");

// =============================================================================
// Test Adapters
// =============================================================================

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    log: vi.fn(),
    name: "TestLogger",
  }),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort],
  lifetime: "request",
  factory: (deps) => ({
    getUser: (id) => {
      deps.Logger.log(`Getting user ${id}`);
      return { id, name: "Test User" };
    },
  }),
});

// =============================================================================
// Test Components
// =============================================================================

function LoggerNameComponent(): React.ReactElement {
  const logger = usePort(LoggerPort);
  return <div data-testid="logger-name">{logger.name}</div>;
}

function UserComponent({ userId }: { userId: string }): React.ReactElement {
  const userService = usePort(UserServicePort);
  const user = userService.getUser(userId);
  return (
    <div data-testid="user-info">
      {user.id}: {user.name}
    </div>
  );
}

// =============================================================================
// Test Cleanup
// =============================================================================

afterEach(() => {
  cleanup();
});

// =============================================================================
// renderWithContainer Basic Tests
// =============================================================================

describe("renderWithContainer", () => {
  describe("basic rendering", () => {
    it("renders element with ContainerProvider wrapping", () => {
      const graph = GraphBuilder.create()
        .provide(LoggerAdapter)
        .build();

      renderWithContainer(<LoggerNameComponent />, graph);

      expect(screen.getByTestId("logger-name")).toBeDefined();
      expect(screen.getByTestId("logger-name").textContent).toBe("TestLogger");
    });

    it("returns RTL render result with standard methods", () => {
      const graph = GraphBuilder.create()
        .provide(LoggerAdapter)
        .build();

      const result = renderWithContainer(<LoggerNameComponent />, graph);

      // Standard RTL render result properties
      expect(result.container).toBeDefined();
      expect(result.baseElement).toBeDefined();
      expect(result.unmount).toBeTypeOf("function");
      expect(result.rerender).toBeTypeOf("function");
      expect(result.asFragment).toBeTypeOf("function");
    });

    it("returns DI container reference as diContainer", () => {
      const graph = GraphBuilder.create()
        .provide(LoggerAdapter)
        .build();

      const result = renderWithContainer(<LoggerNameComponent />, graph);

      // diContainer is the DI container, separate from RTL's container (DOM element)
      expect(result.diContainer).toBeDefined();
      expect(result.diContainer.resolve).toBeTypeOf("function");
      expect(result.diContainer.createScope).toBeTypeOf("function");
      expect(result.diContainer.dispose).toBeTypeOf("function");
    });
  });

  describe("usePort integration", () => {
    it("usePort resolves services in rendered components", () => {
      const graph = GraphBuilder.create()
        .provide(LoggerAdapter)
        .build();

      renderWithContainer(<LoggerNameComponent />, graph);

      const element = screen.getByTestId("logger-name");
      expect(element.textContent).toBe("TestLogger");
    });

    it("usePort works with services that have dependencies", () => {
      const graph = GraphBuilder.create()
        .provide(LoggerAdapter)
        .provide(UserServiceAdapter)
        .build();

      renderWithContainer(<UserComponent userId="123" />, graph);

      const element = screen.getByTestId("user-info");
      expect(element.textContent).toBe("123: Test User");
    });

    it("resolved container can be used for assertions", () => {
      const mockLogFn = vi.fn();
      const mockLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({
          log: mockLogFn,
          name: "MockLogger",
        }),
      });

      const graph = GraphBuilder.create()
        .provide(mockLoggerAdapter)
        .provide(UserServiceAdapter)
        .build();

      const { diContainer } = renderWithContainer(<UserComponent userId="456" />, graph);

      // Can resolve from diContainer for assertions
      const logger = diContainer.resolve(LoggerPort);
      expect(logger.log).toHaveBeenCalledWith("Getting user 456");
    });
  });

  describe("render options", () => {
    it("custom render options are passed through to RTL render", () => {
      const graph = GraphBuilder.create()
        .provide(LoggerAdapter)
        .build();

      // Create a custom wrapper div
      const customContainer = document.createElement("div");
      customContainer.id = "custom-container";
      document.body.appendChild(customContainer);

      try {
        const result = renderWithContainer(<LoggerNameComponent />, graph, {
          container: customContainer,
        });

        // The element should be rendered in the custom container
        expect(result.container).toBe(customContainer);
        expect(customContainer.querySelector('[data-testid="logger-name"]')).not.toBeNull();
      } finally {
        document.body.removeChild(customContainer);
      }
    });
  });

  describe("TestGraphBuilder integration", () => {
    it("works with graphs created from TestGraphBuilder", () => {
      const productionGraph = GraphBuilder.create()
        .provide(LoggerAdapter)
        .build();

      const mockLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({
          log: vi.fn(),
          name: "OverriddenLogger",
        }),
      });

      const testGraph = TestGraphBuilder.from(productionGraph)
        .override(mockLoggerAdapter)
        .build();

      renderWithContainer(<LoggerNameComponent />, testGraph);

      const element = screen.getByTestId("logger-name");
      expect(element.textContent).toBe("OverriddenLogger");
    });

    it("works with TestGraphBuilder graphs that have multiple overrides", () => {
      const mockLogFn = vi.fn();
      const productionGraph = GraphBuilder.create()
        .provide(LoggerAdapter)
        .provide(UserServiceAdapter)
        .build();

      const mockLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({
          log: mockLogFn,
          name: "MockLogger",
        }),
      });

      const mockUserServiceAdapter = createAdapter({
        provides: UserServicePort,
        requires: [LoggerPort],
        lifetime: "request",
        factory: (deps) => ({
          getUser: (id) => {
            deps.Logger.log(`Mock getting user ${id}`);
            return { id, name: "Mocked User" };
          },
        }),
      });

      const testGraph = TestGraphBuilder.from(productionGraph)
        .override(mockLoggerAdapter)
        .override(mockUserServiceAdapter)
        .build();

      renderWithContainer(<UserComponent userId="789" />, testGraph);

      const element = screen.getByTestId("user-info");
      expect(element.textContent).toBe("789: Mocked User");
      expect(mockLogFn).toHaveBeenCalledWith("Mock getting user 789");
    });
  });
});
