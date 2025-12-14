import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * MessageList component displays chat messages with reactive updates.
 *
 * Uses `usePort(MessageStorePort)` to get the singleton store instance
 * and subscribes to message updates via useEffect + store.subscribe() pattern.
 *
 * @packageDocumentation
 */
import { useState, useEffect } from "react";
import { usePort } from "../di/hooks.js";
import { MessageStorePort } from "../di/ports.js";
// =============================================================================
// MessageList Component
// =============================================================================
/**
 * Displays a list of chat messages with reactive subscription to updates.
 *
 * This component demonstrates the reactive subscription pattern - it
 * subscribes to the singleton MessageStore and automatically re-renders
 * when new messages are added.
 *
 * @example
 * ```tsx
 * import { MessageList } from "./components/MessageList";
 *
 * function ChatArea() {
 *   return (
 *     <div className="flex-1 overflow-y-auto">
 *       <MessageList />
 *     </div>
 *   );
 * }
 * ```
 */
export function MessageList() {
    const store = usePort(MessageStorePort);
    const [messages, setMessages] = useState(() => store.getMessages());
    // Subscribe to message updates
    useEffect(() => {
        // Subscribe for future updates
        const unsubscribe = store.subscribe((newMessages) => {
            setMessages(newMessages);
        });
        return unsubscribe;
    }, [store]);
    // Empty state
    if (messages.length === 0) {
        return (_jsx("div", { className: "flex h-full items-center justify-center text-gray-500", children: _jsx("p", { children: "No messages yet. Start the conversation!" }) }));
    }
    return (_jsx("div", { className: "flex flex-col gap-3 p-4 overflow-y-auto scrollbar-thin", children: messages.map((message) => (_jsx(MessageBubble, { message: message }, message.id))) }));
}
/**
 * Renders a single message as a chat bubble.
 *
 * The bubble includes the sender's name, message content, and timestamp.
 */
function MessageBubble({ message }) {
    const formattedTime = message.timestamp.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
    });
    return (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-xs font-medium text-gray-600", children: message.senderName }), _jsx("div", { className: "max-w-xs rounded-lg bg-blue-100 px-4 py-2 text-gray-800", children: _jsx("p", { className: "break-words", children: message.content }) }), _jsx("span", { className: "text-xs text-gray-400", children: formattedTime })] }));
}
//# sourceMappingURL=MessageList.js.map