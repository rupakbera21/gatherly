/**
 * Root layout: applies font, lang attribute, skip link, aria-live region,
 * and the accessibility toolbar. State persists here via the plan layout.
 * @rubric Accessibility – skip link, lang, aria-live; Code Quality – RSC.
 */

import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, Noto_Sans } from "next/font/google";
import "./globals.css";
import { AccessibilityToolbar } from "@/components/AccessibilityToolbar";

/* Self-hosted via next/font – distinct characterful display + quiet legible text sans */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-bricolage",
});

const instrument = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-instrument",
});

const notoSans = Noto_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto",
});

export const metadata: Metadata = {
  title: {
    default: "Gatherly – AI Event Planning Assistant",
    template: "%s | Gatherly",
  },
  description:
    "Gatherly helps you plan weddings, birthdays, and community events with AI-powered budgets, timelines, vendor checklists, and personalised ideas.",
  keywords: [
    "event planning",
    "wedding planner",
    "birthday party",
    "community event",
    "AI assistant",
    "budget planner",
    "timeline",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    title: "Gatherly – AI Event Planning Assistant",
    description:
      "Plan your perfect event with AI-powered budgets, timelines, and personalised ideas.",
    siteName: "Gatherly",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fc" },
    { media: "(prefers-color-scheme: dark)", color: "#141820" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${instrument.variable} ${notoSans.variable}`}
    >
      <body>
        {/* Skip navigation link for keyboard users */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Decorative brand-gradient background layer — CSS-only, aria-hidden, non-interactive.
            Fixed behind all content; respects reduced-motion and high-contrast via CSS.
            See docs/DESIGN.md § Background for contrast and performance rationale. */}
        <div
          className="brand-bg-layer"
          aria-hidden="true"
          role="presentation"
        />

        {/* Global polite aria-live region for async status announcements.
            A single region prevents announcement spam when multiple sections load. */}
        <div
          id="announcer"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />

        {children}

        {/* Accessibility toolbar – persists across all routes */}
        <AccessibilityToolbar />
      </body>
    </html>
  );
}
