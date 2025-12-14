/**
 * Test setup configuration for the React Showcase App.
 *
 * This file configures Vitest with jsdom environment, sets up React Testing Library,
 * and imports jest-dom matchers for enhanced DOM assertions.
 *
 * @packageDocumentation
 */
import "@testing-library/jest-dom/vitest";
// =============================================================================
// Test Environment Configuration
// =============================================================================
/**
 * Vitest configuration note:
 * The jsdom environment is configured in vite.config.ts under test.environment.
 * This setup file is automatically loaded by Vitest before each test file.
 */
// =============================================================================
// Common Test Utilities Re-exports
// =============================================================================
/**
 * Re-export testing utilities from @hex-di/testing for convenient access.
 *
 * @example
 * ```typescript
 * import { createAdapterTest, TestGraphBuilder } from './setup';
 * ```
 */
export { createAdapterTest, createMockAdapter, TestGraphBuilder, assertGraphComplete, serializeGraph, renderWithContainer, } from "@hex-di/testing";
/**
 * Re-export React Testing Library utilities.
 *
 * @example
 * ```typescript
 * import { render, screen, fireEvent } from './setup';
 * ```
 */
export { render, screen, fireEvent, waitFor } from "@testing-library/react";
/**
 * Re-export Vitest utilities.
 *
 * @example
 * ```typescript
 * import { describe, it, expect, vi } from './setup';
 * ```
 */
export { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
//# sourceMappingURL=setup.js.map