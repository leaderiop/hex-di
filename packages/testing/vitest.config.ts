import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      // Resolve @hex-di/react to source files during testing to avoid build artifact issues
      "@hex-di/react": path.resolve(__dirname, "../react/src/index.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "jsdom",
    typecheck: {
      enabled: true,
      include: ["tests/**/*.test-d.ts"],
      tsconfig: "./tsconfig.json",
    },
  },
});
