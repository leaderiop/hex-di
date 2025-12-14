import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts"],
    typecheck: {
      include: ["packages/**/*.test-d.ts"],
    },
  },
});
