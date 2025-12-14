# Product Mission

## Pitch

HexDI is a compile-time validated dependency injection library that helps TypeScript and React developers build maintainable, testable applications by providing type-safe architectural boundaries with zero runtime DI errors.

## Users

### Primary Customers

- **Enterprise TypeScript Teams**: Organizations building large-scale applications that need architectural guardrails and compile-time safety
- **React Developers**: Frontend developers seeking a DI solution that integrates naturally with React patterns and hooks
- **Clean Architecture Enthusiasts**: Developers who follow hexagonal/ports-and-adapters architecture and need tooling that enforces these patterns

### User Personas

**Senior Frontend Architect** (35-45)
- **Role:** Technical lead on a React application with 50+ components
- **Context:** Enterprise environment with multiple teams contributing to a shared codebase
- **Pain Points:** Runtime crashes from misconfigured DI, difficulty onboarding new developers, inconsistent dependency patterns across teams
- **Goals:** Establish architectural boundaries that are enforced at compile-time, reduce production incidents from DI errors

**React Developer** (25-35)
- **Role:** Full-stack developer building React applications
- **Context:** Startup or mid-size company, shipping features quickly
- **Pain Points:** Testing is painful with tightly coupled components, mocking is verbose and error-prone, existing DI solutions feel heavyweight
- **Goals:** Write testable code without boilerplate, catch errors before they reach production

**AI-Assisted Developer** (Any age)
- **Role:** Developer using AI coding assistants (Copilot, Claude, etc.)
- **Context:** Leveraging AI for code generation and refactoring
- **Pain Points:** AI struggles to understand implicit dependencies and runtime-configured DI containers
- **Goals:** Codebase structure that AI can understand and work with effectively

## The Problem

### Runtime DI Failures

Traditional dependency injection containers validate at runtime, meaning missing or misconfigured dependencies only surface when code executes. In production, this leads to crashes, degraded user experience, and emergency fixes.

**Our Solution:** HexDI validates the complete dependency graph at compile-time. If your code compiles, all dependencies are satisfied. Zero runtime DI errors.

### Type Safety Theater

Existing TypeScript DI solutions (InversifyJS, TSyringe) use decorators and string tokens that bypass TypeScript's type system. You get the syntax of type safety without the guarantees.

**Our Solution:** HexDI uses typed port tokens and builder patterns that leverage TypeScript's type inference. Missing dependencies appear as compile-time errors with actionable messages.

### Testing Friction

Testing DI-heavy code typically requires global mock registrations, complex setup, and implicit state. Tests become brittle and don't mirror production wiring.

**Our Solution:** HexDI's testing package enables explicit graph composition. Override specific ports with test adapters. Tests are explicit, isolated, and mirror production architecture.

### Framework Lock-in

Most DI libraries are either framework-agnostic but awkward with React, or React-specific but limited. Developers must choose between integration quality and flexibility.

**Our Solution:** HexDI has a framework-agnostic core (`@hex-di/ports`, `@hex-di/graph`, `@hex-di/runtime`) with a first-class React adapter (`@hex-di/react`). Best of both worlds.

### AI Comprehension Gap

AI coding assistants struggle with implicit dependencies, runtime-configured containers, and decorator-based DI. They generate incorrect code or miss dependencies entirely.

**Our Solution:** HexDI's explicit port declarations and typed graph composition create a codebase structure that AI can parse, understand, and work with effectively.

## Differentiators

### Compile-Time Validation (Like Effect, Unlike Everyone Else)

Unlike InversifyJS, TSyringe, and Typed-inject which validate at runtime, HexDI validates the complete dependency graph at compile-time. This is the same approach that makes Effect powerful for error handling. If it compiles, it works.

**Result:** Zero runtime DI errors in production. Faster feedback loop during development. Confident refactoring.

### React-First Design

Unlike general-purpose DI libraries that treat React as an afterthought, HexDI is designed with React as a primary target. The `@hex-di/react` package provides idiomatic hooks (`usePort`) that feel native to React development.

**Result:** Natural integration with React patterns. No awkward bridging code. Hooks-based API that React developers expect.

### Hexagonal Architecture Native

Unlike general-purpose DI containers, HexDI is built specifically for hexagonal (ports and adapters) architecture. The vocabulary (Ports, Adapters, Graph) and patterns directly map to clean architecture concepts.

**Result:** Architecture is enforced by tooling, not just convention. Inner layers remain pure and framework-agnostic.

### AI-Friendly by Design

Unlike decorator-based or runtime-configured DI, HexDI's explicit type-level declarations create a codebase that AI tools can understand. Dependencies are visible in types, not hidden in decorators or runtime registrations.

**Result:** Better AI code generation. More accurate refactoring suggestions. AI can reason about your architecture.

## Key Features

### Core Features

- **Typed Port Tokens:** Define architectural boundaries with compile-time type safety
- **Graph Composition:** Build and validate dependency graphs with a fluent builder API
- **Lifetime Management:** Singleton, scoped, and request lifetimes with clear semantics
- **Container Resolution:** Type-safe service resolution from validated graphs

### React Integration

- **Provider Component:** Single provider at app root with optional scoped providers
- **usePort Hook:** Type-safe access to services via port tokens
- **useContainer Hook:** Advanced access for dynamic resolution scenarios
- **SSR Compatible:** Patterns for server-side rendering without global state

### Testing Support

- **Graph Overrides:** Replace adapters explicitly for testing
- **Test Container Utilities:** Fresh, isolated containers per test
- **Mock Adapter Helpers:** Type-checked mock creation with minimal boilerplate
- **Parallel Test Safe:** No shared state between tests

### Developer Experience

- **Graph Visualization:** Export to JSON, DOT, Mermaid formats
- **Runtime Inspection:** View resolved services and scope hierarchy
- **Readable Error Messages:** Template literal types for actionable errors
- **Zero Configuration:** Sensible defaults, escape hatches when needed
