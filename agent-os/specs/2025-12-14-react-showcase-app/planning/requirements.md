# Spec Requirements: React Showcase App

## Initial Description

This is a React example app that demonstrates all hex-di library features:
- Real-Time Chat Dashboard theme
- 6 services with dependency hierarchy (singleton, scoped, request lifetimes)
- Reactive subscription patterns
- DevToolsFloating integration
- Testing utilities demonstration
- Located in examples/react-showcase/

## Requirements Discussion

### First Round Questions

**Q1:** I assume the Real-Time Chat Dashboard is meant to be visually functional (users can type messages, see them appear, switch users) but does NOT require actual backend/WebSocket integration - all state will be in-memory via MessageStorePort. Is that correct?
**Answer:** Confirmed. In-memory state only, no backend/WebSocket integration.

**Q2:** For demonstrating scoped lifetime via UserSessionPort, I assume we need a way to "log in" as different users (perhaps a dropdown or buttons like "Login as Alice", "Login as Bob") to show how AutoScopeProvider creates fresh scoped instances. Should this be a simple UI mechanism, or do you want a more elaborate login form?
**Answer:** Simple user switch with buttons like "Login as Alice", "Login as Bob".

**Q3:** For the request lifetime demonstration via NotificationServicePort, I assume clicking the NotificationButton should show some visual feedback that proves a new instance was created each time. Should this be a toast notification, or a simpler inline display showing "Notification #X sent at [timestamp]"?
**Answer:** Deferred to UI/UX expert decision.

**Q4:** You mentioned "bottom-right" for the DevTools panel. I assume this should be a floating panel that's collapsible/expandable. Is it acceptable to use the existing `@hex-di/devtools` package's `DevToolsFloating` component as-is?
**Answer:** Not explicitly answered - proceeding with using existing DevToolsFloating component.

**Q5:** For testing, should we have unit tests for each adapter, graph validation tests, and component integration tests? Is there a specific coverage percentage target?
**Answer:** Not explicitly answered - proceeding with demonstrating each testing utility as the primary goal.

**Q6:** I assume this showcase should have minimal but clean styling. Should we use any specific styling approach?
**Answer:** Tailwind CSS

**Q7:** I assume all code should use strict TypeScript with no `any` types. Is there anything specific about type annotations you want highlighted?
**Answer:** Not explicitly answered - proceeding with strict TypeScript, no `any` types.

**Q8:** Is there anything specifically OUT of scope for this showcase?
**Answer:** Standard exclusions: no persistence, routing, real network calls, or authentication.

### Existing Code to Reference

**Similar Features Identified:**
- Package: `@hex-di/react` - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/react/src/`
  - `createTypedHooks` pattern in `create-typed-hooks.tsx`
  - Provider components in `context.tsx`
  - Hook implementations in `use-port.ts`, `use-container.ts`
- Package: `@hex-di/devtools` - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/`
  - `DevToolsFloating` component in `devtools-floating.tsx`
  - Panel implementation in `devtools-panel.tsx`
- Package: `@hex-di/testing` - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/testing/`
  - Test patterns in `tests/test-graph-builder.test.ts`
  - Mock adapter patterns throughout test files

### Follow-up Questions

**Follow-up 1:** UI/UX decision for NotificationButton demonstrating request lifetime pattern
**Answer (Expert Decision):** Use a **dual-feedback approach** combining:
1. **Inline instance counter**: Shows "Instance #X created at [HH:MM:SS]" directly in the button area, proving each click creates a new NotificationService instance
2. **Brief toast notification**: A small toast appears briefly (2-3 seconds) in the corner showing the notification message, demonstrating real-world usage

This approach was chosen because:
- The inline counter makes the "request lifetime = new instance every time" concept immediately obvious to developers studying the showcase
- The toast demonstrates a realistic notification UX pattern
- Together they provide clear educational value about when/why to use request lifetime

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A - No visual files found in planning/visuals/ folder.

## Requirements Summary

### Functional Requirements

**User Stories:**

1. **As a developer**, I want to see a working chat interface so I can understand how hex-di manages state across components
   - Acceptance Criteria:
     - Can type and send messages
     - Messages appear in real-time in the message list
     - Messages persist within the session (in-memory)
     - Clear visual feedback when message is sent

2. **As a developer**, I want to switch between different users so I can see how scoped lifetime creates isolated instances
   - Acceptance Criteria:
     - Buttons to switch between at least 2 users (Alice, Bob)
     - Switching users creates a new scope (visible in DevTools)
     - Each user's session data is isolated
     - Messages show which user sent them

3. **As a developer**, I want to click a notification button so I can see request lifetime creating new instances
   - Acceptance Criteria:
     - Each click shows a new instance number
     - Timestamp proves fresh creation
     - Toast notification provides realistic UX example
     - DevTools shows request-scoped resolution

4. **As a developer**, I want to see the DevTools panel so I can inspect the container state
   - Acceptance Criteria:
     - Floating panel in bottom-right corner
     - Can expand/collapse the panel
     - Shows resolved services and their lifetimes
     - Shows scope hierarchy when user switches

5. **As a developer**, I want to see reactive message updates so I can understand subscription patterns
   - Acceptance Criteria:
     - MessageList updates automatically when new messages arrive
     - No manual refresh needed
     - Demonstrates usePort with reactive service

### Technical Requirements

**Service Architecture (6 Services):**

| Port | Interface | Lifetime | Dependencies | Implementation Notes |
|------|-----------|----------|--------------|---------------------|
| ConfigPort | `Config` | singleton | none | App configuration (notification duration, max messages, etc.) |
| LoggerPort | `Logger` | singleton | none | Console logging with service prefix |
| MessageStorePort | `MessageStore` | singleton | LoggerPort | In-memory message storage with subscription support |
| UserSessionPort | `UserSession` | scoped | none | Current user info (id, name, avatar) |
| ChatServicePort | `ChatService` | scoped | LoggerPort, UserSessionPort, MessageStorePort | Send message as current user |
| NotificationServicePort | `NotificationService` | request | LoggerPort, ConfigPort | Create and display notifications |

**Component Requirements:**

1. **ChatRoom.tsx** - Container component demonstrating AutoScopeProvider
   - Must wrap children in `<AutoScopeProvider>`
   - Contains user switch buttons
   - Demonstrates scope lifecycle tied to React component
   - When user switches, new scope is created

2. **MessageList.tsx** - Demonstrates reactive subscription with usePort
   - Uses `usePort(MessageStorePort)` to get store
   - Subscribes to message updates (useEffect + subscription pattern)
   - Renders list of messages with sender, content, timestamp
   - Shows loading/empty states appropriately

3. **MessageInput.tsx** - Demonstrates scoped ChatService usage
   - Uses `usePort(ChatServicePort)` to send messages
   - Input field with send button
   - Clears input after send
   - Disabled state while sending (optional)

4. **UserInfo.tsx** - Displays current scoped UserSession
   - Uses `usePort(UserSessionPort)` to display current user
   - Shows user name and avatar/initial
   - Updates when scope changes (user switch)

5. **NotificationButton.tsx** - Demonstrates request lifetime
   - Uses `usePort(NotificationServicePort)` on each click (or stores reference and calls method)
   - Shows instance counter and timestamp inline
   - Triggers toast notification
   - Button label: "Send Notification"

**App.tsx Requirements:**
- Sets up ContainerProvider with root container
- Renders ChatRoom with all child components
- Includes DevToolsFloating component
- Clean layout with Tailwind CSS

**DI Setup (src/di/ folder):**

1. **ports.ts** - All 6 port definitions using `createPort()`
2. **adapters.ts** - All 6 adapter implementations using `createAdapter()`
3. **graph.ts** - Graph built with `GraphBuilder.provide().build()`
4. **hooks.ts** - Typed hooks created with `createTypedHooks()`

### API Demonstrations Checklist

The showcase MUST demonstrate all 15 hex-di features:

**Core (@hex-di/ports, @hex-di/graph, @hex-di/runtime):**
1. [ ] `createPort()` - 6 typed port tokens in ports.ts
2. [ ] `createAdapter()` - 6 adapters with provides/requires/lifetime in adapters.ts
3. [ ] `GraphBuilder.provide().build()` - Compile-time validated graph in graph.ts
4. [ ] `createContainer()` - Container creation in main.tsx or App.tsx
5. [ ] Service resolution via hooks (implicitly through usePort)

**React Integration (@hex-di/react):**
6. [ ] `createTypedHooks()` - Typed React integration in hooks.ts
7. [ ] `ContainerProvider` - Root DI context in App.tsx
8. [ ] `AutoScopeProvider` - Auto scope lifecycle in ChatRoom.tsx
9. [ ] `usePort()` - Type-safe service resolution in all components

**DevTools (@hex-di/devtools):**
10. [ ] `DevToolsFloating` - Dev panel in bottom-right in App.tsx

**Testing (@hex-di/testing):**
11. [ ] `TestGraphBuilder.override()` - Test graph with mocks in tests/
12. [ ] `createMockAdapter()` - Partial mock implementations in tests/
13. [ ] `createAdapterTest()` - Isolated adapter testing in adapters.test.ts
14. [ ] `renderWithContainer()` - RTL + DI integration in components.test.tsx
15. [ ] `assertGraphComplete()` - Runtime validation in graph.test.ts
16. [ ] `serializeGraph()` - Snapshot testing in graph.test.ts

### Test Coverage Requirements

**tests/setup.ts:**
- Vitest configuration
- React Testing Library setup
- Mock adapter utilities setup

**tests/adapters.test.ts:**
- Unit test for each of 6 adapters
- Tests adapter factory functions
- Tests dependency injection works correctly
- Demonstrates `createAdapterTest()` utility

**tests/graph.test.ts:**
- Test complete graph builds successfully
- Test missing dependency detection
- Demonstrates `assertGraphComplete()`
- Demonstrates `serializeGraph()` for snapshot testing

**tests/components.test.tsx:**
- Integration tests for each of 5 components
- Uses `renderWithContainer()` utility
- Uses `TestGraphBuilder.override()` to inject mocks
- Tests user interactions (send message, switch user, click notification)

### Scope Boundaries

**In Scope:**
- Complete working chat dashboard UI
- All 6 services with proper DI wiring
- All 15 hex-di features demonstrated
- Tailwind CSS styling
- DevTools integration
- Comprehensive test suite
- TypeScript strict mode throughout

**Out of Scope:**
- Backend/API integration
- WebSocket/real-time network connections
- Data persistence (localStorage, database)
- Routing (single page app)
- Authentication/authorization
- Production deployment configuration
- Performance optimization
- Accessibility compliance (best effort only)
- Mobile responsive design (best effort only)
- Internationalization

### Technical Considerations

**Build Setup:**
- Vite as build tool (vite.config.ts)
- TypeScript strict mode (tsconfig.json)
- Tailwind CSS configured
- Vitest for testing

**Dependencies (package.json):**
- `@hex-di/ports` - workspace dependency
- `@hex-di/graph` - workspace dependency
- `@hex-di/runtime` - workspace dependency
- `@hex-di/react` - workspace dependency
- `@hex-di/testing` - dev dependency
- `@hex-di/devtools` - dev dependency
- `react` and `react-dom` - React 18+
- `tailwindcss` - styling
- `vite` - bundler
- `vitest` - testing
- `@testing-library/react` - component testing

**Folder Structure:**
```
examples/react-showcase/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── src/
│   ├── main.tsx              # App entry, createContainer
│   ├── App.tsx               # ContainerProvider, layout, DevTools
│   ├── di/
│   │   ├── ports.ts          # 6 port definitions
│   │   ├── adapters.ts       # 6 adapter implementations
│   │   ├── graph.ts          # GraphBuilder composition
│   │   └── hooks.ts          # createTypedHooks
│   ├── components/
│   │   ├── ChatRoom.tsx      # AutoScopeProvider, user switch
│   │   ├── MessageList.tsx   # Reactive subscription
│   │   ├── MessageInput.tsx  # Scoped ChatService
│   │   ├── UserInfo.tsx      # Scoped UserSession
│   │   └── NotificationButton.tsx  # Request lifetime demo
│   ├── types.ts              # Shared TypeScript interfaces
│   └── index.css             # Tailwind imports
└── tests/
    ├── setup.ts              # Test configuration
    ├── adapters.test.ts      # Adapter unit tests
    ├── graph.test.ts         # Graph validation tests
    └── components.test.tsx   # Component integration tests
```

**Code Style:**
- Follow hex-di conventions (kebab-case files, PascalCase types, camelCase functions)
- No `any` types
- Full TSDoc comments on ports and adapters
- Demonstrate type inference throughout
