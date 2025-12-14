/**
 * Adapter implementations for the React Showcase Chat Dashboard.
 *
 * This file defines all 6 adapters that implement the port contracts.
 * Each adapter specifies its lifetime, dependencies, and factory function.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/graph";
import {
  ConfigPort,
  LoggerPort,
  MessageStorePort,
  UserSessionPort,
  ChatServicePort,
  NotificationServicePort,
} from "./ports.js";
import type {
  Config,
  Logger,
  Message,
  MessageStore,
  MessageListener,
  Unsubscribe,
  UserSession,
  ChatService,
  NotificationService,
} from "../types.js";

// =============================================================================
// User Selection State
// =============================================================================

/**
 * Type for supported users in the chat application.
 */
type UserType = "alice" | "bob";

/**
 * Module-level state tracking the currently selected user.
 * Read by UserSessionAdapter factory when creating scoped sessions.
 */
let currentUserSelection: UserType = "alice";

/**
 * Sets the current user selection.
 *
 * Call this BEFORE scope recreation to ensure the new scope gets the correct user.
 * This function should be called when login buttons are clicked, before the
 * React state change that triggers scope recreation.
 *
 * @param user - The user to set as current ("alice" or "bob")
 *
 * @example
 * ```tsx
 * import { setCurrentUserSelection } from "../di/adapters.js";
 *
 * function handleLoginAsBob() {
 *   setCurrentUserSelection("bob");  // Set before state change
 *   setCurrentUser("bob");           // Triggers scope recreation
 * }
 * ```
 */
export function setCurrentUserSelection(user: UserType): void {
  currentUserSelection = user;
}

// =============================================================================
// Instance Counter for NotificationService
// =============================================================================

/**
 * Counter for generating unique instance IDs for NotificationService.
 * Each resolution increments this counter.
 */
let notificationInstanceCounter = 0;

// =============================================================================
// Singleton Adapters
// =============================================================================

/**
 * Adapter for the application configuration service.
 *
 * Provides static configuration values used throughout the application.
 * This is a singleton with no dependencies.
 *
 * @remarks
 * - Lifetime: singleton - one instance for the entire application
 * - Dependencies: none
 */
export const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  requires: [],
  lifetime: "singleton",
  factory: (): Config => ({
    notificationDuration: 3000,
    maxMessages: 100,
  }),
});

/**
 * Adapter for the logging service.
 *
 * Creates a logger that prefixes all messages with "[ChatApp]".
 * This is a singleton with no dependencies.
 *
 * @remarks
 * - Lifetime: singleton - one instance for the entire application
 * - Dependencies: none
 */
export const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: (): Logger => ({
    log: (message: string): void => {
      console.log(`[ChatApp] ${message}`);
    },
    warn: (message: string): void => {
      console.warn(`[ChatApp] ${message}`);
    },
    error: (message: string): void => {
      console.error(`[ChatApp] ${message}`);
    },
  }),
});

/**
 * Adapter for the message store service.
 *
 * Implements an in-memory message store with reactive subscription support.
 * Messages persist across scope changes since this is a singleton.
 *
 * @remarks
 * - Lifetime: singleton - messages persist for the entire application
 * - Dependencies: LoggerPort - for logging message operations
 */
export const MessageStoreAdapter = createAdapter({
  provides: MessageStorePort,
  requires: [LoggerPort],
  lifetime: "singleton",
  factory: (deps): MessageStore => {
    const messages: Message[] = [];
    const listeners = new Set<MessageListener>();

    const notifyListeners = (): void => {
      const frozenMessages = Object.freeze([...messages]) as readonly Message[];
      listeners.forEach((listener) => listener(frozenMessages));
    };

    deps.Logger.log("MessageStore initialized");

    return {
      getMessages: (): readonly Message[] => {
        return Object.freeze([...messages]) as readonly Message[];
      },
      addMessage: (message: Message): void => {
        messages.push(message);
        deps.Logger.log(`Message added from ${message.senderName}`);
        notifyListeners();
      },
      subscribe: (listener: MessageListener): Unsubscribe => {
        listeners.add(listener);
        deps.Logger.log("New subscriber added to MessageStore");
        return () => {
          listeners.delete(listener);
          deps.Logger.log("Subscriber removed from MessageStore");
        };
      },
    };
  },
});

// =============================================================================
// Scoped Adapters
// =============================================================================

/**
 * Adapter for the user session service.
 *
 * Creates a user session for the current scope based on the current
 * user selection. Call `setCurrentUserSelection()` before scope
 * recreation to set which user session should be created.
 *
 * @remarks
 * - Lifetime: scoped - each scope gets its own user session
 * - Dependencies: none
 * - Reads `currentUserSelection` module state at factory time
 */
export const UserSessionAdapter = createAdapter({
  provides: UserSessionPort,
  requires: [],
  lifetime: "scoped",
  factory: (): UserSession => {
    const userData =
      currentUserSelection === "alice"
        ? { id: "alice-001", name: "Alice", avatar: "A" }
        : { id: "bob-002", name: "Bob", avatar: "B" };
    return { user: userData };
  },
});

/**
 * Adapter for the chat service.
 *
 * Sends messages as the current user by combining the user session
 * with the message store. Automatically attaches sender information.
 *
 * @remarks
 * - Lifetime: scoped - tied to the current user session scope
 * - Dependencies: LoggerPort, UserSessionPort, MessageStorePort
 */
export const ChatServiceAdapter = createAdapter({
  provides: ChatServicePort,
  requires: [LoggerPort, UserSessionPort, MessageStorePort],
  lifetime: "scoped",
  factory: (deps): ChatService => {
    const { user } = deps.UserSession;
    deps.Logger.log(`ChatService initialized for user: ${user.name}`);

    return {
      sendMessage: (content: string): void => {
        const message: Message = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          senderId: user.id,
          senderName: user.name,
          content,
          timestamp: new Date(),
        };
        deps.Logger.log(`${user.name} sending message: "${content}"`);
        deps.MessageStore.addMessage(message);
      },
    };
  },
});

// =============================================================================
// Request-Scoped Adapters
// =============================================================================

/**
 * Adapter for the notification service.
 *
 * Creates a new instance with a unique ID each time it is resolved.
 * This demonstrates the request lifetime where every resolution
 * gets a fresh instance.
 *
 * @remarks
 * - Lifetime: request - new instance for every resolution
 * - Dependencies: LoggerPort, ConfigPort
 */
export const NotificationServiceAdapter = createAdapter({
  provides: NotificationServicePort,
  requires: [LoggerPort, ConfigPort],
  lifetime: "request",
  factory: (deps): NotificationService => {
    notificationInstanceCounter += 1;
    const instanceId = notificationInstanceCounter;
    const createdAt = new Date();

    deps.Logger.log(
      `NotificationService instance #${instanceId} created at ${createdAt.toLocaleTimeString()}`
    );

    return {
      instanceId,
      createdAt,
      notify: (message: string): void => {
        deps.Logger.log(
          `[Notification #${instanceId}] ${message} (duration: ${deps.Config.notificationDuration}ms)`
        );
      },
    };
  },
});
