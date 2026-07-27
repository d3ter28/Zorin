# V3 — Cha

**Direction:** Japanese organic warmth — earthy, grounded, humanist.

Named after *cha* (茶), the Japanese word for tea. The palette draws from the tea ceremony (*chadō*) — the matte green of a matcha bowl, the warm white of raku clay, the quiet sage of a bamboo whisk. Where Sumi is cool and precise, Cha is warm and unhurried.

## Identity

| Token | Value | Note |
|---|---|---|
| Background | `oklch(0.97 0.015 140)` | Very faintly sage-green white — not cold |
| Surface | `oklch(0.995 0.005 140)` | Near-white cards with a breath of green |
| Panel/sidebar | `oklch(0.94 0.018 140)` | Soft sage gray — noticeably warmer than Sumi |
| Accent | `oklch(0.38 0.12 155)` | Deep matcha green — buttons, active states, links |
| Muted text | `oklch(0.38 0.012 155)` | Secondary text, ≥4.5:1 contrast on all surfaces |
| Lines | `1px solid oklch(0.88 0.015 140)` | Sage-tinted, softer than Sumi |
| Radius | `6px` | Same as Sumi — disciplined, not bubbly |

## Typography

- **Display/headings:** Crimson Pro — an italic-capable old-style Roman with warmth and elegance. Used at weight 600, with italic available for decorative subheadings. Very different from Shippori Mincho: looser, warmer, more humanist.
- **Body:** Onest — same clean sans-serif as Sumi, pairing cleanly with the serif display.
- **Numbers/code:** JetBrains Mono — same technical legibility as Sumi.

## Logo

Same thin SVG square frame (1.5px stroke, 28×28px) with the Z polyline inside. Both frame and polyline use `stroke: var(--accent)` — the matcha green, not ink. This gives the logo more warmth and ties it to the accent color.

## Sidebar

Light sage panel (`--panel`) instead of pure gray. Same nav structure: Dashboard, Launch Planner, Settings, Sign out. Active items use `--accent-soft` background with `--accent` text — a sage-tinted wash rather than an indigo wash.

## Pages

| File | Description |
|---|---|
| `marketing.html` | Navbar + hero (2-col with UI mockup) + How it works (3-step grid) + Features (4 cards + 1 wide) + CTA form |
| `login.html` | 42% form left + 58% showcase right — plain sage `--bg` on the showcase panel, no decorative patterns, Catalog/Model/Recommendation step pills |
| `dashboard.html` | Light sage sidebar + onboarding checklist + tab bar (Overview/Products) + stats row + trend chart + opportunities list |
| `launch-planner.html` | Light sage sidebar + config pane (unit costs, fees, margin, scenario) + results (recommended price, stats, cost breakdown, saved scenarios) |
| `README.md` | This file |

## Character

Warm, grounded, unhurried. Like drinking matcha in a raku bowl — quiet focus without coldness. The deep matcha accent reads as organic and earthy rather than technological. Crimson Pro headings bring a literary authority that pairs with the tea-ceremony stillness. Everything stays light; no dark surfaces.

Where Sumi says *precision*, Cha says *care*.
