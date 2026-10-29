/**
 * csp.test.ts
 *
 * Verifies that the Content-Security-Policy (CSP) configuration in next.config.ts:
 * 1. Strictly excludes 'unsafe-eval' in production mode.
 * 2. Restricts connect-src to 'self' only (all AI calls go through server-side routes).
 * 3. Enforces frame-ancestors 'none' and other security baselines.
 */

import nextConfig from "../../../next.config";

describe("Content Security Policy (CSP) Headers", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    (process.env as { NODE_ENV: string }).NODE_ENV = originalEnv!;
  });

  it("strictly forbids 'unsafe-eval' when NODE_ENV is production", async () => {
    (process.env as { NODE_ENV: string }).NODE_ENV = "production";

    if (typeof nextConfig.headers !== "function") {
      throw new Error("nextConfig.headers must be defined as a function");
    }

    const headersConfig = await nextConfig.headers();
    const globalRule = headersConfig.find((r) => r.source === "/(.*)");
    expect(globalRule).toBeDefined();

    const cspHeader = globalRule?.headers.find(
      (h) => h.key === "Content-Security-Policy"
    );
    expect(cspHeader).toBeDefined();

    const cspValue = cspHeader?.value ?? "";
    expect(cspValue).not.toContain("'unsafe-eval'");
    expect(cspValue).toContain("script-src 'self' 'unsafe-inline'");
    expect(cspValue).toContain("connect-src 'self'");
    expect(cspValue).toContain("frame-ancestors 'none'");
  });

  it("permits 'unsafe-eval' only in development mode for React callstack debugging", async () => {
    (process.env as { NODE_ENV: string }).NODE_ENV = "development";

    const headersConfig = await (nextConfig.headers as () => Promise<Array<{ source: string; headers: Array<{ key: string; value: string }> }>>)();
    const globalRule = headersConfig.find((r) => r.source === "/(.*)");
    const cspHeader = globalRule?.headers.find(
      (h) => h.key === "Content-Security-Policy"
    );

    const cspValue = cspHeader?.value ?? "";
    expect(cspValue).toContain("'unsafe-eval'");
  });
});

