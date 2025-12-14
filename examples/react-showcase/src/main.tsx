/**
 * Application entry point for the React Showcase Chat Dashboard.
 *
 * Renders the App component with StrictMode and mounts to the DOM.
 *
 * @packageDocumentation
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./index.css";

// =============================================================================
// Application Bootstrap
// =============================================================================

/**
 * Get the root element from the DOM.
 *
 * @throws Error if the root element is not found
 */
function getRootElement(): HTMLElement {
  const element = document.getElementById("root");
  if (element === null) {
    throw new Error(
      "Root element not found. Ensure index.html contains <div id=\"root\"></div>"
    );
  }
  return element;
}

/**
 * Create and render the React application.
 *
 * Uses StrictMode to enable additional development checks:
 * - Double-invocation of lifecycle methods to detect side effects
 * - Warnings for deprecated APIs
 * - Detection of unsafe lifecycle methods
 */
const root = createRoot(getRootElement());

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
