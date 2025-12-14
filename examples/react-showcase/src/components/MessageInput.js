import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * MessageInput component for sending chat messages.
 *
 * Uses `usePort(ChatServicePort)` to get the scoped chat service
 * and sends messages as the current user.
 *
 * @packageDocumentation
 */
import { useState } from "react";
import { usePort } from "../di/hooks.js";
import { ChatServicePort } from "../di/ports.js";
// =============================================================================
// MessageInput Component
// =============================================================================
/**
 * Input field and send button for composing and sending chat messages.
 *
 * This component demonstrates scoped service usage - the ChatService
 * is scoped to the current user session and automatically attaches
 * sender information to messages.
 *
 * @example
 * ```tsx
 * import { MessageInput } from "./components/MessageInput";
 *
 * function ChatFooter() {
 *   return (
 *     <div className="border-t p-4">
 *       <MessageInput />
 *     </div>
 *   );
 * }
 * ```
 */
export function MessageInput() {
    const chatService = usePort(ChatServicePort);
    const [message, setMessage] = useState("");
    const handleSubmit = (event) => {
        event.preventDefault();
        const trimmedMessage = message.trim();
        if (trimmedMessage.length === 0) {
            return;
        }
        chatService.sendMessage(trimmedMessage);
        setMessage("");
    };
    const handleChange = (event) => {
        setMessage(event.target.value);
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "flex gap-2", children: [_jsx("input", { type: "text", value: message, onChange: handleChange, placeholder: "Type a message...", className: "flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500", "aria-label": "Message input" }), _jsx("button", { type: "submit", className: "rounded-lg bg-blue-500 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", disabled: message.trim().length === 0, "aria-label": "Send message", children: "Send" })] }));
}
//# sourceMappingURL=MessageInput.js.map