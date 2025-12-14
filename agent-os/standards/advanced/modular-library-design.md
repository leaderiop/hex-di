# Modular Library Design Standards

This guide establishes standards for designing modular libraries with clear package boundaries, feature-first organization, and clean API surfaces.

## Table of Contents

1. [Feature-First Organization](#feature-first-organization)
2. [Domain-Driven Package Boundaries](#domain-driven-package-boundaries)
3. [API Surface Design](#api-surface-design)
4. [Isolated Declarations for Explicit Public APIs](#isolated-declarations-for-explicit-public-apis)
5. [Asymmetric Import Rules](#asymmetric-import-rules)
6. [Semantic Versioning and Backward Compatibility](#semantic-versioning-and-backward-compatibility)
7. [Contract Boundaries and Interface Versions](#contract-boundaries-and-interface-versions)
8. [Monorepo Tooling for Boundary Enforcement](#monorepo-tooling-for-boundary-enforcement)
9. [Best Practices](#best-practices)
10. [Concrete Examples](#concrete-examples)

---

## Feature-First Organization

Organize code by business features and capabilities, not by technical layers.

### Anti-Pattern: Layer-First Organization

```
packages/
  controllers/
    user-controller.ts
    order-controller.ts
    payment-controller.ts
  services/
    user-service.ts
    order-service.ts
    payment-service.ts
  repositories/
    user-repository.ts
    order-repository.ts
    payment-repository.ts
```

### Recommended: Feature-First Organization

```
packages/
  user-management/
    src/
      api/
        user.controller.ts
        user.routes.ts
      domain/
        user.entity.ts
        user.service.ts
      infrastructure/
        user.repository.ts
      index.ts           # Public API exports
    package.json

  order-processing/
    src/
      api/
        order.controller.ts
      domain/
        order.entity.ts
        order.service.ts
      infrastructure/
        order.repository.ts
      index.ts
    package.json

  payment-gateway/
    src/
      api/
        payment.controller.ts
      domain/
        payment.entity.ts
        payment.service.ts
      infrastructure/
        payment.adapter.ts
      index.ts
    package.json
```

### Benefits of Feature-First

- **Cohesion**: Related code stays together
- **Isolation**: Features can be developed, tested, and deployed independently
- **Discoverability**: New developers find relevant code faster
- **Scalability**: Teams can own entire features without cross-cutting concerns

---

## Domain-Driven Package Boundaries

Define package boundaries based on domain concepts and bounded contexts.

### Identifying Bounded Contexts

1. **Ubiquitous Language**: Each package should have its own vocabulary
2. **Business Capabilities**: Align packages with what the business does
3. **Data Ownership**: Each package owns its data and exposes it through contracts
4. **Team Alignment**: Package boundaries should facilitate team autonomy

### Package Boundary Rules

```
packages/
  @mylib/identity/          # Bounded Context: Identity & Access
    - User authentication
    - Authorization policies
    - Identity verification

  @mylib/catalog/           # Bounded Context: Product Catalog
    - Product definitions
    - Categories and tags
    - Search and discovery

  @mylib/ordering/          # Bounded Context: Order Management
    - Order lifecycle
    - Cart management
    - Order fulfillment

  @mylib/billing/           # Bounded Context: Billing & Payments
    - Payment processing
    - Invoicing
    - Subscription management

  @mylib/shared/            # Cross-cutting concerns ONLY
    - Common types
    - Utility functions
    - Base abstractions
```

### Context Mapping

Document how bounded contexts interact:

```typescript
// packages/ordering/src/contracts/identity-contract.ts

/**
 * Contract for identity information needed by the ordering context.
 * This is a read-only view - ordering never modifies identity data.
 */
export interface OrderingIdentityContract {
  getUserById(id: string): Promise<OrderingUserView>;
  validateUserCanOrder(userId: string): Promise<boolean>;
}

export interface OrderingUserView {
  id: string;
  displayName: string;
  shippingAddresses: Address[];
  // Note: No password, no auth tokens - only what ordering needs
}
```

---

## API Surface Design

Design public APIs to be minimal, stable, and explicit.

### Principles

1. **Minimal Surface Area**: Export only what consumers need
2. **Stable Contracts**: Public APIs change slowly and intentionally
3. **Explicit Boundaries**: Clear distinction between public and internal
4. **Documentation**: Every public export has documentation

### Index File as API Gateway

```typescript
// packages/user-management/src/index.ts

// Types - Explicit public types
export type { User, UserProfile, CreateUserInput } from './domain/user.types';
export type { UserService } from './domain/user.service';

// Factory functions - Controlled instantiation
export { createUserService } from './domain/user.service';
export { createUserRepository } from './infrastructure/user.repository';

// Constants - Public configuration
export { USER_ROLES, DEFAULT_USER_SETTINGS } from './domain/user.constants';

// DO NOT export:
// - Internal helpers
// - Implementation details
// - Database schemas
// - Private types
```

### Explicit Entry Points in package.json

```json
{
  "name": "@mylib/user-management",
  "version": "2.1.0",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./testing": {
      "types": "./dist/testing/index.d.ts",
      "import": "./dist/testing/index.js"
    }
  },
  "files": ["dist"],
  "sideEffects": false
}
```

---

## Isolated Declarations for Explicit Public APIs

TypeScript 5.5+ introduces `isolatedDeclarations` for generating `.d.ts` files without type inference across module boundaries.

### Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "isolatedDeclarations": true,
    "declaration": true,
    "declarationMap": true,
    "strict": true
  }
}
```

### Requirements for Isolated Declarations

All exported functions, classes, and variables must have explicit return types and type annotations:

```typescript
// BEFORE: Implicit types (won't work with isolatedDeclarations)
export function createUser(input) {
  return {
    id: generateId(),
    ...input,
    createdAt: new Date()
  };
}

// AFTER: Explicit types (required for isolatedDeclarations)
export interface CreateUserInput {
  email: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export function createUser(input: CreateUserInput): User {
  return {
    id: generateId(),
    ...input,
    createdAt: new Date()
  };
}
```

### Benefits

1. **Parallel Declaration Generation**: Each file generates its own `.d.ts` independently
2. **Faster Builds**: No cross-file type inference needed
3. **Explicit Contracts**: Forces clear public API definitions
4. **Better Error Messages**: Type errors caught at declaration site

---

## Asymmetric Import Rules

Features consume shared utilities, but never import from each other directly.

### Import Hierarchy

```
                    ┌─────────────┐
                    │   Shared    │
                    │  Utilities  │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  Feature A  │ │  Feature B  │ │  Feature C  │
    └─────────────┘ └─────────────┘ └─────────────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Contracts │
                    │   (Events,  │
                    │   DTOs)     │
                    └─────────────┘
```

### Allowed Imports

```typescript
// packages/ordering/src/domain/order.service.ts

// ALLOWED: Import from shared utilities
import { Result, Logger } from '@mylib/shared';

// ALLOWED: Import shared contracts/DTOs
import { UserCreatedEvent } from '@mylib/contracts';

// FORBIDDEN: Direct import from another feature
// import { UserService } from '@mylib/identity'; // NO!

// CORRECT: Depend on contract, inject implementation
import type { IdentityContract } from '@mylib/contracts';

export class OrderService {
  constructor(
    private identity: IdentityContract, // Injected, not imported
    private logger: Logger
  ) {}
}
```

### Enforcing Import Rules

```typescript
// .eslintrc.js
module.exports = {
  rules: {
    'import/no-restricted-paths': ['error', {
      zones: [
        // Features cannot import from each other
        {
          target: './packages/ordering/src/**/*',
          from: './packages/identity/src/**/*',
          message: 'Use contracts for cross-feature communication'
        },
        {
          target: './packages/identity/src/**/*',
          from: './packages/ordering/src/**/*',
          message: 'Use contracts for cross-feature communication'
        },
        // Shared cannot import from features
        {
          target: './packages/shared/src/**/*',
          from: './packages/!(shared)/src/**/*',
          message: 'Shared utilities must not depend on features'
        }
      ]
    }]
  }
};
```

---

## Semantic Versioning and Backward Compatibility

Follow semantic versioning strictly for library packages.

### Version Number Meaning

```
MAJOR.MINOR.PATCH
  │     │     └── Bug fixes, no API changes
  │     └──────── New features, backward compatible
  └────────────── Breaking changes
```

### Breaking Change Checklist

Before incrementing MAJOR version, document:

1. What changed in the public API
2. Migration path for consumers
3. Deprecation timeline if applicable

```typescript
// packages/user-management/CHANGELOG.md

## [3.0.0] - 2024-01-15

### BREAKING CHANGES

- `UserService.create()` now returns `Result<User>` instead of `User | null`
  - Migration: Wrap existing calls with `.unwrap()` or handle Result properly

- Removed deprecated `UserService.findByEmail()`
  - Migration: Use `UserService.findOne({ email })` instead

- `User.status` is now a union type instead of string
  - Migration: Update type assertions to use `UserStatus` enum

### Migration Guide

See [MIGRATION-v3.md](./MIGRATION-v3.md) for detailed upgrade instructions.
```

### Deprecation Strategy

```typescript
// packages/user-management/src/domain/user.service.ts

export class UserService {
  /**
   * @deprecated Use `findOne({ email })` instead. Will be removed in v3.0.0.
   */
  findByEmail(email: string): Promise<User | null> {
    console.warn(
      'UserService.findByEmail is deprecated. Use findOne({ email }) instead.'
    );
    return this.findOne({ email });
  }

  findOne(criteria: UserSearchCriteria): Promise<User | null> {
    // New implementation
  }
}
```

---

## Contract Boundaries and Interface Versions

Define versioned interfaces for cross-package communication.

### Interface Versioning

```typescript
// packages/contracts/src/identity/v1.ts
export interface IdentityContractV1 {
  authenticate(credentials: Credentials): Promise<AuthResult>;
  getUser(id: string): Promise<User>;
}

// packages/contracts/src/identity/v2.ts
export interface IdentityContractV2 extends IdentityContractV1 {
  authenticateWithMFA(credentials: Credentials, mfaToken: string): Promise<AuthResult>;
  getUserWithPermissions(id: string): Promise<UserWithPermissions>;
}

// packages/contracts/src/identity/index.ts
export type { IdentityContractV1, IdentityContractV2 };
export type IdentityContract = IdentityContractV2; // Current version
```

### Contract Testing

```typescript
// packages/identity/src/__tests__/contract.test.ts
import { IdentityContract } from '@mylib/contracts';
import { IdentityServiceImpl } from '../identity.service';

describe('IdentityService implements IdentityContract', () => {
  let service: IdentityContract;

  beforeEach(() => {
    service = new IdentityServiceImpl(/* deps */);
  });

  // Contract tests verify the interface is correctly implemented
  it('authenticates valid credentials', async () => {
    const result = await service.authenticate({
      email: 'test@example.com',
      password: 'valid-password'
    });
    expect(result.success).toBe(true);
  });

  // These tests should be run by ALL implementations of the contract
});
```

---

## Monorepo Tooling for Boundary Enforcement

Use modern monorepo tools to enforce package boundaries.

### Turborepo Configuration

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    }
  }
}
```

### Nx Configuration

```json
// nx.json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"]
    }
  },
  "namedInputs": {
    "production": [
      "default",
      "!{projectRoot}/**/*.spec.ts",
      "!{projectRoot}/test/**/*"
    ]
  }
}
```

### Nx Boundary Rules

```json
// .eslintrc.json
{
  "rules": {
    "@nx/enforce-module-boundaries": [
      "error",
      {
        "depConstraints": [
          {
            "sourceTag": "scope:feature",
            "onlyDependOnLibsWithTags": ["scope:shared", "scope:contracts"]
          },
          {
            "sourceTag": "scope:shared",
            "onlyDependOnLibsWithTags": ["scope:shared"]
          },
          {
            "sourceTag": "scope:contracts",
            "onlyDependOnLibsWithTags": []
          }
        ]
      }
    ]
  }
}
```

### Project Tags

```json
// packages/ordering/project.json
{
  "name": "ordering",
  "tags": ["scope:feature", "domain:commerce"]
}

// packages/shared/project.json
{
  "name": "shared",
  "tags": ["scope:shared"]
}
```

---

## Best Practices

### Thin Shared Utilities

Keep shared packages minimal and stable:

```typescript
// packages/shared/src/index.ts

// GOOD: Small, focused utilities
export { Result, Ok, Err } from './result';
export { Option, Some, None } from './option';
export { Logger, createLogger } from './logger';
export { deepClone, deepMerge } from './object-utils';
export { formatDate, parseDate } from './date-utils';

// BAD: Domain-specific code in shared
// export { validateEmail } from './validators'; // Move to identity package
// export { formatCurrency } from './formatters'; // Move to billing package
```

### ES Modules for Tree-Shaking

Structure packages for optimal tree-shaking:

```typescript
// packages/shared/src/index.ts

// Named exports enable tree-shaking
export { Result } from './result';
export { Logger } from './logger';

// Avoid barrel file anti-patterns
// export * from './everything'; // BAD: Defeats tree-shaking
```

```json
// packages/shared/package.json
{
  "name": "@mylib/shared",
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./result": {
      "types": "./dist/result/index.d.ts",
      "import": "./dist/result/index.js"
    },
    "./logger": {
      "types": "./dist/logger/index.d.ts",
      "import": "./dist/logger/index.js"
    }
  }
}
```

### Dependency Injection Over Hard Dependencies

```typescript
// packages/ordering/src/order.module.ts

import type { IdentityContract, PaymentContract } from '@mylib/contracts';
import { OrderService } from './domain/order.service';
import { OrderRepository } from './infrastructure/order.repository';

export interface OrderModuleDeps {
  identity: IdentityContract;
  payment: PaymentContract;
  database: DatabaseConnection;
}

export function createOrderModule(deps: OrderModuleDeps) {
  const repository = new OrderRepository(deps.database);
  const service = new OrderService(repository, deps.identity, deps.payment);

  return {
    service,
    // Only expose what consumers need
  };
}
```

---

## Concrete Examples

### Complete Package Structure

```
packages/
  @mylib/contracts/
    src/
      identity/
        v1.ts
        v2.ts
        index.ts
      ordering/
        v1.ts
        index.ts
      events/
        user-events.ts
        order-events.ts
        index.ts
      index.ts
    package.json
    tsconfig.json

  @mylib/shared/
    src/
      result/
        result.ts
        index.ts
      logger/
        logger.ts
        index.ts
      index.ts
    package.json
    tsconfig.json

  @mylib/identity/
    src/
      api/
        auth.controller.ts
        auth.routes.ts
      domain/
        user.entity.ts
        user.service.ts
        auth.service.ts
      infrastructure/
        user.repository.ts
        password.hasher.ts
      testing/
        mocks.ts
        fixtures.ts
        index.ts
      index.ts
    package.json
    tsconfig.json
    CHANGELOG.md

  @mylib/ordering/
    src/
      api/
        order.controller.ts
        order.routes.ts
      domain/
        order.entity.ts
        order.service.ts
        cart.service.ts
      infrastructure/
        order.repository.ts
      index.ts
    package.json
    tsconfig.json
    CHANGELOG.md
```

### API Design Example

```typescript
// packages/identity/src/index.ts

// === PUBLIC TYPES ===
export type {
  User,
  UserProfile,
  CreateUserInput,
  UpdateUserInput,
  UserSearchCriteria
} from './domain/user.types';

export type {
  AuthResult,
  Credentials,
  AuthToken,
  RefreshToken
} from './domain/auth.types';

// === PUBLIC INTERFACES ===
export type { UserService } from './domain/user.service';
export type { AuthService } from './domain/auth.service';

// === FACTORY FUNCTIONS ===
export { createIdentityModule } from './identity.module';

// === CONSTANTS ===
export { USER_ROLES, AUTH_STRATEGIES } from './domain/constants';

// === TESTING UTILITIES (separate entry point) ===
// Exposed via package.json "exports": { "./testing": ... }
```

```typescript
// packages/identity/src/identity.module.ts

import type { IdentityContract } from '@mylib/contracts';
import { UserServiceImpl } from './domain/user.service';
import { AuthServiceImpl } from './domain/auth.service';
import { UserRepositoryImpl } from './infrastructure/user.repository';
import { PasswordHasher } from './infrastructure/password.hasher';

export interface IdentityModuleConfig {
  database: DatabaseConnection;
  jwtSecret: string;
  tokenExpiry: number;
}

export interface IdentityModule {
  userService: UserService;
  authService: AuthService;

  // Implements the contract for other packages
  asContract(): IdentityContract;
}

export function createIdentityModule(config: IdentityModuleConfig): IdentityModule {
  const userRepository = new UserRepositoryImpl(config.database);
  const passwordHasher = new PasswordHasher();

  const userService = new UserServiceImpl(userRepository, passwordHasher);
  const authService = new AuthServiceImpl(
    userRepository,
    passwordHasher,
    config.jwtSecret,
    config.tokenExpiry
  );

  return {
    userService,
    authService,
    asContract(): IdentityContract {
      return {
        authenticate: (creds) => authService.authenticate(creds),
        getUser: (id) => userService.findById(id),
        authenticateWithMFA: (creds, token) => authService.authenticateWithMFA(creds, token),
        getUserWithPermissions: (id) => userService.findByIdWithPermissions(id)
      };
    }
  };
}
```

### Event-Driven Cross-Package Communication

```typescript
// packages/contracts/src/events/user-events.ts

export interface UserCreatedEvent {
  type: 'user.created';
  version: 1;
  payload: {
    userId: string;
    email: string;
    createdAt: Date;
  };
}

export interface UserDeletedEvent {
  type: 'user.deleted';
  version: 1;
  payload: {
    userId: string;
    deletedAt: Date;
  };
}

export type UserEvent = UserCreatedEvent | UserDeletedEvent;
```

```typescript
// packages/ordering/src/domain/order.service.ts

import type { UserCreatedEvent } from '@mylib/contracts';
import type { EventBus } from '@mylib/shared';

export class OrderService {
  constructor(
    private repository: OrderRepository,
    private eventBus: EventBus
  ) {
    // React to events from other domains
    this.eventBus.subscribe<UserCreatedEvent>('user.created', (event) => {
      this.initializeUserOrderHistory(event.payload.userId);
    });
  }

  private async initializeUserOrderHistory(userId: string): Promise<void> {
    // Create initial order-related data for new user
  }
}
```

---

## Summary

Effective modular library design requires:

1. **Feature-first organization** aligned with business capabilities
2. **Clear domain boundaries** based on bounded contexts
3. **Minimal, explicit API surfaces** with versioned interfaces
4. **Asymmetric imports** flowing from features to shared, not between features
5. **Strict semantic versioning** with documented migration paths
6. **Tooling enforcement** via Turborepo, Nx, or similar monorepo tools
7. **Dependency injection** over hard-coded dependencies
8. **Event-driven communication** for loose coupling between features

Following these standards ensures libraries remain maintainable, testable, and evolvable as requirements change.
