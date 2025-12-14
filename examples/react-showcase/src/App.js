import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * App component - Root component for the React Showcase Chat Dashboard.
 *
 * Sets up ContainerProvider with the DI container and renders the
 * ChatRoom component. Includes DevToolsFloating for development.
 *
 * @packageDocumentation
 */
import { createContainer } from "@hex-di/runtime";
import { DevToolsFloating, createTracingContainer } from "@hex-di/devtools";
import { ContainerProvider } from "./di/hooks.js";
import { appGraph } from "./di/graph.js";
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
const baseContainer = createContainer(appGraph);
const container = createTracingContainer(baseContainer);
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
export function App() {
    return (_jsxs(ContainerProvider, { container: container, children: [_jsx("div", { className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8", children: _jsxs("div", { className: "container mx-auto px-4", children: [_jsxs("header", { className: "mb-8 text-center", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-800", children: "HexDI React Showcase" }), _jsx("p", { className: "mt-2 text-gray-600", children: "Real-Time Chat Dashboard demonstrating dependency injection patterns" })] }), _jsx(ChatRoom, {}), _jsx("footer", { className: "mt-8 text-center text-sm text-gray-500", children: _jsx("p", { children: "This showcase demonstrates singleton, scoped, and request lifetimes with reactive updates and DevTools integration." }) })] }) }), _jsx(DevToolsFloating, { graph: appGraph, container: container, position: "bottom-right" })] }));
}
//# sourceMappingURL=App.js.map