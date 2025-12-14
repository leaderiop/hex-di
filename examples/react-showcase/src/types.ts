/**
 * Shared type definitions for the React Showcase Chat Dashboard.
 *
 * This file defines all domain types and service interfaces used throughout
 * the application. These types are used by both the port definitions and
 * the adapter implementations.
 *
 * @packageDocumentation
 */

// =============================================================================
// Domain Types
// =============================================================================

/**
 * Represents a chat message in the dashboard.
 */
export interface Message {
  /** Unique identifier for the message */
  readonly id: string;
  /** ID of the user who sent the message */
  readonly senderId: string;
  /** Display name of the sender */
  readonly senderName: string;
  /** The message content */
  readonly content: string;
  /** Timestamp when the message was created */
  readonly timestamp: Date;
}

/**
 * Represents a user in the chat system.
 */
export interface User {
  /** Unique identifier for the user */
  readonly id: string;
  /** Display name of the user */
  readonly name: string;
  /** Avatar URL or initial letter(s) for display */
  readonly avatar: string;
}

// =============================================================================
// Service Interfaces
// =============================================================================

/**
 * Application configuration service.
 *
 * Provides access to application-wide settings that control behavior
 * of various services. This is a singleton service.
 */
export interface Config {
  /** Duration in milliseconds to show notifications */
  readonly notificationDuration: number;
  /** Maximum number of messages to keep in history */
  readonly maxMessages: number;
}

/**
 * Logging service for application-wide logging.
 *
 * All log messages are prefixed with the service name for easier debugging.
 * This is a singleton service.
 */
export interface Logger {
  /** Log an informational message */
  log(message: string): void;
  /** Log a warning message */
  warn(message: string): void;
  /** Log an error message */
  error(message: string): void;
}

/**
 * Subscription cleanup function.
 */
export type Unsubscribe = () => void;

/**
 * Message listener callback type.
 */
export type MessageListener = (messages: readonly Message[]) => void;

/**
 * In-memory message storage with reactive subscription support.
 *
 * Stores messages in memory and notifies subscribers when messages change.
 * This is a singleton service that persists messages across scope changes.
 */
export interface MessageStore {
  /** Get all current messages */
  getMessages(): readonly Message[];
  /** Add a new message to the store */
  addMessage(message: Message): void;
  /** Subscribe to message changes */
  subscribe(listener: MessageListener): Unsubscribe;
}

/**
 * Current user session information.
 *
 * Provides information about the currently logged-in user.
 * This is a scoped service - each scope gets its own instance.
 */
export interface UserSession {
  /** The current user */
  readonly user: User;
}

/**
 * Chat service for sending messages.
 *
 * Uses the current user session to attach sender information to messages.
 * This is a scoped service that depends on the current user context.
 */
export interface ChatService {
  /** Send a message as the current user */
  sendMessage(content: string): void;
}

/**
 * Notification service with instance tracking.
 *
 * Creates notifications with unique instance IDs to demonstrate
 * request lifetime. Each resolution creates a new instance.
 */
export interface NotificationService {
  /** Unique instance ID for this notification service */
  readonly instanceId: number;
  /** Timestamp when this instance was created */
  readonly createdAt: Date;
  /** Send a notification with the given message */
  notify(message: string): void;
}
