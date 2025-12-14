# Effect-Style Dependency Injection & Environment Modeling

This guide covers Effect-TS's approach to dependency injection using the Context module, Layer system, and Service patterns. Effect provides compile-time validated, type-safe dependency injection that differs fundamentally from runtime DI containers like TSyringe or NestJS.

## Core Concepts

### The R Parameter in Effect<R, E, A>

Effect's signature `Effect<R, E, A>` represents:
- **A**: The success type (what the effect produces)
- **E**: The error type (what can go wrong)
- **R**: The requirements/environment type (what dependencies are needed)

The R parameter represents the "environment" or "context" that must be provided before the effect can execute.

### Understanding R as Union (Intersection Semantics)

**Critical insight**: When you see `R1 | R2` in Effect's R parameter, it means "requires BOTH R1 AND R2", not "either/or".

```typescript
import { Effect, Context } from "effect"

// Service definitions
class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  { query: (sql: string) => Effect.Effect<unknown[], Error> }
>() {}

class LoggerService extends Context.Tag("LoggerService")<
  LoggerService,
  { log: (message: string) => Effect.Effect<void> }
>() {}

// This effect requires BOTH DatabaseService AND LoggerService
const program: Effect.Effect<
  void,
  Error,
  DatabaseService | LoggerService  // Union means: needs both!
> = Effect.gen(function* () {
  const db = yield* DatabaseService
  const logger = yield* LoggerService

  yield* logger.log("Querying database...")
  const results = yield* db.query("SELECT * FROM users")
  yield* logger.log(`Found ${results.length} users`)
})
```

The union `DatabaseService | LoggerService` is a type-level representation that Effect uses to track ALL required services. This differs from typical TypeScript union semantics where `A | B` means "one or the other."

## Services and Context.Tag

### Defining Services with Context.Tag

Services in Effect are defined using `Context.Tag`, which creates a unique identifier for dependency resolution:

```typescript
import { Effect, Context } from "effect"

// Define the service interface and tag together
class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly findById: (id: string) => Effect.Effect<User | null, DatabaseError>
    readonly save: (user: User) => Effect.Effect<void, DatabaseError>
    readonly findAll: () => Effect.Effect<User[], DatabaseError>
  }
>() {}

// Using the service in an effect
const getUser = (id: string) =>
  Effect.gen(function* () {
    const repo = yield* UserRepository
    return yield* repo.findById(id)
  })
```

### Tag-Based Service Identification

Each `Context.Tag` creates a unique symbol-based identifier. This provides:

1. **Type safety**: The compiler knows exactly what interface the service provides
2. **Uniqueness**: No accidental service collisions
3. **Discoverability**: IDE support for service methods

```typescript
// Multiple services with distinct tags
class EmailService extends Context.Tag("EmailService")<
  EmailService,
  { send: (to: string, subject: string, body: string) => Effect.Effect<void, EmailError> }
>() {}

class NotificationService extends Context.Tag("NotificationService")<
  NotificationService,
  { notify: (userId: string, message: string) => Effect.Effect<void, NotificationError> }
>() {}

class AuditService extends Context.Tag("AuditService")<
  AuditService,
  { record: (event: AuditEvent) => Effect.Effect<void> }
>() {}
```

## The Layer System

Layers are "recipes" for constructing services. They describe how to build a service from its dependencies.

### Basic Layer Creation

```typescript
import { Effect, Layer, Context } from "effect"

// Simple layer with no dependencies
const LoggerLive = Layer.succeed(
  LoggerService,
  {
    log: (message) => Effect.sync(() => console.log(`[LOG] ${message}`))
  }
)

// Layer that requires configuration
class DatabaseConfig extends Context.Tag("DatabaseConfig")<
  DatabaseConfig,
  { connectionString: string; poolSize: number }
>() {}

// Layer with dependencies
const DatabaseLive = Layer.effect(
  DatabaseService,
  Effect.gen(function* () {
    const config = yield* DatabaseConfig
    // Initialize database connection pool
    const pool = yield* Effect.tryPromise(() =>
      createPool(config.connectionString, config.poolSize)
    )

    return {
      query: (sql) => Effect.tryPromise({
        try: () => pool.query(sql),
        catch: (e) => new DatabaseError(String(e))
      })
    }
  })
)
```

### Layer Composition Patterns

Layers can be composed to build complex dependency graphs:

```typescript
// Horizontal composition: merge independent layers
const InfrastructureLive = Layer.merge(LoggerLive, ConfigLive)

// Vertical composition: pipe dependencies through
const DatabaseWithConfig = Layer.provide(DatabaseLive, ConfigLive)

// Complex composition example
const AppLive = Layer.provide(
  Layer.merge(
    UserServiceLive,
    OrderServiceLive
  ),
  Layer.merge(
    DatabaseLive,
    Layer.merge(LoggerLive, ConfigLive)
  )
)
```

### Layer.effect vs Layer.succeed vs Layer.scoped

```typescript
// Layer.succeed: For stateless services with no initialization
const SimpleLive = Layer.succeed(SimpleService, {
  doThing: () => Effect.succeed("done")
})

// Layer.effect: For services requiring async initialization
const AsyncLive = Layer.effect(
  AsyncService,
  Effect.gen(function* () {
    const dep = yield* SomeDependency
    yield* Effect.log("Initializing service...")
    return { /* service implementation */ }
  })
)

// Layer.scoped: For services with lifecycle (acquire/release)
const ScopedLive = Layer.scoped(
  ConnectionService,
  Effect.acquireRelease(
    // Acquire
    Effect.gen(function* () {
      const conn = yield* createConnection()
      yield* Effect.log("Connection opened")
      return { connection: conn }
    }),
    // Release
    (service) => Effect.gen(function* () {
      yield* closeConnection(service.connection)
      yield* Effect.log("Connection closed")
    })
  )
)
```

## Compile-Time Dependency Validation

Unlike TSyringe, NestJS, or other runtime DI containers, Effect validates all dependencies at compile time.

### The Problem with Runtime DI

```typescript
// TSyringe example - errors at runtime
@injectable()
class UserService {
  constructor(@inject("UserRepository") private repo: UserRepository) {}
}
// If UserRepository isn't registered, you get a runtime error

// NestJS example - errors at runtime
@Injectable()
class UserService {
  constructor(private userRepo: UserRepository) {}
}
// Missing provider causes runtime exception
```

### Effect's Compile-Time Safety

```typescript
import { Effect, Layer } from "effect"

const program = Effect.gen(function* () {
  const db = yield* DatabaseService
  const logger = yield* LoggerService
  return yield* db.query("SELECT 1")
})

// Type: Effect<unknown[], Error, DatabaseService | LoggerService>

// This WILL NOT COMPILE - missing LoggerService
const incomplete = Effect.runPromise(
  Effect.provide(program, DatabaseLive)
)
// TypeScript Error: Property 'LoggerService' is missing

// This compiles - all dependencies satisfied
const complete = Effect.runPromise(
  Effect.provide(program, Layer.merge(DatabaseLive, LoggerLive))
)
```

### Visualizing Dependency Requirements

```typescript
// The compiler tracks requirements through transformations
const step1 = DatabaseService  // R = DatabaseService
const step2 = Effect.flatMap(step1, (db) =>
  LoggerService  // R = DatabaseService | LoggerService
)
const step3 = Effect.flatMap(step2, (logger) =>
  CacheService  // R = DatabaseService | LoggerService | CacheService
)

// Each service access adds to the R parameter
// Effect.provide removes from R as dependencies are satisfied
```

## Complete Application Example

```typescript
import { Effect, Context, Layer, Console } from "effect"

// ============ Service Definitions ============

interface User {
  id: string
  name: string
  email: string
}

class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly findById: (id: string) => Effect.Effect<User | null, Error>
    readonly save: (user: User) => Effect.Effect<void, Error>
  }
>() {}

class EmailService extends Context.Tag("EmailService")<
  EmailService,
  {
    readonly sendWelcome: (user: User) => Effect.Effect<void, Error>
  }
>() {}

class UserService extends Context.Tag("UserService")<
  UserService,
  {
    readonly register: (name: string, email: string) => Effect.Effect<User, Error>
  }
>() {}

// ============ Layer Implementations ============

// In-memory repository for demonstration
const UserRepositoryLive = Layer.succeed(UserRepository, {
  findById: (id) => Effect.succeed({ id, name: "Test", email: "test@example.com" }),
  save: (user) => Effect.log(`Saved user: ${user.id}`)
})

const EmailServiceLive = Layer.succeed(EmailService, {
  sendWelcome: (user) => Effect.log(`Sent welcome email to ${user.email}`)
})

// UserService depends on UserRepository and EmailService
const UserServiceLive = Layer.effect(
  UserService,
  Effect.gen(function* () {
    const repo = yield* UserRepository
    const email = yield* EmailService

    return {
      register: (name, emailAddr) => Effect.gen(function* () {
        const user: User = {
          id: crypto.randomUUID(),
          name,
          email: emailAddr
        }
        yield* repo.save(user)
        yield* email.sendWelcome(user)
        return user
      })
    }
  })
)

// ============ Compose the Full Application Layer ============

const AppLive = Layer.provide(
  UserServiceLive,
  Layer.merge(UserRepositoryLive, EmailServiceLive)
)

// ============ Program Definition ============

const program = Effect.gen(function* () {
  const userService = yield* UserService
  const newUser = yield* userService.register("Alice", "alice@example.com")
  yield* Console.log(`Registered: ${JSON.stringify(newUser)}`)
})

// ============ Run the Program ============

// Type-safe: compiler ensures AppLive satisfies all requirements
Effect.runPromise(Effect.provide(program, AppLive))
```

## Best Practices

### 1. Explicit Dependencies

Always declare dependencies explicitly through the R parameter rather than using global state or ambient imports:

```typescript
// Good: Dependencies are explicit
const processOrder = Effect.gen(function* () {
  const db = yield* DatabaseService
  const email = yield* EmailService
  // ...
})

// Bad: Hidden dependencies
const processOrder = Effect.sync(() => {
  globalDb.query(...)  // Hidden dependency!
})
```

### 2. Compile-Time Safety

Leverage Effect's type system to catch missing dependencies at compile time:

```typescript
// Define strict service boundaries
class OrderService extends Context.Tag("OrderService")<
  OrderService,
  {
    // Return types include possible errors
    readonly create: (items: Item[]) => Effect.Effect<Order, OrderError | InventoryError>
    readonly cancel: (id: string) => Effect.Effect<void, OrderNotFoundError>
  }
>() {}
```

### 3. Separation of Concerns

Keep layers focused on single responsibilities:

```typescript
// Infrastructure layers
const DatabaseLayer = Layer.effect(DatabaseService, /* ... */)
const CacheLayer = Layer.effect(CacheService, /* ... */)
const MessagingLayer = Layer.effect(MessagingService, /* ... */)

// Domain service layers
const UserLayer = Layer.effect(UserService, /* ... */)
const OrderLayer = Layer.effect(OrderService, /* ... */)

// Compose based on environment
const ProductionLayer = Layer.provide(
  Layer.merge(UserLayer, OrderLayer),
  Layer.merge(DatabaseLayer, CacheLayer, MessagingLayer)
)

const TestLayer = Layer.provide(
  Layer.merge(UserLayer, OrderLayer),
  Layer.merge(MockDatabaseLayer, MockCacheLayer, MockMessagingLayer)
)
```

### 4. Use Layer.scoped for Resources

Always use scoped layers for resources that need cleanup:

```typescript
const HttpServerLive = Layer.scoped(
  HttpServer,
  Effect.acquireRelease(
    Effect.gen(function* () {
      const server = yield* startServer(8080)
      yield* Effect.log("Server started on port 8080")
      return server
    }),
    (server) => Effect.gen(function* () {
      yield* stopServer(server)
      yield* Effect.log("Server stopped")
    })
  )
)
```

### 5. Organize Layers Hierarchically

Structure layers to mirror your application architecture:

```typescript
// layers/infrastructure.ts
export const InfrastructureLayer = Layer.mergeAll(
  DatabaseLayer,
  CacheLayer,
  LoggerLayer
)

// layers/domain.ts
export const DomainLayer = Layer.mergeAll(
  UserServiceLayer,
  OrderServiceLayer,
  ProductServiceLayer
)

// layers/application.ts
export const ApplicationLayer = Layer.provide(
  DomainLayer,
  InfrastructureLayer
)

// main.ts
const program = Effect.gen(function* () {
  // Application logic
})

Effect.runPromise(
  program.pipe(Effect.provide(ApplicationLayer))
)
```

## Summary

Effect's DI system provides:

1. **Type-safe dependency injection** via `Context.Tag`
2. **Compile-time validation** of all dependencies through the R parameter
3. **Composable service construction** via the Layer system
4. **Resource lifecycle management** with scoped layers
5. **Clear dependency graphs** that are explicit in the type signature

This approach eliminates entire categories of runtime errors common in traditional DI containers while providing excellent developer experience through IDE support and type inference.
