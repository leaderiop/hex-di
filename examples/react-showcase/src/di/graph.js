/**
 * Dependency graph composition for the React Showcase Chat Dashboard.
 *
 * This file builds the complete dependency graph by registering all adapters
 * with the GraphBuilder. The graph is validated at compile-time to ensure
 * all dependencies are satisfied.
 *
 * @packageDocumentation
 */
import { GraphBuilder } from "@hex-di/graph";
import { ConfigAdapter, LoggerAdapter, MessageStoreAdapter, UserSessionAdapter, ChatServiceAdapter, NotificationServiceAdapter, } from "./adapters.js";
// =============================================================================
// Graph Construction
// =============================================================================
/**
 * The complete dependency graph for the React Showcase application.
 *
 * This graph contains all 6 adapters registered in dependency order:
 * 1. ConfigAdapter (singleton, no dependencies)
 * 2. LoggerAdapter (singleton, no dependencies)
 * 3. MessageStoreAdapter (singleton, requires Logger)
 * 4. UserSessionAdapter (scoped, no dependencies)
 * 5. ChatServiceAdapter (scoped, requires Logger, UserSession, MessageStore)
 * 6. NotificationServiceAdapter (request, requires Logger, Config)
 *
 * The graph is validated at compile-time. If any required dependencies
 * are missing, TypeScript will produce a compile error with a message
 * like "Missing dependencies: PortName".
 *
 * @example Using the graph with createContainer
 * ```typescript
 * import { createContainer } from "@hex-di/runtime";
 * import { appGraph } from "./di/graph";
 *
 * const container = createContainer(appGraph);
 * const logger = container.resolve(LoggerPort);
 * ```
 *
 * @example Using with DevTools
 * ```typescript
 * import { DevToolsFloating } from "@hex-di/devtools";
 * import { appGraph } from "./di/graph";
 *
 * <DevToolsFloating graph={appGraph} position="bottom-right" />
 * ```
 */
export const appGraph = GraphBuilder.create()
    // Singleton adapters (no dependencies first)
    .provide(ConfigAdapter)
    .provide(LoggerAdapter)
    // Singleton adapter with dependencies
    .provide(MessageStoreAdapter)
    // Scoped adapters
    .provide(UserSessionAdapter)
    .provide(ChatServiceAdapter)
    // Request-scoped adapter
    .provide(NotificationServiceAdapter)
    .build();
/**
 * Compile-time verification that the graph is valid.
 * This will cause a compile error if the graph is incomplete.
 */
const _verifyGraphComplete = true;
// Prevent unused variable warning
void _verifyGraphComplete;
//# sourceMappingURL=graph.js.map