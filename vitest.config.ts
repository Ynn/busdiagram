import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Extensions import bus-diagram; tests use the DOM-free entry point.
    alias: { "bus-diagram": resolve(import.meta.dirname, "src/core.ts") },
  },
  test: {
    environment: "node",
    include: ["tests/knx/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
  },
});
