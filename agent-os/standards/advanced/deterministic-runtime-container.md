# Deterministic Runtime Container Standards

This document provides comprehensive guidance on building deterministic IoC (Inversion of Control) containers with proper lifecycle management, scoping, and disposal patterns.

## Design Principles Hierarchy

Understanding the relationship between these concepts is critical:

```
Inversion of Control (IoC)
    └── Dependency Inversion Principle (DIP)
            └── Dependency Injection (DI)
                    └── IoC Container
```

- **IoC**: A broad principle where control flow is inverted - framework calls your code
- **DIP**: High-level modules should not depend on low-level modules; both should depend on abstractions
- **DI**: A specific technique for achieving IoC by injecting dependencies
- **Container**: A tool that automates dependency injection and lifecycle management

## IoC Container Lifecycle

The container lifecycle follows three deterministic phases:

### 1. Register Phase

During registration, you define how services are created and their lifetimes:

```typescript
// Registration examples
container.register<ILogger, ConsoleLogger>(Lifetime.Singleton);
container.register<IDatabase, PostgresDatabase>(Lifetime.Scoped);
container.register<IRequestHandler, RequestHandler>(Lifetime.Transient);

// Factory registration for complex construction
container.registerFactory<ICache>(() => {
  const config = loadCacheConfig();
  return new RedisCache(config);
}, Lifetime.Singleton);
```

```csharp
// C# example
services.AddSingleton<ILogger, ConsoleLogger>();
services.AddScoped<IDatabase, PostgresDatabase>();
services.AddTransient<IRequestHandler, RequestHandler>();
```

### 2. Resolve Phase

Resolution retrieves or creates service instances based on registration:

```typescript
// Direct resolution (use sparingly - prefer constructor injection)
const logger = container.resolve<ILogger>();

// Resolution with scope
using (const scope = container.createScope()) {
  const db = scope.resolve<IDatabase>(); // Scoped instance
  const handler = scope.resolve<IRequestHandler>(); // New instance
}
```

### 3. Dispose Phase

Deterministic disposal ensures resources are released in reverse order of creation:

```typescript
// Container disposal releases all singleton instances
await container.dispose();

// Scope disposal releases all scoped instances
using (const scope = container.createScope()) {
  const db = scope.resolve<IDatabase>();
  // db is automatically disposed when scope ends
}
```

## Service Lifetimes

### Transient

A new instance is created every time the service is requested.

```typescript
class TransientService implements IDisposable {
  private id = crypto.randomUUID();

  dispose(): void {
    console.log(`Disposing transient ${this.id}`);
  }
}

// Each resolve creates a new instance
const a = container.resolve<TransientService>(); // Instance 1
const b = container.resolve<TransientService>(); // Instance 2
// a !== b
```

**Use cases:**
- Lightweight, stateless services
- Services with no shared state requirements
- Operations that should be isolated

### Scoped

One instance per scope. All resolutions within the same scope return the same instance.

```typescript
class ScopedService implements IDisposable {
  private transactions: Transaction[] = [];

  beginTransaction(): Transaction {
    const tx = new Transaction();
    this.transactions.push(tx);
    return tx;
  }

  dispose(): void {
    this.transactions.forEach(tx => tx.rollback());
  }
}

// Same scope = same instance
using (const scope = container.createScope()) {
  const db1 = scope.resolve<ScopedService>();
  const db2 = scope.resolve<ScopedService>();
  // db1 === db2
}
```

**Use cases:**
- Database connections per request
- Unit of Work patterns
- Request-specific state

### Singleton

One instance for the entire container lifetime.

```typescript
class SingletonService {
  private static instanceCount = 0;
  public readonly instanceId: number;

  constructor() {
    this.instanceId = ++SingletonService.instanceCount;
  }
}

// Always the same instance
const s1 = container.resolve<SingletonService>();
const s2 = container.resolve<SingletonService>();
// s1 === s2, s1.instanceId === 1
```

**Use cases:**
- Configuration services
- Caching layers
- Connection pools
- Logging infrastructure

## Injection Styles

### Constructor Injection (Preferred)

Dependencies are provided through the constructor, making them explicit and immutable:

```typescript
class OrderService {
  constructor(
    private readonly repository: IOrderRepository,
    private readonly logger: ILogger,
    private readonly eventBus: IEventBus
  ) {}

  async createOrder(order: Order): Promise<void> {
    this.logger.info('Creating order', { orderId: order.id });
    await this.repository.save(order);
    await this.eventBus.publish(new OrderCreatedEvent(order));
  }
}
```

**Benefits:**
- Dependencies are explicit and visible
- Object is fully initialized after construction
- Enables immutability (readonly fields)
- Easy to test with mocks

### Setter Injection

Dependencies are provided through property setters after construction:

```typescript
class ReportService {
  private _formatter?: IReportFormatter;

  set formatter(value: IReportFormatter) {
    this._formatter = value;
  }

  generateReport(data: ReportData): Report {
    if (!this._formatter) {
      throw new Error('Formatter not configured');
    }
    return this._formatter.format(data);
  }
}
```

**Use cases:**
- Optional dependencies
- Circular dependency resolution (use sparingly)
- Framework-required patterns

### Interface Injection

Dependencies are injected through an interface method:

```typescript
interface ILoggerAware {
  setLogger(logger: ILogger): void;
}

class AuditService implements ILoggerAware {
  private logger?: ILogger;

  setLogger(logger: ILogger): void {
    this.logger = logger;
  }
}
```

**Use cases:**
- Plugin architectures
- Legacy system integration
- Cross-cutting concerns injection

## Deterministic Component Disposal

### Disposal Order

Components must be disposed in reverse order of their creation to maintain consistency:

```typescript
class DeterministicContainer {
  private disposables: IDisposable[] = [];

  register<T extends IDisposable>(instance: T): void {
    this.disposables.push(instance);
  }

  async dispose(): Promise<void> {
    // Reverse order disposal
    const reversed = [...this.disposables].reverse();

    for (const disposable of reversed) {
      try {
        await disposable.dispose();
      } catch (error) {
        // Log but continue disposing others
        console.error('Disposal error:', error);
      }
    }

    this.disposables = [];
  }
}
```

### Resource Cleanup Patterns

```typescript
class DatabaseConnection implements IAsyncDisposable {
  private connection?: Connection;
  private disposed = false;

  async connect(): Promise<void> {
    this.throwIfDisposed();
    this.connection = await createConnection();
  }

  async query(sql: string): Promise<Result> {
    this.throwIfDisposed();
    return this.connection!.query(sql);
  }

  async disposeAsync(): Promise<void> {
    if (this.disposed) return;

    this.disposed = true;

    if (this.connection) {
      await this.connection.close();
      this.connection = undefined;
    }
  }

  private throwIfDisposed(): void {
    if (this.disposed) {
      throw new ObjectDisposedException('DatabaseConnection');
    }
  }
}
```

## Scope Management

### Basic Scope Creation

```typescript
interface IScope extends IDisposable {
  resolve<T>(token: ServiceToken<T>): T;
  createChildScope(): IScope;
}

class Scope implements IScope {
  private instances = new Map<ServiceToken, any>();
  private children: Scope[] = [];

  constructor(
    private parent?: Scope,
    private container: Container
  ) {}

  resolve<T>(token: ServiceToken<T>): T {
    const registration = this.container.getRegistration(token);

    switch (registration.lifetime) {
      case Lifetime.Singleton:
        return this.container.getSingleton(token);

      case Lifetime.Scoped:
        if (!this.instances.has(token)) {
          this.instances.set(token, registration.factory(this));
        }
        return this.instances.get(token);

      case Lifetime.Transient:
        return registration.factory(this);
    }
  }

  createChildScope(): IScope {
    const child = new Scope(this, this.container);
    this.children.push(child);
    return child;
  }

  dispose(): void {
    // Dispose children first
    this.children.forEach(child => child.dispose());

    // Then dispose own instances in reverse order
    const instances = Array.from(this.instances.values()).reverse();
    instances.forEach(instance => {
      if (isDisposable(instance)) {
        instance.dispose();
      }
    });

    this.instances.clear();
  }
}
```

### Nested Scopes

```typescript
// Root scope (application lifetime)
const rootScope = container.createScope();

// Request scope (per HTTP request)
app.use(async (req, res, next) => {
  using requestScope = rootScope.createChildScope();
  req.scope = requestScope;

  // Operation scope (per database transaction)
  using operationScope = requestScope.createChildScope();

  try {
    const unitOfWork = operationScope.resolve<IUnitOfWork>();
    await unitOfWork.begin();

    // Handle request...

    await unitOfWork.commit();
  } catch (error) {
    await unitOfWork.rollback();
    throw error;
  }
  // operationScope disposed here

  next();
  // requestScope disposed here
});
```

## Lazy Initialization Patterns

### Lazy<T> Wrapper

```typescript
class Lazy<T> {
  private instance?: T;
  private initialized = false;

  constructor(private factory: () => T) {}

  get value(): T {
    if (!this.initialized) {
      this.instance = this.factory();
      this.initialized = true;
    }
    return this.instance!;
  }

  get isValueCreated(): boolean {
    return this.initialized;
  }
}

// Usage
class ExpensiveService {
  constructor(
    private lazyCache: Lazy<ICache>
  ) {}

  getData(key: string): Data {
    // Cache only initialized when first needed
    return this.lazyCache.value.get(key);
  }
}
```

### Container Support for Lazy

```typescript
container.register<Lazy<ICache>>(() => {
  return new Lazy(() => container.resolve<ICache>());
}, Lifetime.Transient);

// Or with dedicated syntax
container.registerLazy<ICache, RedisCache>(Lifetime.Singleton);
```

## Best Practices

### Never Manually Dispose Resolved Services

```typescript
// WRONG - Do not do this
const service = container.resolve<IMyService>();
// ... use service ...
service.dispose(); // Container may still reference this!

// CORRECT - Let the container/scope manage disposal
using (const scope = container.createScope()) {
  const service = scope.resolve<IMyService>();
  // ... use service ...
} // Automatically disposed
```

### Explicit Lifetime Management

```typescript
// WRONG - Ambiguous lifetime
container.register<IService, Service>();

// CORRECT - Explicit lifetime
container.register<IService, Service>(Lifetime.Scoped);

// Document lifetime expectations in interfaces
/**
 * Repository for user data.
 * Expected Lifetime: Scoped (one per request)
 */
interface IUserRepository {
  findById(id: string): Promise<User>;
}
```

### Avoid Captive Dependencies

A captive dependency occurs when a longer-lived service holds a shorter-lived dependency:

```typescript
// WRONG - Singleton captures Scoped dependency
class SingletonService {
  constructor(
    private scopedDb: IScopedDatabase // Captive dependency!
  ) {}
}

// CORRECT - Use factory to get fresh scoped instances
class SingletonService {
  constructor(
    private dbFactory: () => IScopedDatabase
  ) {}

  async doWork(): Promise<void> {
    const db = this.dbFactory(); // Fresh scoped instance
    // ...
  }
}
```

### Validate Registrations at Startup

```typescript
class Container {
  validate(): ValidationResult {
    const errors: string[] = [];

    for (const [token, registration] of this.registrations) {
      // Check for captive dependencies
      if (registration.lifetime === Lifetime.Singleton) {
        for (const dep of registration.dependencies) {
          const depReg = this.registrations.get(dep);
          if (depReg?.lifetime === Lifetime.Scoped) {
            errors.push(
              `Singleton ${token} cannot depend on Scoped ${dep}`
            );
          }
        }
      }

      // Check for circular dependencies
      if (this.hasCircularDependency(token)) {
        errors.push(`Circular dependency detected for ${token}`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}
```

## Avoiding the Service Locator Anti-Pattern

### What is Service Locator?

Service Locator is an anti-pattern where a component requests dependencies from a container rather than receiving them through injection:

```typescript
// ANTI-PATTERN - Service Locator
class OrderService {
  processOrder(order: Order): void {
    // Hidden dependencies - not visible in constructor
    const logger = ServiceLocator.resolve<ILogger>();
    const repo = ServiceLocator.resolve<IOrderRepository>();
    const validator = ServiceLocator.resolve<IOrderValidator>();

    // ... process order ...
  }
}
```

### Problems with Service Locator

1. **Hidden Dependencies**: Dependencies are not visible in the API
2. **Harder Testing**: Must configure global locator for tests
3. **Runtime Failures**: Missing registrations only discovered at runtime
4. **Tight Coupling**: Classes depend on the locator mechanism

### Proper Dependency Injection

```typescript
// CORRECT - Constructor Injection
class OrderService {
  constructor(
    private readonly logger: ILogger,
    private readonly repository: IOrderRepository,
    private readonly validator: IOrderValidator
  ) {}

  processOrder(order: Order): void {
    // All dependencies explicit and injected
    this.logger.info('Processing order');
    this.validator.validate(order);
    this.repository.save(order);
  }
}

// Container configuration (composition root)
container.register<IOrderService, OrderService>(Lifetime.Scoped);
```

### When Service Location is Acceptable

In the **Composition Root** only - the single location where the container is configured:

```typescript
// Composition Root - main.ts
async function bootstrap(): Promise<void> {
  const container = new Container();

  // Register all services
  container.register<ILogger, ConsoleLogger>(Lifetime.Singleton);
  container.register<IDatabase, PostgresDatabase>(Lifetime.Scoped);
  container.register<IOrderService, OrderService>(Lifetime.Scoped);

  // Resolve root component - this is the only acceptable service location
  const app = container.resolve<Application>();

  await app.start();
}
```

## Complete Container Implementation Example

```typescript
// Lifetime enum
enum Lifetime {
  Transient,
  Scoped,
  Singleton
}

// Service registration
interface ServiceRegistration<T> {
  factory: (scope: IScope) => T;
  lifetime: Lifetime;
  dependencies: ServiceToken[];
}

// Container implementation
class Container implements IDisposable {
  private registrations = new Map<ServiceToken, ServiceRegistration<any>>();
  private singletons = new Map<ServiceToken, any>();
  private disposed = false;

  register<TInterface, TImpl extends TInterface>(
    token: ServiceToken<TInterface>,
    implementation: new (...args: any[]) => TImpl,
    lifetime: Lifetime
  ): void {
    this.throwIfDisposed();

    const dependencies = this.getDependencies(implementation);

    this.registrations.set(token, {
      factory: (scope) => {
        const deps = dependencies.map(dep => scope.resolve(dep));
        return new implementation(...deps);
      },
      lifetime,
      dependencies
    });
  }

  createScope(): IScope {
    this.throwIfDisposed();
    return new Scope(undefined, this);
  }

  getSingleton<T>(token: ServiceToken<T>): T {
    if (!this.singletons.has(token)) {
      const registration = this.registrations.get(token)!;
      const rootScope = this.createScope();
      this.singletons.set(token, registration.factory(rootScope));
    }
    return this.singletons.get(token);
  }

  getRegistration<T>(token: ServiceToken<T>): ServiceRegistration<T> {
    const registration = this.registrations.get(token);
    if (!registration) {
      throw new Error(`Service not registered: ${token.toString()}`);
    }
    return registration;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    // Dispose singletons in reverse order
    const singletonValues = Array.from(this.singletons.values()).reverse();
    for (const singleton of singletonValues) {
      if (isDisposable(singleton)) {
        singleton.dispose();
      }
    }

    this.singletons.clear();
    this.registrations.clear();
  }

  private throwIfDisposed(): void {
    if (this.disposed) {
      throw new ObjectDisposedException('Container');
    }
  }

  private getDependencies(ctor: new (...args: any[]) => any): ServiceToken[] {
    // Extract dependencies from constructor metadata
    return Reflect.getMetadata('design:paramtypes', ctor) ?? [];
  }
}

// Helper function
function isDisposable(obj: any): obj is IDisposable {
  return obj && typeof obj.dispose === 'function';
}
```

## Summary

Building a deterministic runtime container requires careful attention to:

1. **Lifecycle Management**: Register, Resolve, Dispose phases must be clearly defined
2. **Service Lifetimes**: Choose Transient, Scoped, or Singleton based on requirements
3. **Injection Style**: Prefer constructor injection for explicit, testable code
4. **Deterministic Disposal**: Dispose in reverse creation order, handle errors gracefully
5. **Scope Management**: Use nested scopes for request/operation boundaries
6. **Avoid Anti-Patterns**: Never use Service Locator outside the composition root
7. **Validate Early**: Check registrations at startup to catch configuration errors

Following these standards ensures your IoC container provides predictable, maintainable, and testable dependency management throughout your application's lifetime.
