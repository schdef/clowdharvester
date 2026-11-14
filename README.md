# Cloud Harvesters (Turmoil in den Wolken)

> Ein atmosphärisches Himmels-Schürfspiel mit entspannter Echtzeit-Strategie, dynamischer Wolkendrift, elastischem Sonden-Bohrgefühl und strategischem Sky-Council.  
> Inspiriert vom Spannungsbogen von *Turmoil* und der visuellen Eleganz von *Monument Valley* und *Alto’s Adventure*.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#)
[![Phaser 3](https://img.shields.io/badge/Phaser-3.88-red)](#)
[![PWA](https://img.shields.io/badge/PWA-Ready-orange)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ☁️ Spielkonzept

In *Cloud Harvesters* ersteigerst du Wolkenbänder, senkst deine Schürfsonde durch dichte Wolkenschichten ab, zapfst Kondensattaschen an und baust ein florierendes Logistiknetz aus Kondensatoren, Rohren und Tankballons auf.

- **Keine Hektik, sondern Planung:** Wolken verschwinden nie auf Nimmerwiedersehen – sie pendeln in einem berechenbaren 4-Wochen-Zyklus. Eine 4-Wochen-Windvorhersage ermöglicht vorausschauende Taktik ohne Frust.
- **Echtes Schürfgefühl:** Die Sonde wird mit Finger oder Maus durch den Nebel gezogen. Jede Schicht bietet fühlbaren Widerstand nach Dichte; die Sonde hinterlässt eine sichtbare Spur im Wolkendichtefeld, die sich langsam heilt.
- **Zielkonflikt im Sky-Council:** Credits sind nur dann Siegpunkte, wenn du sie in Council-Anteile umwandelst. Wer zu früh Anteile kauft, spart an der Ausrüstung; wer zu spät kauft, wird von den drei KI-Rivalen überboten.

### Die drei Höhenzonen

| Zone | Dichte & Widerstand | Drift pro Woche | Ressource | Charakteristik |
| :--- | :--- | :--- | :--- | :--- |
| **Hochzone** | Niedrig (schneller Vortrieb) | 3 Felder (Ost) | **Frostkristalle** | Hoher Marktpreis (25 CR), dünne Schichten, erfordert Eisbohrer |
| **Mittelzone** | Mittel | 2 Felder (West) | **Skywater** | Großes Volumen, verlässliche Basis (10 CR), Nebelfänger |
| **Tiefzone** | Hoch (zäher Widerstand) | 1 Feld (Ost) | **Sturmladung** | Hohe Preisschwankungen (18 CR), Gewitterrisiko, Ladungsspitze |

---

## 🎨 Stil & Ästhetik (Neo-Pastell)

- **Monument-Valley-Ästhetik:** Sanfte geometrische Formen, atmosphärische Farbverläufe und handgezeichnet anmutende Schwebemaschinen.
- **Zonen-Farbwelten:**
  - *Hochzone:* Gletscher-Dunst (`#E0F4FF`), Eisblau (`#BEE3F8`), Kristalltürkis (`#38B2AC`).
  - *Mittelzone:* Pastell-Azur (`#93C5FD`), Sanfter Himmel (`#C7D2FE`), Kondensatblau (`#3B82F6`).
  - *Tiefzone:* Dämmerungsviolett (`#4C1D95`), Sturmindigo (`#5B21B6`), Glimmgold (`#FBBF24`).
- **Adaptives Audio:** Dynamischer Neoklassik-/Ambient-Soundtrack mit 4 synchronen Web-Audio-Stems (warmes Klavier, sanfte Synthesizer, tiefe Cellobögen bei Tauchgängen, Foley-SFX und Haptik-Vibration beim Schürfen).

---

## 📱 Desktop & Mobile (Flexibles Responsive Layout)

- **Mobile (1-Hand-Portrait):** Vollflächiger 9:16 Viewport mit kompaktem Header oben und ergonomischem Daumen-Dock (`ToolBar`) mit 5 Werkzeug-Slots am unteren Displayrand (Touch-Targets >= 48px).
- **Desktop (Widescreen):** Zentrierter Schnitt mit flankierenden Companion-Panels:
  - *Links:* 4-Wochen-Windradar, Pendelphasen und Tastatur-Shortcuts.
  - *Rechts:* Dynamischer Hafen-Börsenticker, Verdunstungsindikator (2%/Woche) und Sky-Council-Dossier mit Rivalen-Profilen.

---

## 🛠️ Technologie-Stack

- **Game Engine:** [Phaser 3](https://phaser.io/) (WebGL 2D mit Canvas-Fallback)
- **Framework & Bundler:** [Vite](https://vitejs.dev/) + [TypeScript 5](https://www.typescriptlang.org/)
- **UI & Styling:** [Tailwind CSS](https://tailwindcss.com/) (strikte Dark-Mode-Konformität)
- **Sound & Haptik:** Native Web Audio API + HTML5 Vibration API
- **Deployment:** Progressive Web App ([vite-plugin-pwa](https://vite-pwa-org.netlify.app/)) & [Capacitor](https://capacitorjs.com/) für Android & iOS
- **Lokalisierung:** Vollständiges i18n-System (Deutsch / Englisch mit Sofort-Umschaltung)

---

## 🚀 Schnellstart

### Voraussetzungen
- [Node.js](https://nodejs.org/) (v18 oder höher empfohlen)
- `npm`

### Installation & Start
```bash
# Repository klonen
git clone git@github.com:schdef/clowdharvester.git
cd clowdharvester

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev
```
Der Entwicklungsserver startet unter `http://localhost:5173`.

### Produktions-Build
```bash
# TypeScript-Prüfung und Vite-Build
npm run build

# Gebaute PWA lokal testen
npm run preview
```

---

## 🎮 Steuerung & Hotkeys

| Aktion | Geste / Touch | Tastatur (Desktop) |
| :--- | :--- | :--- |
| **Sonde absenken / steuern** | Ziehen mit Finger | Ziehen mit linker Maustaste |
| **Werkzeug 1: Windfühler-Scan** | Tippen auf Slot 1 | Taste `1` |
| **Werkzeug 2: Bohrkopf wechseln** | Tippen auf Slot 2 | Taste `2` |
| **Werkzeug 3: Rohrleitungen** | Tippen auf Slot 3 | Taste `3` |
| **Werkzeug 4: Tankballons** | Tippen auf Slot 4 | Taste `4` |
| **Werkzeug 5: Hafen / Verkauf** | Tippen auf Slot 5 | Taste `5` |
| **Pause / Weiterspielen** | Großer Pause-Button | `Leertaste` |
| **Spieltempo** | Header-Tempo-Buttons | `0.5x`, `1x`, `2x` |
| **Sprache umschalten** | Header `DE` / `EN` | Klick auf Sprach-Icon |

---

## 🗺️ Roadmap & Meilensteine

- [x] **Phase 0:** Projekt-Setup, Build-Pipeline, Design-Tokens & Responsive Shell (PWA & Desktop Sidebars)
- [x] **Phase 1 (P1):** Sonde, Schichtwiderstand, Wolkenschneiden & elastisches Kondensattaschen-Docking
- [ ] **Phase 2 (P2):** Logistik-Netzwerk (Kondensator, Rohre, Tankballons), Hafenmarkt & Verdunstung
- [ ] **Phase 3 (P3):** Wolkenband-Auktion vor Saisonstart, 3 KI-Rivalen (Draufgänger, Rechner, Spürnase)
- [ ] **Phase 4 (P4):** Sky-Council Sitzungen (Woche 4, 8, 12), 12-Wochen-Saisonloop & Kampagne (3 Regionen)
- [ ] **Phase 5:** PWA Offline-Tuning, Capacitor Android/iOS Builds & finaler Sound-Mix

---

## 📄 Lizenz

Dieses Projekt ist unter der [MIT-Lizenz](LICENSE) lizenziert.
