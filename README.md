# Vokabeltrainer

Englisch-Vokabeln lernen mit Karteikarten, Quiz, Bewegungen, Eselsbrücken und Orden.
Gebaut mit Vite, Tailwind CSS 4 und Alpine.js. Läuft als statische Seite auf GitHub Pages.

## So kommt eine Änderung online

Jede Änderung auf dem Branch `main` startet automatisch die GitHub Action „App bauen und veröffentlichen“
(`.github/workflows/deploy.yml`). Sie installiert alles, prüft die Lernlogik, baut die App und stellt sie
auf GitHub Pages. Nach 1–2 Minuten ist das Update online. Lokal muss dafür nichts installiert sein.

Einmalig nötig: **Settings → Pages → Source: „GitHub Actions“**.

Den Fortschritt sieht man im Repository unter **Actions**.

## Lokal entwickeln (optional)

1. Node.js installieren (Version 20.19 oder neuer): https://nodejs.org → „LTS“ herunterladen.
2. Im Terminal in diesen Ordner wechseln und einmal ausführen:

   ```bash
   npm install
   ```

## Lokal ansehen

```bash
npm run dev
```

Dann die angezeigte Adresse öffnen, z. B. http://localhost:5173.
Zum Testen auf dem iPad/iPhone im selben WLAN: `npm run dev -- --host` und die angezeigte Netzwerk-Adresse öffnen.

## Neue Lektion hinzufügen

Lektionen liegen in `public/`: eine Datei pro Lektion (z. B. `seite-248.json`) und die Liste `public/lektionen.json`
(neueste zuerst). Neue Lektion = neue Datei in `public/` + Eintrag in `lektionen.json` → auf `main` speichern.

Aufbau einer Lektionsdatei:

```json
{
  "name": "Unit 3",
  "emoji": "🏫",
  "belohnung": { "bild": "🎬", "text": "Du bestimmst den Film beim nächsten Familienabend!" },
  "woerter": [
    {
      "en": "to answer",
      "de": "beantworten; antworten",
      "bild": "🙋",
      "bildDatei": "raising_hand_3d.png",
      "bewegung": "Streck die Hand hoch wie in der Schule.",
      "eselsbruecke": "Das w spricht man nicht: „ahn-ser“.",
      "schreibweise": "Das w schreibt man, spricht es aber nicht: answer."
    }
  ]
}
```

- `belohnung` ist optional. Ohne sie wird zufällig eine aus `belohnungen.json` gezogen.
- `bildDatei` ist optional (z. B. ein Fluent-Emoji-3D-Bild, das in `public/` und auf GitHub liegt). Ohne sie wird das Emoji aus `bild` gezeigt.
- `eselsbruecke` und `schreibweise` sind optional.

## Belohnungen ändern

`public/belohnungen.json` bearbeiten und auf `main` speichern.

## Wie die App lernt

- Jede Lektion ist in Teile zu je 8 Wörtern aufgeteilt. Man kann einen oder mehrere Teile (oder „Alle“) zum Üben wählen.
- **Kleiner Orden:** alle Wörter eines Teils mindestens einmal im **Quiz** richtig.
- **Großer Orden + Belohnung:** alle Wörter der Lektion mindestens einmal im Quiz richtig.
- Karteikarten zählen nicht für Orden (dort bewertet man sich selbst).
- Der Stern „Nochmal üben“ sammelt Wörter, die noch nicht klappen. Solange der Stern gesetzt ist, lässt sich „Wusste ich“ nicht tippen.
- Bilder erscheinen erst auf der Rückseite der Karteikarte bzw. nach der Antwort im Quiz, damit sie die Lösung nicht verraten.
- Lernstand und Sterne liegen im Browser des Geräts (`localStorage`). Lektionen liegen als Dateien auf GitHub und gehen nie verloren.

## Tests

```bash
npm test
```

Prüft die Lernlogik (Teile, Quiz-Antworten, Orden, Sterne).
