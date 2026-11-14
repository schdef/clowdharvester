# Cloud Harvesters

> An atmospheric sky-mining and aerial logistics game featuring relaxing real-time strategy, dynamic pendulum cloud drift, tactile probe drilling, and high-stakes Sky-Council auctions.  
> Designed with a cozy, neo-pastel aesthetic inspired by *Monument Valley* and *Alto’s Adventure*.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#)
[![Phaser 3](https://img.shields.io/badge/Phaser-3.88-red)](#)
[![PWA](https://img.shields.io/badge/PWA-Ready-orange)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ☁️ Game Overview

In **Cloud Harvesters**, players bid on floating cloud bands, lower suspension drill probes through misty atmospheric layers, tap into glowing condensate pockets, and build an efficient sky network of condensers, pipes, and floating storage balloons.

- **Calm, Foresighted Planning:** Clouds never drift away forever—they follow a predictable 4-week harmonic pendulum cycle. An interactive 4-week wind radar allows players to plan operations without time pressure.
- **Tactile Aerial Drilling:** Pull the diamond drill head downwards through atmospheric layers using touch or mouse gestures. Density provides dynamic resistance; drilling leaves a visible trail in the fog that heals gradually over one week (60 seconds).
- **Sky-Council Strategic Balance:** Credits are only victory points when converted into Council shares. Purchasing shares too early leaves fewer funds for infrastructure; waiting too late allows the three autonomous AI rivals to outbid you.

### Atmospheric Height Zones

| Zone | Density & Resistance | Weekly Drift | Resource | Characteristics |
| :--- | :--- | :--- | :--- | :--- |
| **High Zone** | Low (Fast advancement) | 3 cols (East) | **Frost Crystals** | High market value (25 CR), thin layers, requires Ice Drill |
| **Mid Zone** | Medium | 2 cols (West) | **Skywater** | Large volume, reliable foundation (10 CR), requires Fog Catcher |
| **Low Zone** | High (Dense resistance) | 1 col (East) | **Storm Charge** | High price volatility (18 CR), electric risk, requires Charge Tip |

---

## 🎨 Visual Style & Sound Design

- **Neo-Pastel Flat-Art:** Soft geometric forms, atmospheric gradients, and hand-drawn sky machinery.
- **Zone Color Palettes:**
  - *High Zone:* Glacier Mist (`#E0F4FF`), Ice Blue (`#BEE3F8`), Crystal Turquoise (`#38B2AC`).
  - *Mid Zone:* Pastel Azure (`#93C5FD`), Soft Sky (`#C7D2FE`), Condensate Blue (`#3B82F6`).
  - *Low Zone:* Twilight Violet (`#4C1D95`), Storm Indigo (`#5B21B6`), Glowing Gold (`#FBBF24`).
- **Cozy & Friendly Audio:** Cheerful, uplifting soundscape with gentle kalimba and marimba plucks, playful bubbling droplets during extraction, soothing wind chimes, and soft tactile clicks.

---

## 📱 Desktop & Mobile Responsive Layout

- **Mobile (1-Hand Portrait):** Ergonomic edge-to-edge view with a compact status header and a 5-slot thumb-dock toolbar (touch targets ≥ 48px).
- **Desktop (Fullscreen Experience):** The majestic sky spans across the entire screen, accompanied by sleek, semi-transparent floating glassmorphism companion panels:
  - *Left Panel:* 4-week wind radar, pendulum drift phases, and keyboard hotkeys.
  - *Right Panel:* Live harbor commodity exchange, evaporation rate tracker (2%/week), and Sky-Council dossier with AI rival profiles.
- **Built-in Interactive Tutorial:** Features **Balo 🎈**, the friendly weather balloon advisor, offering step-by-step guidance on drilling, drill head switching, harvesting, and sonar scans.

---

## 🛠️ Technology Stack

- **Game Engine:** [Phaser 3](https://phaser.io/) (WebGL 2D with Canvas fallback)
- **Framework & Bundler:** [Vite](https://vitejs.dev/) + [TypeScript 5](https://www.typescriptlang.org/)
- **UI & Styling:** [Tailwind CSS](https://tailwindcss.com/) (strict dark mode compliance)
- **Audio & Haptics:** Native Web Audio API + HTML5 Vibration API
- **Cross-Platform & Offline:** Progressive Web App ([vite-plugin-pwa](https://vite-pwa-org.netlify.app/)) & [Capacitor](https://capacitorjs.com/) for Android and iOS
- **Localization:** Bilingual i18n support (English & German with instant toggle)

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm`

### Installation & Development
```bash
# Clone the repository
git clone git@github.com:schdef/clowdharvester.git
cd clowdharvester

# Install dependencies
npm install

# Run verification test suites (Phase 1, Phase 3, UX, Audio & Tutorial)
npm test

# Start local development server
npm run dev
```
Open `http://localhost:5173` in your browser.

### Production Build & Preview
```bash
# Run type checks and build PWA bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 🎮 Controls & Shortcuts

| Action | Touch / Gesture | Desktop Keyboard |
| :--- | :--- | :--- |
| **Lower / Steer Probe** | Drag with finger | Click and drag with mouse |
| **Tool 1: Wind Sensor Scan** | Tap Slot 1 | Key `1` |
| **Tool 2: Drill Head Tool** | Tap Slot 2 | Key `2` |
| **Switch Drill Head (Ice / Fog / Charge)** | Tap head pills | Keys `Q` (Ice), `W` (Fog), `E` (Charge) |
| **Tool 3: Pipelines** | Tap Slot 3 | Key `3` |
| **Tool 4: Storage Tanks** | Tap Slot 4 | Key `4` |
| **Tool 5: Harbor / Exchange** | Tap Slot 5 | Key `5` |
| **Pause / Resume** | Big Pause button | `Spacebar` |
| **Game Speed** | Header speed buttons | `0.5x`, `1x`, `2x` |
| **Interactive Tutorial / Help** | Tap `🎈 Help` button | Tap `🎈` in header |
| **Switch Language** | Header `EN` / `DE` button | Click language icon |

---

## 🗺️ Roadmap & Milestones

- [x] **Phase 0:** Project setup, build pipeline, design tokens & responsive shell (PWA & companion sidebars)
- [x] **Phase 1 (P1):** Interactive probe, layer resistance, cloud fog carving & elastic pocket docking
- [x] **Phase 2 (P2):** Logistics network (condensers, pipes, storage balloons), harbor economy & evaporation
- [x] **Phase 3 (P3):** Cloud band pre-season auction & 3 AI rivals (The Daredevil, The Calculator, The Tracker)
- [x] **Phase 4 (P4):** Sky-Council sessions (Weeks 4, 8, 12), 12-week season loop & campaign (3 regions)
- [ ] **Phase 5:** PWA offline tuning, Capacitor native Android/iOS packaging & final sound mix

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
