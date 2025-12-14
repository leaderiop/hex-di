# Product Roadmap

1. [x] Port Token System — Implement `createPort<T>(name)` function that creates typed, branded port tokens serving as compile-time contracts for service interfaces `S`

2. [x] Adapter Metadata Structure — Define adapter metadata types that capture provided port, required ports, lifetime scope, and factory function signature with full type inference `S`

3. [x] Graph Builder Foundation — Implement immutable graph builder with `.provide()` method that accumulates provided ports at the type level and validates against required dependencies `M`

4. [x] Graph Validation and Build — Implement `.build()` terminal method that ensures all required ports are satisfied at compile-time, producing a validated Graph object `M`

5. [x] Compile-Time Error Messages — Implement template literal types that produce readable error messages for missing dependencies, duplicate providers, and type mismatches `S`

6. [x] Container Creation — Implement container factory that accepts only validated Graph objects and provides the foundation for service resolution `M`

7. [x] Service Resolution — Implement type-safe `resolve(Port)` method that returns correctly-typed service instances from the container `S`

8. [x] Singleton Lifetime — Implement singleton lifetime scope where one instance is created per root container and shared across all resolutions and scopes `S`

9. [x] Scoped Lifetime — Implement scoped lifetime with `createScope()` method that creates child containers with their own scoped instances while inheriting singletons `M`

10. [x] Request Lifetime — Implement request lifetime scope where each `resolve()` call creates a new instance with no caching `S`

11. [x] React Provider Component — Implement `ContainerProvider` component that provides container via React context with support for nested scoped providers `S`

12. [x] usePort Hook — Implement `usePort(PortToken)` hook that returns typed service instances with proper error handling for missing providers `S`

13. [x] useContainer Hook — Implement `useContainer()` hook for advanced use cases requiring direct container access for dynamic resolution `XS`

14. [x] Test Graph Builder — Implement test utilities for building test-specific graphs with `.override(Port, TestAdapter)` method for explicit adapter replacement `M`

15. [x] Mock Adapter Utilities — Implement helper functions for creating type-checked mock adapters with minimal boilerplate and spy integration `S`

16. [x] Test Container Isolation — Implement test container utilities ensuring fresh containers per test with proper cleanup and parallel test safety `S`

17. [x] Graph Visualization Export — Implement graph export to JSON, DOT (Graphviz), and Mermaid formats for documentation and tooling integration `M`

18. [x] Container State Inspection — Implement runtime inspection utilities to view resolved services, instance lifetimes, and scope hierarchy `S`

19. [x] Resolution Tracing — Implement resolution tracing for debugging that shows resolution order and identifies slow factories `S`

20. [x] Browser DevTools Panel — Implement optional React DevTools integration showing container state and linking services to components `L`

> Notes
> - Order follows technical dependencies: ports -> graph -> runtime -> react -> testing -> devtools
> - Items 1-10 form the framework-agnostic core
> - Items 11-13 deliver the React integration (essential for React-first positioning)
> - Items 14-16 enable the testing story
> - Items 17-20 provide developer experience tooling
> - Each item represents a complete, testable feature with frontend and/or backend functionality
