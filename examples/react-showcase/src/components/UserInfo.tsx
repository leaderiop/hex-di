/**
 * UserInfo component displays the current user's avatar and name.
 *
 * Uses `usePort(UserSessionPort)` to get the current scoped user session.
 * This component automatically updates when the scope changes (user switch).
 *
 * @packageDocumentation
 */

import { usePort } from "../di/hooks.js";
import { UserSessionPort } from "../di/ports.js";

// =============================================================================
// UserInfo Component
// =============================================================================

/**
 * Displays the current user's avatar (initials in a circle) and name.
 *
 * This component demonstrates scoped service resolution - each scope
 * gets its own UserSession instance, so different parts of the app
 * can display different users.
 *
 * @example
 * ```tsx
 * import { UserInfo } from "./components/UserInfo";
 *
 * function ChatHeader() {
 *   return (
 *     <div className="flex items-center">
 *       <UserInfo />
 *     </div>
 *   );
 * }
 * ```
 */
export function UserInfo(): JSX.Element {
  const session = usePort(UserSessionPort);
  const { user } = session;

  return (
    <div className="flex items-center gap-3">
      {/* Avatar circle with initials */}
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white font-semibold text-sm"
        aria-label={`Avatar for ${user.name}`}
      >
        {user.avatar}
      </div>
      {/* User name */}
      <span className="text-gray-800 font-medium">{user.name}</span>
    </div>
  );
}
