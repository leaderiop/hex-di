/**
 * Typed React hooks for the React Showcase Chat Dashboard.
 *
 * This file creates typed React integration using `createTypedHooks<AppPorts>()`.
 * The exported components and hooks are bound to the AppPorts type, providing
 * compile-time validation for port resolution.
 *
 * @packageDocumentation
 */

import { createTypedHooks } from "@hex-di/react";
import type { AppPorts } from "./ports.js";

// =============================================================================
// Typed React Integration
// =============================================================================

/**
 * Create typed React integration bound to AppPorts.
 *
 * This factory creates an isolated set of React components and hooks
 * that are type-safe for our application's port definitions. Each call
 * to usePort will validate at compile-time that the port is in AppPorts.
 */
const typedHooks = createTypedHooks<AppPorts>();

// =============================================================================
// Provider Components
// =============================================================================

/**
 * Root container provider component.
 *
 * Wraps the application tree to provide the DI container context.
 * All usePort calls within this provider will resolve from the container.
 *
 * @example
 * ```tsx
 * import { ContainerProvider } from "./di/hooks";
 * import { createContainer } from "@hex-di/runtime";
 * import { appGraph } from "./di/graph";
 *
 * const container = createContainer(appGraph);
 *
 * function App() {
 *   return (
 *     <ContainerProvider container={container}>
 *       <ChatRoom />
 *     </ContainerProvider>
 *   );
 * }
 * ```
 */
export const ContainerProvider = typedHooks.ContainerProvider;

/**
 * Automatic scope provider component.
 *
 * Creates a new scope on mount and disposes it on unmount.
 * Use this to isolate scoped services (like UserSession) to a
 * specific part of the component tree.
 *
 * @example
 * ```tsx
 * import { AutoScopeProvider } from "./di/hooks";
 *
 * function ChatRoom() {
 *   return (
 *     <AutoScopeProvider>
 *       <UserInfo />
 *       <MessageList />
 *       <MessageInput />
 *     </AutoScopeProvider>
 *   );
 * }
 * ```
 */
export const AutoScopeProvider = typedHooks.AutoScopeProvider;

/**
 * Manual scope provider component.
 *
 * Provides an externally-managed scope to the component tree.
 * Use this when you need explicit control over scope lifecycle.
 *
 * @example
 * ```tsx
 * import { ScopeProvider } from "./di/hooks";
 *
 * function ChatRoom({ scope }) {
 *   return (
 *     <ScopeProvider scope={scope}>
 *       <UserInfo />
 *     </ScopeProvider>
 *   );
 * }
 * ```
 */
export const ScopeProvider = typedHooks.ScopeProvider;

// =============================================================================
// Hooks
// =============================================================================

/**
 * Resolves a port to its service instance.
 *
 * This hook is type-safe - it only accepts ports that are in AppPorts.
 * The return type is automatically inferred from the port's service type.
 *
 * @example
 * ```tsx
 * import { usePort } from "./di/hooks";
 * import { LoggerPort, UserSessionPort } from "./di/ports";
 *
 * function MyComponent() {
 *   const logger = usePort(LoggerPort);
 *   const session = usePort(UserSessionPort);
 *
 *   logger.log(`User: ${session.user.name}`);
 *   return <div>{session.user.name}</div>;
 * }
 * ```
 */
export const usePort = typedHooks.usePort;

/**
 * Returns the root container instance.
 *
 * Use this when you need direct access to the container, for example
 * to create scopes manually or resolve services programmatically.
 *
 * @example
 * ```tsx
 * import { useContainer } from "./di/hooks";
 * import { NotificationServicePort } from "./di/ports";
 *
 * function NotificationButton() {
 *   const container = useContainer();
 *
 *   const handleClick = () => {
 *     // Each resolve creates a new instance (request lifetime)
 *     const notification = container.resolve(NotificationServicePort);
 *     notification.notify("Button clicked!");
 *   };
 *
 *   return <button onClick={handleClick}>Notify</button>;
 * }
 * ```
 */
export const useContainer = typedHooks.useContainer;

/**
 * Creates and returns a scope tied to the component lifecycle.
 *
 * The scope is created on first render and disposed on unmount.
 * Useful when you need access to the scope object itself.
 *
 * @example
 * ```tsx
 * import { useScope } from "./di/hooks";
 *
 * function ScopedComponent() {
 *   const scope = useScope();
 *   const session = scope.resolve(UserSessionPort);
 *   return <div>{session.user.name}</div>;
 * }
 * ```
 */
export const useScope = typedHooks.useScope;

/**
 * Optionally resolves a port to its service instance.
 *
 * Returns undefined if outside a provider or if resolution fails.
 * Use this when the service might not be available.
 *
 * @example
 * ```tsx
 * import { usePortOptional } from "./di/hooks";
 * import { LoggerPort } from "./di/ports";
 *
 * function OptionalLogging() {
 *   const logger = usePortOptional(LoggerPort);
 *   logger?.log("This may or may not log");
 *   return <div>Component</div>;
 * }
 * ```
 */
export const usePortOptional = typedHooks.usePortOptional;
