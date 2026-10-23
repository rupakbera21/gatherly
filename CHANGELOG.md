# Changelog

All notable changes to Gatherly are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- Phase 1: Project foundation deployed

---

## [0.1.0] – 2026-10-23

### Added
- Next.js 16 App Router scaffold with strict TypeScript (`noUncheckedIndexedAccess`)
- Comprehensive security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- `src/services/env.ts` – zod-validated env with quote-stripping and fail-fast errors
- `src/services/logger.ts` – structured JSON logger with IP hashing
- `src/services/http.ts` – `readJsonBodyWithLimit` with Content-Length fast-path and streaming cap
- `src/services/ratelimit.ts` – Upstash sliding-window rate limiter (two tiers, always-awaited, fail-open)
- `src/domain/hash.ts` – canonical SHA-256 cache keys shared between client and server
- `GET /api/health` – deployment verification endpoint (booleans only, no secrets)
- Accessibility toolbar (theme, font scale, dyslexia font, high contrast, reduced motion)
- Root layout with skip link, aria-live region, self-hosted fonts (Devanagari + Bengali)
- Global CSS design system with CSS tokens, dark/light/high-contrast/reduced-motion support
- Unit tests: `hash.test.ts`, `env.test.ts`, `http.test.ts`
- GitHub Actions CI workflow (`ci.yml`)
- `npm run smoke` script for live credential verification
- `.env.example` with all required variable names
- ESLint with `jsx-a11y` plugin; Prettier config
- `README.md` with Requirement Traceability Matrix and GenAI Architecture table
