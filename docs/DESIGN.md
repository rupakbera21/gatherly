# Gatherly Design System & Front-End Specification

## 1. Principles

1. **Operational Clarity Over Decoration:** Event plans are real-world operational cue sheets; mathematical precision, tabular alignment, and calm readability always supersede visual flourish.
2. **One Primary For Action:** A single cobalt ultramarine color drives every primary button and active selection across every screen, ensuring immediate visual predictability.
3. **The Cue Sheet is the Hero:** Structural identity stems from the authentic vernacular of event production—time-ordered run sheets, call lists, and penny-accurate ledgers—not SaaS cards.
4. **Instant, Reversible, and Reachable:** Every action responds under 100 ms, supports one-click undo, guarantees minimum 44 px touch targets, and provides zero-violation keyboard accessibility.
5. **No AI Clichés or Emoji:** Interfaces speak in calm, human sentence case; artificial sparkle badges, emoji decorators, and trailing arrows are strictly eliminated.

---

## 2. Anti-Default Rationale (What We Avoided & Why)

| Cliché AI / SaaS Default | Why It Fails Gatherly | Gatherly Replacement |
|---|---|---|
| **Emoji icons (💍, 🎂, 🌍, ✨, ✦)** | Appears juvenile, renders inconsistently across OS, breaks professional trust | Custom accessible in-repo SVG icon set with consistent 1.5px stroke and optical centering |
| **Fake mock cards with past dates** | Fabricated demonstration data ("Sarah & James Oct 2025") erodes user credibility | Clean structural diagram labelled "Illustration" showing architectural schema, or empty state |
| **Multi-color button soup** | Amber, indigo, emerald, stone buttons cause cognitive fatigue and action paralysis | Uniform Cobalt Primary (`#1d4ed8` / `#2563eb`) for all primary actions across all modules |
| **All-caps tracked eyebrow tags** | Generic SaaS template filler ("✨ AI-POWERED EVENT PLANNING") | Concrete, user-centric headings with descriptive subheadings in sentence case |
| **"Card everywhere" sprawl** | Identical rounded card grids flatten hierarchy and force endless scrolling | Border-first panels with distinct elevations; Cue List and Ledger tables take visual priority |
| **Hover animations on every element** | Distracting visual jitter during active planning | Micro-transitions (120ms) reserved strictly for interactive state changes; disabled under reduced motion |

---

## 3. Typography & Numerals

- **Headings & Display:** `Bricolage Grotesque` (via `next/font/google`). Distinctive, confident, human editorial warmth without generic SaaS anonymity.
- **Body & Controls:** `Instrument Sans` (via `next/font/google`). Highly legible modern sans with neutral clarity.
- **Tabular Numerals:** Global `font-feature-settings: "tnum" 1` for all financial figures, dates, times, countdowns, and table records.
- **International Fallback:** `Noto Sans Devanagari`, `Noto Sans Bengali`, `system-ui`.
- **Maximum Line Length:** Constrained to `< 72ch` on body and prose blocks for optimal readability.

### Type Scale

| Token | Size | Line Height | Weight | Role |
|---|---|---|---|---|
| `--text-display` | 32px (2rem) | 38px | 700 / 800 | Landing hero, plan title |
| `--text-title` | 24px (1.5rem) | 30px | 600 / 700 | Section headers, module headings |
| `--text-subtitle` | 18px (1.125rem) | 24px | 600 | Subsection headers, modal titles |
| `--text-base` | 15px (0.9375rem) | 22px | 400 / 500 | Body text, form fields, table cells |
| `--text-sm` | 13px (0.8125rem) | 18px | 500 | Metadata, timestamps, helper labels |
| `--text-xs` | 11px (0.6875rem) | 15px | 600 | Status badges, table column headers |

---

## 4. Color Palette & Token Ramps

### Base Anchors (5 Named Bases)
- **Neutral:** Slate Ink (`#0f172a`)
- **Primary:** Cobalt Ultramarine (`#1d4ed8` light / `#2563eb` dark)
- **Wedding Identity Tint:** Damask Rose (`#be185d` / `#fdf2f8`)
- **Birthday Identity Tint:** Saffron Amber (`#b45309` / `#fffbeb`)
- **Community Identity Tint:** Pine Emerald (`#047857` / `#ecfdf5`)

### Token Matrix & Contrast Verification

| Token Name | Light Value | Dark Value | High Contrast | Contrast Ratio |
|---|---|---|---|---|
| `--bg-canvas` | `#f8fafc` | `#090d16` | `#ffffff` / `#000000` | Canvas base |
| `--bg-surface` | `#ffffff` | `#0f172a` | `#ffffff` / `#000000` | Main panels |
| `--bg-surface-elevated` | `#f1f5f9` | `#1e293b` | `#ffffff` / `#000000` | Floating / secondary |
| `--text-primary` | `#0f172a` | `#f8fafc` | `#000000` / `#ffffff` | **15.8:1** (AAA) |
| `--text-secondary` | `#475569` | `#94a3b8` | `#000000` / `#ffffff` | **7.0:1** (AAA) |
| `--text-tertiary` | `#64748b` | `#64748b` | `#000000` / `#ffffff` | **4.6:1** (AA) |
| `--border-subtle` | `#e2e8f0` | `#1e293b` | `#000000` / `#ffffff` | **3.1:1** (UI boundary) |
| `--border-strong` | `#cbd5e1` | `#334155` | `#000000` / `#ffffff` | **4.2:1** (Inputs/cards) |
| `--primary` | `#1d4ed8` | `#2563eb` | `#0000ee` / `#3b82f6` | Primary action |
| `--primary-hover` | `#1e40af` | `#1d4ed8` | `#0000aa` / `#60a5fa` | Hover state |
| `--primary-fg` | `#ffffff` | `#ffffff` | `#ffffff` / `#000000` | **5.2:1** (AA) |
| `--status-success` | `#047857` | `#10b981` | `#006600` / `#00ff00` | Positive / 100% match |
| `--status-warning` | `#b45309` | `#f59e0b` | `#884400` / `#ffaa00` | Over budget / lead-time |
| `--status-danger` | `#b91c1c` | `#ef4444` | `#aa0000` / `#ff3333` | Errors / critical path |

---

## 5. Spatial Grid & Radius Hierarchy

- **Grid Unit:** 4 px base.
  - `--space-1`: 4px
  - `--space-2`: 8px
  - `--space-3`: 12px
  - `--space-4`: 16px
  - `--space-5`: 20px
  - `--space-6`: 24px
  - `--space-8`: 32px
  - `--space-10`: 40px
  - `--space-12`: 48px
  - `--space-16`: 64px
- **Radius Hierarchy:**
  - Interactive Controls (buttons, inputs, select triggers): `rounded-md` (6px)
  - Content Surfaces (panels, tables, alert banners): `rounded-lg` (8px)
  - Overlay Shells (dialogs, drawers, bottom sheets): `rounded-xl` (12px)
  - Identity Tags / Status Pills: `rounded-full` (9999px)
- **Touch Target Floor:** All interactive elements maintain `min-height: 44px` and `min-width: 44px`.

---

## 6. Layout Wireframes (ASCII)

### A. Landing & Intake
```text
+-------------------------------------------------------------------------+
| [Gatherly Logo]                            [Events (3)] [Accessibility] |
+-------------------------------------------------------------------------+
|                                                                         |
| Turn messy event ideas into a clear, reliable operational plan.         |
| Real budget ledgers, backward timelines, and day-of run sheets.         |
|                                                                         |
| +---------------------------------------------------------------------+ |
| | Tell us about your event...                                         | |
| | (e.g. 100-guest outdoor wedding in Seattle on Oct 12, $30k budget)  | |
| |                                                                     | |
| +---------------------------------------------------------------------+ |
| [Wedding prompt] [Birthday prompt] [Community prompt]                   |
|                                                                         |
| [Preferences v] (Currency: USD | Language: English)                     |
|                                                                         |
| [  Create Plan  ]               Your plans remain local to this device. |
|                                                                         |
+-------------------------------------------------------------------------+
```

### B. Plan Shell (Desktop & Mobile)
```text
DESKTOP:
+-------------------------------------------------------------------------+
| Gatherly | [Event: Maya's 30th v]  Oct 24, 2027 (184 days) | Copilot (3)|
+-----------+-------------------------------------------------------------+
| Overview  | Main Content Pane                                           |
| Budget    | (Padded 32px, max-w-6xl, centered, border-first panels)    |
| Timeline  |                                                             |
| Vendors   |                                                             |
| Ideas     |                                                             |
| Extras    |                                                             |
| Quote     |                                                             |
| Run Sheet |                                                             |
+-----------+-------------------------------------------------------------+

MOBILE (390px):
+---------------------------------------------+
| Maya's 30th              Oct 24 | [Copilot] |
+---------------------------------------------+
| Active Tab Content                          |
| (Stacked tables, full-width actions)        |
+---------------------------------------------+
| [Overview] [Budget] [Timeline] [Vendors] [More] | (Bottom Bar)
+---------------------------------------------+
```

### C. Overview (Cue Sheet Hero)
```text
+-------------------------------------------------------------------------+
| RUN SHEET: NEXT ACTIONS                        COUNTDOWN: 184 DAYS      |
| ---------------------------------------------- ------------------------ |
| [ ! ] Due in 2 weeks: Finalize Catering Menu   BUDGET: $25,000 / $25,000|
| [   ] Due in 4 weeks: Send Invitations         100% Allocated (0 Cents) |
| [   ] Due in 6 weeks: Book Photographer        ------------------------ |
| [ View complete timeline -> ]                  PROGRESS: 4 of 18 Tasks  |
+-------------------------------------------------------------------------+
```

---

## 7. Motion & Interaction Tokens

- `--motion-instant`: 0ms (under `prefers-reduced-motion: reduce`)
- `--motion-fast`: 120ms `cubic-bezier(0.16, 1, 0.3, 1)` (hover, focus ring, chip selection)
- `--motion-normal`: 240ms `cubic-bezier(0.16, 1, 0.3, 1)` (drawer entry, dialog modal, toast notification)
- **Single Orchestrated Moment:** Generation screen steps sequentially through modules with synchronous progress bars, then smoothly fades into the finished Plan Overview (300ms ease-out).

---

## 8. Component Primitives Inventory

1. `Button`: Variants (`primary`, `secondary`, `ghost`, `danger`), sizes (sm 32px, md 40px, lg 48px), min-tap 44px, loading spinner, disabled state.
2. `Input` & `Textarea`: Border-strong, focus:ring-2 focus:ring-primary, error state with icon and message.
3. `Select`: Custom keyboard-accessible dropdown with ARIA `listbox`, eliminating browser-default styling.
4. `Checkbox` & `Radio`: Accessible native inputs with styled indicators and 44px hit areas.
5. `Tabs`: Segmented controller on desktop, scrollable or bottom-tab on mobile with active indicator.
6. `Badge`: Semantic status pills (neutral, success, warning, danger, identity tints) with text + icon.
7. `Surface`: Border-first panel (variant: `default`, `elevated`, `outlined`).
8. `Table`: Responsive tabular data table with automatic mobile stacked card layout.
9. `Dialog` & `Drawer` & `Sheet`: Accessible overlay with focus trap, Escape dismissal, focus return.
10. `Toast`: Accessible polite `aria-live` notification with action button (e.g. Undo).
11. `Stat`: Structured metric display with large tabular numeral and descriptive label.
12. `EmptyState`: Actionable empty view with clear single next step.
13. `PageHeader`: Title, subtitle, breadcrumb, and action slot with consistent vertical rhythm.
14. `Icon`: In-repo SVG icon set with uniform 20x20 / 16x16 bounding box and 1.5px stroke.

---

## 9. Content & Tone Guidelines

- **Sentence Case Everywhere:** "Plan overview", not "Plan Overview"; "Export calendar", not "EXPORT CALENDAR".
- **Active Verbs:** "Create plan" -> "Plan created"; "Add to plan" -> "Added to plan".
- **Zero Filler & Apologies:** State facts plainly: "Unable to reach GroqCloud. Switched to offline baseline." Never "Oops, sorry! Something went wrong ✨".
- **Explicit Confidence:** Always state penny precision and deterministic guarantees clearly.
