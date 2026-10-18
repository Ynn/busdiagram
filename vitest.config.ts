import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Extensions import bus-diagram; tests use the DOM-free entry point.
    alias: {
      "bus-diagram": resolve(import.meta.dirname, "src/core.ts"),
      // The sources, as the tests of a package of devices reach them (see the guide on
      // manufacturers' devices, whose example is tests/knx/guide-example).
      "@busdiagram": import.meta.dirname,
    },
  },
  test: {
    environment: "node",
    include: ["tests/knx/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
  },
});
