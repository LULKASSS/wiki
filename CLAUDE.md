# CLAUDE.md – Persönliches Wiki

Sprache in App, Kommentaren und Commits: Deutsch.

## Was das ist

Lukas' Persönliches Wiki als eigene Web-App, so wie Klar (`LULKASSS/klar`) eine eigene App ist. Die Oberfläche ist die des früheren claude.ai-Artifacts (Sternenhimmel als Band oben, Reiter Start/Abläufe/Fachwissen/Werkzeuge, Kategorien links, Suche mit `/`, Anlässe als Wege, „Etwas ergänzen“). Sie wurde übernommen und nicht neu entworfen.

Konzept und Regeln stehen im Repo `LULKASSS/Assistenz-LR`: `konzept/wissen-und-gedaechtnis.md` und `auftraege/wiki-app.md`.

## Was nie ins Repo darf

- **Wiki-Inhalte.** Das Repo ist öffentlich. Inhalte gibt es nur bei Supabase. Tests laufen mit dem erfundenen `test/beispiel.json`. Vorschauen mit echten Daten (`scripts/vorschau.js`) landen in `vorschau/` (steht in `.gitignore`) oder außerhalb des Repos.
- **Kundendaten** jeder Art, auch nicht in Tests oder Beispielen.
- **Schlüssel** außer dem öffentlichen Supabase-Schlüssel.

Die Zuordnung von Kategorie-ids zu Zeichen und Kurznamen im Himmel (`PFADE`, `KURZ` in `src/wiki.html`) ist nur Darstellung. Inhalt kommt dort nicht rein.

## Daten

Supabase, dasselbe Projekt und dieselbe Tabelle wie Klar (`public.klar_dokumente`):
- `wiki/aktuell` → `daten = {baum: <JSON-Text>, aktualisiert, fassung}`. Die App liest das nur.
- `wiki-eingang/<Kennung>` → `{text, klasse, am, stand: "neu"}`. Die App schreibt hier nur über „Etwas ergänzen“.

Nicht anfassen: die Tabelle selbst (kein DDL) und Klars Dokumente (`stand`, `sicherungen`, `bilder`, `himmel`).

## Aufbau

- `src/wiki.html` – die ganze App in einer Datei. `wikiProgramm()` zeichnet. Ganz unten startet `WIKI` mit den Daten.
- Bis die Supabase-Anbindung steht, startet die Seite mit `window.WIKI_DATEN = {baum, wartend, ergaenzen}`. Das nutzen die Tests und die Vorschau.
- `src/manifest.webmanifest`, `src/icon*.{svg,png}` – installierbar als Web-App. Die PNGs rendert `scripts/icons.js` aus dem SVG.
- `test/` – Playwright, `npm test`.

## Gestaltung

Lukas' Vorgaben: Linear/Vercel-artig, monochrom, feine Linien, kein Blau, Flieder `#6a52a3` als einzige Akzentfarbe plus höchstens zwei Signalfarben, Geist/IBM Plex, hell und dunkel. Keine Legenden neben Grafiken. Animationen ruhig und nicht abschaltbar: „Bewegung reduzieren“ wird bewusst nicht beachtet.

## Prüfen, bevor „fertig“

Hell, dunkel, Handybreite, bis ans Ende scrollen, keine Fehler in der Konsole, Anmeldung mit zwei offenen Tabs.
