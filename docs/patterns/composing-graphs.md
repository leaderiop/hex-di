# Composing Graphs

This guide covers advanced patterns for composing dependency graphs.

## Graph Immutability

GraphBuilder is immutable - each `.provide()` returns a NEW builder instance. This enables powerful composition patterns.

```typescript
const builder1 = GraphBuilder.create(); // 0 adapters
const builder2 = builder1.provide(LoggerAdapter); // 1 adapter
const builder3 = builder2.provide(DatabaseAdapter); // 2 adapters

// builder1 and builder2 are unchanged!
console.log(builder1.adapters.length); // 0
console.log(builder2.adapters.length); // 1
console.log(builder3.adapters.length); // 2
```

## Base Graph Pattern

Create a shared base graph with common infrastructure:

```typescript
// src/di/base.ts
import { GraphBuilder } from "@hex-di/graph";

export const baseGraph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(ConfigAdapter)
  .provide(MetricsAdapter);

// NOT built yet - still a builder
```

### Extending the Base

Different applications extend the base:

```typescript
// apps/web/di/graph.ts
import { baseGraph } from "../../../di/base";

export const webGraph = baseGraph
  .provide(HttpClientAdapter)
  .provide(AuthAdapter)
  .provide(UserServiceAdapter)
  .build();

// apps/api/di/graph.ts
import { baseGraph } from "../../../di/base";

export const apiGraph = baseGraph
  .provide(DatabaseAdapter)
  .provide(CacheAdapter)
  .provide(UserRepositoryAdapter)
  .build();
```

## Feature Module Pattern

Encapsulate features as graph extensions:

```typescript
// features/auth/di/module.ts
export function withAuth<
  TProvides extends Port<unknown, string> | never,
  TRequires extends Port<unknown, string> | never
>(builder: GraphBuilder<TProvides, TRequires>) {
  return builder
    .provide(SessionStoreAdapter)
    .provide(AuthServiceAdapter)
    .provide(TokenValidatorAdapter);
}

// features/payments/di/module.ts
export function withPayments<
  TProvides extends Port<unknown, string> | never,
  TRequires extends Port<unknown, string> | never
>(builder: GraphBuilder<TProvides, TRequires>) {
  return builder
    .provide(PaymentGatewayAdapter)
    .provide(InvoiceServiceAdapter)
    .provide(BillingAdapter);
}
```

### Using Feature Modules

```typescript
// src/di/graph.ts
const base = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(ConfigAdapter)
  .provide(DatabaseAdapter);

const withAuthGraph = withAuth(base);
const withAllFeatures = withPayments(withAuthGraph);

export const appGraph = withAllFeatures.build();
```

## Environment-Specific Graphs

Create different graphs for different environments:

```typescript
// src/di/adapters/logger.ts
export const ConsoleLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => new ConsoleLogger(),
});

export const CloudLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [ConfigPort],
  lifetime: "singleton",
  factory: (deps) => new CloudWatchLogger(deps.Config.logGroup),
});

// src/di/graph.ts
import { GraphBuilder } from "@hex-di/graph";

const baseBuilder = GraphBuilder.create()
  .provide(ConfigAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter);

export const developmentGraph = baseBuilder
  .provide(ConsoleLoggerAdapter)
  .provide(InMemoryCacheAdapter)
  .build();

export const productionGraph = baseBuilder
  .provide(CloudLoggerAdapter)
  .provide(RedisCacheAdapter)
  .build();

// Select based on environment
export const appGraph =
  process.env.NODE_ENV === "production" ? productionGraph : developmentGraph;
```

## Graph Branching

Create variants for different use cases:

```typescript
// Base with shared services
const coreBuilder = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(ConfigAdapter)
  .provide(DatabaseAdapter);

// Admin variant - full access
export const adminGraph = coreBuilder
  .provide(AdminUserServiceAdapter)
  .provide(AuditLogAdapter)
  .provide(SystemConfigAdapter)
  .build();

// User variant - limited access
export const userGraph = coreBuilder
  .provide(UserServiceAdapter)
  .provide(ProfileAdapter)
  .build();

// API variant - external access
export const apiGraph = coreBuilder
  .provide(ApiAuthAdapter)
  .provide(RateLimiterAdapter)
  .provide(PublicUserServiceAdapter)
  .build();
```

## Testing Graph Variants

Create test-specific graphs:

```typescript
// src/di/testing.ts
import { GraphBuilder } from "@hex-di/graph";
import { createMockAdapter } from "@hex-di/testing";

// Mock adapters
const mockLogger = createMockAdapter(LoggerPort, {
  log: () => {},
  warn: () => {},
  error: () => {},
});

const mockDatabase = createMockAdapter(DatabasePort, {
  query: async () => [],
  insert: async () => ({ id: "1" }),
  update: async () => true,
  delete: async () => true,
});

// Test graph with mocks
export const testGraph = GraphBuilder.create()
  .provide(mockLogger)
  .provide(mockDatabase)
  .provide(UserServiceAdapter) // Real implementation with mock deps
  .build();
```

## Layered Graph Pattern

Build graphs in layers:

```typescript
// Layer 1: Infrastructure
const infrastructureLayer = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(ConfigAdapter)
  .provide(MetricsAdapter);

// Layer 2: Data (depends on infrastructure)
const dataLayer = infrastructureLayer
  .provide(DatabaseAdapter)
  .provide(CacheAdapter)
  .provide(SearchAdapter);

// Layer 3: Domain (depends on data)
const domainLayer = dataLayer
  .provide(UserRepositoryAdapter)
  .provide(OrderRepositoryAdapter)
  .provide(ProductRepositoryAdapter);

// Layer 4: Application (depends on domain)
const applicationLayer = domainLayer
  .provide(UserServiceAdapter)
  .provide(OrderServiceAdapter)
  .provide(ProductServiceAdapter);

// Final graph
export const appGraph = applicationLayer.build();
```

## Dynamic Graph Construction

Build graphs based on runtime configuration:

```typescript
function buildGraph(features: string[]) {
  let builder = GraphBuilder.create()
    .provide(LoggerAdapter)
    .provide(ConfigAdapter);

  if (features.includes("auth")) {
    builder = builder.provide(AuthServiceAdapter).provide(SessionAdapter);
  }

  if (features.includes("payments")) {
    builder = builder.provide(PaymentAdapter).provide(BillingAdapter);
  }

  if (features.includes("notifications")) {
    builder = builder.provide(EmailAdapter).provide(PushAdapter);
  }

  return builder.build();
}

// Usage
const graph = buildGraph(["auth", "payments"]);
```

**Note:** Dynamic construction loses some compile-time safety. Prefer static graphs when possible.

## Plugin Architecture

Support for plugins that add adapters:

```typescript
// Plugin interface
interface Plugin {
  name: string;
  register<
    T extends Port<unknown, string> | never,
    R extends Port<unknown, string> | never
  >(
    builder: GraphBuilder<T, R>
  ): GraphBuilder<T | Port<unknown, string>, R | Port<unknown, string>>;
}

// Plugin implementation
const analyticsPlugin: Plugin = {
  name: "analytics",
  register(builder) {
    return builder.provide(AnalyticsAdapter).provide(TrackingAdapter);
  },
};

// Plugin loader
function loadPlugins(
  baseBuilder: GraphBuilder<Port<unknown, string>, Port<unknown, string>>,
  plugins: Plugin[]
) {
  return plugins.reduce(
    (builder, plugin) => plugin.register(builder),
    baseBuilder
  );
}

// Usage
const graphWithPlugins = loadPlugins(baseBuilder, [
  analyticsPlugin,
  loggingPlugin,
  cachingPlugin,
]).build();
```

## Multi-Tenant Graphs

Different graphs for different tenants:

```typescript
// Tenant-specific adapters
const createTenantAdapter = (tenantId: string) =>
  createAdapter({
    provides: TenantContextPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ tenantId, config: loadTenantConfig(tenantId) }),
  });

// Create tenant-specific graphs
function createTenantGraph(tenantId: string) {
  return GraphBuilder.create()
    .provide(LoggerAdapter)
    .provide(createTenantAdapter(tenantId))
    .provide(TenantDatabaseAdapter)
    .provide(TenantUserServiceAdapter)
    .build();
}

// Container per tenant
const tenantContainers = new Map<string, Container>();

function getTenantContainer(tenantId: string) {
  if (!tenantContainers.has(tenantId)) {
    const graph = createTenantGraph(tenantId);
    tenantContainers.set(tenantId, createContainer(graph));
  }
  return tenantContainers.get(tenantId)!;
}
```

## Merging Graphs

While HexDI doesn't have built-in merge, you can compose:

```typescript
// Instead of merging, use composition
const graphA = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(ConfigAdapter);

const graphB = GraphBuilder.create()
  .provide(DatabaseAdapter)
  .provide(CacheAdapter);

// Can't merge directly, but can compose
const combined = GraphBuilder.create()
  // Copy from A
  .provide(LoggerAdapter)
  .provide(ConfigAdapter)
  // Copy from B
  .provide(DatabaseAdapter)
  .provide(CacheAdapter)
  .build();
```

For true merging, extract adapters to arrays:

```typescript
const infrastructureAdapters = [LoggerAdapter, ConfigAdapter];
const dataAdapters = [DatabaseAdapter, CacheAdapter];
const serviceAdapters = [UserServiceAdapter, OrderServiceAdapter];

const allAdapters = [
  ...infrastructureAdapters,
  ...dataAdapters,
  ...serviceAdapters,
];

const graph = allAdapters
  .reduce((builder, adapter) => builder.provide(adapter), GraphBuilder.create())
  .build();
```

## Best Practices

### 1. Keep Base Graphs Minimal

```typescript
// Good - minimal shared base
const baseGraph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(ConfigAdapter);

// Avoid - too much in base
const baseGraph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(ConfigAdapter)
  .provide(DatabaseAdapter)
  .provide(CacheAdapter)
  .provide(AuthAdapter);
// ... everything
```

### 2. Use Static Graphs When Possible

Static graphs have full compile-time validation:

```typescript
// Good - static, fully validated
export const appGraph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(UserServiceAdapter)
  .build();

// Less ideal - dynamic, partial validation
export const appGraph = buildGraph(runtimeConfig);
```

### 3. Document Graph Dependencies

```typescript
/**
 * Base infrastructure graph.
 *
 * Provides: Logger, Config
 * Requires: none
 *
 * Extend with .provide() for application-specific services.
 */
export const baseGraph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(ConfigAdapter);
```

### 4. Test Each Graph Variant

```typescript
describe("graph variants", () => {
  it("development graph is complete", () => {
    assertGraphComplete(developmentGraph);
  });

  it("production graph is complete", () => {
    assertGraphComplete(productionGraph);
  });

  it("test graph is complete", () => {
    assertGraphComplete(testGraph);
  });
});
```

## Next Steps

- Learn [Scoped Services](./scoped-services.md) patterns
- Explore [Project Structure](./project-structure.md)
- See [Testing Strategies](../guides/testing-strategies.md)
