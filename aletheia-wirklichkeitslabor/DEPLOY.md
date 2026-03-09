# Oeffentliches Deployment

Diese App braucht einen **dauerlaufenden Node-Prozess**. GitHub Pages, reine Static Hosts oder Serverless-Functions sind dafuer ungeeignet, weil:

- die Spielraeume im Arbeitsspeicher liegen
- Server-Sent Events fuer die Live-Synchronisierung offen bleiben muessen
- laufende Partien bei Server-Neustarts verloren gehen

## GitHub-Loesung

Eine reine `github.io`- oder GitHub-Pages-Loesung ist fuer diese App ungeeignet, weil dort kein dauerlaufender Node-Prozess existiert.

Die sinnvolle GitHub-Variante ist:

1. Code in ein GitHub-Repository pushen
2. GitHub Actions prueft den Code automatisch
3. GitHub Actions baut bei Push auf `main` automatisch ein Docker-Image nach `ghcr.io`
4. Dieses Repo oder Image wird dann auf einen echten Web-Host deployed

Im Repo liegen dafuer bereits:

- [.github/workflows/aletheia-check.yml](/Users/patrickfischer/Documents/New%20project/.github/workflows/aletheia-check.yml)
- [.github/workflows/aletheia-publish-ghcr.yml](/Users/patrickfischer/Documents/New%20project/.github/workflows/aletheia-publish-ghcr.yml)
- [Dockerfile](/Users/patrickfischer/Documents/New%20project/aletheia-wirklichkeitslabor/Dockerfile)

Nach dem ersten Push auf `main` entsteht dein Container unter:

- `ghcr.io/<dein-github-name>/<repo-name>:latest`

## Empfohlene Plattformen

- `Render` als Web Service mit Docker
- `Railway` als Web Service mit Docker
- jeder VPS mit Node 20+

## Render

Im Repo liegt bereits [render.yaml](/Users/patrickfischer/Documents/New%20project/aletheia-wirklichkeitslabor/render.yaml).

Vorgehen:

1. Repository zu GitHub pushen.
2. In Render `New +` -> `Blueprint` waehlen.
3. Das Repository verbinden.
4. Render erkennt `render.yaml` und erstellt den Web Service automatisch.
5. Nach dem Deploy die Render-URL oeffnen.

Wichtig:

- Der Dienst darf nicht schlafen gelegt werden.
- `healthCheckPath` ist `/api/health`.
- Die finale URL wird `https://...onrender.com` sein und ist direkt spielbar.

## Railway

Im Repo liegt bereits [railway.json](/Users/patrickfischer/Documents/New%20project/aletheia-wirklichkeitslabor/railway.json) und ein [Dockerfile](/Users/patrickfischer/Documents/New%20project/aletheia-wirklichkeitslabor/Dockerfile).

Vorgehen:

1. Repository zu GitHub pushen.
2. In Railway `New Project` -> `Deploy from GitHub repo`.
3. Das Repository waehlen.
4. Railway baut automatisch ueber das Dockerfile.
5. Nach dem ersten Deploy unter `Settings` -> `Networking` eine oeffentliche Domain aktivieren.

Die finale URL wird `https://...up.railway.app` oder eine eigene Domain sein.

## GitHub Pages

GitHub Pages bleibt absichtlich nur Vorschau bzw. Hinweisseite.

Nicht geeignet fuer:

- Live-Synchronisierung per SSE
- laufende Raeume im Speicher
- Server-API unter `/api/...`
- echte Mehrgeraete-Partien

## VPS

Wenn du einen eigenen Server hast:

```bash
npm install
npm start
```

Dann den Node-Dienst hinter einen Reverse Proxy wie Nginx oder Caddy legen und eine HTTPS-Domain darauf zeigen lassen.

## Nach dem Deploy

Die oeffentliche URL ersetzt danach lokal `http://localhost:8787`.

Beispiele:

- `https://dein-spiel.onrender.com`
- `https://dein-spiel.up.railway.app`

Alle Spielenden muessen exakt diese eine URL verwenden.
