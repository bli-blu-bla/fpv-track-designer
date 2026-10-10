# Collections einrichten (Betreiber-Anleitung)

Eine **Collection** (technisch: Namensraum, Collection `namespaces` in PocketBase) bündelt die Strecken eines Vereins oder Veranstalters, z. B. **FPV Linz** unter `fpv-linz`. Mitglieder einer Collection können im Editor Strecken veröffentlichen und Labels wie `latest` setzen; alle anderen sehen sie nur im Viewer.

Collections und Mitglieder legt der **Betreiber** im PocketBase-Dashboard an. Es gibt dafür bewusst keine Oberfläche im Editor.

## Voraussetzungen

- Zugang zum PocketBase-Dashboard: `https://pb.fpvooe.com/_/` (Superuser).
- Die künftigen Verwalter haben sich im Editor schon einmal **registriert** (Kopfzeile → **Anmelden** → **Registrieren**) bzw. mit Google/Discord angemeldet. Erst dann gibt es ihren Datensatz in `users`.

## Collection anlegen

1. Dashboard öffnen → **Collections** → `namespaces` → **New record**.
2. Felder ausfüllen:
   - **slug**: Kurzname für Links, z. B. `fpv-linz`. Nur Kleinbuchstaben, Ziffern und Bindestriche, 3–32 Zeichen, nicht mit Bindestrich beginnen oder enden. Der Slug steht in allen Links (`/t/fpv-linz:latest`) – später nicht mehr ändern, sonst funktionieren geteilte Links nicht mehr.
   - **name**: Anzeigename, z. B. `FPV Linz`.
   - **members**: siehe unten (kann auch leer bleiben).
3. **Create** speichern.

Die Übersicht ist danach öffentlich unter `https://sharedtrack.fpvooe.com/t/fpv-linz` erreichbar (zunächst leer).

## Mitglieder zuweisen oder entfernen

1. **Collections** → `namespaces` → Collection öffnen.
2. Im Feld **members** Benutzer hinzufügen (Suche nach E-Mail oder Name) oder entfernen.
3. Speichern.

Mitglieder sehen nach dem nächsten Anmelden bzw. Neuladen des Editors das Panel **Collections** in der linken Symbolleiste. Wer entfernt wird, kann sofort nichts mehr schreiben; bestehende Einträge bleiben erhalten.

Mitglieder dürfen in ihrer Collection alles: Einträge veröffentlichen, bearbeiten und löschen sowie Labels setzen, verschieben und entfernen. Feinere Rollen gibt es nicht.

## Was Mitglieder im Editor tun

Siehe [Nutzerdokumentation, Abschnitt 12.2](./NUTZERDOKUMENTATION.md#122-collections--labels-für-verwalter). Kurz:

- **Aktuellen Track veröffentlichen** mit Name, optionalem Datum und Labels.
- Labels sind pro Collection eindeutig. Liegt ein Label schon auf einem anderen Eintrag, fragt der Editor, ob es verschoben werden soll.
- `latest` ist ein normales Label und wird von Hand umgehängt.

## Collection löschen

**Collections** → `namespaces` → Datensatz löschen. Alle Einträge und Labels der Collection werden mitgelöscht (Cascade), ihre Links funktionieren danach nicht mehr. Vorher ggf. Strecken über den Viewer als JSON sichern.

## Hilfe bei Problemen

| Problem | Ursache / Lösung |
| --- | --- |
| Verwalter sieht kein Collections-Panel | Nicht in `members` eingetragen, oder der Editor wurde seitdem nicht neu geladen. Abmelden/Anmelden hilft. |
| „Das hat nicht geklappt“ beim Veröffentlichen | Verbindung zu PocketBase prüfen; Name darf höchstens 120 Zeichen haben. |
| Label lässt sich nicht anlegen | Ungültige Zeichen (nur `a–z`, `0–9`, `.`, `_`, `-`, beginnend mit Buchstabe oder Ziffer). |
| Link `/t/<slug>` zeigt „Diese Collection existiert nicht“ | Slug falsch geschrieben oder Collection gelöscht. |
