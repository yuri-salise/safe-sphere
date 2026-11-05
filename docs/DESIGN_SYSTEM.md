# Safe Sphere — Tactical Telemetry Design System

This document specifies the **High-Contrast Tactical Design System** engineered for the Safe Sphere disaster response and emergency coordination platform.

---

## 1. Design Principles

In emergency command centers and field deployments, operators work under high stress and varying lighting conditions. The design system prioritizes:
- **Zero-Distraction Dark Foundation**: Deep obsidian black minimizes glare, lowers power consumption on OLED displays, and emphasizes critical operational telemetry.
- **Electric Accent Hierarchy**: Vibrant electric lime (`#00FF66`) provides immediate visual focus for primary calls to action, active statuses, and vital alerts.
- **Precision Data Density**: High-contrast hairline borders (`rgba(255, 255, 255, 0.08)`), compact telemetry badges, and monospace tabular figures ensure coordinates, timestamps, and inventory metrics can be scanned rapidly.
- **Micro-Indicators**: Live pulse pings and status chips convey real-time system health and network synchronization without cognitive clutter.

---

## 2. Color System & Design Tokens

Defined in [`src/app/globals.css`](../src/app/globals.css):

### Surface Foundation
| Token | Hex / Value | Description |
| :--- | :--- | :--- |
| `--sphere-black` | `#000000` | Pure Black for contrasts, badges, and deep elevation |
| `--sphere-dark-bg` | `#080b0e` | Deep Obsidian background canvas |
| `--sphere-surface-1` | `#101419` | Primary Card and Module surface |
| `--sphere-surface-2` | `#161b22` | Elevated Panel and hover state surface |
| `--sphere-surface-3` | `#1f2630` | Active input and modal surface |

### Signature Electric Accent
| Token | Hex / Value | Description |
| :--- | :--- | :--- |
| `--sphere-neon` | `#00ff66` | Primary brand accent, primary CTA background, focus ring |
| `--sphere-neon-dim` | `#00df82` | High-contrast accessible text accent |
| `--sphere-neon-soft` | `rgba(0, 255, 102, 0.08)` | Subtle background highlight for active pills and rows |
| `--sphere-neon-glow` | `rgba(0, 255, 102, 0.28)` | Hover elevation shadow glow |
| `--sphere-neon-border`| `rgba(0, 255, 102, 0.35)` | Border for active/selected panels |

### Operational Status Telemetry
| Level | Token | Value | Purpose |
| :--- | :--- | :--- | :--- |
| **Operational / Active** | `--sphere-green` | `#00df89` | Verified, Low Severity, Confirmed Delivery |
| **Critical Alert** | `--sphere-red` | `#f6465d` | Critical Incident, Failed Delivery, Emergency |
| **Pending / Advisory** | `--sphere-yellow` | `#f0b90b` | Needs Admin Review, Moderate Severity |
| **Logistics / En Route**| `--sphere-cyan` | `#00d8ff` | In Transit, Dispatched, Telemetry Active |
| **High Priority** | `--orange` | `#ff9900` | Severe Hazard, Urgent Allocation Required |

### Typography & Dividers
| Token | Hex / Value | Purpose |
| :--- | :--- | :--- |
| `--ink` | `#ffffff` | Primary headings and prominent labels |
| `--ink-secondary` | `#94a3b8` | Subheadings and descriptive text |
| `--muted` | `#848e9c` | Micro-copy, metadata, and timestamps |
| `--line` | `rgba(255, 255, 255, 0.08)` | Subtle module borders and section dividers |
| `--line-strong` | `rgba(255, 255, 255, 0.16)` | Form control borders and active lines |

---

## 3. Typography & Numerical Standards

- **Primary Interface**: **Geist Sans** (`var(--font-geist-sans)`): Clean, modern sans-serif with geometric proportions, tight tracking (`letter-spacing: -.03em`), and high legibility.
- **Telemetry & Metrics**: **Geist Mono** (`var(--font-geist-mono)`): Monospace tabular numbers (`tabular-nums`) ensuring coordinates, quantities, and asset codes align perfectly in vertical lists.

```css
.metric-card strong,
.incident-row b,
.timeline-list small {
  font-family: var(--font-geist-mono), monospace;
  font-variant-numeric: tabular-nums;
}
```

---

## 4. Component Patterns

### Tactical Buttons
- **`.button-green`**: Background `--sphere-neon`, text `#000000`, bold font weight. Primary CTA for operations (*"Launch Console"*, *"Open Live Map"*, *"Submit Report"*).
- **`.button-yellow`**: Background `#ffffff`, text `#000000`. High-contrast secondary CTA.
- **`.button-ghost`**: Border `1px solid var(--line)`, background `var(--sphere-surface-1)`, text `#ffffff`. Secondary navigation controls.

### Status Indicators (`StatusPill`)
Rounded chips (`border-radius: 999px`) featuring an animated 6px glowing status dot:
- `.status-green`: Live Telemetry Active, Verified, Operational.
- `.status-yellow`: Awaiting Verification, Moderate Priority.
- `.status-red`: Critical Alert, Immediate Response Required.
- `.status-neutral`: Standby, Archived.

### Cards & Glassmorphic Elevation
All cards (`.signal-card`, `.panel-card`, `.metric-card`, `.capability-card`) incorporate:
- Background: `var(--sphere-surface-1)`
- Border: `1px solid var(--line)`
- Border Radius: `14px - 20px`
- Backdrop blur (`20px`) on floating elements.
- Smooth hover transition with subtle border highlights.

---

## 5. GIS Map Visualization

- **Telemetry Markers**: Circular pins with animated radar pulse rings (`@keyframes safe-pulse-ring`).
- **Dark Map Overlays**: Dark glassmorphic popups (`#12161c` background with white text and neon title badges).
- **Graceful Fallback**: Automatically activates a zero-dependency raster basemap if vector tiles fail to connect within 7 seconds.
