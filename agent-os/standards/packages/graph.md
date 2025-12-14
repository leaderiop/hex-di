# @hex-di/graph Package Standards

## Purpose
Compile-time architectural validation. This package defines how adapters compose into a validated dependency graph.

## Core Responsibilities
- Define Adapter metadata structure
- Compose adapters into a Graph
- Validate dependency completeness at compile time
- Detect architectural errors before runtime

## Design Constraints

### No Runtime Execution
- Graph is a compile-time/build-time construct
- No instance creation
- No service resolution
- Purely structural and typed

### No React
- Framework-agnostic
- Can be used in any TypeScript environment

## Adapter Metadata

### Required Information
- Which Port this adapter provides
- Which Ports this adapter depends on
- Lifetime scope (singleton/scoped/request)
- Factory function signature

### Type-Level Tracking
- Adapters declare provided and required ports at type level
- Graph accumulates provided ports as adapters are added
- Missing dependencies surface as type errors

## Graph Composition

### Builder Pattern
- Incremental graph construction
- Each `.provide()` call validates against current state
- Final `.build()` ensures completeness

### Validation Rules
- All required ports must be provided
- No duplicate providers for same port
- Optional: detect circular dependencies

## Error Messaging
- Use template literal types for readable errors
- Include missing port names in error messages
- Point to the adapter causing the issue

## Success Criteria
- Missing adapter = compile-time error
- Graph represents complete system architecture
- Type errors are actionable and clear
