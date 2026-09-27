import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "demo/**",
      "docs/**",
      "site/samples/extensions/*.js",
      "src/knx/scenario-v2.generated.ts",
      "src/domain/scenario.generated.ts",
      "src/domain/scenario-validator.generated.js",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "tests/**/*.ts", "examples/**/*.ts", "site/**/*.ts", "*.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["site/**/*.js"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["scripts/**/*.mjs", "site/samples/**/*.mjs"],
    languageOptions: {
      globals: globals.node,
    },
  },
);
