# @hex-di/ports Package Standards

## Purpose
Define architectural boundaries through typed port tokens. This is the innermost package with zero dependencies.

## Core Responsibilities
- Provide Port token creation utilities
- Express dependency requirements at the type level
- Enable inner layers to remain framework-agnostic

## Design Constraints

### Zero Runtime Behavior
- No factory functions that create instances
- No lifetime management
- No container awareness
- Pure type-level constructs with minimal runtime footprint

### No External Dependencies
- This package has zero npm dependencies
- Only TypeScript built-in types

## Port Token Design

### Identity
- Each port has a unique string identifier
- Identifier is used for debugging/error messages only
- Type identity is the primary mechanism

### Type Safety
- Port carries its service interface type
- Ports are branded to prevent accidental substitution
- Type-level dependency declaration (no runtime impact)

## API Surface
- `createPort<T>(name)` - Create a port token for interface T
- Optional: `Port.requires()` for type-level dependency declaration
- Keep API minimal - add only what's necessary

## Success Criteria
- Inner layers (domain, use cases) import only this package
- Ports serve as stable contracts between layers
- Architecture is clear from port definitions alone
- Zero bundle size impact beyond port declarations
