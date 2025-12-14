import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    // Use jsdom environment for React component tests
    environment: "jsdom",
    typecheck: {
      enabled: true,
      include: ["tests/**/*.test-d.ts"],
      tsconfig: "./tsconfig.json",
    },
  },
});
