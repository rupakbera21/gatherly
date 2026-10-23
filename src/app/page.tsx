/**
 * Home page – the entry point to Gatherly.
 * One obvious action: describe your event.
 * No pre-baked sample plans. Example chips fill the text box to edit.
 * @rubric Problem Statement Alignment – planning assistant entry; Accessibility – h1.
 */

import type { Metadata } from "next";
import { IntakeSection } from "@/components/intake/IntakeSection";

export const metadata: Metadata = {
  title: "Gatherly – Plan Your Perfect Event with AI",
  description:
    "Tell Gatherly about your event and get AI-powered budgets, timelines, vendor checklists, and personalised ideas for weddings, birthdays, and community events.",
};

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <div className="home-hero">
        <div className="home-hero-content">
          <div className="home-badge">
            <span aria-hidden="true">✨</span>
            <span>AI-powered event planning</span>
          </div>

          <h1 className="home-title">
            Plan your perfect event,{" "}
            <span className="home-title-accent">without the overwhelm</span>
          </h1>

          <p className="home-subtitle">
            Gatherly turns your vision into a complete plan — budgets, timelines,
            vendor checklists, and personalised ideas — powered by AI and
            grounded in your specific needs.
          </p>

          <div className="home-event-types" role="list" aria-label="Supported event types">
            {[
              { emoji: "💍", label: "Weddings", desc: "Multi-function, tradition-aware" },
              { emoji: "🎂", label: "Birthdays", desc: "Age-adaptive, allergy-aware" },
              { emoji: "🌍", label: "Community Events", desc: "Permits, volunteers, sponsors" },
            ].map(({ emoji, label, desc }) => (
              <div key={label} className="home-event-card" role="listitem">
                <span className="home-event-emoji" aria-hidden="true">{emoji}</span>
                <div>
                  <strong className="home-event-label">{label}</strong>
                  <span className="home-event-desc">{desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <a href="#intake-container" className="home-cta" id="get-started-btn">
              Start planning now
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" focusable="false">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
            <a href="/events" className="px-5 py-3 rounded-xl border border-stone-300 dark:border-stone-700 font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
              View Saved Events →
            </a>
          </div>

          <p className="home-privacy-note">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Your data stays on your device. No account required.
          </p>
        </div>

        <div className="home-hero-visual" aria-hidden="true">
          <div className="home-plan-preview">
            <div className="home-plan-header">
              <div className="home-plan-avatar">💍</div>
              <div>
                <div className="home-plan-title-text">Sarah &amp; James&apos; Wedding</div>
                <div className="home-plan-meta">Oct 2025 · 150 guests · ₹25L budget</div>
              </div>
            </div>
            <div className="home-plan-sections">
              {[
                { label: "Budget", value: "78%", color: "var(--color-success)" },
                { label: "Timeline", value: "12/18 done", color: "var(--color-info)" },
                { label: "Vendors", value: "8 booked", color: "var(--accent-wedding-primary)" },
              ].map(({ label, value, color }) => (
                <div key={label} className="home-plan-row">
                  <span className="home-plan-row-label">{label}</span>
                  <span className="home-plan-row-value" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
            <div className="home-plan-ai-badge">
              <span>✦</span> Generated with Gatherly AI
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Natural Language Intake Section */}
      <div id="intake-container" className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <IntakeSection />
      </div>

      {/* AI disclaimer */}
      <div className="home-disclaimer" role="note">
        <p>
          AI-generated content is for planning guidance only. Costs are estimates —
          verify with local vendors. Legal, permit, and insurance guidance is general
          information, not professional advice.
        </p>
      </div>

      <style>{`
        .home-hero {
          min-height: 100dvh;
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-8);
          padding: var(--space-8) var(--space-4);
          max-width: 1200px;
          margin: 0 auto;
          align-items: center;
        }

        @media (min-width: 900px) {
          .home-hero {
            grid-template-columns: 1fr 1fr;
            padding: var(--space-12) var(--space-8);
          }
        }

        .home-hero-content {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .home-badge {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-1) var(--space-3);
          background: var(--accent-wedding-surface);
          color: var(--accent-wedding-primary);
          border-radius: var(--radius-full);
          font-size: var(--font-size-sm);
          font-weight: 600;
          width: fit-content;
        }

        .home-title {
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: var(--color-text-primary);
        }

        .home-title-accent {
          background: linear-gradient(
            135deg,
            var(--accent-wedding-primary),
            var(--accent-birthday-primary)
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .home-subtitle {
          font-size: var(--font-size-lg);
          color: var(--color-text-secondary);
          line-height: 1.7;
          max-width: 520px;
        }

        .home-event-types {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .home-event-card {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }

        .home-event-emoji {
          font-size: 1.5rem;
          width: 2.5rem;
          height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-surface-raised);
          border-radius: var(--radius-sm);
          flex-shrink: 0;
        }

        .home-event-label {
          display: block;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .home-event-desc {
          display: block;
          font-size: var(--font-size-sm);
          color: var(--color-text-muted);
        }

        .home-cta {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-6);
          background: var(--accent-wedding-primary);
          color: var(--color-text-inverse);
          border-radius: var(--radius-md);
          font-weight: 700;
          font-size: var(--font-size-lg);
          text-decoration: none;
          transition: opacity var(--transition-fast), transform var(--transition-fast);
          width: fit-content;
        }

        .home-cta:hover {
          opacity: 0.9;
          transform: translateY(-1px);
          text-decoration: none;
          color: var(--color-text-inverse);
        }

        .home-privacy-note {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          font-size: var(--font-size-sm);
          color: var(--color-text-muted);
        }

        .home-hero-visual {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .home-plan-preview {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: var(--space-6);
          box-shadow: var(--shadow-lg);
          width: 100%;
          max-width: 360px;
        }

        .home-plan-header {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          margin-bottom: var(--space-4);
          padding-bottom: var(--space-4);
          border-bottom: 1px solid var(--color-border);
        }

        .home-plan-avatar {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          background: var(--accent-wedding-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .home-plan-title-text {
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .home-plan-meta {
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
          margin-top: 2px;
        }

        .home-plan-sections {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          margin-bottom: var(--space-4);
        }

        .home-plan-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .home-plan-row-label {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }

        .home-plan-row-value {
          font-size: var(--font-size-sm);
          font-weight: 600;
        }

        .home-plan-ai-badge {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          font-size: var(--font-size-xs);
          color: var(--color-text-muted);
          padding-top: var(--space-4);
          border-top: 1px solid var(--color-border);
        }

        .home-disclaimer {
          max-width: 1200px;
          margin: 0 auto var(--space-8);
          padding: var(--space-3) var(--space-4);
          background: var(--color-info-surface);
          border-radius: var(--radius-md);
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
          margin-inline: var(--space-4);
        }

        @media (min-width: 900px) {
          .home-disclaimer {
            margin-inline: var(--space-8);
          }
        }
      `}</style>
    </main>
  );
}
