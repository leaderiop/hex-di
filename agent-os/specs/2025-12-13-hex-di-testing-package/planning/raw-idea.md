# Raw Idea: @hex-di/testing Package

Build the `@hex-di/testing` package - testing utilities for HexDI dependency injection library. This covers roadmap items 14-16:

- Item 14: Test Graph Builder with `.override(Port, TestAdapter)` method for explicit adapter replacement
- Item 15: Mock Adapter Utilities - helper functions for creating type-checked mock adapters with minimal boilerplate and spy integration
- Item 16: Test Container Isolation - test container utilities ensuring fresh containers per test with proper cleanup and parallel test safety

This package will depend on @hex-di/ports, @hex-di/graph, and @hex-di/runtime.
