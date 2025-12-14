import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ChatRoom component demonstrates AutoScopeProvider lifecycle.
 *
 * Wraps children in AutoScopeProvider to create isolated scopes for
 * each user session. User switch buttons trigger scope recreation.
 *
 * @packageDocumentation
 */
import { useState } from "react";
import { AutoScopeProvider } from "../di/hooks.js";
import { setCurrentUserSelection } from "../di/adapters.js";
import { UserInfo } from "./UserInfo.js";
import { MessageList } from "./MessageList.js";
import { MessageInput } from "./MessageInput.js";
import { NotificationButton } from "./NotificationButton.js";
// =============================================================================
// ChatRoom Component
// =============================================================================
/**
 * Main chat room container with AutoScopeProvider for scope lifecycle.
 *
 * Features:
 * - AutoScopeProvider wraps children for isolated scopes
 * - User switch buttons trigger scope recreation via key change
 * - Composes UserInfo, MessageList, MessageInput, NotificationButton
 *
 * @example
 * ```tsx
 * import { ChatRoom } from "./components/ChatRoom";
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
export function ChatRoom() {
    // Track current user for scope key - changing this recreates the scope
    const [currentUser, setCurrentUser] = useState("alice");
    // Scope key includes user to force scope recreation on user switch
    const scopeKey = `user-scope-${currentUser}`;
    return (_jsxs("div", { className: "mx-auto max-w-2xl rounded-xl bg-white shadow-lg", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-200 p-4", children: [_jsx("h1", { className: "text-lg font-semibold text-gray-800", children: "Chat Dashboard" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", onClick: () => {
                                    setCurrentUserSelection("alice");
                                    setCurrentUser("alice");
                                }, className: `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${currentUser === "alice"
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`, children: "Login as Alice" }), _jsx("button", { type: "button", onClick: () => {
                                    setCurrentUserSelection("bob");
                                    setCurrentUser("bob");
                                }, className: `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${currentUser === "bob"
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`, children: "Login as Bob" })] })] }), _jsxs(AutoScopeProvider, { children: [_jsx("div", { className: "border-b border-gray-200 p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx(UserInfo, {}), _jsx(NotificationButton, {})] }) }), _jsx("div", { className: "h-80 overflow-y-auto bg-gray-50", children: _jsx(MessageList, {}) }), _jsx("div", { className: "border-t border-gray-200 p-4", children: _jsx(MessageInput, {}) })] }, scopeKey)] }));
}
//# sourceMappingURL=ChatRoom.js.map