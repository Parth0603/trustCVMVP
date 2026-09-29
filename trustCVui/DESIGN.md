---
name: Autonomous Infrastructure Security
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 3.5rem
    fontWeight: '600'
    lineHeight: 4rem
    letterSpacing: -0.035em
  display-md:
    fontFamily: Inter
    fontSize: 2.5rem
    fontWeight: '600'
    lineHeight: 3rem
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: 2.5rem
    letterSpacing: -0.025em
  headline-md:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  title-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '500'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.625rem
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
    letterSpacing: -0.005em
  label-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system embodies a calm, authoritative developer-first aesthetic rooted in precision, extreme legibility, and architectural rigor. Designed for mission-critical security intelligence, cryptographic attestation, and enterprise AI orchestration, it avoids unnecessary decoration in favor of high-signal clarity.

The visual style blends modern technical minimalism with refined product utility:
- **Clean & Calm Precision**: Crisp negative space, intentional hierarchy, and restrained interactive states reduce cognitive load during high-stakes monitoring.
- **Architectural Structure**: Razor-thin hairline boundaries combined with disciplined micro-elevation establish strict relational hierarchy across complex observability streams and configuration workflows.
- **High-Fidelity Utility**: Confident, dark slate text against luminous, near-white backdrops provides uncompromising legibility across prolonged operations.

## Colors

The palette balances clinical precision with calculated focal accents:
- **Primary Canvas & Surfaces**: Base canvas defaults to `#F8FAFC` to eliminate screen glare, while card modules, table rows, and interactive overlays rely on pure `#FFFFFF` surfaces to create immediate visual layer definition.
- **Structural Lines**: `#E2E8F0` provides crisp structural delineation without visual noise. Hover borders subtly darken to `#CBD5E1`.
- **Text & Hierarchy**: Primary typography operates at near-black `#0F172A` for absolute contrast. Meta labels, timestamp hints, and non-actionable descriptors utilize `#64748B`.
- **Semantic Accents**:
  - **Action & Primary Blue** (`#2563EB`): Reserved for active primary actions, active telemetry pins, and critical state navigations.
  - **Success** (`#16A34A`): Validated attestations, zero-vulnerability checks, and stable nodes.
  - **Warning** (`#D97706`): Approaching quota thresholds, certificate renewals, and transient latency spikes.
  - **Critical** (`#DC2626`): Unauthenticated access vectors, compromised nodes, and pipeline failures.

## Typography

The type scale relies exclusively on Inter to deliver an uncompromising, neutral reading experience across dense analytical interfaces:
- **Tracking & Tight Leading**: Larger display and headline sizes employ negative tracking (`-0.015em` to `-0.035em`) to create dense, confident editorial authority reminiscent of modern developer tooling.
- **Tabular Figures & Metrics**: Numeric dashboards, security ratings, and system resource indicators should enforce tabular figures (`font-variant-numeric: tabular-nums`) to ensure strict columnar scanning.
- **Monospace Usage**: Monospace fonts are forbidden for generic labels or interface copy. Monospace styling is strictly reserved for cryptographic signatures, public keys, commit SHAs, and raw API payloads.

## Layout & Spacing

The layout is constructed on an 8pt base grid with a fluid 12-column desktop framework:
- **Canvas Margins & Gutters**: Desktop views maintain an outer canvas margin of `2rem` (`32px`) and internal column gutters of `1.5rem` (`24px`). On viewport widths below 768px, gutters collapse to `1rem` (`16px`) and margins scale to `1rem`.
- **Vertical Rhythm**: Related elements (such as field labels and text inputs) pair tightly with `space-xs` (4px) or `space-sm` (8px). Structural cards and grid segments separate cleanly with `space-md` (16px) to `space-lg` (24px).
- **Dense Data Zones**: Tables, log monitors, and policy inspectors reduce vertical cell gaps to `space-sm` while maintaining horizontal padding of `space-md` to prioritize vertical information capacity.

## Elevation & Depth

Visual hierarchy leverages crisp hairline borders augmented by low-opacity, high-diffusion ambient shadows:
- **Level 0 (Flat / Canvas)**: `#F8FAFC` base without borders or shadows.
- **Level 1 (Card & Module Surface)**: Pure `#FFFFFF` fill bounded by a 1px solid `#E2E8F0` border. Shadow: `0 1px 2px 0 rgba(15, 23, 42, 0.04)`.
- **Level 2 (Hover & Raised Elements)**: Interactive cards on pointer focus or secondary popovers. Border: `1px solid #CBD5E1`. Shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Modals & Command Palettes)**: Foreground overlays (e.g., Quick Switcher, Audit Trail Drawer). Border: `1px solid #E2E8F0`. Shadow: `0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`.

## Shapes

The geometric identity balances clean-cut modernism with refined ergonomics:
- **Base Rounding (8px / `0.5rem`)**: Applied to standard interactive controls, including text inputs, dropdown triggers, and buttons.
- **Container Rounding (12px - 16px / `0.75rem` - `1rem`)**: Applied to cards, code blocks, analytical charts, and modal viewports.
- **Pill Badges (`9999px`)**: Status pills and inline entity badges use fully rounded geometries to differentiate immediate state indicators from interactive actionable buttons.

## Components

### Buttons
- **Primary**: Solid `#2563EB` fill, white text, 8px radius, `font-weight: 500`. Subtle hover: `#1D4ED8`. Focus outline: 2px ring with `#2563EB` at 20% opacity.
- **Secondary**: Surface `#FFFFFF` with 1px border `#E2E8F0` and `#0F172A` text. Hover shifts to `#F8FAFC` background and `#CBD5E1` border.
- **Ghost**: Transparent background, `#64748B` text, turning to `#0F172A` on hover with a `#F1F5F9` background fill.

### Input Fields
- Structured with `#FFFFFF` background, 1px border in `#E2E8F0`, and 8px border radius.
- Height standard is 38px with horizontal padding of 12px. Placeholder text is `#94A3B8`.
- Focus state switches border directly to `#2563EB` with an ambient 3px outer ring: `rgba(37, 99, 235, 0.12)`.

### Cards & Panels
- Constructed with a white (`#FFFFFF`) surface, 12px to 16px corner radii, and a uniform 1px `#E2E8F0` border.
- Header partitions use a bottom border of 1px `#F1F5F9` with generous 16px to 20px inner padding.

### Chips & Status Badges
- Semi-transparent, tinted backgrounds with high-contrast foreground text:
  - **Healthy**: `#DCFCE7` fill with `#16A34A` text.
  - **Review**: `#FEF3C7` fill with `#D97706` text.
  - **Breach / Critical**: `#FEE2E2` fill with `#DC2626` text.
  - **Neutral**: `#F1F5F9` fill with `#475569` text.
- Compact height (22px), 8px horizontal padding, pill-shaped radius.

### Checkboxes & Radio Controls
- Base state: 16px box/circle, 1px border `#CBD5E1`, `#FFFFFF` interior.
- Selected state: `#2563EB` background with crisp `#FFFFFF` icon tick or inner disc.

### Data Tables & Technical Lists
- Alternating row zebra patterns are omitted in favor of clean 1px `#F1F5F9` horizontal separators.
- Hover states subtly tint the row to `#F8FAFC`.
- Technical attributes (IPs, hashes, timestamps) adopt tabular numeric spacing and a secondary `#64748B` tone.