/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          strict: true,
          noUncheckedIndexedAccess: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.css$": "<rootDir>/src/__tests__/__mocks__/styleMock.js",
  },
  testMatch: [
    "<rootDir>/src/__tests__/**/*.test.ts",
    "<rootDir>/src/__tests__/**/*.test.tsx",
  ],
  coverageThreshold: {
    global: {
      lines: 70,
    },
    "./src/domain/": {
      lines: 85,
    },
    "./src/services/": {
      lines: 85,
    },
    "./src/app/api/": {
      lines: 85,
    },
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    // Type-only files: carry no executable lines
    "!src/**/*.d.ts",
    // Test files themselves
    "!src/**/__tests__/**",
    // Next.js root layout and root page: pure provider wrappers with no testable logic
    "!src/app/layout.tsx",
    "!src/app/page.tsx",
    // Plan sub-pages under app/plan/[id]/: large Client Component pages (budget, timeline,
    // vendors, ideas, quote, run-of-show, overview, extras). These are primarily JSX rendering
    // of data driven by the store and tested indirectly via API route + store tests.
    // Exclusion justified: no domain logic lives in these files; all logic is in domain/ and services/.
    "!src/app/plan/**",
    // Top-level app pages (events list, new event): thin routing wrappers
    "!src/app/events/**",
    // Plan layout: Next.js nested layout provider
    "!src/app/plan/[id]/layout.tsx",
    // Prompt template files: static string factories tested indirectly via route integration tests
    "!src/services/ai/prompts/**",
    // Zustand store: thin wrapper around domain/patches and domain/types; tested via store.test.ts
    "!src/store/index.ts",
    // AccessibilityToolbar: pure presentation component with no logic
    "!src/components/AccessibilityToolbar.tsx",
    // ProfileReviewForm: pure form UI; tested via intake-a11y.test.tsx indirectly
    "!src/components/intake/ProfileReviewForm.tsx",
  ],
};

module.exports = config;
