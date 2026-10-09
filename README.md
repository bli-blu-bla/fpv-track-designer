# FPV Track Designer

Ein desktop-orientierter 3D-Editor zum Entwerfen, Generieren und Speichern von FPV-Drohnen-Rennstrecken direkt im Browser.

Das Projekt kombiniert eine interaktive React-Oberfläche mit einer Three.js/R3F-Szene. Strecken können automatisch generiert, über einzelne Gates feinjustiert und lokal als JSON-ähnliche Track-Daten gespeichert werden.

[![FPV Track Designer Screenshot](public/screenshot.png)](public/screenshot.png)

## Features

- **3D-Streckeneditor** mit frei sichtbarer FPV-Rennstrecke
- **Zufällige Track-Generierung** anhand von Feldgröße und Gate-Anzahl je Typ
- **11 Gate-Typen**: Standard, Start/Ziel, H-Gate, Double-H, Hurdle, Dive, Double, Ladder, Flagge, Flagge klein und Tunnel
- **Gate-Bearbeitung** direkt in der Szene: auswählen, verschieben, drehen, Höhe verstellen, Ein-/Ausflugseite wechseln, Reihenfolge ändern, einfügen und löschen
- **Snap-Raster** mit wählbarer Genauigkeit (0,3 m / 0,5 m / 1,0 m)
- **Flugpfad-Visualisierung** mit Gate-Reihenfolge und Richtungspfeilen
- **Undo/Redo-Verlauf** für Bearbeitungsschritte
- **Lokale Speicherung** von Tracks im Browser über `localStorage`
- **Track-Galerie** zum Laden, Duplizieren und Löschen gespeicherter Strecken
- **Import/Export** von Strecken als JSON
- **Track teilen** per Link (lang + Kurzlink) und QR-Code (PNG/SVG), angezeigt im Read-only-Viewer
- **FPV-Flug**: automatischer Durchflug der Strecke aus Pilotensicht
- **Themes**: Minimal, Realistisch und Nacht
- **Stangenzähler** für den Materialbedarf
- **Sprache** Deutsch/Englisch umschaltbar
- **Keyboard-Shortcuts** für schnelle Bedienung

Eine ausführliche Anleitung steht in der [Nutzerdokumentation](docs/NUTZERDOKUMENTATION.md).

## Tech Stack

- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [React Three Fiber](https://r3f.docs.pmnd.rs/) und [Drei](https://github.com/pmndrs/drei)
- [Zustand](https://zustand-demo.pmnd.rs/) für globalen State
- [Tailwind CSS](https://tailwindcss.com/) v4
- [shadcn/ui](https://ui.shadcn.com/) Komponenten
- [Vitest](https://vitest.dev/) für Tests

## Voraussetzungen

- Node.js 20.19+ oder 22.12+ (die Docker-Images nutzen Node 24)
- npm

## Installation

```bash
git clone <repository-url>
cd fpv-track-designer
npm ci
```

## Entwicklung starten

```bash
npm run dev
```

Die App läuft anschließend standardmäßig unter:

```text
http://localhost:5173
```

## Nützliche Skripte

```bash
npm run dev           # Entwicklungsserver starten
npm run build         # TypeScript prüfen und Editor-Build nach dist/ erstellen
npm run build:viewer  # Share-Viewer als einzelne HTML-Datei nach dist-viewer/ bauen
npm run build:all     # Editor und Viewer bauen
npm run preview       # Editor-Build lokal ansehen
npm run lint          # ESLint ausführen
npm run test          # Vitest starten
```

Neue shadcn/ui-Komponenten werden mit `npx shadcn@latest add <name>` hinzugefügt; die CLI ist bewusst keine Projekt-Abhängigkeit.

## Bedienung

### Strecke konfigurieren

Über die Einstellungen können Gate-Anzahlen je Typ, Feldmaße sowie Anzeigeoptionen angepasst werden. Beim Mischen wird daraus automatisch eine neue Strecke erzeugt.

### Gates bearbeiten

1. Gate in der 3D-Szene anklicken.
2. Verschieben-, Drehen- oder Höhen-Werkzeug direkt am Gate verwenden.
3. Neue Gates können relativ zu einem ausgewählten Gate eingefügt werden.
4. Ausgewählte Gates lassen sich per Dialog oder Shortcut löschen.

### Maussteuerung in der 3D-Ansicht

Die Ansicht kann vollständig mit der Maus bedient werden:

| Aktion | Mausbedienung |
| --- | --- |
| Ansicht drehen | Linke Maustaste gedrückt halten und ziehen |
| Über die Strecke bewegen | Rechte Maustaste gedrückt halten und ziehen (draggen/pannen) |
| Zoomen | Mausrad scrollen oder Mausrad/mittlere Maustaste gedrückt halten und nach oben/unten ziehen |
| Kamerahöhe ändern | `Shift` gedrückt halten und mit linker Maustaste ziehen |

Alternativ kann die Ansicht auch mit `Space + linke Maustaste ziehen` verschoben werden.

### Shortcuts

| Aktion | Shortcut |
| --- | --- |
| Strecke shuffeln | `S` |
| Strecke speichern | `Cmd/Ctrl + S` |
| Galerie öffnen | `G` |
| Ansicht verschieben | `Space + linke Maustaste ziehen` |
| Kamerahöhe ändern | `Shift + linke Maustaste ziehen` |
| Auswahl/Dialog schließen, FPV-Flug stoppen | `Escape` |
| Ausgewähltes Gate löschen | `Backspace` |
| Löschen bestätigen (im Dialog) | `Enter` |
| Rückgängig | `Cmd/Ctrl + Z` |
| Wiederholen | `Cmd/Ctrl + Y` oder `Cmd/Ctrl + Shift + Z` |

## Projektstruktur

```text
src/
├── components/
│   ├── gates/       # 3D-Komponenten für Gate-Typen und Handles
│   ├── layout/      # TopBar und Werkzeugleiste
│   ├── scene/       # R3F-Canvas, Kamera, Grid, Flugpfad und FPV-Flug
│   ├── ui/          # Dialoge, Panels und shadcn/ui-Primitives
│   └── viewer/      # Read-only Share-Viewer
├── hooks/           # Keyboard- und Auswahl-Logik
├── schemas/         # Zod-Validierung für Track-Daten
├── store/           # Zustand-Slices für Config und Tracks
├── types/           # TypeScript-Domänenmodelle
└── utils/           # Generator, Flugpfad, Storage, Share-Links und QR-Codes
```

## Daten und Speicherung

Die App benötigt kein eigenes Backend. Gespeicherte Tracks werden lokal im Browser abgelegt. Dadurch bleiben Daten auf dem Gerät, sind aber auch an den jeweiligen Browser und dessen Speicher gekoppelt.

Beim Teilen steckt die komplette Strecke komprimiert im Link. Nur für Kurzlinks wird optional ein externer n8n-Webhook angesprochen. Deployment-Details: [`docs/coolify-track-sharing.md`](docs/coolify-track-sharing.md).

## Tests

Die Kernlogik ist mit Vitest abgedeckt, unter anderem für:

- Track-Generierung
- Gate-Öffnungen und Sequenzen
- Flugpfad-Berechnung
- Store-Slices
- LocalStorage-Persistenz
- Share-Links und Import/Export-Schema

```bash
npm run test
```

## Build

```bash
npm run build
```

Der Build führt zuerst den TypeScript-Projektcheck aus und erstellt danach die optimierten Vite-Assets in `dist/`.

## Lizenz

Dieses Projekt ist unter der GNU General Public License v3.0 lizenziert.
Details stehen in der Datei [LICENSE](./LICENSE).
