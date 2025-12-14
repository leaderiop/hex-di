/**
 * NotificationButton component demonstrates request lifetime.
 *
 * Each click resolves a new NotificationService instance, showing
 * the instance ID and timestamp to prove fresh instances are created.
 *
 * @packageDocumentation
 */

import { useState, useEffect } from "react";
import { useContainer } from "../di/hooks.js";
import { NotificationServicePort } from "../di/ports.js";

// =============================================================================
// Types
// =============================================================================

interface NotificationInstance {
  readonly instanceId: number;
  readonly createdAt: Date;
}

interface ToastState {
  readonly visible: boolean;
  readonly message: string;
}

// =============================================================================
// NotificationButton Component
// =============================================================================

/**
 * Button that demonstrates request lifetime by creating new instances on each click.
 *
 * Features:
 * - Inline instance counter showing "Instance #X created at HH:MM:SS"
 * - Toast notification (2-3 seconds) in corner
 * - Proves new NotificationService instance created per resolution
 *
 * @example
 * ```tsx
 * import { NotificationButton } from "./components/NotificationButton";
 *
 * function Toolbar() {
 *   return (
 *     <div className="flex gap-2">
 *       <NotificationButton />
 *     </div>
 *   );
 * }
 * ```
 */
export function NotificationButton(): JSX.Element {
  const container = useContainer();
  const [instance, setInstance] = useState<NotificationInstance | null>(null);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "" });

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (!toast.visible) {
      return;
    }

    const timer = setTimeout(() => {
      setToast({ visible: false, message: "" });
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast.visible]);

  const handleClick = (): void => {
    // Each resolution creates a new instance (request lifetime)
    const notificationService = container.resolve(NotificationServicePort);

    // Update instance info
    setInstance({
      instanceId: notificationService.instanceId,
      createdAt: notificationService.createdAt,
    });

    // Send notification and show toast
    const message = `Notification #${notificationService.instanceId} sent!`;
    notificationService.notify(message);

    setToast({
      visible: true,
      message,
    });
  };

  const formattedTime = instance?.createdAt.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex flex-col gap-2">
      {/* Button */}
      <button
        type="button"
        onClick={handleClick}
        className="rounded-lg bg-purple-500 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        aria-label="Send notification"
      >
        Send Notification
      </button>

      {/* Instance counter info */}
      {instance !== null && (
        <p className="text-sm text-gray-600">
          Instance #{instance.instanceId} created at {formattedTime}
        </p>
      )}

      {/* Toast notification */}
      {toast.visible && (
        <div
          data-testid="notification-toast"
          className="fixed bottom-4 right-4 rounded-lg bg-purple-600 px-4 py-3 text-white shadow-lg"
          role="alert"
        >
          <p>{toast.message}</p>
        </div>
      )}
    </div>
  );
}
