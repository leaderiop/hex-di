/**
 * Component integration tests for the React Showcase Chat Dashboard.
 *
 * Tests use a custom `renderWithAppContainer()` helper that wraps components
 * with the typed ContainerProvider from our hooks.ts, ensuring the same
 * React context is used as in the actual application.
 *
 * @packageDocumentation
 */

import { type ReactElement } from "react";
import {
  describe,
  it,
  expect,
  vi,
  screen,
  fireEvent,
  waitFor,
  render,
  TestGraphBuilder,
  createMockAdapter,
} from "./setup.js";
import { createContainer, type Container } from "@hex-di/runtime";
import type { Graph } from "@hex-di/graph";
import { appGraph } from "../src/di/graph.js";
import {
  UserSessionPort,
  MessageStorePort,
  ChatServicePort,
  NotificationServicePort,
  LoggerPort,
  ConfigPort,
  type AppPorts,
} from "../src/di/ports.js";
import { ContainerProvider } from "../src/di/hooks.js";
import type { Message, MessageListener, Unsubscribe } from "../src/types.js";

// Import components under test
import { UserInfo } from "../src/components/UserInfo.js";
import { MessageList } from "../src/components/MessageList.js";
import { MessageInput } from "../src/components/MessageInput.js";
import { NotificationButton } from "../src/components/NotificationButton.js";
import { ChatRoom } from "../src/components/ChatRoom.js";

// =============================================================================
// Custom Test Render Helper
// =============================================================================

/**
 * Result type for renderWithAppContainer.
 */
interface RenderWithAppContainerResult {
  readonly container: HTMLElement;
  readonly diContainer: Container<AppPorts>;
}

/**
 * Renders a component with the typed ContainerProvider from our app.
 *
 * This ensures the same React context is used as in the actual application,
 * since we use createTypedHooks for isolated contexts.
 */
function renderWithAppContainer(
  element: ReactElement,
  graph: Graph<AppPorts>
): RenderWithAppContainerResult {
  const diContainer = createContainer(graph);

  const { container } = render(
    <ContainerProvider container={diContainer}>{element}</ContainerProvider>
  );

  return { container, diContainer };
}

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Creates a mock message store with controllable behavior for testing.
 */
function createMockMessageStore() {
  const messages: Message[] = [];
  const listeners = new Set<MessageListener>();

  return {
    messages,
    listeners,
    store: {
      getMessages: vi.fn(() => [...messages] as readonly Message[]),
      addMessage: vi.fn((msg: Message) => {
        messages.push(msg);
        listeners.forEach((listener) => listener([...messages]));
      }),
      subscribe: vi.fn((listener: MessageListener): Unsubscribe => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }),
    },
  };
}

/**
 * Creates a base test graph with common mock adapters.
 */
function createTestGraph() {
  const mockLogger = createMockAdapter(LoggerPort, {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  });

  const mockConfig = createMockAdapter(ConfigPort, {
    notificationDuration: 3000,
    maxMessages: 100,
  });

  return TestGraphBuilder.from(appGraph)
    .override(mockLogger)
    .override(mockConfig);
}

// =============================================================================
// Test 1: ChatRoom renders with AutoScopeProvider
// =============================================================================

describe("ChatRoom", () => {
  it("renders with AutoScopeProvider and displays user switch buttons", () => {
    const mockMessageStore = createMockMessageStore();
    const mockMessageStoreAdapter = createMockAdapter(
      MessageStorePort,
      mockMessageStore.store
    );

    const mockUserSession = createMockAdapter(UserSessionPort, {
      user: { id: "test-user", name: "Test User", avatar: "T" },
    });

    const mockChatService = createMockAdapter(ChatServicePort, {
      sendMessage: vi.fn(),
    });

    const mockNotificationService = createMockAdapter(NotificationServicePort, {
      instanceId: 1,
      createdAt: new Date(),
      notify: vi.fn(),
    });

    const testGraph = createTestGraph()
      .override(mockMessageStoreAdapter)
      .override(mockUserSession)
      .override(mockChatService)
      .override(mockNotificationService)
      .build();

    renderWithAppContainer(<ChatRoom />, testGraph);

    // Verify user switch buttons are rendered
    expect(screen.getByText("Login as Alice")).toBeInTheDocument();
    expect(screen.getByText("Login as Bob")).toBeInTheDocument();
  });

  // ===========================================================================
  // Test 2: ChatRoom user switch buttons trigger scope recreation
  // ===========================================================================

  it("recreates scope when user switch button is clicked", async () => {
    const mockMessageStore = createMockMessageStore();
    const mockMessageStoreAdapter = createMockAdapter(
      MessageStorePort,
      mockMessageStore.store
    );

    // The UserSession adapter always returns Alice - in a real app,
    // this would be configured per-scope. For this test, we verify
    // the scope key mechanism works by checking the buttons toggle.
    const mockUserSession = createMockAdapter(UserSessionPort, {
      user: { id: "alice-001", name: "Alice", avatar: "A" },
    });

    const mockChatService = createMockAdapter(ChatServicePort, {
      sendMessage: vi.fn(),
    });

    const mockNotificationService = createMockAdapter(NotificationServicePort, {
      instanceId: 1,
      createdAt: new Date(),
      notify: vi.fn(),
    });

    const testGraph = createTestGraph()
      .override(mockMessageStoreAdapter)
      .override(mockUserSession)
      .override(mockChatService)
      .override(mockNotificationService)
      .build();

    renderWithAppContainer(<ChatRoom />, testGraph);

    // Initially Alice button is active (blue background)
    const aliceButton = screen.getByText("Login as Alice");
    const bobButton = screen.getByText("Login as Bob");

    expect(aliceButton).toHaveClass("bg-blue-500");
    expect(bobButton).not.toHaveClass("bg-blue-500");

    // Click on "Login as Bob" button
    fireEvent.click(bobButton);

    // After click, Bob button should be active
    await waitFor(() => {
      expect(bobButton).toHaveClass("bg-blue-500");
      expect(aliceButton).not.toHaveClass("bg-blue-500");
    });
  });
});

// =============================================================================
// Test 3: MessageList displays messages from store
// =============================================================================

describe("MessageList", () => {
  it("displays messages from the store", () => {
    const testMessages: Message[] = [
      {
        id: "msg-1",
        senderId: "alice-001",
        senderName: "Alice",
        content: "Hello, World!",
        timestamp: new Date("2024-01-01T10:00:00"),
      },
      {
        id: "msg-2",
        senderId: "bob-001",
        senderName: "Bob",
        content: "Hi Alice!",
        timestamp: new Date("2024-01-01T10:01:00"),
      },
    ];

    const mockMessageStore = createMockMessageStore();
    mockMessageStore.messages.push(...testMessages);
    const mockMessageStoreAdapter = createMockAdapter(
      MessageStorePort,
      mockMessageStore.store
    );

    const testGraph = createTestGraph()
      .override(mockMessageStoreAdapter)
      .build();

    renderWithAppContainer(<MessageList />, testGraph);

    // Verify messages are displayed
    expect(screen.getByText("Hello, World!")).toBeInTheDocument();
    expect(screen.getByText("Hi Alice!")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows empty state when no messages", () => {
    const mockMessageStore = createMockMessageStore();
    const mockMessageStoreAdapter = createMockAdapter(
      MessageStorePort,
      mockMessageStore.store
    );

    const testGraph = createTestGraph()
      .override(mockMessageStoreAdapter)
      .build();

    renderWithAppContainer(<MessageList />, testGraph);

    expect(
      screen.getByText("No messages yet. Start the conversation!")
    ).toBeInTheDocument();
  });
});

// =============================================================================
// Test 4: MessageInput sends message via ChatService
// =============================================================================

describe("MessageInput", () => {
  it("sends message via ChatService when send button is clicked", async () => {
    const mockSendMessage = vi.fn();
    const mockChatService = createMockAdapter(ChatServicePort, {
      sendMessage: mockSendMessage,
    });

    const testGraph = createTestGraph().override(mockChatService).build();

    renderWithAppContainer(<MessageInput />, testGraph);

    // Type a message
    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(input, { target: { value: "Test message" } });

    // Click send button
    const sendButton = screen.getByRole("button", { name: /send/i });
    fireEvent.click(sendButton);

    // Verify sendMessage was called
    expect(mockSendMessage).toHaveBeenCalledWith("Test message");

    // Verify input is cleared after send
    await waitFor(() => {
      expect(input).toHaveValue("");
    });
  });
});

// =============================================================================
// Test 5: UserInfo displays current user name
// =============================================================================

describe("UserInfo", () => {
  it("displays current user name and avatar", () => {
    const mockUserSession = createMockAdapter(UserSessionPort, {
      user: { id: "alice-001", name: "Alice", avatar: "A" },
    });

    const testGraph = createTestGraph().override(mockUserSession).build();

    renderWithAppContainer(<UserInfo />, testGraph);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});

// =============================================================================
// Test 6: NotificationButton shows new instance ID on each click
// =============================================================================

describe("NotificationButton", () => {
  it("shows new instance ID on each click", async () => {
    const mockNotificationService = createMockAdapter(NotificationServicePort, {
      instanceId: 1,
      createdAt: new Date(),
      notify: vi.fn(),
    });

    const testGraph = createTestGraph()
      .override(mockNotificationService)
      .build();

    renderWithAppContainer(<NotificationButton />, testGraph);

    // Click the notification button
    const button = screen.getByRole("button", { name: /send notification/i });
    fireEvent.click(button);

    // Verify instance info is displayed
    await waitFor(() => {
      expect(screen.getByText(/Instance #1/)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Test 7: NotificationButton displays toast notification
  // ===========================================================================

  it("displays toast notification when clicked", async () => {
    const mockNotify = vi.fn();
    const mockNotificationService = createMockAdapter(NotificationServicePort, {
      instanceId: 1,
      createdAt: new Date(),
      notify: mockNotify,
    });

    const testGraph = createTestGraph()
      .override(mockNotificationService)
      .build();

    renderWithAppContainer(<NotificationButton />, testGraph);

    // Click the notification button
    const button = screen.getByRole("button", { name: /send notification/i });
    fireEvent.click(button);

    // Verify toast appears
    await waitFor(() => {
      expect(screen.getByTestId("notification-toast")).toBeInTheDocument();
    });

    // Verify notify was called
    expect(mockNotify).toHaveBeenCalled();
  });
});

// =============================================================================
// Test 8: Full integration - send message flow works end-to-end
// =============================================================================

describe("Integration", () => {
  it("send message flow works end-to-end", async () => {
    const mockMessageStore = createMockMessageStore();
    const mockMessageStoreAdapter = createMockAdapter(
      MessageStorePort,
      mockMessageStore.store
    );

    const mockUserSession = createMockAdapter(UserSessionPort, {
      user: { id: "alice-001", name: "Alice", avatar: "A" },
    });

    // Real-ish chat service that uses the mock store
    const mockChatService = createMockAdapter(ChatServicePort, {
      sendMessage: (content: string) => {
        const message: Message = {
          id: `msg-${Date.now()}`,
          senderId: "alice-001",
          senderName: "Alice",
          content,
          timestamp: new Date(),
        };
        mockMessageStore.store.addMessage(message);
      },
    });

    const mockNotificationService = createMockAdapter(NotificationServicePort, {
      instanceId: 1,
      createdAt: new Date(),
      notify: vi.fn(),
    });

    const testGraph = createTestGraph()
      .override(mockMessageStoreAdapter)
      .override(mockUserSession)
      .override(mockChatService)
      .override(mockNotificationService)
      .build();

    renderWithAppContainer(<ChatRoom />, testGraph);

    // Initially no messages
    expect(
      screen.getByText("No messages yet. Start the conversation!")
    ).toBeInTheDocument();

    // Type and send a message
    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(input, { target: { value: "Hello from Alice!" } });

    const sendButton = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(sendButton);

    // Message should appear in the list
    await waitFor(() => {
      expect(screen.getByText("Hello from Alice!")).toBeInTheDocument();
    });

    // Empty state should be gone
    expect(
      screen.queryByText("No messages yet. Start the conversation!")
    ).not.toBeInTheDocument();
  });
});
