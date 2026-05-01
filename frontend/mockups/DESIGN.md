---
name: Celestial Guidance
colors:
  surface: '#071420'
  surface-dim: '#071420'
  surface-bright: '#2e3a48'
  surface-container-lowest: '#030f1b'
  surface-container-low: '#101d29'
  surface-container: '#14212d'
  surface-container-high: '#1f2b38'
  surface-container-highest: '#293643'
  on-surface: '#d7e4f5'
  on-surface-variant: '#c4c6cc'
  inverse-surface: '#d7e4f5'
  inverse-on-surface: '#25313f'
  outline: '#8e9196'
  outline-variant: '#44474c'
  surface-tint: '#bac8dc'
  primary: '#bac8dc'
  on-primary: '#243141'
  primary-container: '#0d1b2a'
  on-primary-container: '#768497'
  inverse-primary: '#525f71'
  secondary: '#ffb955'
  on-secondary: '#452b00'
  secondary-container: '#dc9100'
  on-secondary-container: '#4f3100'
  tertiary: '#89ceff'
  on-tertiary: '#00344d'
  tertiary-container: '#001c2c'
  on-tertiary-container: '#2f8abe'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d6e4f9'
  primary-fixed-dim: '#bac8dc'
  on-primary-fixed: '#0f1c2c'
  on-primary-fixed-variant: '#3a4859'
  secondary-fixed: '#ffddb4'
  secondary-fixed-dim: '#ffb955'
  on-secondary-fixed: '#291800'
  on-secondary-fixed-variant: '#633f00'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#071420'
  on-background: '#d7e4f5'
  surface-variant: '#293643'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
  heading-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.5'
  mono-stats:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin: 32px
---

## Brand & Style

The design system is anchored in the concept of "Intellectual Wonder." It captures the specific, quiet intimacy of a late-night study session where the vastness of the future (the starry sky) meets the warmth of immediate progress (the glowing screen). This design system is built for Indonesian university students navigating the transition from academia to career, evoking feelings of safety, boundless potential, and scholarly prestige.

The visual style is a refined **Glassmorphism**. It utilizes deep, translucent layers to simulate depth, as if the UI elements are floating within a nocturnal atmosphere. This is paired with high-precision typography and soft, radiant light sources to ensure the AI-driven insights feel both magical and authoritative.

## Colors

The palette is divided into the "Void" and the "Glow." The Void consists of deep navies and midnight blues that form the foundation of the dark-mode environment, providing a low-strain backdrop for long periods of focus. The Glow is represented by the Amber and Gold accents, used exclusively for primary actions, AI highlights, and success states to mimic the warmth of a flickering candle or a bright screen.

Surface colors utilize semi-transparent versions of the Deep Navy to maintain the glass effect. Success and error states are inspired by atmospheric phenomena—Aurora Green and Nebula Red—ensuring they feel integrated into the celestial theme rather than jarringly industrial.

## Typography

The typography in this design system balances modern accessibility with a rhythmic, editorial feel. **Plus Jakarta Sans** is used for headings to provide a friendly yet structured Indonesian character. Its wide apertures and optimistic geometry make large titles feel welcoming.

**Inter** handles the heavy lifting of the UI and long-form career guidance, chosen for its exceptional readability on backlit screens. For data-heavy sections, career matching percentages, and system status updates, **JetBrains Mono** is utilized to provide a technical, high-precision contrast that reinforces the "AI-powered" nature of the system.

## Layout & Spacing

This design system employs an **8px linear grid system** to ensure mathematical harmony across all components. The layout philosophy is a **Fixed Grid** for dashboard content to maintain a scholarly, organized feel, while the landing page utilizes a **Fluid Grid** to allow the starry background video to feel expansive and immersive.

Generous whitespace (the "lg" and "xl" tokens) is encouraged between major sections to prevent cognitive overload. Elements should feel as though they have "room to breathe" against the night sky, mimicking the isolation and focus of a quiet library.

## Elevation & Depth

Depth is communicated through **Backdrop Blurs** and **Luminous Outlines** rather than traditional shadows. 

1.  **Base Layer:** The solid #0D1B2A background with a 5% opacity grain/noise texture.
2.  **Surface Layer:** `rgba(13, 27, 42, 0.65)` with a 20px blur. This creates the "Glass" effect.
3.  **Border:** A 1px solid stroke of `rgba(248, 249, 255, 0.1)` on all glass containers to define edges against the dark background.
4.  **Active Elevation:** Primary buttons and active state cards feature a "Glow" effect—an outer shadow with a high spread (20px+) using the Amber Glow color at 30% opacity to simulate light emission.

## Shapes

The shape language is organic yet disciplined. All containers use a tiered rounding system:
- **Small components (Buttons, Inputs):** 12px (rounded-md) to feel precise.
- **Medium components (Cards, Modals):** 16px (rounded-lg) for a softer, more approachable feel.
- **Large Layout Blocks:** 24px (rounded-xl) for major content sections.

This curvature mimics the soft edges of a stack of well-worn books or the glow of light through a circular lens, avoiding the harshness of sharp corners.

## Components

### Buttons
Primary buttons use the **Amber Glow** background with black text for maximum contrast. They feature a persistent 10px soft glow. Secondary buttons use the Glassmorphic style with a Celestial Blue border.

### Cards
Cards are the primary vehicle for career advice. They must use the 20px backdrop blur. When a card is "Featured" or "AI-Recommended," the border transitions from Star White (10% opacity) to a Warm Gold gradient.

### Input Fields
Inputs are dark and translucent. The focus state is indicated by the border changing to Celestial Blue and the background opacity increasing slightly. Labels use **Inter SemiBold** in Star White at 80% opacity.

### Chips & Tags
Used for skills and interests, chips use a pill-shape (`rounded-full`) and a Mist (#E8EDF5) background at 10% opacity. For "Hot Careers," the chip uses the Flower Orange accent.

### Navigation
The sidebar or top-nav should be a persistent glass blur. Icons should be thin-stroke (1.5px) to maintain the "intellectually beautiful" and airy aesthetic.