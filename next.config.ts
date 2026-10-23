import type { NextConfig } from "next";

/**
 * Next.js configuration.
 * Security headers applied to all responses via headers().
 * CSP: connect-src 'self' only (all AI calls are server-side API routes).
 * Fonts: self-hosted via next/font, so no external font CDN needed in CSP.
 */

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Referrer policy
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions policy – only what the app actually uses
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)",
          },
          // HSTS (1 year, include subdomains)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          // CSP:
          // - default-src 'self': baseline deny-all
          // - script-src 'self' 'unsafe-inline': Next.js needs inline scripts
          //   Relaxation: 'unsafe-inline' needed for Next.js hydration chunks.
          //   Mitigation: all AI calls are server-side; no third-party scripts.
          // - style-src 'self' 'unsafe-inline': Tailwind inline styles
          // - connect-src 'self': all AI calls go through /api/* server routes
          // - img-src 'self' data:: favicon and data URIs only
          // - font-src 'self': next/font self-hosts fonts
          // - frame-ancestors 'none': no embedding
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self'",
              "img-src 'self' data:",
              "font-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // Turbopack for development
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
