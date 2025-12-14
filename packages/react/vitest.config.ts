import { defineConfig } from "vitest/config";

export default defineConfig({
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
