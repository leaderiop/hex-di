/**
 * Unit tests for React Provider components.
 *
 * These tests verify:
 * 1. ContainerProvider renders children
 * 2. ContainerProvider provides container via context
 * 3. ScopeProvider renders children and provides scope
 * 4. AutoScopeProvider creates and disposes scope on lifecycle
 * 5. Nested ContainerProvider throws error
 * 6. AutoScopeProvider outside ContainerProvider throws MissingProviderError
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React, { useContext, useEffect } from "react";
import { createPort } from "@hex-di/ports";
import type { Container, Scope } from "@hex-di/runtime";
import { MissingProviderError } from "../src/errors.js";
import {
  ContainerProvider,
  ScopeProvider,
  AutoScopeProvider,
  ContainerContext,
  ResolverContext,
} from "../src/context.jsx";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Simple service interface for testing.
 */
interface TestService {
  name: string;
}

/**
 * Port for testing resolution.
 */
const TestServicePort = createPort<"TestService", TestService>("TestService");

/**
 * Type alias for test containers.
 */
type TestContainer = Container<typeof TestServicePort>;
type TestScope = Scope<typeof TestServicePort>;

/**
 * Creates a mock container for testing.
 */
function createMockContainer(): TestContainer {
  const mockScope: TestScope = {
    resolve: vi.fn().mockReturnValue({ name: "scoped-test-service" }),
    createScope: vi.fn().mockImplementation(() => createMockScope()),
    dispose: vi.fn().mockResolvedValue(undefined),
  } as unknown as TestScope;

  const mockContainer: TestContainer = {
    resolve: vi.fn().mockReturnValue({ name: "test-service" }),
    createScope: vi.fn().mockReturnValue(mockScope),
    dispose: vi.fn().mockResolvedValue(undefined),
  } as unknown as TestContainer;

  return mockContainer;
}

/**
 * Creates a mock scope for testing.
 */
function createMockScope(): TestScope {
  const mockScope: TestScope = {
    resolve: vi.fn().mockReturnValue({ name: "scoped-test-service" }),
    createScope: vi.fn().mockImplementation(() => createMockScope()),
    dispose: vi.fn().mockResolvedValue(undefined),
  } as unknown as TestScope;

  return mockScope;
}

// =============================================================================
// Helper Components for Testing
// =============================================================================

/**
 * Component that displays the container context value for testing.
 */
function ContainerConsumer(): React.ReactElement {
  const context = useContext(ContainerContext);
  return <div data-testid="container-value">{context ? "has-container" : "no-container"}</div>;
}

/**
 * Component that displays the resolver context value for testing.
 */
function ResolverConsumer(): React.ReactElement {
  const context = useContext(ResolverContext);
  return <div data-testid="resolver-value">{context ? "has-resolver" : "no-resolver"}</div>;
}

/**
 * Component that tracks mount/unmount for lifecycle testing.
 */
function LifecycleTracker({ onMount, onUnmount }: { onMount: () => void; onUnmount: () => void }): React.ReactElement {
  useEffect(() => {
    onMount();
    return () => {
      onUnmount();
    };
  }, [onMount, onUnmount]);

  return <div data-testid="lifecycle-tracker">mounted</div>;
}

// =============================================================================
// ContainerProvider Tests
// =============================================================================

describe("ContainerProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders children", () => {
    const container = createMockContainer();

    render(
      <ContainerProvider container={container}>
        <div data-testid="child">Child Content</div>
      </ContainerProvider>
    );

    expect(screen.getByTestId("child").textContent).toBe("Child Content");
  });

  it("provides container via context", () => {
    const container = createMockContainer();

    render(
      <ContainerProvider container={container}>
        <ContainerConsumer />
      </ContainerProvider>
    );

    expect(screen.getByTestId("container-value").textContent).toBe("has-container");
  });

  it("throws MissingProviderError when nested ContainerProvider detected", () => {
    const container1 = createMockContainer();
    const container2 = createMockContainer();

    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(
        <ContainerProvider container={container1}>
          <ContainerProvider container={container2}>
            <div>Nested content</div>
          </ContainerProvider>
        </ContainerProvider>
      );
    }).toThrow(MissingProviderError);

    consoleSpy.mockRestore();
  });
});

// =============================================================================
// ScopeProvider Tests
// =============================================================================

describe("ScopeProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders children and provides scope", () => {
    const container = createMockContainer();
    const scope = createMockScope();

    render(
      <ContainerProvider container={container}>
        <ScopeProvider scope={scope}>
          <div data-testid="child">Child Content</div>
          <ResolverConsumer />
        </ScopeProvider>
      </ContainerProvider>
    );

    expect(screen.getByTestId("child").textContent).toBe("Child Content");
    expect(screen.getByTestId("resolver-value").textContent).toBe("has-resolver");
  });
});

// =============================================================================
// AutoScopeProvider Tests
// =============================================================================

describe("AutoScopeProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("creates and disposes scope on lifecycle", async () => {
    const container = createMockContainer();
    const mockScope = createMockScope();
    (container.createScope as ReturnType<typeof vi.fn>).mockReturnValue(mockScope);

    const { unmount } = render(
      <ContainerProvider container={container}>
        <AutoScopeProvider>
          <ResolverConsumer />
        </AutoScopeProvider>
      </ContainerProvider>
    );

    // Verify scope was created
    expect(container.createScope).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("resolver-value").textContent).toBe("has-resolver");

    // Unmount and verify disposal
    unmount();

    // Wait for async dispose
    await vi.waitFor(() => {
      expect(mockScope.dispose).toHaveBeenCalledTimes(1);
    });
  });

  it("throws MissingProviderError when used outside ContainerProvider", () => {
    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(
        <AutoScopeProvider>
          <div>Content</div>
        </AutoScopeProvider>
      );
    }).toThrow(MissingProviderError);

    consoleSpy.mockRestore();
  });
});
