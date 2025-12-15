# Testing Strategies

This guide covers testing HexDI-powered applications using `@hex-di/testing`.

## Installation

```bash
pnpm add -D @hex-di/testing
```

## Testing Philosophy

HexDI enables three levels of testing:

1. **Unit Tests** - Test individual adapters in isolation
2. **Integration Tests** - Test service compositions with mock dependencies
3. **Component Tests** - Test React components with DI containers

## Unit Testing Adapters

### Using createAdapterTest

Test an adapter's factory function in isolation:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createAdapterTest } from '@hex-di/testing';
import { UserServiceAdapter } from '../src/di/adapters';
import type { Logger, Database } from '../src/types';

describe('UserServiceAdapter', () => {
  it('logs when fetching a user', async () => {
    // Create mock dependencies
    const mockLogger: Logger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    const mockDatabase: Database = {
      query: vi.fn().mockResolvedValue({ id: '123', name: 'Alice' })
    };

    // Create test harness
    const harness = createAdapterTest(UserServiceAdapter, {
      Logger: mockLogger,
      Database: mockDatabase
    });

    // Invoke the factory to get the service
    const userService = harness.invoke();

    // Test the service
    const user = await userService.getUser('123');

    // Verify behavior
    expect(mockLogger.log).toHaveBeenCalledWith('Fetching user 123');
    expect(mockDatabase.query).toHaveBeenCalled();
    expect(user.name).toBe('Alice');
  });

  it('throws on invalid user ID', async () => {
    const harness = createAdapterTest(UserServiceAdapter, {
      Logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
      Database: { query: vi.fn().mockResolvedValue(null) }
    });

    const userService = harness.invoke();

    await expect(userService.getUser('')).rejects.toThrow('Invalid user ID');
  });
});
```

### Accessing Dependencies After Invocation

```typescript
const harness = createAdapterTest(ChatServiceAdapter, {
  Logger: mockLogger,
  UserSession: mockUserSession,
  MessageStore: mockMessageStore
});

const chatService = harness.invoke();
chatService.sendMessage('Hello!');

// Access the mocks for assertions
const deps = harness.getDeps();
expect(deps.Logger.log).toHaveBeenCalledWith(expect.stringContaining('Hello!'));
expect(deps.MessageStore.addMessage).toHaveBeenCalled();
```

## Integration Testing

### Using TestGraphBuilder

Override specific adapters while keeping the rest of the production graph:

```typescript
import { TestGraphBuilder, createMockAdapter } from '@hex-di/testing';
import { createContainer } from '@hex-di/runtime';
import { appGraph } from '../src/di/graph';
import { LoggerPort, DatabasePort } from '../src/di/ports';

describe('UserService integration', () => {
  it('creates users correctly', async () => {
    // Create mock adapters
    const mockLogger = createMockAdapter(LoggerPort, {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    });

    const mockDatabase = createMockAdapter(DatabasePort, {
      query: vi.fn().mockResolvedValue({ id: '1', name: 'Test' }),
      insert: vi.fn().mockResolvedValue({ id: '2' })
    });

    // Build test graph with overrides
    const testGraph = TestGraphBuilder.from(appGraph)
      .override(mockLogger)
      .override(mockDatabase)
      .build();

    // Create container from test graph
    const container = createContainer(testGraph);

    try {
      const userService = container.resolve(UserServicePort);
      const user = await userService.createUser('Test User');

      expect(user.id).toBe('2');
    } finally {
      await container.dispose();
    }
  });
});
```

### Partial Mocks

Only mock what you need:

```typescript
// Mock only the methods you're testing
const partialMock = createMockAdapter(DatabasePort, {
  query: vi.fn().mockResolvedValue([]),
  // insert, update, delete use default no-op implementations
});
```

### Chaining Overrides

```typescript
const testGraph = TestGraphBuilder.from(appGraph)
  .override(mockLogger)
  .override(mockDatabase)
  .override(mockCache)
  .override(mockEmailService)
  .build();
```

## Mock Adapters

### Creating Mock Adapters

```typescript
import { createMockAdapter } from '@hex-di/testing';

const mockLogger = createMockAdapter(LoggerPort, {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
});
```

### Mock with Partial Implementation

```typescript
// Only implement methods you need
const partialMock = createMockAdapter(UserServicePort, {
  getUser: vi.fn().mockResolvedValue({ id: '1', name: 'Mock User' })
  // createUser, deleteUser will throw "not implemented"
});
```

### Mock with Custom Lifetime

```typescript
const scopedMock = createMockAdapter(
  UserSessionPort,
  { user: { id: '1', name: 'Test' } },
  { lifetime: 'scoped' } // Override lifetime for testing
);
```

### Spy on Real Implementation

```typescript
// Keep real implementation but spy on calls
const spyAdapter = createMockAdapter(LoggerPort, {
  log: vi.fn((msg) => console.log(`[SPY] ${msg}`)),
  warn: vi.fn((msg) => console.warn(`[SPY] ${msg}`)),
  error: vi.fn((msg) => console.error(`[SPY] ${msg}`))
});
```

## Graph Assertions

### assertGraphComplete

Verify all dependencies are satisfied:

```typescript
import { assertGraphComplete } from '@hex-di/testing';

describe('appGraph', () => {
  it('has all dependencies satisfied', () => {
    // Throws if any dependencies are missing
    assertGraphComplete(appGraph);
  });
});
```

### assertPortProvided

Check that a specific port is in the graph:

```typescript
import { assertPortProvided } from '@hex-di/testing';

describe('appGraph', () => {
  it('provides Logger', () => {
    assertPortProvided(appGraph, LoggerPort);
  });

  it('provides UserService', () => {
    assertPortProvided(appGraph, UserServicePort);
  });
});
```

### assertLifetime

Verify a port's lifetime:

```typescript
import { assertLifetime } from '@hex-di/testing';

describe('adapter lifetimes', () => {
  it('Logger is singleton', () => {
    assertLifetime(appGraph, LoggerPort, 'singleton');
  });

  it('UserSession is scoped', () => {
    assertLifetime(appGraph, UserSessionPort, 'scoped');
  });
});
```

## Graph Snapshots

### Serializing Graphs

Create deterministic snapshots for testing:

```typescript
import { serializeGraph } from '@hex-di/testing';

describe('graph structure', () => {
  it('matches snapshot', () => {
    const snapshot = serializeGraph(appGraph);
    expect(snapshot).toMatchSnapshot();
  });
});
```

### Snapshot Structure

```typescript
const snapshot = serializeGraph(appGraph);
// {
//   adapters: [
//     {
//       portName: 'Logger',
//       lifetime: 'singleton',
//       dependencies: []
//     },
//     {
//       portName: 'UserService',
//       lifetime: 'scoped',
//       dependencies: ['Logger', 'Database']
//     }
//   ]
// }
```

## Vitest Integration

### useTestContainer Hook

Automatic container lifecycle management:

```typescript
import { useTestContainer } from '@hex-di/testing';
import { appGraph } from '../src/di/graph';

describe('UserService', () => {
  const { container, scope } = useTestContainer(() => appGraph);

  it('resolves services', () => {
    const logger = container.resolve(LoggerPort);
    expect(logger).toBeDefined();
  });

  it('creates scoped services', () => {
    const session = scope.resolve(UserSessionPort);
    expect(session).toBeDefined();
  });

  // Container and scope are automatically disposed after each test
});
```

### Custom Test Graph per Test

```typescript
import { useTestContainer } from '@hex-di/testing';

describe('UserService with mock database', () => {
  const mockDatabase = createMockAdapter(DatabasePort, {
    query: vi.fn().mockResolvedValue([])
  });

  const { container } = useTestContainer(() =>
    TestGraphBuilder.from(appGraph)
      .override(mockDatabase)
      .build()
  );

  it('handles empty results', async () => {
    const userService = container.resolve(UserServicePort);
    const users = await userService.listUsers();
    expect(users).toEqual([]);
  });
});
```

## React Component Testing

### renderWithContainer

Render components with a DI container:

```typescript
import { renderWithContainer } from '@hex-di/testing';
import { screen, fireEvent } from '@testing-library/react';
import { Dashboard } from '../src/components/Dashboard';
import { appGraph } from '../src/di/graph';

describe('Dashboard', () => {
  it('displays user name', async () => {
    const mockSession = createMockAdapter(UserSessionPort, {
      user: { id: '1', name: 'Test User', avatar: 'T' }
    });

    const testGraph = TestGraphBuilder.from(appGraph)
      .override(mockSession)
      .build();

    renderWithContainer(<Dashboard />, testGraph);

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });
});
```

### Testing with AutoScopeProvider

```typescript
import { renderWithContainer } from '@hex-di/testing';
import { AutoScopeProvider } from '../src/di/hooks';

describe('UserProfile', () => {
  it('renders user info', () => {
    const testGraph = TestGraphBuilder.from(appGraph)
      .override(mockUserSession)
      .build();

    renderWithContainer(
      <AutoScopeProvider>
        <UserProfile />
      </AutoScopeProvider>,
      testGraph
    );

    expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
  });
});
```

### Testing User Interactions

```typescript
describe('MessageInput', () => {
  it('sends message on submit', async () => {
    const mockSendMessage = vi.fn();
    const mockChatService = createMockAdapter(ChatServicePort, {
      sendMessage: mockSendMessage
    });

    const testGraph = TestGraphBuilder.from(appGraph)
      .override(mockChatService)
      .build();

    renderWithContainer(
      <AutoScopeProvider>
        <MessageInput />
      </AutoScopeProvider>,
      testGraph
    );

    // Type a message
    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Hello!' } });

    // Submit
    const button = screen.getByRole('button', { name: /send/i });
    fireEvent.click(button);

    // Verify
    expect(mockSendMessage).toHaveBeenCalledWith('Hello!');
  });
});
```

## Best Practices

### 1. Test Adapters in Isolation

Unit test adapter logic without the full container:

```typescript
// Good - isolated test
const harness = createAdapterTest(MyAdapter, mockDeps);
const service = harness.invoke();
// Test service directly

// Less ideal - requires full container
const container = createContainer(graph);
const service = container.resolve(MyPort);
```

### 2. Use TestGraphBuilder for Integration Tests

Keep production graph structure, just swap implementations:

```typescript
// Good - preserves graph structure
const testGraph = TestGraphBuilder.from(productionGraph)
  .override(mockAdapter)
  .build();

// Avoid - rebuilding entire graph
const testGraph = GraphBuilder.create()
  .provide(mockAdapter1)
  .provide(mockAdapter2)
  // ... repeat everything
  .build();
```

### 3. Mock at the Right Level

Mock external boundaries, not internal services:

```typescript
// Good - mock external dependencies
const mockDatabase = createMockAdapter(DatabasePort, { /* ... */ });
const mockHttpClient = createMockAdapter(HttpClientPort, { /* ... */ });

// Avoid - mocking internal services
// Let UserService use real Logger, mock the Database instead
```

### 4. Clean Up Resources

Always dispose containers in tests:

```typescript
// Using useTestContainer (automatic cleanup)
const { container } = useTestContainer(() => graph);

// Manual cleanup
afterEach(async () => {
  await container.dispose();
});
```

### 5. Test Graph Validity

Add a test to ensure your graph is complete:

```typescript
describe('production graph', () => {
  it('is complete and valid', () => {
    assertGraphComplete(appGraph);
  });
});
```

## Complete Test Example

```typescript
// tests/chat-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAdapterTest, TestGraphBuilder, createMockAdapter, useTestContainer } from '@hex-di/testing';
import { ChatServiceAdapter } from '../src/di/adapters';
import { appGraph } from '../src/di/graph';
import { LoggerPort, UserSessionPort, MessageStorePort, ChatServicePort } from '../src/di/ports';

describe('ChatService', () => {
  // Unit test
  describe('adapter unit test', () => {
    it('sends message with user info', () => {
      const mockLogger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
      const mockSession = { user: { id: '1', name: 'Alice', avatar: 'A' } };
      const mockStore = { addMessage: vi.fn(), getMessages: vi.fn(), subscribe: vi.fn() };

      const harness = createAdapterTest(ChatServiceAdapter, {
        Logger: mockLogger,
        UserSession: mockSession,
        MessageStore: mockStore
      });

      const chatService = harness.invoke();
      chatService.sendMessage('Hello!');

      expect(mockStore.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          senderName: 'Alice',
          content: 'Hello!'
        })
      );
    });
  });

  // Integration test
  describe('integration test', () => {
    const mockLogger = createMockAdapter(LoggerPort, {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    });

    const { scope } = useTestContainer(() =>
      TestGraphBuilder.from(appGraph)
        .override(mockLogger)
        .build()
    );

    it('integrates with message store', () => {
      const chatService = scope.resolve(ChatServicePort);
      const messageStore = scope.resolve(MessageStorePort);

      chatService.sendMessage('Test message');

      const messages = messageStore.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Test message');
    });
  });
});
```

## Next Steps

- Learn [DevTools Usage](./devtools-usage.md) for debugging tests
- Explore [Error Handling](./error-handling.md) for testing error cases
- See [React Integration](./react-integration.md) for component testing patterns
