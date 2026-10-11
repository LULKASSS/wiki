# CLAUDE.md – Persönliches Wiki

Lukas' Nachschlagewerk: wie er seine Arbeit macht (Abläufe in Schritten, Fachwissen mit Quelle, Werkzeuge).
Läuft unter https://lulkasss.github.io/wiki/. Sprache in App, Kommentaren und Commits: **Deutsch**.

Konzept und Regeln stehen im Repo `LULKASSS/Assistenz-LR`: `konzept/wissen-und-gedaechtnis.md` und `auftraege/wiki-app.md`.
Aufgebaut wie Klar (`LULKASSS/klar`): eine Seite, Skripte in `scripts/`, Playwright-Tests, GitHub Actions veröffentlicht `main`.

## Was nie ins Repo darf
- **Wiki-Inhalte.** Das Repo ist öffentlich, die Inhalte liegen nur bei Supabase. Tests laufen mit dem erfundenen `test/beispiel.json`.
  `daten/` (lokale Kopie des echten Wikis für den Fehlercheck) und `vorschau/` sind ignoriert, `npm run check` prüft das.
- **Kundendaten** jeder Art, auch nicht in Tests oder Beispielen.
- **Schlüssel** außer dem öffentlichen Supabase-Schlüssel in `wolke.json` (derselbe wie bei Klar).
- Die Zuordnung von Kategorie-ids zu Zeichen und Kurznamen im Himmel (`PFADE`, `KURZ` in `src/wiki.html`) ist nur Darstellung.

## Daten
Supabase, dasselbe Projekt und dieselbe Tabelle wie Klar (`public.klar_dokumente`, Schema in Klars `supabase/schema.sql`):
- `wiki/aktuell` → `daten = {baum: <ganzes Wiki als JSON-Text>, aktualisiert: <ISO>, fassung: <Zahl>}`. Die App **liest** es nur.
  Gepflegt wird es vom Sonntagslauf.
- `wiki-eingang/<Kennung>` → `{text, klasse, am, stand: "neu"}`. Das Einzige, was die App **schreibt** („Etwas ergänzen“).
  Der Sonntagslauf wertet es aus und setzt `stand: "ausgewertet"`.
- **Einmal-Übernahme:** Fehlt `wiki/aktuell`, zeigt die App nach der Anmeldung „Wiki übernehmen“ (Datei `wissensbaum.json`,
  geprüft: `artikel[]` da, `fassung` ≥ 11). Geschrieben wird mit `insert` und nur, wenn das Dokument dann immer noch fehlt.
- Nicht anfassen: die Tabelle selbst (kein DDL) und Klars Dokumente (`stand`, `sicherungen`, `bilder`, `himmel`).
- Auf dem Gerät: `wiki.kopie` im localStorage – der zuletzt geladene Stand, damit die App ohne Netz startet. Wird gelöscht,
  sobald keine Anmeldung mehr da ist. Kommt das Fenster nach vorn, prüft die App höchstens alle zehn Minuten auf eine neue Fassung.

## Anmeldung
- supabase-js **2.45.4** wie Klar, `storageKey: "klar.anmeldung"`. Beide Apps liegen unter `lulkasss.github.io`, also teilen sie
  im selben Browser die Anmeldung. Ändert Klar die Bibliothek oder den Schlüssel, hier mitziehen.
- Mehrere Tabs (auch Klar und Wiki nebeneinander): auth-js erneuert das Token nur unter der Browser-Sperre `lock:klar.anmeldung`
  und meldet Anmeldungen per BroadcastChannel an die anderen Tabs. Geprüft im Quelltext von auth-js 2.65.0.
- Kein Konto anlegen und kein Abmelden im Wiki – das Konto gehört Klar. Abmelden in Klar zeigt hier die Anmeldeseite.
- Web-Apps auf dem iPhone-Home-Bildschirm haben je eigenen Speicher: dort meldet Lukas sich im Wiki einmal extra an (Annahme, ungeprüft).

## Aufbau
- `src/wiki.html` – die ganze App. `wikiProgramm()` zeichnet. Ganz unten `WIKI`: Daten aus `window.WIKI_DATEN` (Tests, Vorschau)
  oder aus dem Konto (Ziel als `#wolkeziel`, setzt `scripts/oeffentlich.mjs` aus `wolke.json`).
- Direktlinks: `#/artikel/<id>`, `#/wissen/<id>`, `#/werkzeug/<id>`, `#/anlass/<id>` – so verlinkt Klar hierher.
  Alte Artifact-Adressen (`#a.<id>` usw.) gehen weiter.
- `icon/wiki.svg` – App-Zeichen (Flieder-Kachel wie Klar, Stern). Nach Änderungen `node scripts/icons.mjs`.

## Befehle
- `npm test` – Fehlercheck + Browsertests. Ohne installiertes Chrome: `PW_CHROMIUM=<pfad> CI=1 npm test`.
- `npm run dev` → http://localhost:5192 (Beispiel-Wiki), `/konto?wolke=test` (nachgebautes Konto), `/konto?wolke=echt`, `/leer`.
- `node scripts/vorschau.mjs <wiki.json> vorschau/wiki.html` – Vorschau mit echten Daten für ein privates Artifact, nie committen.

## Gestaltung
Die Oberfläche ist die des früheren Artifacts – übernommen, nicht neu entworfen. Linear/Vercel-artig, monochrom, feine Linien,
kein Blau, Flieder `#6a52a3` als einzige Akzentfarbe plus höchstens zwei Signalfarben, Geist/IBM Plex, hell und dunkel.
Keine Legenden neben Grafiken. Animationen ruhig und **nicht abschaltbar** („Bewegung reduzieren“ wird bewusst nicht beachtet).

## Prüfen, bevor „fertig“
Hell, dunkel, Handybreite, bis ans Ende scrollen, keine Fehler in der Konsole, Anmeldung mit zwei offenen Tabs.
