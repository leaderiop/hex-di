# React Integration

This guide covers integrating HexDI with React applications using `@hex-di/react`.

## Installation

```bash
pnpm add @hex-di/react
```

## Overview

`@hex-di/react` provides:
- **ContainerProvider** - Makes container available to components
- **ScopeProvider** - Manual scope management
- **AutoScopeProvider** - Automatic scope lifecycle
- **usePort** - Resolve services in components
- **useContainer** - Access the container directly
- **useScope** - Access the current scope

## Basic Setup

### 1. Create Typed Hooks

First, create typed hooks for your application's ports:

```typescript
// src/di/hooks.ts
import { createTypedHooks } from '@hex-di/react';
import type { AppPorts } from './ports';

// Create hooks typed to your ports
const typedHooks = createTypedHooks<AppPorts>();

export const ContainerProvider = typedHooks.ContainerProvider;
export const ScopeProvider = typedHooks.ScopeProvider;
export const AutoScopeProvider = typedHooks.AutoScopeProvider;
export const usePort = typedHooks.usePort;
export const useContainer = typedHooks.useContainer;
export const useScope = typedHooks.useScope;
```

### 2. Create Your Graph and Container

```typescript
// src/di/container.ts
import { createContainer } from '@hex-di/runtime';
import { appGraph } from './graph';

export const container = createContainer(appGraph);
```

### 3. Wrap Your App with ContainerProvider

```typescript
// src/App.tsx
import { ContainerProvider } from './di/hooks';
import { container } from './di/container';

export function App() {
  return (
    <ContainerProvider container={container}>
      <MyApp />
    </ContainerProvider>
  );
}
```

### 4. Use Services in Components

```typescript
// src/components/Dashboard.tsx
import { usePort } from '../di/hooks';
import { LoggerPort, UserServicePort } from '../di/ports';

export function Dashboard() {
  const logger = usePort(LoggerPort);
  const userService = usePort(UserServicePort);

  useEffect(() => {
    logger.log('Dashboard mounted');
  }, [logger]);

  return <div>Dashboard</div>;
}
```

## Provider Components

### ContainerProvider

The root provider that makes the container available to the component tree.

```typescript
import { ContainerProvider } from './di/hooks';
import { container } from './di/container';

function App() {
  return (
    <ContainerProvider container={container}>
      <MyApp />
    </ContainerProvider>
  );
}
```

**Props:**
- `container` (required) - The container instance created from your graph

### ScopeProvider

Provides a manually-managed scope to children.

```typescript
import { ScopeProvider, useContainer } from './di/hooks';

function RequestHandler() {
  const container = useContainer();
  const scope = useMemo(() => container.createScope(), [container]);

  useEffect(() => {
    return () => {
      scope.dispose();
    };
  }, [scope]);

  return (
    <ScopeProvider scope={scope}>
      <RequestContent />
    </ScopeProvider>
  );
}
```

**Props:**
- `scope` (required) - A scope instance created from the container

### AutoScopeProvider

Automatically creates a scope on mount and disposes it on unmount.

```typescript
import { AutoScopeProvider } from './di/hooks';

function UserDashboard() {
  return (
    <AutoScopeProvider>
      {/* Children have access to scoped services */}
      <UserProfile />
      <UserSettings />
    </AutoScopeProvider>
  );
}
```

**Props:**
- `children` - React children

**Behavior:**
- Creates a new scope when the component mounts
- Disposes the scope when the component unmounts
- Children can resolve scoped services

## Hooks

### usePort

Resolves a service from the container or current scope.

```typescript
function MyComponent() {
  const logger = usePort(LoggerPort);

  // logger is typed as Logger
  logger.log('Hello!');
}
```

**For scoped services**, must be inside a `ScopeProvider` or `AutoScopeProvider`:

```typescript
function UserProfile() {
  // This requires being inside a scope provider
  const session = usePort(UserSessionPort);

  return <div>User: {session.user.name}</div>;
}
```

### useContainer

Access the container directly for advanced use cases.

```typescript
function NotificationButton() {
  const container = useContainer();

  const handleClick = () => {
    // Resolve a request-scoped service
    const notification = container.resolve(NotificationPort);
    notification.send('Button clicked!');
  };

  return <button onClick={handleClick}>Notify</button>;
}
```

### useScope

Access the current scope (only available inside a scope provider).

```typescript
function ScopedComponent() {
  const scope = useScope();

  useEffect(() => {
    console.log('Inside scope:', scope);
  }, [scope]);
}
```

## Scope Management Patterns

### Pattern 1: User Session Scope

Create a new scope when the user changes:

```typescript
function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Key forces re-mount when user changes
  const scopeKey = currentUser?.id ?? 'anonymous';

  return (
    <ContainerProvider container={container}>
      <AutoScopeProvider key={scopeKey}>
        <UserContext.Provider value={currentUser}>
          <MainApp />
        </UserContext.Provider>
      </AutoScopeProvider>
    </ContainerProvider>
  );
}
```

### Pattern 2: Route-Based Scopes

Create a scope per route:

```typescript
function AppRoutes() {
  const location = useLocation();

  return (
    <AutoScopeProvider key={location.pathname}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AutoScopeProvider>
  );
}
```

### Pattern 3: Modal Scopes

Isolate modal state with scopes:

```typescript
function UserModal({ userId, onClose }) {
  return (
    <AutoScopeProvider>
      <Modal onClose={onClose}>
        <UserEditor userId={userId} />
      </Modal>
    </AutoScopeProvider>
  );
}
```

## Working with Singleton Services

Singleton services work the same everywhere:

```typescript
function LogViewer() {
  const logger = usePort(LoggerPort); // Singleton

  // This is the same logger instance everywhere
  // No scope required
}

function AnotherComponent() {
  const logger = usePort(LoggerPort); // Same instance
}
```

## Working with Scoped Services

Scoped services require a scope context:

```typescript
function UserProfile() {
  // This will throw MissingProviderError if not in a scope
  const session = usePort(UserSessionPort);

  return <div>Welcome, {session.user.name}!</div>;
}

// Usage - must wrap in scope provider
function App() {
  return (
    <ContainerProvider container={container}>
      <AutoScopeProvider>
        <UserProfile /> {/* Works! */}
      </AutoScopeProvider>
    </ContainerProvider>
  );
}
```

## Working with Request Services

Request services create fresh instances each resolution:

```typescript
function NotificationDemo() {
  const container = useContainer();
  const [instances, setInstances] = useState<number[]>([]);

  const handleClick = () => {
    // Each call creates a new instance
    const notif = container.resolve(NotificationPort);
    setInstances(prev => [...prev, notif.instanceId]);
  };

  return (
    <div>
      <button onClick={handleClick}>Create Notification</button>
      <ul>
        {instances.map(id => (
          <li key={id}>Instance #{id}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Reactive Updates

### Subscribing to Singleton State

For services with subscriptions:

```typescript
function MessageList() {
  const messageStore = usePort(MessageStorePort);
  const [messages, setMessages] = useState(() => messageStore.getMessages());

  useEffect(() => {
    // Subscribe to updates
    const unsubscribe = messageStore.subscribe(setMessages);
    return unsubscribe;
  }, [messageStore]);

  return (
    <ul>
      {messages.map(msg => (
        <li key={msg.id}>{msg.content}</li>
      ))}
    </ul>
  );
}
```

### Using with External State

Combine HexDI with other state management:

```typescript
function App() {
  const [user, setUser] = useState(null);
  const container = useMemo(() => createContainer(graph), []);

  // Update adapter factory state before scope creation
  const handleLogin = (userData) => {
    setCurrentUserData(userData); // Module-level state
    setUser(userData);
  };

  return (
    <ContainerProvider container={container}>
      <AutoScopeProvider key={user?.id ?? 'anon'}>
        <AuthContext.Provider value={{ user, setUser: handleLogin }}>
          <App />
        </AuthContext.Provider>
      </AutoScopeProvider>
    </ContainerProvider>
  );
}
```

## Error Handling

### MissingProviderError

Thrown when hooks are used outside their required context:

```typescript
function BadComponent() {
  // Throws MissingProviderError - no ContainerProvider ancestor
  const logger = usePort(LoggerPort);
}

// Fix: Wrap in ContainerProvider
function App() {
  return (
    <ContainerProvider container={container}>
      <BadComponent /> {/* Now works */}
    </ContainerProvider>
  );
}
```

### Error Boundaries

Use error boundaries to catch resolution errors:

```typescript
class DIErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.state.error instanceof MissingProviderError) {
        return <div>Missing DI provider: {this.state.error.message}</div>;
      }
      throw this.state.error;
    }
    return this.props.children;
  }
}
```

## SSR Considerations

### No Global State

`createTypedHooks()` creates isolated instances, safe for SSR:

```typescript
// Each createTypedHooks call creates isolated context
// No global state pollution between requests
const hooks = createTypedHooks<AppPorts>();
```

### Per-Request Containers

Create a new container per request:

```typescript
// Next.js example
export async function getServerSideProps(context) {
  const container = createContainer(graph);

  try {
    const dataService = container.resolve(DataServicePort);
    const data = await dataService.fetchData();

    return { props: { data } };
  } finally {
    await container.dispose();
  }
}
```

### Hydration

Pass initial data to avoid refetching:

```typescript
function App({ initialData }) {
  const container = useMemo(() => {
    const c = createContainer(graph);
    // Hydrate with server data
    c.resolve(DataStorePort).hydrate(initialData);
    return c;
  }, []);

  return (
    <ContainerProvider container={container}>
      <MyApp />
    </ContainerProvider>
  );
}
```

## DevTools Integration

Add the DevTools component for debugging:

```typescript
import { DevToolsFloating } from '@hex-di/devtools';
import { appGraph } from './di/graph';
import { container } from './di/container';

function App() {
  return (
    <ContainerProvider container={container}>
      <MyApp />
      {process.env.NODE_ENV === 'development' && (
        <DevToolsFloating
          graph={appGraph}
          container={container}
          position="bottom-right"
        />
      )}
    </ContainerProvider>
  );
}
```

## Complete Example

```typescript
// di/ports.ts
import { createPort } from '@hex-di/ports';

export const LoggerPort = createPort<'Logger', Logger>('Logger');
export const UserSessionPort = createPort<'UserSession', UserSession>('UserSession');
export const ChatServicePort = createPort<'ChatService', ChatService>('ChatService');

export type AppPorts =
  | typeof LoggerPort
  | typeof UserSessionPort
  | typeof ChatServicePort;

// di/hooks.ts
import { createTypedHooks } from '@hex-di/react';
import type { AppPorts } from './ports';

const hooks = createTypedHooks<AppPorts>();
export const { ContainerProvider, AutoScopeProvider, usePort } = hooks;

// di/container.ts
import { createContainer } from '@hex-di/runtime';
import { appGraph } from './graph';
export const container = createContainer(appGraph);

// App.tsx
import { ContainerProvider, AutoScopeProvider } from './di/hooks';
import { container } from './di/container';

export function App() {
  const [currentUser, setCurrentUser] = useState('alice');

  return (
    <ContainerProvider container={container}>
      <AutoScopeProvider key={currentUser}>
        <ChatRoom />
        <UserSwitcher onSwitch={setCurrentUser} />
      </AutoScopeProvider>
    </ContainerProvider>
  );
}

// components/ChatRoom.tsx
import { usePort } from '../di/hooks';
import { ChatServicePort, UserSessionPort } from '../di/ports';

export function ChatRoom() {
  const chat = usePort(ChatServicePort);
  const session = usePort(UserSessionPort);

  const handleSend = (message: string) => {
    chat.sendMessage(message);
  };

  return (
    <div>
      <h1>Welcome, {session.user.name}!</h1>
      <MessageInput onSend={handleSend} />
    </div>
  );
}
```

## Next Steps

- Learn [Testing Strategies](./testing-strategies.md) for React components
- Explore [DevTools Usage](./devtools-usage.md) for debugging
- See [Scoped Services](../patterns/scoped-services.md) patterns
