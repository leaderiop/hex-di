# @hex-di/react API Reference

React integration for HexDI with typed hooks, providers, and automatic scope lifecycle management.

## Installation

```bash
pnpm add @hex-di/react
```

## Overview

`@hex-di/react` provides:
- `createTypedHooks()` - Factory for creating typed React integration
- Provider components for container and scope access
- Hooks for service resolution

## Functions

### createTypedHooks

Creates typed React hooks and providers for a specific set of ports.

```typescript
function createTypedHooks<TProvides extends Port<unknown, string>>(): TypedReactIntegration<TProvides>
```

**Type Parameters:**
- `TProvides` - Union of Port types that can be resolved

**Returns:**
- `TypedReactIntegration<TProvides>` - Object containing hooks and providers

**Example:**

```typescript
import { createTypedHooks } from '@hex-di/react';
import type { AppPorts } from './ports';

const {
  ContainerProvider,
  ScopeProvider,
  AutoScopeProvider,
  usePort,
  useContainer,
  useScope,
  usePortOptional
} = createTypedHooks<AppPorts>();
```

## Types

### TypedReactIntegration<TProvides>

The return type of `createTypedHooks()`.

```typescript
interface TypedReactIntegration<TProvides extends Port<unknown, string>> {
  ContainerProvider: React.FC<ContainerProviderProps<TProvides>>;
  ScopeProvider: React.FC<ScopeProviderProps<TProvides>>;
  AutoScopeProvider: React.FC<AutoScopeProviderProps>;
  usePort: <P extends TProvides>(port: P) => InferService<P>;
  useContainer: () => Container<TProvides>;
  useScope: () => Scope<TProvides>;
  usePortOptional: <P extends TProvides>(port: P) => InferService<P> | undefined;
}
```

## Components

### ContainerProvider

Provides the container to the component tree.

```typescript
interface ContainerProviderProps<TProvides> {
  container: Container<TProvides>;
  children: React.ReactNode;
}
```

**Example:**

```typescript
import { createContainer } from '@hex-di/runtime';
import { ContainerProvider } from './di/hooks';
import { appGraph } from './di/graph';

const container = createContainer(appGraph);

function App() {
  return (
    <ContainerProvider container={container}>
      <MyApp />
    </ContainerProvider>
  );
}
```

### ScopeProvider

Provides a manually-managed scope to children.

```typescript
interface ScopeProviderProps<TProvides> {
  scope: Scope<TProvides>;
  children: React.ReactNode;
}
```

**Example:**

```typescript
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

### AutoScopeProvider

Automatically creates and disposes a scope on mount/unmount.

```typescript
interface AutoScopeProviderProps {
  children: React.ReactNode;
}
```

**Example:**

```typescript
function UserDashboard() {
  return (
    <AutoScopeProvider>
      {/* Scoped services available here */}
      <UserProfile />
      <UserSettings />
    </AutoScopeProvider>
  );
}
```

**With Key for Scope Recreation:**

```typescript
function App() {
  const [userId, setUserId] = useState('alice');

  return (
    <AutoScopeProvider key={userId}>
      {/* New scope created when userId changes */}
      <Dashboard />
    </AutoScopeProvider>
  );
}
```

## Hooks

### usePort

Resolves a service from the container or current scope.

```typescript
function usePort<P extends TProvides>(port: P): InferService<P>
```

**Parameters:**
- `port` - The port to resolve

**Returns:**
- The resolved service instance

**Throws:**
- `MissingProviderError` if no ContainerProvider ancestor
- `ScopeRequiredError` if scoped port without ScopeProvider

**Example:**

```typescript
function UserProfile() {
  const logger = usePort(LoggerPort);      // Singleton - always works
  const session = usePort(UserSessionPort); // Scoped - needs scope

  useEffect(() => {
    logger.log('Profile mounted');
  }, [logger]);

  return <div>Welcome, {session.user.name}!</div>;
}
```

### useContainer

Access the container directly.

```typescript
function useContainer(): Container<TProvides>
```

**Returns:**
- The container instance

**Throws:**
- `MissingProviderError` if no ContainerProvider ancestor

**Example:**

```typescript
function NotificationButton() {
  const container = useContainer();

  const handleClick = () => {
    // Manual resolution for request-scoped service
    const notification = container.resolve(NotificationPort);
    notification.send('Hello!');
  };

  return <button onClick={handleClick}>Notify</button>;
}
```

### useScope

Access the current scope (only inside scope providers).

```typescript
function useScope(): Scope<TProvides>
```

**Returns:**
- The current scope instance

**Throws:**
- `MissingProviderError` if no ScopeProvider ancestor

**Example:**

```typescript
function ScopedComponent() {
  const scope = useScope();

  useEffect(() => {
    console.log('Current scope:', scope);
  }, [scope]);

  return <div>In scope</div>;
}
```

### usePortOptional

Resolves a service, returning undefined if not available.

```typescript
function usePortOptional<P extends TProvides>(port: P): InferService<P> | undefined
```

**Returns:**
- The service or `undefined` if resolution fails

**Example:**

```typescript
function OptionalFeature() {
  const analytics = usePortOptional(AnalyticsPort);

  const handleClick = () => {
    analytics?.track('button_clicked');
  };

  return <button onClick={handleClick}>Click</button>;
}
```

## Error Classes

### MissingProviderError

Thrown when hooks are used outside required providers.

```typescript
class MissingProviderError extends Error {
  readonly providerType: 'Container' | 'Scope';
}
```

**Example:**

```typescript
function BadComponent() {
  try {
    const logger = usePort(LoggerPort);
  } catch (error) {
    if (error instanceof MissingProviderError) {
      console.error(`Missing ${error.providerType}Provider`);
    }
  }
}
```

## Usage Patterns

### Basic Setup

```typescript
// di/hooks.ts
import { createTypedHooks } from '@hex-di/react';
import type { AppPorts } from './ports';

const hooks = createTypedHooks<AppPorts>();

export const ContainerProvider = hooks.ContainerProvider;
export const AutoScopeProvider = hooks.AutoScopeProvider;
export const usePort = hooks.usePort;
export const useContainer = hooks.useContainer;

// App.tsx
import { ContainerProvider, AutoScopeProvider } from './di/hooks';
import { container } from './di/container';

function App() {
  return (
    <ContainerProvider container={container}>
      <AutoScopeProvider>
        <MainApp />
      </AutoScopeProvider>
    </ContainerProvider>
  );
}
```

### Multiple Scope Regions

```typescript
function App() {
  return (
    <ContainerProvider container={container}>
      <Header /> {/* Singletons only */}

      <AutoScopeProvider key="workspace">
        <Workspace /> {/* Workspace scoped services */}
      </AutoScopeProvider>

      <AutoScopeProvider key="settings">
        <Settings /> {/* Settings scoped services */}
      </AutoScopeProvider>
    </ContainerProvider>
  );
}
```

### Reactive Updates

```typescript
function MessageList() {
  const store = usePort(MessageStorePort);
  const [messages, setMessages] = useState(() => store.getMessages());

  useEffect(() => {
    return store.subscribe(setMessages);
  }, [store]);

  return (
    <ul>
      {messages.map(msg => (
        <li key={msg.id}>{msg.content}</li>
      ))}
    </ul>
  );
}
```

## SSR Considerations

- `createTypedHooks()` creates isolated context instances
- No global state - safe for SSR
- Create containers per request on server

```typescript
// Server-side
export async function getServerSideProps() {
  const container = createContainer(graph);
  try {
    const data = await container.resolve(DataPort).fetch();
    return { props: { data } };
  } finally {
    await container.dispose();
  }
}
```
