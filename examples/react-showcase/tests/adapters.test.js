/**
 * Adapter Unit Tests for the React Showcase Chat Dashboard.
 *
 * These tests demonstrate the `createAdapterTest()` harness from `@hex-di/testing`,
 * which provides isolated testing of individual adapters with mock dependencies.
 * Each test uses `invoke()` to call the adapter factory and `getDeps()` to access
 * mock references for spy assertions.
 *
 * @packageDocumentation
 */
import { describe, it, expect, vi } from "vitest";
import { createAdapterTest } from "@hex-di/testing";
import { ConfigAdapter, LoggerAdapter, MessageStoreAdapter, UserSessionAdapter, ChatServiceAdapter, NotificationServiceAdapter, } from "../src/di/adapters.js";
// =============================================================================
// ConfigAdapter Tests
// =============================================================================
describe("ConfigAdapter", () => {
    it("returns correct configuration shape with expected properties", () => {
        // Create harness with no dependencies (ConfigAdapter has none)
        const harness = createAdapterTest(ConfigAdapter, {});
        // Invoke factory to get the config service
        const config = harness.invoke();
        // Verify configuration shape
        expect(config).toHaveProperty("notificationDuration");
        expect(config).toHaveProperty("maxMessages");
        // Verify configuration values
        expect(config.notificationDuration).toBe(3000);
        expect(config.maxMessages).toBe(100);
    });
});
// =============================================================================
// LoggerAdapter Tests
// =============================================================================
describe("LoggerAdapter", () => {
    it("logs with correct [ChatApp] prefix format", () => {
        // Spy on console methods to verify prefix
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => { });
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
        // Create harness with no dependencies (LoggerAdapter has none)
        const harness = createAdapterTest(LoggerAdapter, {});
        const logger = harness.invoke();
        // Call each logger method
        logger.log("test message");
        logger.warn("test warning");
        logger.error("test error");
        // Verify prefix format
        expect(logSpy).toHaveBeenCalledWith("[ChatApp] test message");
        expect(warnSpy).toHaveBeenCalledWith("[ChatApp] test warning");
        expect(errorSpy).toHaveBeenCalledWith("[ChatApp] test error");
        // Cleanup spies
        logSpy.mockRestore();
        warnSpy.mockRestore();
        errorSpy.mockRestore();
    });
});
// =============================================================================
// MessageStoreAdapter Tests
// =============================================================================
describe("MessageStoreAdapter", () => {
    /**
     * Mock Logger for MessageStoreAdapter dependencies.
     */
    const createMockLogger = () => ({
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    });
    it("getMessages() returns an empty array initially", () => {
        const mockLogger = createMockLogger();
        const harness = createAdapterTest(MessageStoreAdapter, {
            Logger: mockLogger,
        });
        const store = harness.invoke();
        const messages = store.getMessages();
        // Verify empty array returned
        expect(Array.isArray(messages)).toBe(true);
        expect(messages).toHaveLength(0);
    });
    it("addMessage() notifies subscribers with updated messages", () => {
        const mockLogger = createMockLogger();
        const harness = createAdapterTest(MessageStoreAdapter, {
            Logger: mockLogger,
        });
        const store = harness.invoke();
        // Create a mock subscriber
        const subscriber = vi.fn();
        store.subscribe(subscriber);
        // Add a message
        const testMessage = {
            id: "msg-1",
            senderId: "user-1",
            senderName: "Alice",
            content: "Hello, world!",
            timestamp: new Date(),
        };
        store.addMessage(testMessage);
        // Verify subscriber was notified
        expect(subscriber).toHaveBeenCalledTimes(1);
        // Verify subscriber received the message array
        const firstCall = subscriber.mock.calls[0];
        if (!firstCall)
            throw new Error("Expected subscriber to be called");
        const receivedMessages = firstCall[0];
        expect(receivedMessages).toHaveLength(1);
        expect(receivedMessages[0].content).toBe("Hello, world!");
        // Verify getDeps() provides access to mock logger for assertions
        const deps = harness.getDeps();
        expect(deps.Logger.log).toHaveBeenCalledWith("Message added from Alice");
    });
});
// =============================================================================
// UserSessionAdapter Tests
// =============================================================================
describe("UserSessionAdapter", () => {
    it("returns user session with id, name, and avatar properties", () => {
        // Create harness with no dependencies (UserSessionAdapter has none)
        const harness = createAdapterTest(UserSessionAdapter, {});
        const session = harness.invoke();
        // Verify user session structure
        expect(session).toHaveProperty("user");
        expect(session.user).toHaveProperty("id");
        expect(session.user).toHaveProperty("name");
        expect(session.user).toHaveProperty("avatar");
        // Verify default user is Alice
        expect(session.user.id).toBe("alice-001");
        expect(session.user.name).toBe("Alice");
        expect(session.user.avatar).toBe("A");
    });
});
// =============================================================================
// ChatServiceAdapter Tests
// =============================================================================
describe("ChatServiceAdapter", () => {
    /**
     * Mock dependencies for ChatServiceAdapter.
     */
    const createMockDeps = () => {
        const mockLogger = {
            log: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        };
        const mockUserSession = {
            user: {
                id: "bob-002",
                name: "Bob",
                avatar: "B",
            },
        };
        const mockMessageStore = {
            getMessages: vi.fn(() => []),
            addMessage: vi.fn(),
            subscribe: vi.fn(() => () => { }),
        };
        return { mockLogger, mockUserSession, mockMessageStore };
    };
    it("sends message with correct sender info from UserSession", () => {
        const { mockLogger, mockUserSession, mockMessageStore } = createMockDeps();
        const harness = createAdapterTest(ChatServiceAdapter, {
            Logger: mockLogger,
            UserSession: mockUserSession,
            MessageStore: mockMessageStore,
        });
        const chatService = harness.invoke();
        // Send a message
        chatService.sendMessage("Hello from Bob!");
        // Verify message was added to store with correct sender info
        expect(mockMessageStore.addMessage).toHaveBeenCalledTimes(1);
        const addMessageMock = mockMessageStore.addMessage;
        const firstCall = addMessageMock.mock.calls[0];
        if (!firstCall)
            throw new Error("Expected addMessage to be called");
        const addedMessage = firstCall[0];
        expect(addedMessage.senderId).toBe("bob-002");
        expect(addedMessage.senderName).toBe("Bob");
        expect(addedMessage.content).toBe("Hello from Bob!");
        // Verify getDeps() access pattern
        const deps = harness.getDeps();
        expect(deps.Logger.log).toHaveBeenCalledWith('Bob sending message: "Hello from Bob!"');
    });
});
// =============================================================================
// NotificationServiceAdapter Tests
// =============================================================================
describe("NotificationServiceAdapter", () => {
    /**
     * Mock dependencies for NotificationServiceAdapter.
     */
    const createMockDeps = () => {
        const mockLogger = {
            log: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        };
        const mockConfig = {
            notificationDuration: 5000,
            maxMessages: 50,
        };
        return { mockLogger, mockConfig };
    };
    it("creates unique instance IDs per resolution", () => {
        const deps1 = createMockDeps();
        const deps2 = createMockDeps();
        // Create two separate harnesses to simulate two resolutions
        const harness1 = createAdapterTest(NotificationServiceAdapter, {
            Logger: deps1.mockLogger,
            Config: deps1.mockConfig,
        });
        const harness2 = createAdapterTest(NotificationServiceAdapter, {
            Logger: deps2.mockLogger,
            Config: deps2.mockConfig,
        });
        // Invoke factories to get two service instances
        const notification1 = harness1.invoke();
        const notification2 = harness2.invoke();
        // Verify unique instance IDs (instanceId increments globally)
        expect(notification1.instanceId).toBeDefined();
        expect(notification2.instanceId).toBeDefined();
        expect(notification1.instanceId).not.toBe(notification2.instanceId);
        // Verify createdAt timestamps exist
        expect(notification1.createdAt).toBeInstanceOf(Date);
        expect(notification2.createdAt).toBeInstanceOf(Date);
    });
    it("uses config for notification duration when logging", () => {
        const { mockLogger, mockConfig } = createMockDeps();
        const harness = createAdapterTest(NotificationServiceAdapter, {
            Logger: mockLogger,
            Config: mockConfig,
        });
        const notificationService = harness.invoke();
        // Call notify method
        notificationService.notify("Test notification message");
        // Verify getDeps() provides access to mock dependencies
        const deps = harness.getDeps();
        // Verify logger was called with the notification duration from config
        expect(deps.Logger.log).toHaveBeenCalledWith(expect.stringContaining("duration: 5000ms"));
        expect(deps.Logger.log).toHaveBeenCalledWith(expect.stringContaining("Test notification message"));
    });
});
//# sourceMappingURL=adapters.test.js.map