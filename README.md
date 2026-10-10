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
- **Track teilen** per Link (lang + Kurzlink `/s/…`) und QR-Code (PNG/SVG), angezeigt im Read-only-Viewer
- **Optionales Konto** mit Synchronisierung von „Meine Tracks“ zwischen Geräten
- **Collections mit Labels** für Vereine/Veranstalter, z. B. `fpv-linz:latest` (Viewer-Übersicht unter `/t/fpv-linz`)
- **FPV-Flug**: automatischer Durchflug der Strecke aus Pilotensicht
- **Szene, Untergrund und Grafikqualität**: Tag, Dämmerung, Nacht (Neon) oder Studio; Rasen, Turnsaal (Parkett mit Spielfeldlinien) oder Asphalt; einfache oder realistische Grafik
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
- [Zod](https://zod.dev/) für die Validierung importierter, gespeicherter und geteilter Tracks
- [Tailwind CSS](https://tailwindcss.com/) v4
- [shadcn/ui](https://ui.shadcn.com/) Komponenten
- [Vitest](https://vitest.dev/) für Tests
- [PocketBase](https://pocketbase.io/) als Backend für Kurzlinks, Konten und Collections (`pocketbase/`)

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
docker compose up pocketbase   # optional: lokales Backend auf http://127.0.0.1:8090 (Dashboard /_/)
npm run dev
```

Ohne laufendes PocketBase funktioniert der Editor lokal wie gewohnt; nur Kurzlinks, Konto und Collections sind dann nicht verfügbar. `.env.development` zeigt mit `VITE_API_URL` auf die lokale Instanz.

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
npm run preview:viewer # Viewer-Build lokal ansehen (mit Pfad-Routing /s/… und /t/…)
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
| Ausgewählte Gates verschieben | Pfeiltasten (0,1 m bzw. Snap-Raster) |
| Ausgewählte Gates drehen | `Shift + ←/→` (5° bzw. 15° mit Snap) |
| Ausgewählte Gates anheben/absenken | `Shift + ↑/↓` |
| Rückgängig | `Cmd/Ctrl + Z` |
| Wiederholen | `Cmd/Ctrl + Y` oder `Cmd/Ctrl + Shift + Z` |

## Projektstruktur

```text
src/
├── core/        # Domänenlogik ohne React: Typen, Gate-Definitionen, Generator,
│                # Flugpfad, Zod-Schemas, Share-Link-Format, Viewer-Routen, API-Client (fetch)
├── scene/       # Gemeinsame 3D-Szene (R3F): Canvas, Kamera, Gates, Flugpfad
├── editor/      # Editor: App, Zustand-Store, Speicher, Panels, Bearbeitungs-Handles,
│                # Konto/Sync/Collections (PocketBase-SDK nur in editor/api)
├── viewer/      # Read-only Share-Viewer
├── components/  # shadcn/ui-Primitives und ErrorBoundary
└── i18n.ts      # Übersetzungen DE/EN
pocketbase/      # Backend: Dockerfile (gepinnte Version), Migrationen, Hooks
```

Die Abhängigkeiten zeigen nur in eine Richtung (`core ← scene ← editor/viewer`); ESLint prüft das.

## Daten und Speicherung

Gespeicherte Tracks werden immer zuerst lokal im Browser (`localStorage`) abgelegt. Das einzige Backend ist [PocketBase](https://pocketbase.io/) (`pocketbase/`) für drei optionale Dinge:

- **Kurzlinks** (`/s/<id>`): anonym, unveränderlich, gleicher Inhalt ergibt denselben Link; nach 4 Monaten ohne Aufruf gelöscht.
- **Konten** mit Synchronisierung von „Meine Tracks“ zwischen Geräten (inkl. Konflikterkennung).
- **Collections** mit Labels für Vereine/Veranstalter; Verwaltung von Collections und Mitgliedern im PocketBase-Dashboard ([`docs/collections.md`](docs/collections.md)).

Der lange Link (`/#c.…`) enthält die komplette Strecke komprimiert und funktioniert ohne Server. Deployment-Details (Editor, Viewer, PocketBase): [`docs/coolify-track-sharing.md`](docs/coolify-track-sharing.md).

## Tests

Die Kernlogik ist mit Vitest abgedeckt, unter anderem für:

- Track-Generierung
- Gate-Öffnungen und Sequenzen
- Flugpfad-Berechnung
- Store-Slices
- LocalStorage-Persistenz
- Share-Links (kompaktes Format), Viewer-Routen und Import/Export-Schema
- API-Client, Konto, Sync-Konflikte und Label-Verschieben (Server gemockt)
- Gate-Definitionen und Bearbeitungs-Handles

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
