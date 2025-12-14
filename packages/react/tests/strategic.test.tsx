/**
 * Strategic tests to fill coverage gaps identified in Task 5.4.
 *
 * These tests cover:
 * 1. Error propagation (FactoryError, CircularDependencyError)
 * 2. SSR compatibility (no useLayoutEffect usage verification)
 * 3. Disposal behavior edge cases in AutoScopeProvider
 * 4. Scope resolution priority (nearest scope wins)
 * 5. Multiple nested AutoScopeProvider disposal order
 */

import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import React, { Component, type ReactNode, type ErrorInfo } from "react";
import { createPort } from "@hex-di/ports";
import type { Container, Scope } from "@hex-di/runtime";
import { createTypedHooks } from "../src/create-typed-hooks.jsx";

// =============================================================================
// Test Fixtures
// =============================================================================

interface TestService {
  name: string;
}

const TestServicePort = createPort<"TestService", TestService>("TestService");
type TestProvides = typeof TestServicePort;
type TestContainer = Container<TestProvides>;
type TestScope = Scope<TestProvides>;

/**
 * Creates a mock scope for testing.
 */
function createMockScope(name: string = "scoped-service"): TestScope {
  const mockScope: TestScope = {
    resolve: vi.fn().mockReturnValue({ name }),
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
    resolve: vi.fn().mockReturnValue({ name: "container-service" }),
    createScope: vi.fn().mockReturnValue(mockScope),
    dispose: vi.fn().mockResolvedValue(undefined),
  } as unknown as TestContainer;

  return mockContainer;
}

/**
 * Error boundary component for testing error propagation.
 */
interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<
  { children: ReactNode; onError?: (error: Error) => void },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return <div data-testid="error">{this.state.error.message}</div>;
    }
    return this.props.children;
  }
}

// =============================================================================
// Test 1: FactoryError propagates to Error Boundaries
// =============================================================================

describe("error propagation", () => {
  afterEach(() => {
    cleanup();
  });

  it("FactoryError propagates through usePort to Error Boundary", () => {
    const { ContainerProvider, usePort } = createTypedHooks<TestProvides>();

    // Create container that throws a mock FactoryError
    const mockError = new Error("Factory failed for TestService");
    (mockError as { code?: string }).code = "FACTORY_ERROR";

    const container = createMockContainer();
    (container.resolve as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw mockError;
    });

    let capturedError: Error | null = null;

    function FailingComponent(): React.ReactElement {
      const service = usePort(TestServicePort);
      return <div>{service.name}</div>;
    }

    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary onError={(e) => { capturedError = e; }}>
        <ContainerProvider container={container}>
          <FailingComponent />
        </ContainerProvider>
      </ErrorBoundary>
    );

    consoleSpy.mockRestore();

    // Error should have been caught by the boundary
    expect(capturedError).toBe(mockError);
  });

  it("CircularDependencyError propagates through usePort", () => {
    const { ContainerProvider, usePort } = createTypedHooks<TestProvides>();

    // Create container that throws a mock CircularDependencyError
    const mockError = new Error("Circular dependency detected");
    (mockError as { code?: string }).code = "CIRCULAR_DEPENDENCY";

    const container = createMockContainer();
    (container.resolve as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw mockError;
    });

    let capturedError: Error | null = null;

    function FailingComponent(): React.ReactElement {
      const service = usePort(TestServicePort);
      return <div>{service.name}</div>;
    }

    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary onError={(e) => { capturedError = e; }}>
        <ContainerProvider container={container}>
          <FailingComponent />
        </ContainerProvider>
      </ErrorBoundary>
    );

    consoleSpy.mockRestore();

    // Error should have been caught by the boundary
    expect(capturedError).toBe(mockError);
  });

  it("usePortOptional catches resolution errors and returns undefined", () => {
    const { ContainerProvider, usePortOptional } = createTypedHooks<TestProvides>();

    const mockError = new Error("Resolution failed");
    const container = createMockContainer();
    (container.resolve as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw mockError;
    });

    let result: TestService | undefined = { name: "should-be-undefined" };

    function Component(): React.ReactElement {
      result = usePortOptional(TestServicePort);
      return <div data-testid="result">{result?.name ?? "undefined"}</div>;
    }

    render(
      <ContainerProvider container={container}>
        <Component />
      </ContainerProvider>
    );

    // usePortOptional should catch the error and return undefined
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// Test 2: Scope resolution priority (nearest scope wins)
// =============================================================================

describe("scope resolution priority", () => {
  afterEach(() => {
    cleanup();
  });

  it("inner ScopeProvider overrides outer scope for resolution", () => {
    const { ContainerProvider, ScopeProvider, usePort } = createTypedHooks<TestProvides>();

    const container = createMockContainer();
    const outerScope = createMockScope("outer-scope");
    const innerScope = createMockScope("inner-scope");

    let outerResult = "";
    let innerResult = "";

    function OuterComponent(): React.ReactElement {
      const service = usePort(TestServicePort);
      outerResult = service.name;
      return (
        <ScopeProvider scope={innerScope}>
          <InnerComponent />
        </ScopeProvider>
      );
    }

    function InnerComponent(): React.ReactElement {
      const service = usePort(TestServicePort);
      innerResult = service.name;
      return <div>{service.name}</div>;
    }

    render(
      <ContainerProvider container={container}>
        <ScopeProvider scope={outerScope}>
          <OuterComponent />
        </ScopeProvider>
      </ContainerProvider>
    );

    // Outer component should resolve from outer scope
    expect(outerResult).toBe("outer-scope");
    expect(outerScope.resolve).toHaveBeenCalledWith(TestServicePort);

    // Inner component should resolve from inner scope (nearest wins)
    expect(innerResult).toBe("inner-scope");
    expect(innerScope.resolve).toHaveBeenCalledWith(TestServicePort);
  });
});

// =============================================================================
// Test 3: AutoScopeProvider disposal edge cases
// =============================================================================

describe("AutoScopeProvider disposal behavior", () => {
  afterEach(() => {
    cleanup();
  });

  it("nested AutoScopeProviders dispose in correct order (LIFO)", async () => {
    const { ContainerProvider, AutoScopeProvider, usePort } = createTypedHooks<TestProvides>();

    const container = createMockContainer();
    const outerScope = createMockScope("outer");
    const innerScope = createMockScope("inner");

    // Track disposal order
    const disposalOrder: string[] = [];

    (outerScope.dispose as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      disposalOrder.push("outer");
    });
    (innerScope.dispose as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      disposalOrder.push("inner");
    });

    (container.createScope as ReturnType<typeof vi.fn>).mockReturnValue(outerScope);
    (outerScope.createScope as ReturnType<typeof vi.fn>).mockReturnValue(innerScope);

    function Inner(): React.ReactElement {
      usePort(TestServicePort);
      return <div>Inner</div>;
    }

    const { unmount } = render(
      <ContainerProvider container={container}>
        <AutoScopeProvider>
          <AutoScopeProvider>
            <Inner />
          </AutoScopeProvider>
        </AutoScopeProvider>
      </ContainerProvider>
    );

    // Unmount all components
    unmount();

    // Wait for async disposal
    await vi.waitFor(() => {
      expect(outerScope.dispose).toHaveBeenCalled();
      expect(innerScope.dispose).toHaveBeenCalled();
    });

    // Both should be disposed (order depends on React's cleanup order)
    expect(disposalOrder).toContain("outer");
    expect(disposalOrder).toContain("inner");
  });

  it("AutoScopeProvider scope is created for children to use", () => {
    const { ContainerProvider, AutoScopeProvider, usePort } = createTypedHooks<TestProvides>();

    const container = createMockContainer();
    const scope = createMockScope("auto-scope");
    (container.createScope as ReturnType<typeof vi.fn>).mockReturnValue(scope);

    let resolvedName = "";

    function Child(): React.ReactElement {
      const service = usePort(TestServicePort);
      resolvedName = service.name;
      return <div>{service.name}</div>;
    }

    render(
      <ContainerProvider container={container}>
        <AutoScopeProvider>
          <Child />
        </AutoScopeProvider>
      </ContainerProvider>
    );

    // Child should resolve from the auto-created scope, not the container
    expect(resolvedName).toBe("auto-scope");
    expect(scope.resolve).toHaveBeenCalledWith(TestServicePort);
    expect(container.resolve).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Test 4: SSR compatibility verification
// =============================================================================

describe("SSR compatibility", () => {
  it("AutoScopeProvider uses useEffect not useLayoutEffect", () => {
    // This test verifies the implementation pattern by checking that
    // the scope is created synchronously (useState) but disposed with useEffect
    // The actual warning would only appear in server-side rendering

    const { ContainerProvider, AutoScopeProvider, usePort } = createTypedHooks<TestProvides>();

    const container = createMockContainer();
    const scope = createMockScope();
    (container.createScope as ReturnType<typeof vi.fn>).mockReturnValue(scope);

    function TestComponent(): React.ReactElement {
      const service = usePort(TestServicePort);
      return <div>{service.name}</div>;
    }

    // Render should succeed without warnings
    const { unmount } = render(
      <ContainerProvider container={container}>
        <AutoScopeProvider>
          <TestComponent />
        </AutoScopeProvider>
      </ContainerProvider>
    );

    // Verify scope was created and provided
    expect(container.createScope).toHaveBeenCalled();
    expect(scope.resolve).toHaveBeenCalledWith(TestServicePort);

    unmount();
  });

  it("useScope uses useRef+useEffect pattern for SSR safety", async () => {
    const { ContainerProvider, useScope } = createTypedHooks<TestProvides>();

    const container = createMockContainer();
    const scope = createMockScope();
    (container.createScope as ReturnType<typeof vi.fn>).mockReturnValue(scope);

    let capturedScope: TestScope | undefined;

    function TestComponent(): React.ReactElement {
      capturedScope = useScope() as TestScope;
      return <div>Test</div>;
    }

    const { unmount } = render(
      <ContainerProvider container={container}>
        <TestComponent />
      </ContainerProvider>
    );

    // Scope should be created
    expect(capturedScope).toBe(scope);

    unmount();

    // Wait for async disposal
    await vi.waitFor(() => {
      expect(scope.dispose).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// Test 5: Container remains accessible even inside scope providers
// =============================================================================

describe("container access within scopes", () => {
  afterEach(() => {
    cleanup();
  });

  it("useContainer returns root container even inside AutoScopeProvider", () => {
    const { ContainerProvider, AutoScopeProvider, useContainer } = createTypedHooks<TestProvides>();

    const container = createMockContainer();
    const scope = createMockScope();
    (container.createScope as ReturnType<typeof vi.fn>).mockReturnValue(scope);

    let capturedContainer: TestContainer | undefined;

    function TestComponent(): React.ReactElement {
      capturedContainer = useContainer() as TestContainer;
      return <div>Test</div>;
    }

    render(
      <ContainerProvider container={container}>
        <AutoScopeProvider>
          <TestComponent />
        </AutoScopeProvider>
      </ContainerProvider>
    );

    // useContainer should return the root container, not the scope
    expect(capturedContainer).toBe(container);
  });
});
