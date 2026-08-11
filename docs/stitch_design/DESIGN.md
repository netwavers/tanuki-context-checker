---
name: Warm Earth Analysis
colors:
  surface: '#151313'
  surface-dim: '#151313'
  surface-bright: '#3b3839'
  surface-container-lowest: '#0f0e0e'
  surface-container-low: '#1d1b1b'
  surface-container: '#211f1f'
  surface-container-high: '#2c2929'
  surface-container-highest: '#373434'
  on-surface: '#e7e1e1'
  on-surface-variant: '#d1c3c3'
  inverse-surface: '#e7e1e1'
  inverse-on-surface: '#323030'
  outline: '#9a8e8e'
  outline-variant: '#4e4444'
  surface-tint: '#d5c2c2'
  primary: '#d5c2c2'
  on-primary: '#3a2d2e'
  primary-container: '#837373'
  on-primary-container: '#ffffff'
  inverse-primary: '#6a5b5b'
  secondary: '#cfc4c4'
  on-secondary: '#352f2f'
  secondary-container: '#4f4747'
  on-secondary-container: '#c1b6b6'
  tertiary: '#c0c9c2'
  on-tertiary: '#2a322e'
  tertiary-container: '#8a938d'
  on-tertiary-container: '#242b27'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#f2dede'
  primary-fixed-dim: '#d5c2c2'
  on-primary-fixed: '#241919'
  on-primary-fixed-variant: '#514344'
  secondary-fixed: '#ece0df'
  secondary-fixed-dim: '#cfc4c4'
  on-secondary-fixed: '#201a1a'
  on-secondary-fixed-variant: '#4c4545'
  tertiary-fixed: '#dce5de'
  tertiary-fixed-dim: '#c0c9c2'
  on-tertiary-fixed: '#161d19'
  on-tertiary-fixed-variant: '#414944'
  background: '#151313'
  on-background: '#e7e1e1'
  surface-variant: '#373434'
typography:
  headline-lg:
    fontFamily: Noto Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-lg-mobile:
    fontFamily: Noto Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  headline-md:
    fontFamily: Noto Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Noto Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  score-display:
    fontFamily: Noto Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 48px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 1rem
  gutter-md: 1rem
  stack-gap-lg: 1.5rem
  stack-gap-sm: 0.75rem
  card-padding: 1.25rem
---

## Brand & Style

This design system is built for the **Tanuki Context Checker (Terra Edition)**, a high-precision analysis tool that balances technical authority with a grounded, organic aesthetic. The brand personality is **"Organic Precision"**—evoking the reliability of architectural blueprints and the warmth of a professional studio environment.

The design style is **Corporate Modern with Glassmorphism**. It utilizes a muted "Warm Earth" dark mode to represent stability and focus, while employing tonal accents (sage, taupe, warm grey) to highlight data points and system actions. Smoked-glass translucent panels provide a sense of lightness and depth, preventing the dark theme from feeling heavy or claustrophobic.

**Key visual principles:**
- **Clarity & Trust:** High-contrast typography and explicit data visualization to reassure users of the tool's accuracy and privacy-first local processing.
- **Muted Sophistication:** Using a palette of desaturated earthy tones to create a calm, professional environment for deep analysis.
- **Mobile-First Utility:** Large touch targets, condensed functional groups, and card-based vertical stacking for optimal mobile ergonomics.

## Colors

The color palette is rooted in a desaturated, "Warm Earth" dark mode.
- **Primary Base:** The background uses a deep earthy charcoal (`warm-earth-base`) to provide a solid foundation for information density.
- **Secondary / Accent:** `muted-taupe` is the primary action color, used for buttons, active states, and critical paths.
- **Semantic Accents:** `sage-accent` represents high scores or safe states, providing a professional and calm indicator for system status.
- **Surface Colors:** "Smoked-glass" effects are used for panels, allowing the warm background depth to bleed through while maintaining legibility.
- **Typography:** Whites are slightly tinted toward warm grey (`text-primary`) to reduce eye strain and maintain the organic feel of the interface.

## Typography

This design system prioritizes legibility and technical clarity.
- **Primary Typeface:** **Noto Sans** is used across all UI elements for its neutral, modern tone and excellent readability at all sizes.
- **Technical Typeface:** **JetBrains Mono** is used for metadata, version numbers, and technical labels (like "JS Pipeline") to emphasize the tool's precision.
- **Hierarchy:** Use bold weights for headers to contrast against the dark background. Body text should maintain generous line-height to prevent "text-heavy" fatigue during long analysis sessions.
- **Numerical Data:** Analysis scores should be displayed prominently using the `score-display` style to act as the primary visual anchor.

## Layout & Spacing

The layout follows a **Fluid Card-Based** model optimized for mobile viewport constraints.
- **Mobile (Default):** A single-column vertical stack with 16px (`container-margin`) side padding. Elements are grouped into discrete cards to maintain logical separation.
- **Tablet/Desktop:** Cards can expand or transition into a multi-column grid (Input/Controls on the left, Results/Score on the right) above 768px.
- **Spacing Rhythm:** An 8px base grid is used. Sections are separated by `stack-gap-lg` to provide breathing room between distinct analytical functional blocks.
- **Safe Areas:** Ensure bottom navigation and action buttons account for mobile home-bar "safe areas" to prevent interaction conflicts.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layering** and **Smoked-Glass Effects**, rather than heavy shadows.
- **Level 0 (Background):** `warm-earth-base`.
- **Level 1 (Cards):** Surfaces using translucent warm-grey overlays with a 1px border of 10% white to define the edges. Apply a 12px backdrop-blur.
- **Level 2 (Interactive/Floating):** Use a subtle tonal "lift" (inner glow or slightly brighter border) for primary action buttons or active input states to make them "pop" from the UI.
- **Dividers:** Use thin, 1px lines with low opacity (15% white) for internal card divisions.

## Shapes

The design system uses a **Rounded** shape language to soften the technical nature of the tool.
- **Standard Cards:** 0.5rem (8px) corner radius.
- **Action Buttons & Tags:** 1rem (16px) radius for a "Pill-like" feel that is comfortable for thumb interaction.
- **Input Fields:** 0.5rem radius to match card styling.
- **Data Visuals:** Gauges and progress bars should use rounded caps to maintain consistency with the UI's "soft-tech" aesthetic.

## Components

### Buttons
- **Primary:** Solid warm-grey background (`primary`), bold typography, high-contrast text. Large tap target (min 48px height).
- **Secondary/Ghost:** Smoked-glass background with a `muted-taupe` border. Use for secondary actions like "Clear" or "Domain Selection."

### Cards
- Main container for analysis results. Features a backdrop-blur effect and a subtle 1px border. 
- **Header:** Includes a clean icon and a `headline-md` title.

### Input Fields
- Large text areas with a background slightly darker than the card. 
- **Focus State:** 1px `muted-taupe` border with a subtle inner glow.

### Chips & Tags
- Used for "Domain Selection" or "Preset Examples." 
- Pill-shaped, using `text-secondary` for inactive states and `primary` backgrounds for active states.

### Analysis Gauges
- Semi-circular gauges for the "Total Score." 
- Use a tonal gradient (Sage Green to Warm Taupe) to visualize the spectrum of AI-to-Human content.

### Iconography
- **Style:** Linear, 2px stroke width, consistent 24px bounding box.
- **Themes:** Use "Search/Magnifying Glass" for analysis, "Chart" for breakdowns, and "Shield" for privacy/local processing indicators.