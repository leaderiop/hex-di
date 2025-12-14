# @hex-di/runtime Package Standards

## Purpose
Deterministic execution of a validated architecture. This package creates containers from validated graphs and manages service lifetimes.

## Core Responsibilities
- Create containers from validated graphs
- Manage instance lifetimes
- Resolve dependencies deterministically
- Support scoped execution contexts

## Design Constraints

### Framework-Agnostic
- No React imports
- No DOM dependencies
- Usable in Node.js, browser, or any JS runtime

### No Dynamic Lookup
- Services resolved by port token, not string
- All ports known at compile time
- No service locator pattern

### Deterministic Resolution
- Same inputs = same resolution order
- No ambient/global state
- Predictable instance creation

## Lifetime Semantics

### Singleton
- One instance per root container
- Created on first resolution
- Shared across all scopes

### Scoped
- One instance per scope
- Created on first resolution within scope
- Different scopes have different instances

### Request
- New instance per resolution
- No caching
- Each `resolve()` call creates new instance

## Container API

### Creation
- Container created only from validated Graph
- No way to create container with missing dependencies

### Resolution
- `resolve(Port)` returns service instance
- Type-safe: return type matches Port's interface
- Throws only for programming errors (should never happen with validated graph)

### Scoping
- `createScope()` creates child container
- Child inherits singletons from parent
- Child has own scoped instances

## Success Criteria
- Zero runtime DI errors with validated graph
- Predictable instance lifecycle
- Clear scoping semantics
- Memory-efficient instance management
