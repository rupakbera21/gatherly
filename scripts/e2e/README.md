# End-to-End Browser & API Matrix Scripts

These automated Node.js Playwright and HTTP scripts exercise the live Gatherly application matrix against running servers.

> [!WARNING]
> **Real API Quota Usage:** These scripts invoke actual live GenAI endpoints (Gemini, GroqCloud, Upstash Redis). Running them will consume outbound API quota and tokens. Run them intentionally during pre-submission verification or milestone regression audits.
>
> **Zero Secrets:** None of these scripts contain hardcoded credentials or API keys. They read keys securely from `.env.local` or process environment variables (`GEMINI_API_KEY`, `GROQ_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).

## Script Catalog

- **`exercise-features.mjs`**: Exercises the primary wedding creation flow, module generation, and budget calculations.
- **`exercise-intake-birthday-community.mjs`**: Exercises birthday and community gathering event intake profiles, review forms, and type-specific extras.
- **`exercise-copilot-quote.mjs`**: Tests the live Copilot conversational drawer, patch proposal, approve/reject cycles, and vendor quote analyzer parsing.
- **`exercise-exports-data.mjs`**: Validates RFC 5545 iCalendar generation, RFC 4180 CSV export, JSON backup export/import roundtrip, and privacy data deletion.
- **`exercise-failure-paths.mjs`**: Validates empty and malformed input handling, prompt injection neutralization, rate limiting, and AI provider fallback badges.
- **`exercise-a11y-keyboard-mobile.mjs`**: Audits keyboard tab navigation, focus rings, skip links, accessibility toolbar toggles, and screen reader announcements.
- **`exercise-events-a11y.mjs`**: Tests events dashboard accessibility, plan card navigation, and saved state hydration.

## Usage

Ensure the production build is running locally:
```bash
npm run build
npm start
```

Run any script using Node.js:
```bash
node scripts/e2e/exercise-failure-paths.mjs
```
