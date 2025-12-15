# Examples

Real-world examples and code references for HexDI.

## React Showcase

The [React Showcase](../../examples/react-showcase) is a complete example application demonstrating:

- All three lifetime scopes (singleton, scoped, request)
- React integration with typed hooks
- Automatic scope lifecycle management
- DevTools integration
- Reactive updates with subscriptions

### Key Files

| File | Description |
|------|-------------|
| [`src/di/ports.ts`](../../examples/react-showcase/src/di/ports.ts) | Port definitions |
| [`src/di/adapters.ts`](../../examples/react-showcase/src/di/adapters.ts) | Adapter implementations |
| [`src/di/graph.ts`](../../examples/react-showcase/src/di/graph.ts) | Graph composition |
| [`src/di/hooks.ts`](../../examples/react-showcase/src/di/hooks.ts) | React typed hooks |
| [`src/App.tsx`](../../examples/react-showcase/src/App.tsx) | Main application |
| [`tests/`](../../examples/react-showcase/tests) | Testing patterns |

### Running the Showcase

```bash
cd examples/react-showcase
pnpm install
pnpm dev
```

## Code Snippets

### Basic Setup

```typescript
// ports.ts
import { createPort } from '@hex-di/ports';

interface Logger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

interface Config {
  apiUrl: string;
  debug: boolean;
}

export const LoggerPort = createPort<'Logger', Logger>('Logger');
export const ConfigPort = createPort<'Config', Config>('Config');

export type AppPorts = typeof LoggerPort | typeof ConfigPort;
```

```typescript
// adapters.ts
import { createAdapter } from '@hex-di/graph';
import { LoggerPort, ConfigPort } from './ports';

export const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({
    log: (msg) => console.log(`[INFO] ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`)
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
```

```typescript
// graph.ts
import { GraphBuilder } from '@hex-di/graph';
import { LoggerAdapter, ConfigAdapter } from './adapters';

export const appGraph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(ConfigAdapter)
  .build();
```

```typescript
// main.ts
import { createContainer } from '@hex-di/runtime';
import { appGraph } from './graph';
import { LoggerPort, ConfigPort } from './ports';

const container = createContainer(appGraph);

const logger = container.resolve(LoggerPort);
const config = container.resolve(ConfigPort);

logger.log(`API URL: ${config.apiUrl}`);
```

### Scoped User Session

```typescript
// ports.ts
export const UserSessionPort = createPort<'UserSession', UserSession>('UserSession');
export const ChatServicePort = createPort<'ChatService', ChatService>('ChatService');

// adapters.ts
let currentUserId = 'guest';

export function setCurrentUser(userId: string) {
  currentUserId = userId;
}

export const UserSessionAdapter = createAdapter({
  provides: UserSessionPort,
  requires: [],
  lifetime: 'scoped',
  factory: () => ({
    userId: currentUserId,
    startedAt: new Date()
  })
});

export const ChatServiceAdapter = createAdapter({
  provides: ChatServicePort,
  requires: [LoggerPort, UserSessionPort],
  lifetime: 'scoped',
  factory: (deps) => ({
    sendMessage: (content: string) => {
      deps.Logger.log(`${deps.UserSession.userId}: ${content}`);
    }
  })
});

// Usage with React
function ChatRoom() {
  return (
    <AutoScopeProvider key={currentUserId}>
      <ChatInterface />
    </AutoScopeProvider>
  );
}
```

### Mock Adapter Testing

```typescript
// tests/chat-service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createAdapterTest, createMockAdapter, TestGraphBuilder } from '@hex-di/testing';
import { createContainer } from '@hex-di/runtime';

describe('ChatService', () => {
  // Unit test adapter
  it('sends message with user info', () => {
    const mockLogger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const mockSession = { userId: 'test-user', startedAt: new Date() };

    const harness = createAdapterTest(ChatServiceAdapter, {
      Logger: mockLogger,
      UserSession: mockSession
    });

    const chat = harness.invoke();
    chat.sendMessage('Hello!');

    expect(mockLogger.log).toHaveBeenCalledWith('test-user: Hello!');
  });

  // Integration test with overrides
  it('integrates with message store', () => {
    const mockLogger = createMockAdapter(LoggerPort, {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    });

    const testGraph = TestGraphBuilder.from(appGraph)
      .override(mockLogger)
      .build();

    const container = createContainer(testGraph);
    const scope = container.createScope();

    const chat = scope.resolve(ChatServicePort);
    chat.sendMessage('Test message');

    // Assertions...
  });
});
```

### Graph Visualization

```typescript
// scripts/generate-docs.ts
import { toMermaid, toDOT } from '@hex-di/devtools';
import { appGraph } from '../src/di/graph';
import { writeFileSync } from 'fs';

// Generate Mermaid diagram
const mermaid = toMermaid(appGraph, {
  direction: 'TB',
  showLifetime: true
});

writeFileSync('docs/graph.md', `
# Dependency Graph

\`\`\`mermaid
${mermaid}
\`\`\`
`);

// Generate Graphviz DOT
const dot = toDOT(appGraph, {
  title: 'Application Dependencies',
  rankdir: 'LR'
});

writeFileSync('graph.dot', dot);
console.log('Run: dot -Tpng graph.dot -o docs/images/graph.png');
```

### Express.js Integration

```typescript
// server.ts
import express from 'express';
import { createContainer } from '@hex-di/runtime';
import { appGraph } from './di/graph';
import { UserServicePort, RequestContextPort } from './di/ports';

const container = createContainer(appGraph);

const app = express();

// Middleware to create request scope
app.use((req, res, next) => {
  const scope = container.createScope();
  req.scope = scope;

  // Initialize request context
  const context = scope.resolve(RequestContextPort);
  context.requestId = req.headers['x-request-id'] as string || generateId();
  context.userId = req.user?.id;

  res.on('finish', () => scope.dispose());
  next();
});

// Route handler
app.get('/users/:id', async (req, res) => {
  const userService = req.scope.resolve(UserServicePort);
  const user = await userService.getUser(req.params.id);
  res.json(user);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  server.close();
  await container.dispose();
  process.exit(0);
});
```

### Environment-Specific Configuration

```typescript
// adapters/logger.ts
export const ConsoleLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({
    log: (msg) => console.log(msg),
    warn: (msg) => console.warn(msg),
    error: (msg) => console.error(msg)
  })
});

export const CloudLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [ConfigPort],
  lifetime: 'singleton',
  factory: (deps) => new CloudWatchLogger({
    region: deps.Config.awsRegion,
    logGroup: deps.Config.logGroup
  })
});

// graph.ts
const baseBuilder = GraphBuilder.create()
  .provide(ConfigAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter);

export const devGraph = baseBuilder
  .provide(ConsoleLoggerAdapter)
  .provide(InMemoryCacheAdapter)
  .build();

export const prodGraph = baseBuilder
  .provide(CloudLoggerAdapter)
  .provide(RedisCacheAdapter)
  .build();

export const appGraph = process.env.NODE_ENV === 'production'
  ? prodGraph
  : devGraph;
```

## Learning Resources

### Recommended Reading Order

1. **[Core Concepts](../getting-started/core-concepts.md)** - Understand the fundamentals
2. **[First Application](../getting-started/first-application.md)** - Build step by step
3. **[Lifetimes](../getting-started/lifetimes.md)** - Master service scopes
4. **[React Integration](../guides/react-integration.md)** - Add React hooks
5. **[Testing Strategies](../guides/testing-strategies.md)** - Write effective tests

### Quick Reference

| Task | Documentation |
|------|---------------|
| Create a port | [Ports API](../api/ports.md) |
| Create an adapter | [Graph API](../api/graph.md) |
| Build a graph | [Graph API](../api/graph.md#graphbuilder) |
| Create a container | [Runtime API](../api/runtime.md) |
| Use in React | [React Guide](../guides/react-integration.md) |
| Write tests | [Testing Guide](../guides/testing-strategies.md) |
| Visualize graph | [DevTools Guide](../guides/devtools-usage.md) |

## Community Examples

Have you built something with HexDI? [Open an issue](https://github.com/your-org/hex-di/issues) to share your example!
