/**
 * Port definitions for the React Showcase Chat Dashboard.
 *
 * This file defines all 6 typed port tokens used throughout the application.
 * Each port serves as a compile-time contract for its corresponding service interface.
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/ports";
import type {
  Config,
  Logger,
  MessageStore,
  UserSession,
  ChatService,
  NotificationService,
} from "../types.js";

// =============================================================================
// Singleton Ports
// =============================================================================

/**
 * Port for the application configuration service.
 *
 * Provides access to application-wide settings that control behavior
 * of various services. This is a singleton service - one instance
 * shared across the entire application lifetime.
 *
 * @example
 * ```typescript
 * const config = usePort(ConfigPort);
 * console.log(config.notificationDuration);
 * ```
 */
export const ConfigPort = createPort<"Config", Config>("Config");

/**
 * Port for the logging service.
 *
 * All log messages are prefixed with the service name for easier debugging.
 * This is a singleton service - one instance shared across the entire
 * application lifetime.
 *
 * @example
 * ```typescript
 * const logger = usePort(LoggerPort);
 * logger.log("User logged in");
 * ```
 */
export const LoggerPort = createPort<"Logger", Logger>("Logger");

/**
 * Port for the message store service.
 *
 * Stores messages in memory and notifies subscribers when messages change.
 * This is a singleton service that persists messages across scope changes,
 * enabling all users to see the same conversation.
 *
 * @example
 * ```typescript
 * const store = usePort(MessageStorePort);
 * const messages = store.getMessages();
 * const unsubscribe = store.subscribe((newMessages) => {
 *   console.log("Messages updated:", newMessages);
 * });
 * ```
 */
export const MessageStorePort = createPort<"MessageStore", MessageStore>(
  "MessageStore"
);

// =============================================================================
// Scoped Ports
// =============================================================================

/**
 * Port for the user session service.
 *
 * Provides information about the currently logged-in user.
 * This is a scoped service - each scope gets its own instance,
 * enabling different users in different parts of the application.
 *
 * @example
 * ```typescript
 * const session = usePort(UserSessionPort);
 * console.log(`Logged in as: ${session.user.name}`);
 * ```
 */
export const UserSessionPort = createPort<"UserSession", UserSession>(
  "UserSession"
);

/**
 * Port for the chat service.
 *
 * Uses the current user session to attach sender information to messages.
 * This is a scoped service that depends on the current user context,
 * ensuring messages are sent with the correct user identity.
 *
 * @example
 * ```typescript
 * const chat = usePort(ChatServicePort);
 * chat.sendMessage("Hello, world!");
 * ```
 */
export const ChatServicePort = createPort<"ChatService", ChatService>(
  "ChatService"
);

// =============================================================================
// Request-Scoped Ports
// =============================================================================

/**
 * Port for the notification service.
 *
 * Creates notifications with unique instance IDs to demonstrate
 * request lifetime. Each resolution creates a new instance with
 * a fresh instance ID and timestamp.
 *
 * @example
 * ```typescript
 * // Each call to usePort creates a new instance
 * const notificationA = container.resolve(NotificationServicePort);
 * const notificationB = container.resolve(NotificationServicePort);
 * console.log(notificationA.instanceId !== notificationB.instanceId); // true
 * ```
 */
export const NotificationServicePort = createPort<
  "NotificationService",
  NotificationService
>("NotificationService");

// =============================================================================
// Type Exports
// =============================================================================

/**
 * Union type of all port types in the application.
 *
 * This type is used with `createTypedHooks<AppPorts>()` to create
 * type-safe React hooks that only accept valid port tokens.
 */
export type AppPorts =
  | typeof ConfigPort
  | typeof LoggerPort
  | typeof MessageStorePort
  | typeof UserSessionPort
  | typeof ChatServicePort
  | typeof NotificationServicePort;
