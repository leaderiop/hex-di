# Runtime Package - Initial Idea

## Description

Implement the `@hex-di/runtime` package for HexDI, covering roadmap items 6-10:

- **Item 6**: Container Creation - Implement the core DI container with registration and configuration capabilities
- **Item 7**: Service Resolution - Build the service resolution engine with dependency graph traversal
- **Item 8**: Lifetime Scopes - Implement scoped, transient, and singleton lifetime management
- **Item 9**: Circular Dependency Detection - Add runtime detection and error handling for circular dependencies
- **Item 10**: Error Handling - Comprehensive error messages and diagnostics for resolution failures

This package will provide the runtime functionality that brings together the core abstractions and metadata from previous packages to create a fully functional dependency injection system.

## Key Components

1. **Container Implementation**: Core container class that manages service registrations and resolutions
2. **Resolution Engine**: Dependency graph traversal and service instantiation logic
3. **Lifetime Management**: Scope hierarchy and instance lifecycle management
4. **Validation & Diagnostics**: Runtime validation, circular dependency detection, and detailed error reporting

## Dependencies

- `@hex-di/core` - Core abstractions and interfaces
- `@hex-di/metadata` - Decorator metadata for dependency resolution

## Success Criteria

- Container can register and resolve services with all lifetime scopes
- Proper handling of constructor injection, property injection, and method injection
- Circular dependencies are detected and reported with clear error messages
- Comprehensive test coverage for all resolution scenarios
- Full TypeScript type safety maintained throughout
