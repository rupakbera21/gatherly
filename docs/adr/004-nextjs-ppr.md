# ADR 004: Next.js 16 Partial Prerendering (PPR) & Suspense Isolation

## Status
Accepted

## Context
Next.js 16 introduces cutting-edge compile and streaming optimizations:
1. Turbopack bundler for sub-second hot reloading and production builds.
2. `cacheComponents: true` and `partialPrefetching: true`.
3. React 19 asynchronous parameter unwrapping (`use(params)`).

During static prerender passes, accessing dynamic URL parameters (`/plan/[id]/*`) directly inside root route components without a Suspense boundary halts the compiler or triggers runtime prerender errors. Furthermore, using legacy `export const dynamic = "force-dynamic"` breaks `cacheComponents` and causes Next.js build errors.

## Decision
1. **Suspense Boundary Isolation:**
   - In `src/app/plan/[id]/layout.tsx` and each tab page (`budget`, `timeline`, `vendors`, `ideas`, `extras`, `quote`, `run-of-show`), the dynamic parameter unwrapping and client state consumption are encapsulated inside an inner component (e.g., `BudgetPageInner`).
   - The default page export renders `<React.Suspense fallback={<PageSkeleton />}>`.
2. **Partial Prerendering Compatibility:**
   - Static app shells, layout headers, and navigation tabs are prerendered as static HTML at build time (`○` and `◐` markers in Next.js build output).
   - Dynamic client state hydrates smoothly in the browser via `useSyncExternalStore` without layout shifts or flashes of unstyled content.
3. **No Force Dynamic:**
   - Avoid legacy dynamic directives that disable Turbopack's partial prefetching engine.

## Consequences
- **Positive:** Fast Time to First Byte (TTFB); static HTML shells load near-instantly from CDN edges.
- **Positive:** Clean React 19 compliance with zero hydration mismatch errors.
- **Positive:** Predictable static build verification across all 23 app routes.
