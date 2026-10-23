import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Note: eslint-config-next already includes jsx-a11y internally.
// We add additional rule strictness here without re-registering the plugin.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Additional code quality rules
  {
    rules: {
      // No any types
      "@typescript-eslint/no-explicit-any": "error",
      // No unused variables (prefix with _ to ignore)
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // No var
      "no-var": "error",
      // Prefer const
      "prefer-const": "error",
      // Enforce jsx-a11y rules (plugin already loaded by eslint-config-next)
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/label-has-associated-control": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "*.config.js",
    "src/__tests__/__mocks__/**",
  ]),
]);

export default eslintConfig;
