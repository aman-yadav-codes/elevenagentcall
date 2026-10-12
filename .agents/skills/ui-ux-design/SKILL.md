---
name: ui-ux-design
description: >-
  Provides state-of-the-art UI/UX design heuristics, design system tokens,
  glassmorphism aesthetics, responsive layouts, micro-animations, and audio-reactive
  interface design patterns for web applications.
---

# UI/UX Design System Skill for Antigravity

This skill guides the design and implementation of modern, visually stunning web interfaces, with a special emphasis on AI voice agents, audio visualizers, and interactive dashboards.

## Core Design Principles

### 1. Visual Hierarchy & Contrast
- **Backgrounds**: Deep, rich dark themes (`#090a0f`, `#0f121d`, `#131726`) using subtle radial ambient glow gradients rather than flat `#000000`.
- **Card Surfaces**: Translucent glassmorphism (`backdrop-blur-md bg-white/[0.03] border border-white/[0.08]`) with soft inner highlights.
- **Accents**: Dual-tone neon gradients (Electric Violet `#8b5cf6` to Cyan `#06b6d4`, or Emerald `#10b981` to Sky `#38bdf8`) for active states and audio reactions.

### 2. Audio & Voice Agent Interfaces
- **Status Indicators**:
  - `Disconnected`: Slate gray with muted ring.
  - `Connecting`: Pulsing amber glow with rotating status orbit.
  - `Listening`: Soft breathing emerald or cyan pulse that reacts to microphone input.
  - `Thinking`: Shimmering violet sweep animation.
  - `Speaking`: Dynamic soundwave or spherical fluid orb with active amplitude scaling.
- **Microphone & Controls**: High-contrast, tactile pill buttons with instant visual feedback and audio volume meters.
- **Transcripts**: Clean chat streams with distinct bubbles for User vs Agent, displaying timestamps, latency indicators, and tool execution badges.

### 3. Tool & Database Integration Displays
- **Live Tool Badges**: Highlight when an agent triggers a function/webhook (e.g., `⚡ Database Query: order_status`).
- **Data Cards**: Structured JSON inspection modals or inline tabular data cards that display returned records clearly.
- **Connection Status**: Real-time WebSocket / WebRTC latency indicators (e.g. `120ms`, `Connected`).

### 4. Typography & Spacing
- Use clean modern sans-serifs (Inter, Plus Jakarta Sans, Outfit).
- Generous padding (`p-6` to `p-8` for panels, `gap-4` to `gap-6` for grids).
- Crisp contrast ratios complying with WCAG AA standards.
