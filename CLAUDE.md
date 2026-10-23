# CLAUDE.md – Persönliches Wiki

Lukas' Nachschlagewerk: wie er seine Arbeit macht (Abläufe in Schritten, Fachwissen mit Quelle, Werkzeuge).
Läuft unter https://lulkasss.github.io/wiki/. Sprache in App, Kommentaren und Commits: **Deutsch**.

## Ziel
- Wofür: Lukas findet in Sekunden, wie er einen Ablauf macht und was fachlich gilt, und sieht sofort, was das Wiki seit
  seinem letzten Besuch dazugelernt hat.
- Wer, wann: Lukas, kurz vor oder während einer Aufgabe oder eines Termins; oft am iPhone (Home-Bildschirm), sonst am Mac
  neben Klar.
- Gelungen, wenn: Mit einer Suche oder zwei Tipps ist er an der richtigen Stelle, und neue Abschnitte findet er, ohne
  danach zu suchen.
- Abgenommen: Inhalte und Gliederung (Anlässe, Abläufe in Bereichen, Fachwissen, Werkzeuge), Suche mit `/`, Direktlinks
  `#/artikel/<id>`, Abläufe als nummerierte Schritte mit Randnotiz „Worauf es ankommt“ (11.10.2026), Flieder als einzige
  Akzentfarbe, hell und dunkel, ruhige Animationen.
- Nicht gewollt: Blau; Spielanzeige-Look (Ringe, pulsierende Punkte); Titelbalken oben links (Logo, App-Name); viel Text.
  23.10.2026: „alles neu, neue Visuals, neue Animationen, sinnvoll aufgeteilt“; Neues war in der App nicht zu finden.

## Verlauf der Entwürfe
- Bis 11.10.2026: Oberfläche des früheren Artifacts mit Sternenhimmel (Skyrim-Skilltree), Leiste mit Baum.
- Neuentwurf 1 (23.10.2026), Lukas: „Passt so“, am selben Tag live. Vorschau war das private Artifact
  https://claude.ai/artifact/J3SGH1NQbgNAdoG8iHd4SQ. Leiste links am Mac, unten am Handy (Start, Abläufe, Nachschlagen,
  Suchen). Start: große Frage mit Suche, „Zuletzt“, Karte „Seiten haben Neues“, Anlässe als Linienplan, Bereiche als
  Chips. Artikel: Abschnitte als mitlaufende Leiste, Schritte als Weg, der sich beim Lesen füllt, Randnotiz daneben
  (Handy darunter), im Anlass „Schritt x von n“ mit Weiter. Nachschlagen: Umschalter Fachwissen/Werkzeuge mit Prüfdatum.
  Suche als Blatt (Handy von unten), findet auch Text in Schritten.

Konzept und Regeln stehen im Repo `LULKASSS/Assistenz-LR`: `konzept/wissen-und-gedaechtnis.md` und `auftraege/wiki-app.md`.
Aufgebaut wie Klar (`LULKASSS/klar`): eine Seite, Skripte in `scripts/`, Playwright-Tests, GitHub Actions veröffentlicht `main`.

## Was nie ins Repo darf
- **Wiki-Inhalte.** Das Repo ist öffentlich, die Inhalte liegen nur bei Supabase. Tests laufen mit dem erfundenen `test/beispiel.json`.
  `daten/` (lokale Kopie des echten Wikis für den Fehlercheck) und `vorschau/` sind ignoriert, `npm run check` prüft das.
- **Kundendaten** jeder Art, auch nicht in Tests oder Beispielen.
- **Schlüssel** außer dem öffentlichen Supabase-Schlüssel in `wolke.json` (derselbe wie bei Klar).
- Die Zuordnung von Kategorie-ids zu Zeichen (`PFADE` in `src/wiki.html`) ist nur Darstellung.

## Daten
Supabase, dasselbe Projekt und dieselbe Tabelle wie Klar (`public.klar_dokumente`, Schema in Klars `supabase/schema.sql`):
- `wiki/aktuell` → `daten = {baum: <ganzes Wiki als JSON-Text>, aktualisiert: <ISO>, fassung: <Zahl>}`. Die App **liest** es nur.
  Gepflegt wird es vom Sonntagslauf.
- `wiki-eingang/<Kennung>` → `{text, klasse, am, stand: "neu"}`. Das Einzige, was die App **schreibt** („Etwas ergänzen“).
  Der Sonntagslauf wertet es aus und setzt `stand: "ausgewertet"`.
- **Einmal-Übernahme:** Fehlt `wiki/aktuell`, zeigt die App nach der Anmeldung „Wiki übernehmen“ (Datei `wissensbaum.json`,
  geprüft: `artikel[]` da, `fassung` ≥ 11). Geschrieben wird mit `insert` und nur, wenn das Dokument dann immer noch fehlt.
- `wiki-sicherungen/<JJJJ-MM-TT>-fassung-<n>` → frühere Fassungen, angelegt vom Sonntagslauf vor dem Schreiben. Die App **liest**
  nur die neueste, und nur, wenn auf dem Gerät noch kein `wiki.gesehen` liegt (siehe „Neu seit …“).
- Nicht anfassen: die Tabelle selbst (kein DDL) und Klars Dokumente (`stand`, `sicherungen`, `bilder`, `himmel`).
- Auf dem Gerät: `wiki.kopie` im localStorage – der zuletzt geladene Stand, damit die App ohne Netz startet. Wird gelöscht,
  sobald keine Anmeldung mehr da ist. Kommt das Fenster nach vorn, prüft die App höchstens alle zehn Minuten auf eine neue Fassung.
- Weiter im localStorage, nur Bequemlichkeit: `wiki.gesehen` (je Abschnitt Titel und Prüfsumme des zuletzt mit „Gesehen“
  bestätigten Stands), `wiki.zuletzt` (zuletzt angesehen), `wiki.reiter` (Fachwissen oder Werkzeuge).

## Neu seit dem letzten Besuch
Die Startseite vergleicht das Wiki mit einem älteren Stand, je Abschnitt (Titel gleich, Prüfsumme anders → „ergänzt“,
Titel neu → „neu“). Der ältere Stand ist, der Reihe nach: `wiki.gesehen` auf dem Gerät; sonst die vorige `wiki.kopie`;
sonst die neueste Sicherung bei Supabase. Gibt es nichts Älteres, ist nichts neu und `wiki.gesehen` wird gesetzt.
„Gesehen“ setzt `wiki.gesehen` auf den jetzigen Stand. Ein Fehler beim Holen der Sicherung hält das Laden nie auf.

## Anmeldung
- supabase-js **2.45.4** wie Klar, `storageKey: "klar.anmeldung"`. Beide Apps liegen unter `lulkasss.github.io`, also teilen sie
  im selben Browser die Anmeldung. Ändert Klar die Bibliothek oder den Schlüssel, hier mitziehen.
- Mehrere Tabs (auch Klar und Wiki nebeneinander): auth-js erneuert das Token nur unter der Browser-Sperre `lock:klar.anmeldung`
  und meldet Anmeldungen per BroadcastChannel an die anderen Tabs. Geprüft im Quelltext von auth-js 2.65.0.
- Kein Konto anlegen und kein Abmelden im Wiki – das Konto gehört Klar. Abmelden in Klar zeigt hier die Anmeldeseite.
- Web-Apps auf dem iPhone-Home-Bildschirm haben je eigenen Speicher: dort meldet Lukas sich im Wiki einmal extra an (Annahme, ungeprüft).

## Aufbau
- `src/wiki.html` – die ganze App. `wikiProgramm()` zeichnet: ein Zustand `S`, eine Sicht zur Zeit (`zeichnen()`), Wechsel
  über `gehe()` mit echtem Browser-Verlauf (Zurückwischen am iPhone geht). Ganz unten `WIKI`: Daten aus `window.WIKI_DATEN`
  (Tests, Vorschau; `{baum, vorher, wartend, ergaenzen}`) oder aus dem Konto (Ziel als `#wolkeziel`, setzt
  `scripts/oeffentlich.mjs` aus `wolke.json`).
- Direktlinks: `#/artikel/<id>`, `#/wissen/<id>`, `#/werkzeug/<id>`, `#/anlass/<id>`, `#/ablaeufe[/<kategorie>]`,
  `#/fachwissen`, `#/werkzeuge` – so verlinkt Klar hierher. Alte Artifact-Adressen (`#a.<id>` usw.) gehen weiter.
- `icon/wiki.svg` – App-Zeichen (Flieder-Kachel wie Klar, Stern). Nach Änderungen `node scripts/icons.mjs`.

## Befehle
- `npm test` – Fehlercheck + Browsertests. Ohne installiertes Chrome: `PW_CHROMIUM=<pfad> CI=1 npm test`.
- `npm run dev` → http://localhost:5192 (Beispiel-Wiki), `/konto?wolke=test` (nachgebautes Konto), `/konto?wolke=echt`, `/leer`.
- `node scripts/vorschau.mjs <wiki.json> vorschau/wiki.html [<vorher.json>]` – Vorschau mit echten Daten für ein privates Artifact, nie committen.
- `test/rundgang.schritte.mjs` – Rundgang für den Skill `ui-pruefung`.

## Gestaltung
Linear/Vercel-artig, ruhig, feine Linien, weiße Karten mit weichem Schatten auf hellem Grund. Kein Blau, Flieder `#6a52a3` als
einzige Akzentfarbe, Grün nur für „geprüft“, Ocker nur für „unbestätigt“. Nur Geist. Hell und dunkel gleichwertig, Farben als
Tokens oben im `<style>`, Dunkel zweimal (Media-Abfrage und `[data-theme="dark"]`). Ein Bild, das sich durchzieht: der Weg aus
Stationen (Anlässe im Linienplan, Schritte im Ablauf). Bewegung: Sicht gleitet (0,17 s raus, 0,33 s Feder rein), Linienplan
zeichnet sich beim ersten Besuch, Schritte füllen sich beim Lesen, Neues leuchtet beim Hinspringen kurz auf, Drücken gibt
nach. Keine Legenden neben Grafiken. Animationen **nicht abschaltbar** („Bewegung reduzieren“ wird bewusst nicht beachtet).
Text unter 4,5 : 1 Kontrast gibt es nicht (`ui-pruefung` meldet es).

## Prüfen, bevor „fertig“
Hell, dunkel, Handybreite, bis ans Ende scrollen, keine Fehler in der Konsole, Anmeldung mit zwei offenen Tabs.
