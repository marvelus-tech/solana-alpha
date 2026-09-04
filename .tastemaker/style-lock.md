# Solana Alpha — Style Lock (Phase 1)

This document captures the visual design contract established in Phase 1 to guide future development.

## Color System

### Surface & Structure
- **Background**: `#F5F3EE` — warm paper feel, light cream
- **Surface (cards)**: `#FFFFFF` — pure white for panels
- **Text**: `#171728` — almost black, high contrast
- **Muted**: `#66667A` — subdued secondary text
- **Border**: `#E6E4DC` — hairline, used sparingly

### Semantic Colors
- **Accent (primary)**: `#0F9F7A` — Solana-adjacent teal for live status, emphasis (used sparingly)
- **Positive**: `#00875a` — gains, up movements
- **Negative**: `#d92d20` — losses, down movements

**Rule**: ONE accent color only. No purple-pink gradients, no rainbow UI.

## Typography

### Font Stack
- **Display/Headings**: Space Grotesk (500, 700)
- **Body/UI**: Plus Jakarta Sans (400, 500, 600)

### Scale & Hierarchy
- **H1**: 2.2–3rem, weight 700, tight tracking (-0.02em), line-height 1.1
- **H2 (section)**: 1.2rem, weight 600, subtle tracking (-0.01em)
- **Stat labels**: 0.72rem, uppercase, tracking 0.1em, weight 600
- **Body**: 1rem base
- **Prices**: tabular-nums for alignment

## Radius & Elevation

### Border Radius
- **Panels**: 16px
- **Rows/Cards**: 12px
- **Badges**: 999px (pill shape)

### Shadows (instead of borders)
- **Small**: `0 1px 2px rgba(23,23,40,0.04), 0 2px 6px rgba(23,23,40,0.02)`
- **Medium**: `0 2px 8px rgba(23,23,40,0.06), 0 4px 16px rgba(23,23,40,0.04)`
- **Lift (hover)**: `0 4px 12px rgba(23,23,40,0.08), 0 8px 24px rgba(23,23,40,0.06)`

**Philosophy**: Soft proximity + shadow over stacked 1px borders everywhere.

## Motion & Animation

### Timing
- **Fast feedback** (hover): 160ms
- **Spatial moves** (enter, lift): 280ms
- **Easing**: `cubic-bezier(0.22, 1, 0.36, 1)` — smooth, natural

### Animate Only
- `transform` and `opacity` for performance
- Respect `prefers-reduced-motion: reduce`

### Patterns
- **Row hover**: slight lift (translateY -1px) + background shift + shadow
- **List enter**: stagger 40ms per row, opacity + translateY 6px
- **Live pulse**: 2s infinite on status dot
- **Skeleton loading**: shimmer gradient animation

## Layout & Spacing

### Spacing Scale
- **XS**: 8px
- **SM**: 12px
- **MD**: 16px
- **LG**: 24px
- **XL**: 32px

### Breakpoints
- Mobile-first
- `@media (min-width: 920px)` — three-column grid
- Test stress at ~360px and ~920px

## Featured Treatment: Scout Finds

Scout panel is visually distinct:
- 2px accent border (`#0F9F7A`)
- Elevated shadow (medium)
- 3px gradient top bar (accent to lighter teal)
- More breathing room above (margin-top: var(--spacing-lg))

## Anti-Patterns (Do NOT)

- ❌ Dark mode (light theme only)
- ❌ Purple-to-pink gradients
- ❌ Swapping Inter font
- ❌ Lucide icon soup or emoji-as-icons
- ❌ Fake 3D effects
- ❌ Grain overlay decoration
- ❌ Generic AI SaaS look

## Success Criteria

1. Still light theme
2. Page looks materially more premium and distinctive
3. Live JSON still loads and renders
4. Mobile grid still works
5. Same information architecture (no content changes)

---

**Phase 2 considerations**: When adding/changing token filtering or content strategy, maintain this style lock as the visual foundation.
