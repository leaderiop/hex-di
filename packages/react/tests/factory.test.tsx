/**
 * Unit tests for createTypedHooks factory function.
 *
 * These tests verify:
 * 1. createTypedHooks returns all expected components/hooks
 * 2. Returned hooks are bound to TProvides type
 * 3. Multiple createTypedHooks calls create isolated contexts
 * 4. TypedReactIntegration type matches factory return
 * 5. Full integration: ContainerProvider + usePort resolution flow
 * 6. Scope hierarchy: Container -> AutoScope -> nested AutoScope
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { createPort } from "@hex-di/ports";
import type { Container, Scope } from "@hex-di/runtime";
import { createTypedHooks } from "../src/create-typed-hooks.jsx";
import type { TypedReactIntegration } from "../src/types.js";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Service interface for testing.
 */
interface LoggerService {
  log: (message: string) => void;
  name: string;
}

/**
 * Port for testing resolution.
 */
const LoggerPort = createPort<"Logger", LoggerService>("Logger");

/**
 * Type alias for test containers.
 */
type TestProvides = typeof LoggerPort;
type TestContainer = Container<TestProvides>;
type TestScope = Scope<TestProvides>;

/**
 * Creates a mock scope for testing.
 */
function createMockScope(name: string = "scoped-logger"): TestScope {
  const mockScope: TestScope = {
    resolve: vi.fn().mockReturnValue({ log: vi.fn(), name }),
    createScope: vi.fn().mockImplementation(() => createMockScope(`nested-${name}`)),
    dispose: vi.fn().mockResolvedValue(undefined),
  } as unknown as TestScope;

  return mockScope;
}

/**
 * Creates a mock container for testing.
 */
function createMockContainer(): TestContainer {
  const mockScope = createMockScope();

  const mockContainer: TestContainer = {
    resolve: vi.fn().mockReturnValue({ log: vi.fn(), name: "container-logger" }),
    createScope: vi.fn().mockReturnValue(mockScope),
    dispose: vi.fn().mockResolvedValue(undefined),
  } as unknown as TestContainer;

  return mockContainer;
}

// =============================================================================
// Test 1: createTypedHooks returns all expected components/hooks
// =============================================================================

describe("createTypedHooks", () => {
  afterEach(() => {
    cleanup();
  });

  it("returns all expected components/hooks", () => {
    const integration = createTypedHooks<TestProvides>();

    // Verify all components are present
    expect(integration.ContainerProvider).toBeDefined();
    expect(typeof integration.ContainerProvider).toBe("function");

    expect(integration.ScopeProvider).toBeDefined();
    expect(typeof integration.ScopeProvider).toBe("function");

    expect(integration.AutoScopeProvider).toBeDefined();
    expect(typeof integration.AutoScopeProvider).toBe("function");

    // Verify all hooks are present
    expect(integration.usePort).toBeDefined();
    expect(typeof integration.usePort).toBe("function");

    expect(integration.usePortOptional).toBeDefined();
    expect(typeof integration.usePortOptional).toBe("function");

    expect(integration.useContainer).toBeDefined();
    expect(typeof integration.useContainer).toBe("function");

    expect(integration.useScope).toBeDefined();
    expect(typeof integration.useScope).toBe("function");
  });

  // ===========================================================================
  // Test 2: Returned hooks are bound to TProvides type
  // ===========================================================================

  it("returned hooks are bound to TProvides type", () => {
    const integration = createTypedHooks<TestProvides>();
    const container = createMockContainer();

    function TestComponent(): React.ReactElement {
      // usePort should be able to resolve LoggerPort (which is in TestProvides)
      const logger = integration.usePort(LoggerPort);
      return <div data-testid="logger-name">{logger.name}</div>;
    }

    render(
      <integration.ContainerProvider container={container}>
        <TestComponent />
      </integration.ContainerProvider>
    );

    expect(screen.getByTestId("logger-name").textContent).toBe("container-logger");
    expect(container.resolve).toHaveBeenCalledWith(LoggerPort);
  });

  // ===========================================================================
  // Test 3: Multiple createTypedHooks calls create isolated contexts
  // ===========================================================================

  it("multiple createTypedHooks calls create isolated contexts", () => {
    // Create two separate integrations
    const integration1 = createTypedHooks<TestProvides>();
    const integration2 = createTypedHooks<TestProvides>();

    const container1 = createMockContainer();
    (container1.resolve as ReturnType<typeof vi.fn>).mockReturnValue({
      log: vi.fn(),
      name: "logger-from-container-1",
    });

    const container2 = createMockContainer();
    (container2.resolve as ReturnType<typeof vi.fn>).mockReturnValue({
      log: vi.fn(),
      name: "logger-from-container-2",
    });

    // Component that uses integration1's hooks
    function Component1(): React.ReactElement {
      const logger = integration1.usePort(LoggerPort);
      return <div data-testid="component1">{logger.name}</div>;
    }

    // Component that uses integration2's hooks
    function Component2(): React.ReactElement {
      const logger = integration2.usePort(LoggerPort);
      return <div data-testid="component2">{logger.name}</div>;
    }

    // Render both with their respective providers
    // They should be isolated - integration2's provider shouldn't affect integration1's hooks
    render(
      <integration1.ContainerProvider container={container1}>
        <integration2.ContainerProvider container={container2}>
          <Component1 />
          <Component2 />
        </integration2.ContainerProvider>
      </integration1.ContainerProvider>
    );

    // Each component should resolve from its own context
    expect(screen.getByTestId("component1").textContent).toBe("logger-from-container-1");
    expect(screen.getByTestId("component2").textContent).toBe("logger-from-container-2");
  });

  // ===========================================================================
  // Test 4: TypedReactIntegration type matches factory return
  // ===========================================================================

  it("TypedReactIntegration type matches factory return", () => {
    // This test verifies that the factory return is assignable to TypedReactIntegration
    const integration = createTypedHooks<TestProvides>();

    // Explicitly type as TypedReactIntegration - this will fail compilation if types don't match
    const typedIntegration: TypedReactIntegration<TestProvides> = integration;

    // Verify we can use the typed integration
    expect(typedIntegration.ContainerProvider).toBe(integration.ContainerProvider);
    expect(typedIntegration.usePort).toBe(integration.usePort);
  });

  // ===========================================================================
  // Test 5: Full integration: ContainerProvider + usePort resolution flow
  // ===========================================================================

  it("full integration: ContainerProvider + usePort resolution flow", () => {
    const integration = createTypedHooks<TestProvides>();
    const container = createMockContainer();

    // Track resolution calls
    const resolvedLoggers: LoggerService[] = [];

    function ParentComponent(): React.ReactElement {
      const logger = integration.usePort(LoggerPort);
      resolvedLoggers.push(logger);
      return (
        <div data-testid="parent">
          <span data-testid="parent-name">{logger.name}</span>
          <ChildComponent />
        </div>
      );
    }

    function ChildComponent(): React.ReactElement {
      const logger = integration.usePort(LoggerPort);
      resolvedLoggers.push(logger);
      return <span data-testid="child-name">{logger.name}</span>;
    }

    render(
      <integration.ContainerProvider container={container}>
        <ParentComponent />
      </integration.ContainerProvider>
    );

    // Both parent and child should have resolved the logger
    expect(screen.getByTestId("parent-name").textContent).toBe("container-logger");
    expect(screen.getByTestId("child-name").textContent).toBe("container-logger");

    // Container.resolve should have been called for each usePort call
    expect(container.resolve).toHaveBeenCalledTimes(2);
    expect(container.resolve).toHaveBeenCalledWith(LoggerPort);
  });

  // ===========================================================================
  // Test 6: Scope hierarchy: Container -> AutoScope -> nested AutoScope
  // ===========================================================================

  it("scope hierarchy: Container -> AutoScope -> nested AutoScope", async () => {
    const integration = createTypedHooks<TestProvides>();
    const container = createMockContainer();

    // Create nested scope structure
    const scope1 = createMockScope("scope1-logger");
    const scope2 = createMockScope("scope2-logger");

    // Container creates scope1
    (container.createScope as ReturnType<typeof vi.fn>).mockReturnValue(scope1);
    // scope1 creates scope2
    (scope1.createScope as ReturnType<typeof vi.fn>).mockReturnValue(scope2);

    let capturedScopedName1 = "";
    let capturedScopedName2 = "";

    function OuterScopeComponent(): React.ReactElement {
      const logger = integration.usePort(LoggerPort);
      capturedScopedName1 = logger.name;
      return (
        <div data-testid="outer-scope">
          <integration.AutoScopeProvider>
            <InnerScopeComponent />
          </integration.AutoScopeProvider>
        </div>
      );
    }

    function InnerScopeComponent(): React.ReactElement {
      const logger = integration.usePort(LoggerPort);
      capturedScopedName2 = logger.name;
      return <span data-testid="inner-scope">{logger.name}</span>;
    }

    const { unmount } = render(
      <integration.ContainerProvider container={container}>
        <integration.AutoScopeProvider>
          <OuterScopeComponent />
        </integration.AutoScopeProvider>
      </integration.ContainerProvider>
    );

    // Outer AutoScope creates scope from container
    expect(container.createScope).toHaveBeenCalledTimes(1);

    // Inner AutoScope creates scope from outer scope
    expect(scope1.createScope).toHaveBeenCalledTimes(1);

    // Verify resolution from correct scopes
    expect(capturedScopedName1).toBe("scope1-logger");
    expect(capturedScopedName2).toBe("scope2-logger");

    // Unmount and verify disposal
    unmount();

    // Wait for async dispose
    await vi.waitFor(() => {
      expect(scope1.dispose).toHaveBeenCalledTimes(1);
      expect(scope2.dispose).toHaveBeenCalledTimes(1);
    });
  });
});
