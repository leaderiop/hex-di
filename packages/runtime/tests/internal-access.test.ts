/**
 * Internal Access Protocol tests for @hex-di/runtime.
 *
 * Tests for the Symbol-based access protocol that allows DevTools
 * to inspect container internals without exposing mutable state.
 */

import { describe, test, expect, vi } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer } from "../src/container.js";
import { INTERNAL_ACCESS } from "../src/inspector-symbols.js";
import type { ContainerInternalState, ScopeInternalState } from "../src/inspector-types.js";

/**
 * Helper to safely access the internal state accessor from a container or scope.
 * This handles the type narrowing for Symbol-indexed properties.
 */
function getContainerAccessor(
  container: unknown
): () => ContainerInternalState {
  const accessor = (container as Record<symbol, unknown>)[INTERNAL_ACCESS];
  if (typeof accessor !== "function") {
    throw new Error("INTERNAL_ACCESS accessor not found");
  }
  return accessor as () => ContainerInternalState;
}

function getScopeAccessor(scope: unknown): () => ScopeInternalState {
  const accessor = (scope as Record<symbol, unknown>)[INTERNAL_ACCESS];
  if (typeof accessor !== "function") {
    throw new Error("INTERNAL_ACCESS accessor not found");
  }
  return accessor as () => ScopeInternalState;
}

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

interface RequestContext {
  requestId: string;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const RequestContextPort = createPort<"RequestContext", RequestContext>("RequestContext");

// =============================================================================
// Internal Access Protocol Tests
// =============================================================================

describe("Internal Access Protocol", () => {
  test("INTERNAL_ACCESS Symbol grants access to container internals", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // Access internal state via Symbol
    const accessor = getContainerAccessor(container);
    expect(typeof accessor).toBe("function");

    const state = accessor();
    expect(state).toBeDefined();
    expect(typeof state.disposed).toBe("boolean");
    expect(state.singletonMemo).toBeDefined();
    expect(state.childScopes).toBeDefined();
    expect(state.adapterMap).toBeDefined();
  });

  test("accessor returns frozen snapshot object (not mutable state)", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const accessor = getContainerAccessor(container);
    const state = accessor();

    // Snapshot should be frozen
    expect(Object.isFrozen(state)).toBe(true);

    // Repeated calls should return different snapshot objects
    const state2 = accessor();
    expect(state).not.toBe(state2);
  });

  test("disposed container accessor throws descriptive error", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    await container.dispose();

    const accessor = getContainerAccessor(container);
    expect(() => accessor()).toThrow(/disposed/i);
  });

  test("scope ID is generated at scope creation time", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const scope = container.createScope();
    const scopeAccessor = getScopeAccessor(scope);
    const scopeState = scopeAccessor();

    // Scope should have an ID
    expect(scopeState.id).toBeDefined();
    expect(typeof scopeState.id).toBe("string");
    expect(scopeState.id).toMatch(/^scope-\d+$/);
  });

  test("scope IDs are unique and stable across snapshot calls", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const scope1 = container.createScope();
    const scope2 = container.createScope();

    const scope1Accessor = getScopeAccessor(scope1);
    const scope2Accessor = getScopeAccessor(scope2);

    const scope1State1 = scope1Accessor();
    const scope1State2 = scope1Accessor();
    const scope2State = scope2Accessor();

    // Same scope should have stable ID across snapshot calls
    expect(scope1State1.id).toBe(scope1State2.id);

    // Different scopes should have unique IDs
    expect(scope1State1.id).not.toBe(scope2State.id);
  });

  test("scope accessor returns frozen snapshot with correct structure", () => {
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "test-123" }),
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph);

    const scope = container.createScope();
    // Resolve to populate scopedMemo
    scope.resolve(RequestContextPort);

    const scopeAccessor = getScopeAccessor(scope);
    const scopeState = scopeAccessor();

    // Snapshot should be frozen
    expect(Object.isFrozen(scopeState)).toBe(true);

    // Should include expected fields
    expect(scopeState.id).toBeDefined();
    expect(typeof scopeState.disposed).toBe("boolean");
    expect(scopeState.scopedMemo).toBeDefined();
    expect(scopeState.childScopes).toBeDefined();
  });
});
