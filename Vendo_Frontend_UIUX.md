# Vendo — Frontend & UI/UX Design System

**Prepared as:** Senior Developer / Solutions Architect with Frontend & UI/UX expertise (20 yrs production experience)
**Document Type:** Complete Frontend & UI/UX Specification (Design System + Page-by-Page Breakdown)
**Version:** 2.0
**Companion:** `Vendo_System_Architecture.md`, `Vendo_System_Structure.md`
**Research basis:** 2026 UI/UX trend research (Pantone Cloud Dancer, elevated neutrals, warm dark mode, transformative teal for trust-led platforms, live-commerce UI patterns).

---

## Changelog v1.0 → v2.0 (major upgrades)

Previous version covered: Color, Typography, Role-wise pages, Bento Grid, Glassmorphism, Motion tokens.

| Upgrade | Why (industry standard) |
|---|---|
| **4-Tier Design Token Architecture** | Atlassian / Shopify Polaris — primitive → semantic → component → product |
| **Dark Mode (first-class, token-based)** | Not CSS invert — every semantic token has a dark mapping |
| **Component State Matrix** | Every interactive state documented before ship |
| **Skeleton Loading exact specs** | Shimmer, timing, shapes per surface |
| **Empty + Error State per section** | No blank or “broken” screens |
| **Icon System (Lucide)** | Sizing grid + rules |
| **4px Base Spacing + Grid** | Polaris/Material 3 density + marketing layout |
| **Z-Index Architecture + Elevation** | Predictable overlays; shadow = height |
| **Focus Ring + Keyboard Nav (WCAG 2.1 AA)** | Commerce + admin tools keyboard-complete |
| **Performance Spec (CWV)** | LCP/INP/CLS + WebP/AVIF + font loading |
| **AI Chat UI Patterns** | Streaming text, AI skeleton, escalate |
| **Toast / Notification full spec** | Placement, duration, stacking, a11y |
| **Onboarding UX** | New vendor KYC + new customer first-run |
| **Print Stylesheet** | Invoice legal/print-ready |
| **Social Commerce overlay patterns** | Reels + Live safe zones and shoppable tags |

---

## PART A — DESIGN SYSTEM FOUNDATION

## 1. Design Philosophy

Vendo UI must feel **Aesthetic + Modern + Classic** together. 2026 research points to warm neutrals, elevated dark mode, and a soothing bold accent — not pure white/black or harsh neon.

- **Aesthetic:** Warm off-white canvas, soft shadow, generous space, Bento rhythm
- **Modern:** Sora headings, teal + coral, Bento dashboards, Glassmorphism 2.0 on video
- **Classic:** Deep navy-charcoal text, Fraunces only on hero/brand moments

**Rule:** One token file (`src/css/tokens.css`). No raw hex/px in component CSS.

---

## 2. 4-Tier Design Token Architecture

```
Tier 0  Primitive     raw values (palette, space, duration)
Tier 1  Semantic      meaning (bg.canvas, text.primary)
Tier 2  Component     button.primary.bg, input.border
Tier 3  Product/Role  role.accent, live.badge, cta.buy
```

- Components consume **Tier 2 + Tier 3** only
- Theme (`data-theme="light|dark"`) remaps **Tier 1**
- Role (`data-role="admin|vendor|customer"`) remaps **Tier 3**
- Naming: `--vendo-*` in code; tables below use short names

### 2.1 Tier 0 — Primitive color

| Token | Hex |
|---|---|
| cream-50 | `#FAF9F6` |
| cream-100 | `#F1F0EB` |
| cream-200 | `#E5E3DC` |
| white | `#FFFFFF` |
| navy-950 | `#1E293B` |
| slate-500 | `#64748B` |
| slate-400 | `#94A3B8` |
| stone-950 | `#1C1917` |
| stone-900 | `#24211E` |
| stone-800 | `#2D2A26` |
| stone-700 | `#3A362F` |
| ivory-50 | `#F5F3EF` |
| ivory-300 | `#B8B2A8` |
| ivory-500 | `#8A8378` |
| teal-800 | `#0F766E` |
| teal-900 | `#0B5D56` |
| teal-400 | `#2DD4BF` |
| coral-500 | `#F97316` |
| coral-600 | `#EA580C` |
| coral-400 | `#FB923C` |
| navy-800 | `#1E3A5F` |
| green-500 / 400 | `#10B981` / `#34D399` |
| amber-500 / 400 | `#F59E0B` / `#FBBF24` |
| red-500 / 400 | `#EF4444` / `#F87171` |
| sky-500 / 400 | `#0EA5E9` / `#38BDF8` |

Space primitives (4px base): `0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128`.

Duration: 100 / 150 / 220 / 320 / 450ms. Easing: enter `cubic-bezier(0.16,1,0.3,1)`, exit `cubic-bezier(0.7,0,0.84,0)`, toggle `cubic-bezier(0.65,0,0.35,1)`, standard `cubic-bezier(0.2,0,0,1)`. No plain `ease`, no bounce.

### 2.2 Tier 1 — Semantic (theme-mapped)

**Light**

| Token | Value | Use |
|---|---|---|
| bg-canvas | `#FAF9F6` | Page |
| bg-surface | `#FFFFFF` | Card, modal |
| bg-subtle | `#F1F0EB` | Section, hover |
| border-default | `#E5E3DC` | Dividers, inputs |
| text-primary | `#1E293B` | Headings, body |
| text-secondary | `#64748B` | Labels |
| text-muted | `#94A3B8` | Placeholder |
| brand / hover | `#0F766E` / `#0B5D56` | Nav, links |
| cta / hover | `#F97316` / `#EA580C` | Buy Now |
| success / warning / danger / info | green / amber / red / sky | Status |
| focus-ring | teal-800 | Keyboard |

**Dark (first-class — never `filter: invert()`)**

| Token | Value |
|---|---|
| bg-canvas / surface / subtle | `#1C1917` / `#24211E` / `#2D2A26` |
| border | `#3A362F` |
| text-primary / secondary / muted | `#F5F3EF` / `#B8B2A8` / `#8A8378` |
| brand / cta | `#2DD4BF` / `#FB923C` |
| success / warning / danger | `#34D399` / `#FBBF24` / `#F87171` |
| focus-ring | `#2DD4BF` |

Contrast: body ≥ 4.5:1. Images never inverted. Overlay scrim darker in dark mode. Persist `localStorage.vendo-theme` = `light | dark | system`. FOUC script in `<head>`.

### 2.3 Tier 3 — Role accent

| Role | Light | Dark | Use |
|---|---|---|---|
| Admin | `#1E3A5F` | `#93C5FD` | Sidebar, non-commerce primary |
| Vendor | `#0F766E` | `#2DD4BF` | Same |
| Customer | `#F97316` | `#FB923C` | Same |

**Buy Now is always Coral**, regardless of role. Max 3 prominent colors per screen.

### 2.4 Glassmorphism 2.0 (video overlays only)

| Token | Value |
|---|---|
| glass-bg | `rgba(28,25,23,0.55)` |
| glass-bg-heavy | `rgba(28,25,23,0.78)` |
| glass-bg-light | `rgba(255,255,255,0.22)` |
| glass-blur / heavy | `16px` / `24px` |
| glass-border | `1px solid rgba(255,255,255,0.12)` |
| glass-glow-cta | `0 0 24px rgba(249,115,22,0.35)` |

Never on dashboard cards.

---

## 3. Typography

| Role | Font |
|---|---|
| Heading | Sora |
| Body | Inter |
| Display (hero/storefront only) | Fraunces |
| Mono (invoice #, audit) | IBM Plex Mono |

Load with `preconnect` + `display=swap`. Optional Noto Sans Bengali when copy is BN.

| Style | Size / LH | Weight | Use |
|---|---|---|---|
| Display | 40/48 | Fraunces 500 | Hero |
| H1 | 32/40 | Sora 600 | Page title |
| H2 | 24/32 | Sora 600 | Section |
| H3 | 20/28 | Sora 500 | Card/modal |
| H4 | 18/26 | Sora 500 | Subhead |
| Body Large | 16/24 | Inter 400 | Descriptions |
| Body | 14/22 | Inter 400 | Default UI |
| Caption | 12/18 | Inter 400 | Meta |
| Button | 14–16 | Sora 600 | Buttons |
| KPI | 28–40 | Sora 600 tabular-nums | Dashboards |

Never below 12px. Body never lighter than text-secondary on canvas.

---

## 4. Spacing, Grid & Layout (4px base)

| Token | px |
|---|---|
| space-1 … 16 | 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 |

Customer cards: comfortable (`space-6`). Admin tables: compact (`space-3`) with 44px taps on mobile.

| | Mobile <640 | Tablet 640–1024 | Desktop >1024 | Wide >1440 |
|---|---|---|---|---|
| Columns | 4 | 8 | 12 | 12 |
| Gutter | 16 | 20 | 24 | 24 |
| Max | 100% | 100% | 1280px dashboards | 1440px storefront |

Bento: 12-col, row unit 160px, gap 16px, spans 2/3/4/6/8/12. Sidebar 240px, topbar 64px. Customer mobile bottom tab 56px + safe-area.

---

## 5. Elevation, Shadow & Z-Index

| Elev | Shadow | Use |
|---|---|---|
| 0 | none | Flat |
| 1 | `0 1px 3px rgba(30,41,59,0.08)` | Resting card |
| 2 | `0 8px 24px rgba(30,41,59,0.12)` | Hover, popover, sticky summary |
| 3 | `0 16px 40px rgba(30,41,59,0.16)` | Modal |
| 4 | `0 24px 56px rgba(30,41,59,0.20)` | Toast |

Dark shadows: `rgba(0,0,0,0.45)`. Radius: 8 button/input, 12 card, 16 modal, pill 9999.

| Z token | Value | Layer |
|---|---|---|
| base | 0 | Page |
| raised | 10 | Sticky headers |
| live-overlay | 15 | In-player chrome |
| nav | 20 | Top nav, sidebar |
| dropdown | 30 | Menus |
| overlay | 40 | Scrim |
| modal | 50 | Modal/drawer |
| toast | 60 | Toasts |
| skip | 70 | Skip link |

---

## 6. Icon System (Lucide)

Sizes: 12 / 16 / 20 / 24 / 32 / 48. Default stroke 1.75. `currentColor`. Icon-only: `aria-label` + 44×44 hit. No emoji-as-UI. Empty states: one muted Lucide icon. Reels icons: white + drop-shadow.

Core set: search, shopping-bag, heart, user, bell, play, radio, message-circle, store, layout-dashboard, package, shield, sun, moon, plus, check, x, chevron-*, upload, pin, sparkles.

---

## 7. Motion

| Token | Duration | Use |
|---|---|---|
| instant | 100–150ms | Press, color |
| fast | 200–250ms | Hover, dropdown, tab |
| medium | 300–350ms | Modal, sheet |
| slow | 400–500ms | Page/hero |

Exit ≈ 75% of enter. `prefers-reduced-motion: reduce` → no pulse, duration ~0.

---

## 8. Component State Matrix

| State | Visual | Motion | A11y |
|---|---|---|---|
| Default | Base | — | name/role |
| Hover | bg-subtle or 6% darken | fast | pointer only |
| Focus-visible | 2px ring, offset 2px | instant | keyboard |
| Pressed | scale(0.98) | instant | — |
| Loading | spinner/skeleton, not 40% dim | 800ms spin | aria-busy |
| Disabled | opacity 40%, no hover | none | disabled |
| Error | danger border + text | **no shake** | aria-invalid |
| Success | check 1.2s | fast | live polite |
| Selected | accent border/fill | toggle | aria-selected |
| Empty / Skeleton | §9 / §10 | | |

Component extras: button width locked while loading; destructive confirm 3s; LIVE badge only pulsing element; file dropzone teal dashed on dragover; AI composer streaming/fail.

---

## 9. Empty + Error per section

Empty anatomy: hero icon → H4 → one helper line → one action.

| Surface | Title | Action |
|---|---|---|
| Cart | Your cart is empty | Browse Products (Coral) |
| Wishlist | Nothing saved yet | Start Exploring |
| Search | No results | Related categories |
| Customer orders | No orders yet | Continue shopping |
| Vendor products | No products | Add Product |
| Vendor orders | No orders yet | Copy store link |
| Vendor reels | No reels | Upload Reel |
| Vendor inbox | No messages | — |
| Admin disputes | No pending disputes | — (positive) |
| Admin payouts | Queue empty | — |
| Admin audit | No matching logs | Reset filters |
| Reels new user | **Never blank** | Trending fallback |
| Live list | Nobody live | Watch Reels |
| Notifications | You’re caught up | — |
| AI chat | Vendo Assistant | Suggestion chips |

Errors: icon + what happened + Retry + secondary. Payment fail stays on checkout (not toast-only). Live fail: “Live has ended” + browse. AI fail: retry bubble. Session: modal with return URL. Realtime drop: “Reconnecting…” banner.

---

## 10. Skeleton — exact specs

- Base: light `#E5E3DC` / dark `#3A362F`
- Shine: white 55% / 6%
- Shimmer: **105deg**, **1.4s** linear infinite, background-size 200%
- Reduced motion: static fill
- Image bones keep aspect (1:1 product, 9:16 reel, circle avatar)
- Text bones 12px tall, 40–80% width, 8px gap
- Product grid: 8 desktop / 4 mobile cards
- Live connect: 24px spinner + “Connecting to live…” + Cancel
- Reels: **blurred last frame**, not gray
- AI: 3 staggered lines + typing dots 1.2s
- Progressive: show image when ready even if price still a bone

---

## 11. Focus + Keyboard (WCAG 2.1 AA)

```
outline: 2px solid var(--color-focus-ring);
outline-offset: 2px;
```

`:focus-visible` only. On video: white ring + dark halo. Never `outline: none` without replacement. Targets: 44×44 mobile, 32×32 dense desktop with 8px gap.

| Context | Keys |
|---|---|
| Global | Tab visual order; skip link first |
| Modal | trap, Esc, restore focus |
| Listbox | arrows, Enter, Esc, typeahead |
| Tabs | Left/Right, Home/End |
| Reels | Up/Down, L like, C comments |
| AI | Enter send, Shift+Enter newline |

Status never color-only. Visible labels. `lang` set. Toasts polite; submit errors assertive.

---

## 12. Toast / Notification

Toasts: desktop top-right 24px; mobile top 16px; width 360px; max stack 3; z-toast; elev-4; enter 320ms; exit 240ms; info/success 4s; warning 6s; error sticky/10s; hover pauses; icon + title 14 + optional 12 desc. `role="status"` / error `alert`.

Notification center: bell, `9+` pill, grouped Today/Yesterday/Earlier, unread coral dot, mark all read.

---

## 13. AI Chat UI

FAB 56px bottom-right. Panel 380×640 (mobile 100dvh). Header: Assistant + sparkles + Escalate (Teal). User bubble Coral right; AI `bg-subtle` left. Streaming replaces 3-line skeleton; caret 800ms; send disabled while busy. Markdown subset + product mini-cards. Empty chips: Track order / Return policy / Find in live shops. Escalate keeps history + banner.

---

## 14. Onboarding

**Vendor KYC:** 1 Business → 2 Documents → 3 Review → 4 Pending (amber 24–48h). Draft per step. Rejected: admin note + resubmit docs. Live/Payout nav disabled until approved.

**Customer:** optional welcome (always Skip) → interest chips → follow 3 vendors. Reels never empty. Guest checkout allowed.

**Admin:** 2FA banner, no long tour.

---

## 15. Print (invoice)

`@media print`: hide chrome; A4 16mm; force light `color-scheme`; 12pt Inter; Plex Mono for numbers; `break-inside: avoid` on rows; header TAX INVOICE; footer page counter. On-screen Print uses `window.print()`.

---

## 16. Social commerce overlays

9:16 safe zones: top vendor/live; right 48px actions; bottom caption + 72px glass product card; left clear. Shop sheet 50–70vh glass-heavy. Tag pin 24px coral. Live hierarchy: recessed viewers → chat → foreground pinned product + CTA glow. Chat max 5 lines mobile, fade mask. `env(safe-area-inset-*)`.

---

## 17. Performance

| Metric | Target |
|---|---|
| LCP | ≤ 2.5s p75 |
| INP | ≤ 200ms |
| CLS | ≤ 0.1 (reserved skeleton space, image dimensions) |
| Critical JS | ≤ 180KB gzip |

Images: AVIF → WebP → JPEG; srcset 320/640/960/1280; lazy below fold; LCP `fetchpriority="high"`. Fonts: swap, max 3 families/page. Animate only transform/opacity. Pause offscreen video; unsubscribe realtime on leave.

---

## PART B — ROLE-WISE PAGES

## 18. Admin (Navy)

Login; Dashboard bento (chart 6×2, Live 3, Disputes 3, KPI×3, activity 12); Vendors list/detail; Moderation (reels, live, comments); Categories tree; Disputes + Payouts (confirm modal); Audit (Plex Mono timestamps); Settings + 2FA.

## 19. Vendor (Teal)

KYC onboarding; Dashboard (chart 8, quick actions 4 with Go Live coral pulse, KPI×4, recent orders); Products; Reel studio 9:16; Live setup + 70/30 control; Orders; Messages two-pane; Store settings WYSIWYG; Earnings.

## 20. Customer (Coral)

Split login; Home discovery; Reels; Live; Listing + PDP (Add Cart teal outline, Buy coral); Search tabs; Cart; Checkout stepper; Confirmation; Tracking; Wishlist; Storefront Fraunces; Profile; AI widget; Notifications; Invoice print.

Mobile tabs: Home, Reels, Live, Bag, Account.

---

## 21–22. Responsive + A11y

Mobile hamburger for admin/vendor; hover only as enhancement. Full checklist: contrast, 12px min, 44px taps, focus-visible, aria-label, skip link, reduced motion, no invert dark mode.

## 23. Implementation mapping

| Spec | Code |
|---|---|
| Tokens, dark, role | `src/css/tokens.css` |
| Components | `src/css/styles.css` |
| Theme | `src/js/theme.js` |
| Toast/modal | `src/js/ui.js` |
| Shells | `src/js/layout.js` |
| Mock data | `src/js/data.js` |
| AI widget | `src/js/chat.js` |
| Pages | `public/**/*.html` |

## 24. Why this works

Warm neutrals + teal/coral jobs + 4-tier tokens + first-class dark + state/skeleton/empty matrix + z-index + WCAG keyboard + CWV + AI/toast/onboarding/print/social overlays = production design system, not a palette dump.
