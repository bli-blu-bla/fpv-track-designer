# FPV Track Designer – Nutzerdokumentation

Willkommen! Diese Anleitung führt dich Schritt für Schritt durch den **FPV Track Designer** – vom ersten zufällig generierten Kurs über die Feinabstimmung einzelner Gates bis zum Teilen deiner Strecke und dem Durchfliegen aus der Ich-Perspektive.

Die App läuft komplett im Browser, ist **desktop-orientiert** (Maus + Tastatur) und speichert deine Strecken lokal auf deinem Gerät. Es gibt kein Login und kein Konto.

---

## Inhaltsverzeichnis

1. [Erste Schritte](#1-erste-schritte)
2. [Die Oberfläche im Überblick](#2-die-oberfläche-im-überblick)
3. [Eine Strecke erzeugen](#3-eine-strecke-erzeugen)
4. [Einstellungen (Gate-Anzahl & Feldgröße)](#4-einstellungen-gate-anzahl--feldgröße)
5. [Die Gate-Typen](#5-die-gate-typen)
6. [Gates bearbeiten](#6-gates-bearbeiten)
7. [Die Flugbahn verstehen](#7-die-flugbahn-verstehen)
8. [FPV-Flug (Durchfliegen)](#8-fpv-flug-durchfliegen)
9. [Design & Themes](#9-design--themes)
10. [Speichern & Galerie](#10-speichern--galerie)
11. [Import & Export (JSON)](#11-import--export-json)
12. [Strecken teilen & Viewer](#12-strecken-teilen--viewer)
13. [Stangenzähler](#13-stangenzähler)
14. [Maussteuerung in der 3D-Ansicht](#14-maussteuerung-in-der-3d-ansicht)
15. [Tastenkürzel](#15-tastenkürzel)
16. [Sprache umstellen](#16-sprache-umstellen)
17. [Tipps, Grenzen & Fehlerbehebung](#17-tipps-grenzen--fehlerbehebung)

---

## 1. Erste Schritte

1. Öffne die App im Browser (im Entwicklungsbetrieb: `http://localhost:5173`).
2. Beim ersten Start wird **automatisch eine zufällige Strecke** erzeugt – du hast sofort etwas zu sehen und zu bearbeiten.
3. Beim ersten Besuch öffnet sich automatisch der **Hilfe-Dialog** mit den wichtigsten Bedienschritten. Danach nicht mehr (du kannst ihn jederzeit über das **Hilfe**-Symbol oben rechts erneut öffnen).
4. Drehe die Ansicht mit der **linken Maustaste**, bewege dich mit der **rechten Maustaste** über das Feld und zoome mit dem **Mausrad**.

Alles Weitere in dieser Anleitung baut darauf auf.

---

## 2. Die Oberfläche im Überblick

Die Oberfläche besteht aus diesen Bereichen:

- **Kopfzeile (oben):** Rückgängig/Wiederholen, Streckenname (zum Umbenennen anklicken), Speicherstatus (Wolke = gespeichert, Diskette = ungespeicherte Änderungen speichern), Shuffle (Würfel), Stangenzähler, **Exportieren**-Menü (JSON-Export und Import), Sprache, Hilfe und der Button **FPV-Flug**.
- **Symbolleiste (ganz links):** öffnet die Seitenpanels **Bibliothek**, **Ebenen**, **Meine Tracks** (Galerie), **Feld** und **Darstellung** sowie den Dialog **Track teilen**. Unten: **Tastenkürzel**.
- **Seitenpanel (links):** der Inhalt des gewählten Panels; mit dem **×** schließen.
- **3D-Szene (Mitte):** die Strecke selbst. Oben links wechselst du zwischen **3D** und **Draufsicht**, unten liegt die Leiste mit den Anzeige-Optionen. Angeklickt erscheinen direkt am Gate die Bearbeitungswerkzeuge.
- **Inspektor (rechts, ab ca. 1024 px Fensterbreite):** ohne Auswahl die Kennzahlen der Strecke (Objekte, Stangen, Rundenlänge, Feld); mit einem ausgewählten Gate dessen Position, Höhe, Rotation und Durchflug-Reihenfolge sowie **Duplizieren** und **Löschen**.

---

## 3. Eine Strecke erzeugen

Es gibt zwei Wege zu einem Kurs:

### 3.1 Zufällig generieren („Shuffle")

- Klick auf das **Würfel-Symbol** in der Kopfzeile oder drücke die Taste **`S`**.
- Aus deinen Einstellungen (Gate-Anzahl je Typ und Feldgröße) wird eine **neue, zufällige Strecke** erzeugt.
- Der Generator achtet auf einen **Mindestabstand von 3 Metern** zwischen den Gates und richtet die Gates in **30°-Schritten** aus.
- Ein **Start/Ziel-Gate** wird dabei bevorzugt zuerst an den Feldrand gesetzt.

> **Wichtig:** Shuffle ersetzt die aktuelle Strecke. Sind ungespeicherte Änderungen vorhanden, fragt die App vorher nach (Speichern / Verwerfen / Abbrechen).

### 3.2 Aus der Galerie laden

Gespeicherte Strecken lädst du über die **Galerie** wieder (siehe [Abschnitt 10](#10-speichern--galerie)).

---

## 4. Einstellungen (Gate-Anzahl & Feldgröße)

Öffne links das Panel **Feld** (Regler-Symbol):

- **Gate-Anzahl:** ein Zahlenfeld pro Gate-Typ. Trage ein, wie viele Gates welchen Typs generiert werden sollen (0 = nicht verwenden).
- **Feldgröße (m):** **Breite** und **Länge** des Spielfelds.
- **Auf Standard zurücksetzen:** setzt die Konfiguration auf die Werkseinstellungen zurück.

**Anwenden:** Änderst du Werte, erscheint der Hinweis, dass die Kurskonfiguration geändert wurde. Mit **„Neue Kurskonfiguration anwenden"** wird daraus eine neue Strecke generiert. Da dabei die aktuelle Strecke ersetzt wird, greift auch hier der Nachfrage-Dialog bei ungespeicherten Änderungen.

**Standardwerte** (werksseitig): Standard-Gate 3, Start/Ziel 1, h-Gate 2, Dive 1, Doppel 1, Flagge 1, Flagge klein 1, Tunnel 1; Doppel-h, Hurdle und Leiter sind standardmäßig auf 0.

> **Hinweis:** Eine separate **Gate-Größe** gibt es in der aktuellen Version nicht – die Gate-Abmessungen sind fest. Die Anzahl der Gates und die Feldgröße sind die Stellschrauben.

### 4.1 Anzeige-Optionen (Leiste unten in der Szene)

Diese Optionen ändern nur die Darstellung, nicht die Strecke:

| Option | Wirkung |
| --- | --- |
| **Grid anzeigen** | blendet das Boden-Grid (1-m-Zellen, 5-m-Markierungen) ein. Standardmäßig aus. |
| **Grid-Snap** | Gates rasten beim Verschieben auf einem Positions-Grid ein. Die Drehung bleibt unabhängig davon bei 15°-Schritten. |
| **Snap-Genauigkeit** | erscheint bei aktivem Snap: **0,3 m**, **0,5 m** oder **1 m**. |
| **Flugbahn** | zeigt die Ideallinie durch alle Gates inkl. Richtungspfeilen. |
| **Durchflüge** | markiert an jedem Gate die Reihenfolge der Durchflüge und die Ein-/Ausflugseite. |
| **Ansicht zurücksetzen** | bringt die Kamera zurück in die Ausgangsposition der gewählten Ansicht (3D oder Draufsicht). |

---

## 5. Die Gate-Typen

Der Designer kennt **11 feste Gate-Typen**. Jeder Typ hat eine eigene Form und ein eigenes Durchflugverhalten. Die „Stangen"-Spalte zeigt, wie viele Stangen ein Gate im Stangenzähler benötigt (0 = nicht aus Stangen baubar).

| Gate | Beschreibung | Stangen |
| --- | --- | --- |
| **Standard-Gate** | Klassischer rechteckiger Rahmen aus zwei Pfosten und oberer Querstrebe. | 3 |
| **Start/Ziel-Gate** | Standard-Rahmen mit Panel und „Start"-Beschriftung auf beiden Seiten. Wird beim Generieren bevorzugt an den Feldrand gesetzt. | 3 |
| **h-Gate** | Untere Durchflugöffnung plus seitliche „Rückenlehne". Die Seite der Rückenlehne ist fest je Gate. | 4 |
| **Doppel-h-Gate** | Gestapeltes Standard- und h-Gate; Durchflüge unten, mittig und oben. | 7 |
| **Hurdle** | Breite, niedrige Hürde (doppelte Breite) mit einer Öffnung darüber. | 0 |
| **Dive-Gate** | Würfelartiger, unten offener Rahmen. Einflug von oben, Ausflug auf einer festen Seite. | 0 |
| **Doppel-Gate** | Zwei übereinander gestapelte Standard-Gates. | 6 |
| **Leiter-Gate** | Drei übereinander gestapelte Gates. | 9 |
| **Flaggen-Gate** | 2-m-Mast mit dreieckiger Flagge. | 2 |
| **Flaggen-Gate klein** | 1,2-m-Mast mit kleiner Flagge. | 1 |
| **Tunnel** | Achteckiger Tunnel (ca. 2 m lang), dessen Ausgangsseite gespiegelt markiert ist. | 0 |

> **Tipp:** Hurdle, Dive-Gate und Tunnel benötigen **keine Stangen** – sie erscheinen im Stangenzähler unter „Nicht aus Stangen baubar".

### 5.1 Gates aus der Bibliothek platzieren

Im Panel **Bibliothek** findest du alle Gate-Typen, filterbar nach **Gates**, **Flaggen** und **Hindernissen** oder per Suche. Ein Klick setzt das Gate in die **Feldmitte**, hängt es ans Ende der Durchflugreihenfolge und wählt es aus. Das Start/Ziel-Gate gibt es nur einmal pro Strecke.

Das Panel **Ebenen** listet alle Gates mit ihrer Durchflugnummer; ein Klick wählt das Gate aus (mit `Shift`/`Cmd`/`Ctrl` mehrere).

---

## 6. Gates bearbeiten

So bearbeitest du einzelne Gates direkt in der 3D-Szene:

1. **Gate anklicken.** Es wird markiert und zeigt die Werkzeuge.
2. **Verschieben:** Halte das Verschieben-Symbol am Gate und ziehe es an die gewünschte Position (N/S/E/W in 1-m-Schritten; mit aktivem Grid-Snap in der gewählten Snap-Genauigkeit).
3. **Höhe verstellen:** Nutze das Höhen-Werkzeug am Gate, um es anzuheben oder abzusenken.
4. **Drehen:** Halte das Dreh-Symbol und ziehe seitlich. Die Drehung rastet in **15°-Schritten** ein.
5. **Einfügen:** Klicke ein Gate an, wähle im Dialog **„Gate einfügen"** das Symbol **vorher** oder **nachher** und dann den **Gate-Typ**. Das neue Gate wird passend in die Durchflugreihenfolge eingefügt.
6. **Löschen:** Wähle das Gate und drücke **`Backspace`** (öffnet den Bestätigungsdialog) oder nutze das Löschen-Symbol. Bestätigen mit **`Enter`** oder **„Gate löschen"**.

Alternativ bearbeitest du ein ausgewähltes Gate präzise im **Inspektor** rechts: Position **X/Z** und Höhe in Metern, Rotation per Regler oder mit den Schnellwerten 0°/90°/180°/270°, Durchflug-Reihenfolge mit den Pfeilen, außerdem **Duplizieren** und **Löschen**.

### 6.1 Einflug-/Ausflugseite wechseln

Jedes Gate zeigt **grüne Einflug-** und **rote Ausflug-Markierungen** (diese Indikatoren sind immer sichtbar). Klicke die Markierung an und drehe die Richtung mit dem **⇄-Symbol** um. Die grüne Seite zeigt danach die neue Einflugseite.

### 6.2 Durchflugreihenfolge ändern

Mit aktivem **„Durchflüge"** zeigt jede Öffnung ihre **Durchflugnummer**. Klicke eine Nummer an und trage im Dialog **„Durchflugnummer ändern"** eine neue Position zwischen 1 und der Gesamtzahl der Durchflüge ein.

### 6.3 Rückgängig / Wiederholen

Alle Bearbeitungsschritte lassen sich mit **`Cmd/Ctrl + Z`** rückgängig machen und mit **`Cmd/Ctrl + Y`** (oder `Cmd/Ctrl + Shift + Z`) wiederherstellen.

---

## 7. Die Flugbahn verstehen

Aktiviere in der Leiste unten **„Flugbahn"**. Die App berechnet dann die **Ideallinie** durch die Gates in der von dir festgelegten Durchflugreihenfolge:

- Kurven von Einflug zu Ausflug durch jedes Gate,
- Übergänge zwischen den Gates (inkl. Sonderfällen wie U-Turns, H-Gate-Rückenlehne, Doppel-h-Stapel und Tunnelportale),
- **Richtungspfeile** entlang der Linie zeigen, in welche Richtung und Reihenfolge geflogen wird.

Die Flugbahn ist auch die Grundlage für den FPV-Flug.

---

## 8. FPV-Flug (Durchfliegen)

Das Highlight: die Strecke einmal aus der **Ich-Perspektive** durchfliegen.

- **Starten:** Klicke oben rechts auf **„FPV-Flug"** (Play-Symbol).
- Die Kamera fliegt automatisch die **Ideallinie** durch alle Gates – in deiner Durchflugreihenfolge.
- **Stoppen:** Klick erneut auf den Button (**„FPV stoppen"**), auf **„FPV stoppen · Esc"** in der Anzeige oben in der Szene, oder drücke **`Escape`**. Am Ende der Strecke stoppt der Flug automatisch und die Editor-Kamera wird wiederhergestellt.
- **Voraussetzung:** Die Strecke braucht **mindestens 2 Gates**; sonst ist der Button deaktiviert.

> **Hinweis:** Es gibt (noch) keine Fortschritts- oder Zeitanzeige während des Flugs. Die Fluggeschwindigkeit ist fest.

---

## 9. Design & Themes

Über das Panel **Darstellung** (Paletten-Symbol) wählst du das visuelle Erscheinungsbild der 3D-Ansicht:

| Theme | Beschreibung |
| --- | --- |
| **Minimal Standard** | Für schwächere Geräte – reduzierter Detailgrad, keine Schatten. |
| **Realistisch** | Sonne, Wolken, Schatten und atmosphärische Beleuchtung – für leistungsstarke Rechner. |
| **Nacht** | Neonfarbene Gates mit Bloom-Effekt unter einem Sternenhimmel. |

Das gewählte Theme wird mit der Strecke gespeichert und **beim Teilen mitgegeben** – Empfänger sehen deine Strecke also im gleichen Look.

---

## 10. Speichern & Galerie

### 10.1 Speichern

- Das **Disketten-Symbol** neben dem Streckennamen (erscheint bei ungespeicherten Änderungen) oder **`Cmd/Ctrl + S`**.
- Vergib einen **Streckennamen**; die Strecke wird **lokal im Browser** (`localStorage`) abgelegt.
- Dabei wird automatisch ein **Vorschaubild** aus einer festen Schrägansicht erstellt, das in der Galerie erscheint. Strecken, die vor dieser Funktion gespeichert wurden, bekommen ihr Bild beim nächsten Speichern.
- Gespeicherte Strecken bleiben an **diesen Browser auf diesem Gerät** gebunden.

### 10.2 Galerie

Öffne das Panel **Meine Tracks** in der Symbolleiste oder drücke **`G`**. Du siehst alle gespeicherten Strecken (neueste zuerst) mit Vorschaubild, Name, Anzahl der Objekte und Stangen sowie Datum. Die gerade geladene Strecke ist mit **„Aktuell"** markiert. Du kannst:

- **Laden** – Klick auf das Vorschaubild; ersetzt die aktuelle Strecke (Nachfrage bei ungespeicherten Änderungen),
- **Duplizieren** – erstellt eine Kopie unter neuem Namen (inklusive Vorschaubild),
- **Löschen** – entfernt die Strecke nach Bestätigung.

---

## 11. Import & Export (JSON)

Im Menü **Exportieren** in der Kopfzeile findest du **Als JSON** und **Importieren…**:

- **Export:** speichert die aktuell geladene Strecke (Gates, Reihenfolge, Konfiguration, Theme) als JSON-Datei zum Sichern oder Weitergeben.
- **Import:** lädt eine zuvor exportierte oder von anderen Piloten erhaltene JSON-Datei. Beim Import wird die aktuelle Strecke ersetzt – bei ungespeicherten Änderungen fragt die App vorher nach.
- Ältere/legacy Track-Dateien werden beim Import automatisch auf das aktuelle Format normalisiert.

---

## 12. Strecken teilen & Viewer

Der schnellste Weg, eine Strecke weiterzugeben – ohne Datei, ohne Konto:

1. Klicke in der Symbolleiste links auf das Teilen-Symbol (**„Track Teilen"**).
2. Es öffnet sich der Dialog **„Track teilen"**. Er zeigt sofort den **„Langen Link"** – dieser funktioniert bereits sofort.
3. Parallel versucht die App, einen **„Teilbaren Link"** (Kurzlink) zu erstellen. Solange das läuft: „Kurzlink wird erstellt. Bis dahin ist der lange Link bereits nutzbar." Bei Erfolg erscheint „Kurzlink erstellt.".
   - Klappt das Erstellen des Kurzlinks nicht, kannst du den langen Link trotzdem teilen.
4. Sobald ein Kurzlink existiert, erscheint zusätzlich ein **QR-Code**, den du als **PNG** oder **SVG** herunterladen kannst.
5. **„Link kopieren"** kopiert den Kurzlink (falls vorhanden), sonst den langen Link. Danach zeigt der Button **„Kopiert!"**.

### 12.1 Was der Empfänger sieht (Viewer)

Der Link öffnet eine **reine Ansichtsseite** (Read-only) – ohne Bearbeitungsfunktionen. Die Track-Daten stecken im **URL-Fragment** (`#…`), werden also nicht an einen Server gesendet.

Im Viewer kann der Empfänger:

- die Strecke frei betrachten (Drehen, Bewegen, Zoom, Kamerahöhe – wie im Editor),
- den **FPV-Flug** starten/stoppen,
- den Track als **JSON herunterladen** (wieder importierbar in den Editor),
- die **Viewer-Hilfe** öffnen (erscheint beim ersten Besuch automatisch).

Ist ein Link leer oder beschädigt, erscheint **„Track kann nicht geladen werden"** mit einer passenden Meldung.

> **Technischer Hintergrund (Deployment):** Der Editor läuft unter `trackdesigner.fpvooe.com`, der Viewer unter `sharedtrack.fpvooe.com`. Details zur Einrichtung stehen in [`coolify-track-sharing.md`](./coolify-track-sharing.md).

---

## 13. Stangenzähler

Oben in der Kopfzeile zeigt der **Stangenzähler** (Hammer-Symbol) die Gesamtzahl der für den Aufbau benötigten Stangen. Ein Klick öffnet die detaillierte **Stangenkalkulation**:

- Tabelle mit **Gate-Typ**, **Anzahl**, **Stangen pro Gate** und **Summe**,
- separater Bereich **„Nicht aus Stangen baubar"** für Hurdle, Dive-Gate und Tunnel.

So planst du den Materialbedarf deiner Strecke direkt mit.

---

## 14. Maussteuerung in der 3D-Ansicht

| Aktion | Bedienung |
| --- | --- |
| Ansicht drehen | Linke Maustaste gedrückt halten und ziehen |
| Über die Strecke bewegen (Pan) | Rechte Maustaste ziehen **oder** `Space` + linke Maustaste ziehen |
| Zoomen | Mausrad scrollen **oder** mittlere Maustaste ziehen |
| Schnell zoomen | Mausrad / mittlere Maustaste ziehen |
| Kamerahöhe ändern | `Shift` gedrückt halten und mit linker Maustaste ziehen |
| Auf Mobilgeräten | Zwei Finger ziehen zum Verschieben, auf-/zuziehen zum Zoomen |

Während eines **FPV-Flugs** sind die Kamera-Bedienelemente deaktiviert, bis du den Flug stoppst.

---

## 15. Tastenkürzel

| Aktion | Kürzel |
| --- | --- |
| Strecke shuffeln (neu generieren) | `S` |
| Strecke speichern | `Cmd/Ctrl + S` |
| Galerie öffnen | `G` |
| Rückgängig | `Cmd/Ctrl + Z` |
| Wiederholen | `Cmd/Ctrl + Y` oder `Cmd/Ctrl + Shift + Z` |
| Ausgewähltes Gate löschen (Dialog) | `Backspace` |
| Löschen bestätigen | `Enter` |
| Gate abwählen / Dialoge schließen / **FPV stoppen** | `Escape` |

---

## 16. Sprache umstellen

Über **DE/EN** in der Kopfzeile wechselst du zwischen **Deutsch** und **Englisch**. Deine Wahl wird gespeichert und beim nächsten Besuch beibehalten.

---

## 17. Tipps, Grenzen & Fehlerbehebung

**Tipps**

- Nutze **Grid-Snap** zusammen mit einer passenden **Snap-Genauigkeit**, um schnurgerade Linien zu bauen.
- Aktiviere **„Durchflüge"**, um Reihenfolge und Ein-/Ausflugseiten auf einen Blick zu prüfen, bevor du den FPV-Flug startest.
- Prüfe den **Stangenzähler**, bevor du eine Strecke für den realen Aufbau freigibst.

**Grenzen / gut zu wissen**

- Es gibt **keine einstellbare Gate-Größe** und **keinen Zufalls-Seed** – nur Gate-Anzahl und Feldgröße.
- Der **FPV-Flug** zeigt keine Fortschrittsanzeige und hat eine feste Geschwindigkeit.
- Der **Viewer ist strikt read-only** – Änderungen sind dort nicht möglich.
- Tracks liegen in `localStorage` deines Browsers. Löschst du Browserdaten, sind auch die lokal gespeicherten Strecken weg – exportiere wichtige Strecken zusätzlich als **JSON**.
- Sind ungespeicherte Änderungen vorhanden, fragt die App bei destruktiven Aktionen (Shuffle, Import, Laden, Duplizieren, Konfiguration anwenden) nach: **Abbrechen**, **Zuerst speichern** oder **Verwerfen**.

**Häufige Fragen**

- *Der FPV-Button ist ausgegraut.* → Deine Strecke hat weniger als 2 Gates.
- *Der Kurzlink kam nicht.* → Kein Problem, teile einfach den **langen Link**; er funktioniert immer.
- *Beim Öffnen eines Links erscheint eine Fehlermeldung.* → Der Link ist unvollständig oder beschädigt. Bitte den Absender, ihn erneut zu teilen.

---

*Diese Dokumentation beschreibt den Stand von `main`. Die interne Projekt-/Entwicklerdokumentation findest du in den `AGENTS.md`-Dateien und im [`README.md`](../README.md).*
