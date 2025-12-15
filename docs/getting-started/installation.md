---
title: Installation
description: Install HexDI packages and configure TypeScript for type-safe dependency injection.
sidebar_position: 1
---

# Installation

This guide covers installing HexDI packages and configuring your TypeScript project.

## Package Options

HexDI is split into multiple packages so you only install what you need:

| Package | Purpose | Required |
|---------|---------|----------|
| `@hex-di/ports` | Port token system | Yes |
| `@hex-di/graph` | GraphBuilder and adapters | Yes |
| `@hex-di/runtime` | Container and scopes | Yes |
| `@hex-di/react` | React hooks and providers | No |
| `@hex-di/devtools` | Visualization and tracing | No |
| `@hex-di/testing` | Testing utilities | No |

## Installing Core Packages

The three core packages are required for any HexDI application:

```bash
# Using pnpm (recommended)
pnpm add @hex-di/ports @hex-di/graph @hex-di/runtime

# Using npm
npm install @hex-di/ports @hex-di/graph @hex-di/runtime

# Using yarn
yarn add @hex-di/ports @hex-di/graph @hex-di/runtime
```

## Installing Optional Packages

### React Integration

For React applications:

```bash
pnpm add @hex-di/react
```

### DevTools

For development visualization and debugging:

```bash
pnpm add @hex-di/devtools
```

### Testing Utilities

For testing (install as dev dependency):

```bash
pnpm add -D @hex-di/testing
```

## Full Installation

Install everything at once:

```bash
# Production dependencies
pnpm add @hex-di/ports @hex-di/graph @hex-di/runtime @hex-di/react @hex-di/devtools

# Development dependencies
pnpm add -D @hex-di/testing
```

## TypeScript Configuration

HexDI requires TypeScript 5.0+ with strict mode enabled.

### Minimum Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "module": "ESNext"
  }
}
```

### Recommended Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "module": "ESNext",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### Important Settings

| Setting | Required | Purpose |
|---------|----------|---------|
| `strict` | Yes | Enables strict type checking |
| `moduleResolution: "bundler"` | Recommended | Modern module resolution |
| `target: "ES2022"` | Recommended | Modern JavaScript features |

## Verify Installation

Create a simple test file to verify everything works:

```typescript
// verify-hexdi.ts
import { createPort } from '@hex-di/ports';
import { createAdapter, GraphBuilder } from '@hex-di/graph';
import { createContainer } from '@hex-di/runtime';

interface Logger {
  log(message: string): void;
}

const LoggerPort = createPort<'Logger', Logger>('Logger');

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({
    log: (msg) => console.log(`[Test] ${msg}`)
  })
});

const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .build();

const container = createContainer(graph);
const logger = container.resolve(LoggerPort);

logger.log('HexDI is working!');
```

Run with:

```bash
npx tsx verify-hexdi.ts
```

You should see: `[Test] HexDI is working!`

## Package Import Patterns

### Recommended: Import from Runtime

The `@hex-di/runtime` package re-exports common types from sibling packages:

```typescript
// Import everything from runtime (convenient)
import {
  createPort,           // from @hex-di/ports
  createAdapter,        // from @hex-di/graph
  GraphBuilder,         // from @hex-di/graph
  createContainer,      // from @hex-di/runtime
  type Container,       // from @hex-di/runtime
  type Port,            // from @hex-di/ports
  type Adapter,         // from @hex-di/graph
} from '@hex-di/runtime';
```

### Alternative: Import from Individual Packages

For explicit imports or tree-shaking:

```typescript
import { createPort } from '@hex-di/ports';
import { createAdapter, GraphBuilder } from '@hex-di/graph';
import { createContainer } from '@hex-di/runtime';
```

## Troubleshooting

### "Cannot find module '@hex-di/ports'"

Ensure packages are installed:

```bash
pnpm add @hex-di/ports @hex-di/graph @hex-di/runtime
```

### Type Errors with Strict Mode

HexDI requires `strict: true`. If you see type errors, ensure your `tsconfig.json` has strict mode enabled.

### Module Resolution Errors

Use `moduleResolution: "bundler"` or `moduleResolution: "node16"`:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

## Next Steps

Now that you have HexDI installed, learn the [Core Concepts](./core-concepts.md).
