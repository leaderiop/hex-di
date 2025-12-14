# Task Breakdown: React Showcase App

## Overview
Total Tasks: 26 (across 5 task groups)

This showcase app demonstrates all hex-di library features through a Real-Time Chat Dashboard with 6 services (singleton, scoped, request lifetimes), reactive patterns, DevTools integration, and comprehensive testing utilities.

## Task List

### Project Setup

#### Task Group 1: Project Foundation and Configuration
**Dependencies:** None

- [x] 1.0 Complete project setup and configuration
  - [x] 1.1 Create project directory structure
    - Create `examples/react-showcase/` folder
    - Create subdirectories: `src/`, `src/di/`, `src/components/`, `tests/`
  - [x] 1.2 Create package.json with workspace dependencies
    - File: `examples/react-showcase/package.json`
    - Workspace dependencies: `@hex-di/ports`, `@hex-di/graph`, `@hex-di/runtime`, `@hex-di/react`
    - Dev dependencies: `@hex-di/testing`, `@hex-di/devtools`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`
    - Dependencies: `react`, `react-dom`, `tailwindcss`, `vite`
    - Scripts: `dev`, `build`, `preview`, `test`
  - [x] 1.3 Create TypeScript configuration
    - File: `examples/react-showcase/tsconfig.json`
    - Enable strict mode, no `any` types
    - Configure paths for workspace packages
    - Target ES2022, module ESNext
  - [x] 1.4 Create Vite configuration
    - File: `examples/react-showcase/vite.config.ts`
    - React plugin configuration
    - Resolve workspace package paths
  - [x] 1.5 Create Tailwind CSS configuration
    - File: `examples/react-showcase/tailwind.config.js`
    - File: `examples/react-showcase/postcss.config.js`
    - File: `examples/react-showcase/src/index.css` with Tailwind directives
    - Configure content paths for component files
  - [x] 1.6 Create HTML entry point
    - File: `examples/react-showcase/index.html`
    - Include root div and script module reference
  - [x] 1.7 Create shared types file
    - File: `examples/react-showcase/src/types.ts`
    - Define `Message` interface (id, senderId, senderName, content, timestamp)
    - Define `User` interface (id, name, avatar)
    - Define `Config` interface (notificationDuration, maxMessages)
    - Define service interfaces: Logger, MessageStore, UserSession, ChatService, NotificationService
  - [x] 1.8 Verify project setup
    - Run `pnpm install` in project directory
    - Verify TypeScript compilation with `pnpm tsc --noEmit`
    - Verify Vite dev server starts with `pnpm dev`

**Acceptance Criteria:**
- Project builds without TypeScript errors
- Vite dev server starts successfully
- Tailwind CSS is configured and working
- All workspace dependencies resolve correctly

**Files Created:**
- `examples/react-showcase/package.json`
- `examples/react-showcase/tsconfig.json`
- `examples/react-showcase/vite.config.ts`
- `examples/react-showcase/tailwind.config.js`
- `examples/react-showcase/postcss.config.js`
- `examples/react-showcase/index.html`
- `examples/react-showcase/src/index.css`
- `examples/react-showcase/src/types.ts`

---

### DI Layer

#### Task Group 2: Dependency Injection Architecture
**Dependencies:** Task Group 1 (complete)

- [x] 2.0 Complete DI layer implementation
  - [x] 2.1 Write 4-6 focused tests for DI layer
    - File: `examples/react-showcase/tests/graph.test.ts`
    - Test 1: Graph builds successfully with all 6 adapters
    - Test 2: `assertGraphComplete()` passes for valid graph
    - Test 3: `serializeGraph()` produces expected structure (snapshot test)
    - Test 4: Graph validates dependency relationships
    - Test 5: Missing adapter detection works (negative test)
    - Test 6: Circular dependency detection (if applicable)
  - [x] 2.2 Create 6 port definitions
    - File: `examples/react-showcase/src/di/ports.ts`
    - `ConfigPort` (singleton) - App configuration
    - `LoggerPort` (singleton) - Console logging with prefix
    - `MessageStorePort` (singleton) - In-memory message storage with subscribe()
    - `UserSessionPort` (scoped) - Current user info
    - `ChatServicePort` (scoped) - Send messages as current user
    - `NotificationServicePort` (request) - Create notifications with instance ID
    - Use `createPort<TName, TService>(name)` pattern from `@hex-di/ports`
    - Include TSDoc comments on each port
  - [x] 2.3 Create 6 adapter implementations
    - File: `examples/react-showcase/src/di/adapters.ts`
    - `ConfigAdapter`: singleton, no dependencies, returns config object
    - `LoggerAdapter`: singleton, no dependencies, returns logger with prefixed methods
    - `MessageStoreAdapter`: singleton, requires LoggerPort, implements reactive subscription
    - `UserSessionAdapter`: scoped, no dependencies, returns user session (initially Alice)
    - `ChatServiceAdapter`: scoped, requires LoggerPort + UserSessionPort + MessageStorePort
    - `NotificationServiceAdapter`: request, requires LoggerPort + ConfigPort, tracks instance ID
    - Use `createAdapter({ provides, requires, lifetime, factory })` pattern from `@hex-di/graph`
    - Include TSDoc comments on each adapter
  - [x] 2.4 Create graph builder composition
    - File: `examples/react-showcase/src/di/graph.ts`
    - Use `GraphBuilder.create().provide(...).build()` pattern
    - Register all 6 adapters in correct order
    - Export graph constant for use in main.tsx and DevTools
    - Demonstrate compile-time type validation
  - [x] 2.5 Create typed React hooks
    - File: `examples/react-showcase/src/di/hooks.ts`
    - Use `createTypedHooks<AppPorts>()` from `@hex-di/react`
    - Export: `ContainerProvider`, `AutoScopeProvider`, `ScopeProvider`, `usePort`, `useContainer`
    - Define `AppPorts` type union from all 6 ports
  - [x] 2.6 Ensure DI layer tests pass
    - Run ONLY tests written in 2.1
    - Verify graph builds successfully
    - Verify all adapters are properly registered

**Acceptance Criteria:**
- All 6 ports defined with proper typing
- All 6 adapters implement correct lifetime and dependencies
- Graph builds without errors at compile-time and runtime
- Tests from 2.1 pass (4-6 tests)
- `assertGraphComplete()` validates graph successfully
- `serializeGraph()` produces snapshot-testable output

**Files Created:**
- `examples/react-showcase/src/di/ports.ts`
- `examples/react-showcase/src/di/adapters.ts`
- `examples/react-showcase/src/di/graph.ts`
- `examples/react-showcase/src/di/hooks.ts`
- `examples/react-showcase/tests/graph.test.ts`

**Reference Code:**
- Pattern: `/Users/mohammadalmechkor/Projects/hex-di/packages/ports/src/index.ts`
- Pattern: `/Users/mohammadalmechkor/Projects/hex-di/packages/graph/src/index.ts`
- Pattern: `/Users/mohammadalmechkor/Projects/hex-di/packages/react/src/create-typed-hooks.tsx`

---

### Adapter Testing

#### Task Group 3: Adapter Unit Tests
**Dependencies:** Task Group 2 (complete)

- [x] 3.0 Complete adapter unit tests
  - [x] 3.1 Create test setup file
    - File: `examples/react-showcase/tests/setup.ts`
    - Configure Vitest with jsdom environment
    - Setup React Testing Library
    - Import `@testing-library/jest-dom` matchers
    - Export common test utilities
  - [x] 3.2 Write 6-8 focused adapter tests using createAdapterTest()
    - File: `examples/react-showcase/tests/adapters.test.ts`
    - Test 1: ConfigAdapter returns correct configuration shape
    - Test 2: LoggerAdapter logs with correct prefix format
    - Test 3: MessageStoreAdapter getMessages() returns array
    - Test 4: MessageStoreAdapter addMessage() notifies subscribers
    - Test 5: UserSessionAdapter returns user session with id, name, avatar
    - Test 6: ChatServiceAdapter sends message with correct sender info
    - Test 7: NotificationServiceAdapter creates unique instance IDs per resolution
    - Test 8: NotificationServiceAdapter uses config for notification duration
    - Use `createAdapterTest(adapter, mockDeps)` harness from `@hex-di/testing`
    - Demonstrate `invoke()` and `getDeps()` methods
  - [x] 3.3 Ensure adapter tests pass
    - Run ONLY tests written in 3.2
    - Verify all 6-8 tests pass
    - Do NOT run entire test suite

**Acceptance Criteria:**
- Test setup file configures Vitest correctly
- Each adapter has at least 1 unit test
- Tests demonstrate `createAdapterTest()` utility pattern
- All 6-8 adapter tests pass

**Files Created:**
- `examples/react-showcase/tests/setup.ts`
- `examples/react-showcase/tests/adapters.test.ts`

**Reference Code:**
- Pattern: `/Users/mohammadalmechkor/Projects/hex-di/packages/testing/src/index.ts`

---

### React Components

#### Task Group 4: UI Components Implementation
**Dependencies:** Task Group 2

- [x] 4.0 Complete React component implementation
  - [x] 4.1 Write 5-8 focused component tests
    - File: `examples/react-showcase/tests/components.test.tsx`
    - Test 1: ChatRoom renders with AutoScopeProvider
    - Test 2: ChatRoom user switch buttons trigger scope recreation
    - Test 3: MessageList displays messages from store
    - Test 4: MessageInput sends message via ChatService
    - Test 5: UserInfo displays current user name
    - Test 6: NotificationButton shows new instance ID on each click
    - Test 7: NotificationButton displays toast notification
    - Test 8: Full integration - send message flow works end-to-end
    - Use `renderWithContainer()` from `@hex-di/testing`
    - Use `TestGraphBuilder.override()` to inject mock adapters
    - Use `createMockAdapter()` for partial mock implementations
  - [x] 4.2 Create UserInfo component
    - File: `examples/react-showcase/src/components/UserInfo.tsx`
    - Use `usePort(UserSessionPort)` to get current user
    - Display user avatar (initials in circle) and name
    - Tailwind styling: avatar circle with initials, name text
    - Updates automatically when scope changes (user switch)
  - [x] 4.3 Create MessageList component
    - File: `examples/react-showcase/src/components/MessageList.tsx`
    - Use `usePort(MessageStorePort)` to get singleton store
    - Subscribe to message updates via `useEffect` + `store.subscribe()` pattern
    - Render messages as chat bubbles with sender name, content, timestamp
    - Show empty state: "No messages yet. Start the conversation!"
    - Tailwind styling: chat bubbles, alternating alignment based on sender
  - [x] 4.4 Create MessageInput component
    - File: `examples/react-showcase/src/components/MessageInput.tsx`
    - Use `usePort(ChatServicePort)` to get scoped chat service
    - Controlled input field with local state
    - Send button triggers `chatService.sendMessage(content)`
    - Clear input after successful send
    - Tailwind styling: input field, send button, flex layout
  - [x] 4.5 Create NotificationButton component
    - File: `examples/react-showcase/src/components/NotificationButton.tsx`
    - Use `usePort(NotificationServicePort)` on each button click
    - Track and display instance counter: "Instance #X created at HH:MM:SS"
    - Show brief toast notification (2-3 seconds) in corner
    - Tailwind styling: button, inline counter text, toast overlay
  - [x] 4.6 Create ChatRoom component with AutoScopeProvider
    - File: `examples/react-showcase/src/components/ChatRoom.tsx`
    - Wrap children in `<AutoScopeProvider>` to demonstrate scope lifecycle
    - Include user switch buttons: "Login as Alice", "Login as Bob"
    - User switch triggers scope recreation (key change on AutoScopeProvider)
    - Compose: UserInfo, MessageList, MessageInput, NotificationButton
    - Tailwind styling: card layout, header with user info, message area, input footer
  - [x] 4.7 Create App.tsx with ContainerProvider
    - File: `examples/react-showcase/src/App.tsx`
    - Import `ContainerProvider` from `./di/hooks.ts`
    - Import `DevToolsFloating` from `@hex-di/devtools/react`
    - Create container via `createContainer(graph)` at module level or in component
    - Wrap app in `<ContainerProvider container={container}>`
    - Render `<ChatRoom />` as main content
    - Include `<DevToolsFloating graph={graph} position="bottom-right" />`
    - Tailwind styling: centered layout, max-width container, clean background
  - [x] 4.8 Create main.tsx entry point
    - File: `examples/react-showcase/src/main.tsx`
    - Import React, ReactDOM, App, and CSS
    - Render App with `StrictMode`
    - Mount to `#root` element
  - [x] 4.9 Ensure component tests pass
    - Run ONLY tests written in 4.1
    - Verify all 5-8 component tests pass
    - Do NOT run entire test suite

**Acceptance Criteria:**
- All 5 components render correctly
- ChatRoom demonstrates AutoScopeProvider lifecycle
- MessageList updates reactively when messages are added
- MessageInput sends messages via scoped ChatService
- NotificationButton shows new instance ID on each click
- App.tsx integrates ContainerProvider and DevToolsFloating
- Tests from 4.1 pass (5-8 tests)

**Files Created:**
- `examples/react-showcase/src/components/UserInfo.tsx`
- `examples/react-showcase/src/components/MessageList.tsx`
- `examples/react-showcase/src/components/MessageInput.tsx`
- `examples/react-showcase/src/components/NotificationButton.tsx`
- `examples/react-showcase/src/components/ChatRoom.tsx`
- `examples/react-showcase/src/App.tsx`
- `examples/react-showcase/src/main.tsx`
- `examples/react-showcase/tests/components.test.tsx`

**Reference Code:**
- Pattern: `/Users/mohammadalmechkor/Projects/hex-di/packages/react/src/create-typed-hooks.tsx`
- Pattern: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/devtools-floating.tsx`
- Pattern: `/Users/mohammadalmechkor/Projects/hex-di/packages/testing/src/index.ts`

---

### Test Review and Integration

#### Task Group 5: Test Review, Gap Analysis, and Final Validation
**Dependencies:** Task Groups 1-4

- [x] 5.0 Review tests and validate complete integration
  - [x] 5.1 Review tests from Task Groups 2-4
    - Review 9 tests from graph.test.ts (Task 2.1)
    - Review 8 tests from adapters.test.ts (Task 3.2)
    - Review 9 tests from components.test.tsx (Task 4.1)
    - Total existing tests: 26 tests
  - [x] 5.2 Analyze test coverage gaps for THIS feature only
    - Identified critical user workflows are covered
    - All 15+ hex-di features are demonstrated
    - End-to-end workflows are tested in components.test.tsx
    - No critical gaps identified requiring additional tests
  - [x] 5.3 Write up to 10 additional strategic tests if needed
    - Analysis determined existing 26 tests provide comprehensive coverage
    - Scope disposal tested via user switch button tests
    - Message persistence tested via integration test
    - DevTools integration included in App.tsx
    - No additional tests needed
  - [x] 5.4 Run complete feature test suite
    - All 26 tests pass across 3 test files
    - graph.test.ts: 9 tests passed
    - adapters.test.ts: 8 tests passed
    - components.test.tsx: 9 tests passed
  - [x] 5.5 Validate all 15 hex-di features are demonstrated
    - Checklist verification:
      - [x] `createPort()` - 6 ports in ports.ts
      - [x] `createAdapter()` - 6 adapters in adapters.ts
      - [x] `GraphBuilder.provide().build()` - in graph.ts
      - [x] `createContainer()` - in App.tsx
      - [x] Service resolution via usePort - in all components
      - [x] `createTypedHooks()` - in hooks.ts
      - [x] `ContainerProvider` - in App.tsx
      - [x] `AutoScopeProvider` - in ChatRoom.tsx
      - [x] `usePort()` - in UserInfo, MessageList, MessageInput, NotificationButton
      - [x] `DevToolsFloating` - in App.tsx
      - [x] `TestGraphBuilder.override()` - in components.test.tsx
      - [x] `createMockAdapter()` - in components.test.tsx
      - [x] `createAdapterTest()` - in adapters.test.ts
      - [x] `renderWithContainer()` - exported in setup.ts (custom typed helper used)
      - [x] `assertGraphComplete()` - in graph.test.ts
      - [x] `serializeGraph()` - in graph.test.ts
  - [x] 5.6 Final integration smoke test
    - Vite dev server starts successfully on port 3000
    - Fixed vite.config.ts alias resolution for @hex-di/devtools/react
    - All TypeScript types compile correctly
    - All 26 tests pass

**Acceptance Criteria:**
- All feature-specific tests pass (26 tests total)
- All 15+ hex-di features are demonstrated and documented
- Critical user workflows are covered
- No additional tests added (existing coverage is sufficient)
- App runs successfully with all features working

---

## Execution Order

Recommended implementation sequence:

1. **Project Setup (Task Group 1)** - Foundation must be in place first
   - Package.json, TypeScript, Vite, Tailwind configuration
   - Shared types definition

2. **DI Layer (Task Group 2)** - Core architecture before components
   - Ports, adapters, graph, typed hooks
   - Graph validation tests

3. **Adapter Tests (Task Group 3)** - Validate adapters work correctly
   - Test setup configuration
   - Unit tests for all 6 adapters

4. **React Components (Task Group 4)** - UI implementation
   - Components from simplest to most complex
   - Order: UserInfo -> MessageList -> MessageInput -> NotificationButton -> ChatRoom -> App -> main

5. **Test Review & Integration (Task Group 5)** - Final validation
   - Gap analysis and additional tests
   - Feature checklist verification
   - Integration smoke test

---

## Summary of Files to Create

| Task Group | Files |
|------------|-------|
| 1. Setup | `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/index.css`, `src/types.ts` |
| 2. DI Layer | `src/di/ports.ts`, `src/di/adapters.ts`, `src/di/graph.ts`, `src/di/hooks.ts`, `tests/graph.test.ts` |
| 3. Adapter Tests | `tests/setup.ts`, `tests/adapters.test.ts` |
| 4. Components | `src/components/UserInfo.tsx`, `src/components/MessageList.tsx`, `src/components/MessageInput.tsx`, `src/components/NotificationButton.tsx`, `src/components/ChatRoom.tsx`, `src/App.tsx`, `src/main.tsx`, `tests/components.test.tsx` |
| 5. Integration | Additional tests as needed |

**Total Files:** 20 files (all in `examples/react-showcase/`)

---

## API Demonstrations Summary

This showcase demonstrates ALL 15 hex-di features:

| Feature | Location | Task |
|---------|----------|------|
| `createPort()` | `src/di/ports.ts` | 2.2 |
| `createAdapter()` | `src/di/adapters.ts` | 2.3 |
| `GraphBuilder.provide().build()` | `src/di/graph.ts` | 2.4 |
| `createContainer()` | `src/App.tsx` | 4.7 |
| `createTypedHooks()` | `src/di/hooks.ts` | 2.5 |
| `ContainerProvider` | `src/App.tsx` | 4.7 |
| `AutoScopeProvider` | `src/components/ChatRoom.tsx` | 4.6 |
| `usePort()` | All components | 4.2-4.6 |
| `DevToolsFloating` | `src/App.tsx` | 4.7 |
| `TestGraphBuilder.override()` | `tests/components.test.tsx` | 4.1 |
| `createMockAdapter()` | `tests/components.test.tsx` | 4.1 |
| `createAdapterTest()` | `tests/adapters.test.ts` | 3.2 |
| `renderWithContainer()` | `tests/components.test.tsx` | 4.1 |
| `assertGraphComplete()` | `tests/graph.test.ts` | 2.1 |
| `serializeGraph()` | `tests/graph.test.ts` | 2.1 |
