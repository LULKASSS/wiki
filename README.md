# Persönliches Wiki

Lukas Rückborns Nachschlagewerk: wie er seine Arbeit macht. Es enthält Abläufe in Schritten, Fachwissen mit Quelle und Prüfdatum und die Werkzeuge, mit denen er arbeitet. Die App läuft unter https://lulkasss.github.io/wiki/.

**In diesem Repo stehen keine Wiki-Inhalte.** Das Repo ist öffentlich, die Inhalte liegen nur bei Supabase. Für die Tests gibt es ein kleines erfundenes Wiki (`test/beispiel.json`).

## Daten

Die Daten liegen im selben Supabase-Projekt und in derselben Tabelle wie Klar:

| Tabelle `public.klar_dokumente` | Inhalt | App |
| --- | --- | --- |
| `sammlung = 'wiki'`, `id = 'aktuell'` | `daten = {baum: <Wiki als JSON-Text>, aktualisiert: <ISO>, fassung: <Zahl>}` | liest |
| `sammlung = 'wiki-eingang'`, `id = <Kennung>` | `{text, klasse, am, stand: "neu"}`: das, was unter „Etwas ergänzen“ abgeschickt wird | schreibt |

Die Artikel pflegt der Sonntagslauf. Er wertet `wiki-eingang` aus und setzt danach `stand: "ausgewertet"`. Die Oberfläche selbst schreibt nie ins Wiki.

### Form des Wikis (Fassung 11 und folgende)

```
{ fassung, aktualisiert, regel, gruppen[],
  kategorien[{id, gruppe, name, kurz, artikel[]}],
  artikel[{id, kategorie, name, wann, abschnitte[{titel, intro, schritte[], hinweise[]}],
           seit, wissen[], werkzeuge[], verwandt[], quelle[], alt[]}],
  wissen[{id, name, kurz, kategorie, abschnitte[{titel, kurz, punkte[], quelle, geprueft}]}],
  werkzeuge[{id, name, kurz, punkte[], quelle, geprueft}],
  anlaesse[{id, name, kurz, weg[]}] }
```

## Direktlinks

`#/artikel/<id>`, `#/wissen/<id>`, `#/werkzeug/<id>` und `#/anlass/<id>` öffnen genau diese Seite. So verlinkt Klar hierher. Alte Adressen aus dem Artifact (`#a.<id>` usw.) funktionieren weiter.

## Entwickeln

```
npm install
npm test            # Playwright, PC- und Handybreite
npm start           # http://localhost:4174, ohne Daten
npm run bauen       # _site/ für GitHub Pages
node scripts/vorschau.js <wiki.json> vorschau/wiki.html   # mit Daten, nie committen
```

Jeder Push auf `main` wird getestet und nach GitHub Pages veröffentlicht (`.github/workflows/pages.yml`).
