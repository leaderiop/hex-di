# Project Structure

This guide covers recommended patterns for organizing HexDI code in your projects.

## Basic Structure

For small to medium applications:

```
src/
├── di/
│   ├── ports.ts       # All port definitions
│   ├── adapters.ts    # All adapter implementations
│   ├── graph.ts       # Graph composition
│   └── hooks.ts       # React typed hooks (if using React)
├── services/          # Service implementations (plain classes/functions)
├── components/        # React components (if using React)
└── main.ts            # Application entry point
```

### ports.ts

Define all ports in one file for easy discovery:

```typescript
// src/di/ports.ts
import { createPort } from '@hex-di/ports';
import type { Logger, Database, UserService, Config } from '../types';

// Infrastructure ports
export const LoggerPort = createPort<'Logger', Logger>('Logger');
export const ConfigPort = createPort<'Config', Config>('Config');

// Data layer ports
export const DatabasePort = createPort<'Database', Database>('Database');

// Application services
export const UserServicePort = createPort<'UserService', UserService>('UserService');

// Type for all ports
export type AppPorts =
  | typeof LoggerPort
  | typeof ConfigPort
  | typeof DatabasePort
  | typeof UserServicePort;
```

### adapters.ts

Define all adapters with their dependencies:

```typescript
// src/di/adapters.ts
import { createAdapter } from '@hex-di/graph';
import { LoggerPort, ConfigPort, DatabasePort, UserServicePort } from './ports';

export const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({
    log: (msg) => console.log(`[App] ${msg}`),
    warn: (msg) => console.warn(`[App] ${msg}`),
    error: (msg) => console.error(`[App] ${msg}`)
  })
});

export const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({
    apiUrl: process.env.API_URL || 'http://localhost:3000',
    debug: process.env.NODE_ENV !== 'production'
  })
});

export const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort, ConfigPort],
  lifetime: 'singleton',
  factory: (deps) => new DatabasePool(deps.Config.dbUrl),
  finalizer: async (db) => await db.close()
});

export const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: 'singleton',
  factory: (deps) => new UserServiceImpl(deps.Logger, deps.Database)
});
```

### graph.ts

Compose all adapters into a validated graph:

```typescript
// src/di/graph.ts
import { GraphBuilder } from '@hex-di/graph';
import {
  LoggerAdapter,
  ConfigAdapter,
  DatabaseAdapter,
  UserServiceAdapter
} from './adapters';

export const appGraph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(ConfigAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter)
  .build();

// Export type for the graph's ports
export type AppPorts = typeof appGraph extends { __provides: infer P } ? P : never;
```

## Domain-Driven Structure

For larger applications, organize by domain:

```
src/
├── di/
│   ├── index.ts           # Main exports
│   ├── graph.ts           # Graph composition
│   └── hooks.ts           # React hooks
│
├── domains/
│   ├── auth/
│   │   ├── ports.ts       # AuthService, SessionManager ports
│   │   ├── adapters.ts    # Auth adapters
│   │   └── types.ts       # Auth interfaces
│   │
│   ├── users/
│   │   ├── ports.ts       # UserService, UserRepository ports
│   │   ├── adapters.ts    # User adapters
│   │   └── types.ts       # User interfaces
│   │
│   └── orders/
│       ├── ports.ts       # OrderService, OrderRepository ports
│       ├── adapters.ts    # Order adapters
│       └── types.ts       # Order interfaces
│
├── infrastructure/
│   ├── ports.ts           # Logger, Database, Cache ports
│   ├── adapters.ts        # Infrastructure adapters
│   └── types.ts           # Infrastructure interfaces
│
└── main.ts
```

### Domain Module Example

```typescript
// src/domains/users/ports.ts
import { createPort } from '@hex-di/ports';
import type { UserService, UserRepository } from './types';

export const UserServicePort = createPort<'UserService', UserService>('UserService');
export const UserRepositoryPort = createPort<'UserRepository', UserRepository>('UserRepository');

// src/domains/users/adapters.ts
import { createAdapter } from '@hex-di/graph';
import { UserServicePort, UserRepositoryPort } from './ports';
import { LoggerPort, DatabasePort } from '../../infrastructure/ports';

export const UserRepositoryAdapter = createAdapter({
  provides: UserRepositoryPort,
  requires: [DatabasePort],
  lifetime: 'singleton',
  factory: (deps) => new UserRepositoryImpl(deps.Database)
});

export const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, UserRepositoryPort],
  lifetime: 'singleton',
  factory: (deps) => new UserServiceImpl(deps.Logger, deps.UserRepository)
});
```

### Aggregating Ports and Adapters

```typescript
// src/di/index.ts
// Re-export all ports
export * from '../infrastructure/ports';
export * from '../domains/auth/ports';
export * from '../domains/users/ports';
export * from '../domains/orders/ports';

// Aggregate all port types
import * as infra from '../infrastructure/ports';
import * as auth from '../domains/auth/ports';
import * as users from '../domains/users/ports';
import * as orders from '../domains/orders/ports';

export type AppPorts =
  | typeof infra.LoggerPort
  | typeof infra.DatabasePort
  | typeof auth.AuthServicePort
  | typeof users.UserServicePort
  | typeof orders.OrderServicePort;
```

```typescript
// src/di/graph.ts
import { GraphBuilder } from '@hex-di/graph';

// Infrastructure
import { LoggerAdapter, DatabaseAdapter } from '../infrastructure/adapters';

// Domains
import { AuthAdapter, SessionAdapter } from '../domains/auth/adapters';
import { UserServiceAdapter, UserRepositoryAdapter } from '../domains/users/adapters';
import { OrderServiceAdapter, OrderRepositoryAdapter } from '../domains/orders/adapters';

export const appGraph = GraphBuilder.create()
  // Infrastructure first
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter)
  // Auth domain
  .provide(SessionAdapter)
  .provide(AuthAdapter)
  // Users domain
  .provide(UserRepositoryAdapter)
  .provide(UserServiceAdapter)
  // Orders domain
  .provide(OrderRepositoryAdapter)
  .provide(OrderServiceAdapter)
  .build();
```

## Feature-Based Structure

Organize by feature for large applications:

```
src/
├── features/
│   ├── authentication/
│   │   ├── di/
│   │   │   ├── ports.ts
│   │   │   └── adapters.ts
│   │   ├── components/
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   ├── dashboard/
│   │   ├── di/
│   │   ├── components/
│   │   └── index.ts
│   │
│   └── settings/
│       ├── di/
│       ├── components/
│       └── index.ts
│
├── shared/
│   ├── di/
│   │   ├── ports.ts         # Shared ports
│   │   └── adapters.ts      # Shared adapters
│   └── components/
│
├── app/
│   ├── di/
│   │   ├── graph.ts         # Compose all features
│   │   └── hooks.ts
│   └── App.tsx
│
└── main.ts
```

### Feature Module Pattern

Each feature exports its DI components:

```typescript
// src/features/authentication/di/index.ts
export * from './ports';
export * from './adapters';

// src/features/authentication/index.ts
export * from './di';
export { LoginForm } from './components/LoginForm';
export { useAuth } from './hooks/useAuth';
```

### Composing Features

```typescript
// src/app/di/graph.ts
import { GraphBuilder } from '@hex-di/graph';

// Shared infrastructure
import { LoggerAdapter, ConfigAdapter } from '../../shared/di/adapters';

// Features
import * as auth from '../../features/authentication/di';
import * as dashboard from '../../features/dashboard/di';
import * as settings from '../../features/settings/di';

export const appGraph = GraphBuilder.create()
  // Shared
  .provide(LoggerAdapter)
  .provide(ConfigAdapter)
  // Authentication feature
  .provide(auth.AuthServiceAdapter)
  .provide(auth.SessionAdapter)
  // Dashboard feature
  .provide(dashboard.DashboardServiceAdapter)
  // Settings feature
  .provide(settings.SettingsServiceAdapter)
  .build();
```

## Monorepo Structure

For monorepos with shared packages:

```
packages/
├── core/                    # Shared DI infrastructure
│   ├── src/
│   │   ├── ports/           # Core port definitions
│   │   ├── adapters/        # Base adapter implementations
│   │   └── index.ts
│   └── package.json
│
├── web-app/                 # Web application
│   ├── src/
│   │   ├── di/
│   │   │   ├── ports.ts     # App-specific ports
│   │   │   ├── adapters.ts  # App-specific adapters
│   │   │   └── graph.ts     # Combines core + app
│   │   └── ...
│   └── package.json
│
└── api-server/              # API server
    ├── src/
    │   ├── di/
    │   │   ├── ports.ts
    │   │   ├── adapters.ts
    │   │   └── graph.ts
    │   └── ...
    └── package.json
```

### Shared Core Package

```typescript
// packages/core/src/ports/index.ts
export const LoggerPort = createPort<'Logger', Logger>('Logger');
export const ConfigPort = createPort<'Config', Config>('Config');

// packages/core/src/adapters/index.ts
export const ConsoleLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => new ConsoleLogger()
});
```

### Consuming in Apps

```typescript
// packages/web-app/src/di/graph.ts
import { GraphBuilder } from '@hex-di/graph';
import { LoggerPort, ConsoleLoggerAdapter } from '@myorg/core';
import { WebConfigAdapter, AuthAdapter } from './adapters';

export const appGraph = GraphBuilder.create()
  // From core
  .provide(ConsoleLoggerAdapter)
  // App-specific
  .provide(WebConfigAdapter)
  .provide(AuthAdapter)
  .build();
```

## Naming Conventions

### Ports

Use `Port` suffix:
- `LoggerPort`
- `UserServicePort`
- `DatabasePort`

### Adapters

Use `Adapter` suffix with implementation hint:
- `ConsoleLoggerAdapter`
- `PostgresUserRepositoryAdapter`
- `InMemoryDatabaseAdapter`
- `MockLoggerAdapter`

### Files

- `ports.ts` - Port definitions
- `adapters.ts` - Adapter implementations
- `graph.ts` - Graph composition
- `hooks.ts` - React hooks
- `types.ts` - TypeScript interfaces

## Best Practices

### 1. Keep Ports Simple

```typescript
// Good - ports just define contracts
export const LoggerPort = createPort<'Logger', Logger>('Logger');

// Avoid - don't put implementation details in port files
```

### 2. Separate Interfaces from Adapters

```typescript
// types.ts - Pure interfaces
export interface UserService {
  getUser(id: string): Promise<User>;
}

// adapters.ts - Implementation
export const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  // ...
});
```

### 3. One Port per Interface

```typescript
// Good - clear mapping
const UserServicePort = createPort<'UserService', UserService>('UserService');
const AuthServicePort = createPort<'AuthService', AuthService>('AuthService');

// Avoid - multiple services in one port
```

### 4. Export AppPorts Type

Always export a union type of all ports:

```typescript
export type AppPorts =
  | typeof LoggerPort
  | typeof DatabasePort
  | typeof UserServicePort;
```

### 5. Validate Graph at Module Level

```typescript
// graph.ts - Errors caught at compile time
export const appGraph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(UserServiceAdapter)
  .build(); // Compile error if invalid
```

## Next Steps

- Learn [Composing Graphs](./composing-graphs.md) patterns
- Explore [Scoped Services](./scoped-services.md) for request contexts
- See [Testing Strategies](../guides/testing-strategies.md) for testing
