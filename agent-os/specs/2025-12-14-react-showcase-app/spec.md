# Specification: React Showcase App

## Goal
Create a Real-Time Chat Dashboard example app that demonstrates all hex-di library features including 6 services with varying lifetimes, reactive patterns, DevTools integration, and comprehensive testing utilities.

## User Stories
- As a developer, I want to see a working chat interface so I can understand how hex-di manages state across components with singleton MessageStore and scoped ChatService
- As a developer, I want to switch between different users so I can see how scoped lifetime creates isolated UserSession instances visible in DevTools

## Specific Requirements

**Service Architecture with 6 Services**
- ConfigPort (singleton): App configuration with `notificationDuration` and `maxMessages` settings
- LoggerPort (singleton): Console logging with `[ServiceName]` prefix, `log()`, `warn()`, `error()` methods
- MessageStorePort (singleton): In-memory message storage with `subscribe()`, `getMessages()`, `addMessage()` methods for reactive patterns
- UserSessionPort (scoped): Current user info with `id`, `name`, `avatar` properties, isolated per AutoScopeProvider
- ChatServicePort (scoped): Sends messages as current user, depends on LoggerPort, UserSessionPort, MessageStorePort
- NotificationServicePort (request): Creates notifications with instance ID and timestamp, depends on LoggerPort, ConfigPort

**ChatRoom Component with AutoScopeProvider**
- Wrap all children in `<AutoScopeProvider>` to demonstrate scope lifecycle tied to React component
- Include user switch buttons ("Login as Alice", "Login as Bob") that trigger scope recreation
- When user switches, current scope disposes and new scope creates fresh UserSessionPort instance
- Display current user context via UserInfo component

**MessageList Component with Reactive Subscription**
- Use `usePort(MessageStorePort)` to get singleton store instance
- Subscribe to message updates via useEffect + store.subscribe() pattern
- Render messages with sender name, content, timestamp in chat bubble style
- Show loading/empty states with appropriate visual feedback

**MessageInput Component with Scoped Service**
- Use `usePort(ChatServicePort)` to get scoped chat service
- Input field with send button, clears after successful send
- ChatService automatically uses current UserSession to attach sender info

**NotificationButton with Request Lifetime**
- Each click demonstrates request lifetime by showing new instance number inline
- Display "Instance #X created at HH:MM:SS" text below button
- Show brief toast notification (2-3 seconds) in corner with notification message
- Proves new NotificationService instance created per resolution

**DI Setup in src/di/ Folder**
- `ports.ts`: 6 port definitions using `createPort<TName, TService>(name)` pattern
- `adapters.ts`: 6 adapter implementations using `createAdapter({ provides, requires, lifetime, factory })`
- `graph.ts`: Complete graph via `GraphBuilder.create().provide(...).build()`
- `hooks.ts`: Typed hooks via `createTypedHooks<AppPorts>()` exporting ContainerProvider, AutoScopeProvider, usePort

**App Entry and Container Setup**
- `main.tsx`: Create container via `createContainer(graph)`, render App with StrictMode
- `App.tsx`: Wrap in ContainerProvider, render ChatRoom, include DevToolsFloating at bottom-right
- Clean layout with Tailwind CSS, centered chat dashboard with reasonable max-width

**Test Suite with 4 Test Files**
- `tests/setup.ts`: Vitest configuration, React Testing Library setup, jsdom environment
- `tests/adapters.test.ts`: Unit test each adapter using `createAdapterTest()` harness with mock dependencies
- `tests/graph.test.ts`: Use `assertGraphComplete()` for validation, `serializeGraph()` for snapshot testing
- `tests/components.test.tsx`: Integration tests using `renderWithContainer()` and `TestGraphBuilder.override()` for mocks

## Visual Design
No visual assets provided - use clean chat dashboard layout with Tailwind CSS featuring message bubbles, user avatars/initials, and floating DevTools panel.

## Existing Code to Leverage

**@hex-di/react createTypedHooks pattern**
- Located at `/Users/mohammadalmechkor/Projects/hex-di/packages/react/src/create-typed-hooks.tsx`
- Factory creates isolated React integration with ContainerProvider, AutoScopeProvider, ScopeProvider, usePort, useContainer
- AutoScopeProvider automatically creates scope on mount and disposes on unmount via useEffect

**@hex-di/devtools DevToolsFloating component**
- Located at `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/devtools-floating.tsx`
- Props: `graph` (required), `container` (optional), `position` (default 'bottom-right')
- Auto-hides in production, persists open/closed state to localStorage

**@hex-di/ports createPort pattern**
- Located at `/Users/mohammadalmechkor/Projects/hex-di/packages/ports/src/index.ts`
- Usage: `createPort<'PortName', ServiceInterface>('PortName')` creates frozen Port object

**@hex-di/graph createAdapter and GraphBuilder patterns**
- Located at `/Users/mohammadalmechkor/Projects/hex-di/packages/graph/src/index.ts`
- Adapter: `createAdapter({ provides, requires, lifetime, factory, finalizer? })`
- Graph: `GraphBuilder.create().provide(adapter1).provide(adapter2).build()`

**@hex-di/testing utilities**
- Located at `/Users/mohammadalmechkor/Projects/hex-di/packages/testing/src/index.ts`
- `TestGraphBuilder.from(graph).override(mockAdapter).build()` for test graphs
- `createMockAdapter(port, partialImpl)` for partial mock implementations
- `createAdapterTest(adapter, mockDeps)` harness with `invoke()` and `getDeps()`
- `assertGraphComplete(graph)`, `serializeGraph(graph)` for validation and snapshots
- `renderWithContainer(element, graph)` for React Testing Library integration

## Out of Scope
- Backend/API integration or WebSocket connections
- Data persistence (localStorage, IndexedDB, database)
- Routing or multiple pages
- Authentication/authorization flows
- Production deployment configuration
- Performance optimization beyond reasonable defaults
- Full accessibility compliance (best effort only)
- Mobile responsive design (best effort only)
- Internationalization or localization
- Real-time network message synchronization
