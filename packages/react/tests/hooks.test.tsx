/**
 * Unit tests for React hooks.
 *
 * These tests verify:
 * 1. usePort resolves service from container
 * 2. usePort resolves service from nearest scope
 * 3. usePort throws MissingProviderError outside provider
 * 4. usePortOptional returns undefined outside provider
 * 5. usePortOptional returns service when available
 * 6. useContainer returns root container
 * 7. useContainer throws outside ContainerProvider
 * 8. useScope creates and disposes scope on component lifecycle
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, renderHook } from "@testing-library/react";
import React, { type ReactNode } from "react";
import { createPort } from "@hex-di/ports";
import type { Container, Scope } from "@hex-di/runtime";
import { MissingProviderError } from "../src/errors.js";
import {
  ContainerProvider,
  ScopeProvider,
  AutoScopeProvider,
} from "../src/context.jsx";
import { useContainer } from "../src/use-container.js";
import { usePort } from "../src/use-port.js";
import { usePortOptional } from "../src/use-port-optional.js";
import { useScope } from "../src/use-scope.js";

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
 * Creates a mock scope for testing.
 */
function createMockScope(name: string = "scoped-test-service"): TestScope {
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
    resolve: vi.fn().mockReturnValue({ name: "test-service" }),
    createScope: vi.fn().mockReturnValue(mockScope),
    dispose: vi.fn().mockResolvedValue(undefined),
  } as unknown as TestContainer;

  return mockContainer;
}

// =============================================================================
// usePort Tests
// =============================================================================

describe("usePort", () => {
  afterEach(() => {
    cleanup();
  });

  it("resolves service from container", () => {
    const container = createMockContainer();

    function TestComponent(): React.ReactElement {
      const service = usePort(TestServicePort);
      return <div data-testid="service-name">{service.name}</div>;
    }

    render(
      <ContainerProvider container={container}>
        <TestComponent />
      </ContainerProvider>
    );

    expect(screen.getByTestId("service-name").textContent).toBe("test-service");
    expect(container.resolve).toHaveBeenCalledWith(TestServicePort);
  });

  it("resolves service from nearest scope", () => {
    const container = createMockContainer();
    const scope = createMockScope("scope-service");

    function TestComponent(): React.ReactElement {
      const service = usePort(TestServicePort);
      return <div data-testid="service-name">{service.name}</div>;
    }

    render(
      <ContainerProvider container={container}>
        <ScopeProvider scope={scope}>
          <TestComponent />
        </ScopeProvider>
      </ContainerProvider>
    );

    expect(screen.getByTestId("service-name").textContent).toBe("scope-service");
    // Container.resolve should NOT have been called - scope.resolve should be used
    expect(container.resolve).not.toHaveBeenCalled();
    expect(scope.resolve).toHaveBeenCalledWith(TestServicePort);
  });

  it("throws MissingProviderError outside provider", () => {
    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function TestComponent(): React.ReactElement {
      const service = usePort(TestServicePort);
      return <div>{service.name}</div>;
    }

    expect(() => {
      render(<TestComponent />);
    }).toThrow(MissingProviderError);

    consoleSpy.mockRestore();
  });
});

// =============================================================================
// usePortOptional Tests
// =============================================================================

describe("usePortOptional", () => {
  afterEach(() => {
    cleanup();
  });

  it("returns undefined outside provider", () => {
    function TestComponent(): React.ReactElement {
      const service = usePortOptional(TestServicePort);
      return <div data-testid="service-value">{service?.name ?? "undefined"}</div>;
    }

    render(<TestComponent />);

    expect(screen.getByTestId("service-value").textContent).toBe("undefined");
  });

  it("returns service when available", () => {
    const container = createMockContainer();

    function TestComponent(): React.ReactElement {
      const service = usePortOptional(TestServicePort);
      return <div data-testid="service-value">{service?.name ?? "undefined"}</div>;
    }

    render(
      <ContainerProvider container={container}>
        <TestComponent />
      </ContainerProvider>
    );

    expect(screen.getByTestId("service-value").textContent).toBe("test-service");
  });
});

// =============================================================================
// useContainer Tests
// =============================================================================

describe("useContainer", () => {
  afterEach(() => {
    cleanup();
  });

  it("returns root container", () => {
    const container = createMockContainer();
    let capturedContainer: TestContainer | undefined;

    function TestComponent(): React.ReactElement {
      capturedContainer = useContainer() as TestContainer;
      return <div data-testid="component">Rendered</div>;
    }

    render(
      <ContainerProvider container={container}>
        <TestComponent />
      </ContainerProvider>
    );

    expect(capturedContainer).toBe(container);
    expect(screen.getByTestId("component").textContent).toBe("Rendered");
  });

  it("throws MissingProviderError outside ContainerProvider", () => {
    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function TestComponent(): React.ReactElement {
      const container = useContainer();
      return <div>{String(container)}</div>;
    }

    expect(() => {
      render(<TestComponent />);
    }).toThrow(MissingProviderError);

    consoleSpy.mockRestore();
  });
});

// =============================================================================
// useScope Tests
// =============================================================================

describe("useScope", () => {
  afterEach(() => {
    cleanup();
  });

  it("creates and disposes scope on component lifecycle", async () => {
    const container = createMockContainer();
    const mockScope = createMockScope();
    (container.createScope as ReturnType<typeof vi.fn>).mockReturnValue(mockScope);

    let capturedScope: TestScope | undefined;

    function TestComponent(): React.ReactElement {
      capturedScope = useScope() as TestScope;
      return <div data-testid="component">Rendered</div>;
    }

    const { unmount } = render(
      <ContainerProvider container={container}>
        <TestComponent />
      </ContainerProvider>
    );

    // Verify scope was created from container
    expect(container.createScope).toHaveBeenCalledTimes(1);
    expect(capturedScope).toBe(mockScope);

    // Unmount and verify disposal
    unmount();

    // Wait for async dispose
    await vi.waitFor(() => {
      expect(mockScope.dispose).toHaveBeenCalledTimes(1);
    });
  });
});
