// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: "./tests/global-setup.ts",
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
    include: ["**/*.test.ts"],
    hookTimeout: 60000,
  },
});
