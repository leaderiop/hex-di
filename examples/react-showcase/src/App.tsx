/**
 * App component - Root component for the React Showcase Chat Dashboard.
 *
 * Sets up ContainerProvider with the DI container and renders the
 * ChatRoom component. Includes DevToolsFloating for development.
 *
 * @packageDocumentation
 */

import { DevToolsFloating, createTracingContainer } from "@hex-di/devtools";
import { ContainerProvider } from "./di/hooks.js";
import { appGraph, type AppPorts } from "./di/graph.js";
import { ChatRoom } from "./components/ChatRoom.js";

// =============================================================================
// Container Creation
// =============================================================================

/**
 * Create the DI container from the application graph.
 *
 * This is created at module level to ensure a single container instance
 * for the application lifetime. In SSR scenarios, this would be created
 * per-request instead.
 *
 * The container is wrapped with tracing to enable resolution tracking
 * in the DevTools panel.
 */
const container = createTracingContainer<AppPorts>(appGraph);
// =============================================================================
// App Component
// =============================================================================

/**
 * Root application component.
 *
 * Features:
 * - ContainerProvider wraps the app to provide DI context
 * - ChatRoom is the main application content
 * - DevToolsFloating provides development tools in bottom-right corner
 *
 * @example
 * ```tsx
 * import { StrictMode } from "react";
 * import { createRoot } from "react-dom/client";
 * import { App } from "./App";
 *
 * createRoot(document.getElementById("root")!).render(
 *   <StrictMode>
 *     <App />
 *   </StrictMode>
 * );
 * ```
 */
export function App(): JSX.Element {
  return (
    <ContainerProvider container={container}>
      {/* Main application layout */}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="container mx-auto px-4">
          {/* App title */}
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-800">
              HexDI React Showcase
            </h1>
            <p className="mt-2 text-gray-600">
              Real-Time Chat Dashboard demonstrating dependency injection
              patterns
            </p>
          </header>

          {/* Chat room content */}
          <ChatRoom />

          {/* Feature explanation */}
          <footer className="mt-8 text-center text-sm text-gray-500">
            <p>
              This showcase demonstrates singleton, scoped, and request
              lifetimes with reactive updates and DevTools integration.
            </p>
          </footer>
        </div>
      </div>

      {/* DevTools floating panel with tracing enabled */}
      <DevToolsFloating
        graph={appGraph}
        container={container}
        position="bottom-right"
      />
    </ContainerProvider>
  );
}
