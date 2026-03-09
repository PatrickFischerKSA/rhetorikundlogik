# Aletheia Wirklichkeitslabor

Mehrgeraete-Lernlandschaft fuer Raphaela Edelbauers *Die echtere Wirklichkeit*.

Build-Stand: `Multi-Device Build 2026-03-09 11:27`

## Was jetzt anders ist

Die App ist keine lokale Einzelseite mehr, sondern ein synchronisiertes Klassenzimmer-Spiel:

- lokaler Node-Server mit Raumcodes
- zwei private Player-Ansichten fuer unterschiedliche Endgeraete
- zusaetzlicher Solo-Modus mit digitalem Systempartner
- optionaler Board-/Beamer-Modus fuer die gemeinsame Szene
- Host-Konsole mit Join-Links und versteckter Engine
- Live-Feed, private Inboxen, Timer und Systemeingriffe
- exportierbares JSON- und Markdown-Protokoll

## Lokal starten

Im Projektordner:

```bash
cd /Users/patrickfischer/Documents/New\ project/aletheia-wirklichkeitslabor
npm start
```

Danach:

1. Auf dem Startgeraet `http://localhost:8787` oeffnen.
2. Entweder einen Mehrgeraete-Raum anlegen oder direkt eine Solo-Partie starten.
3. Im Mehrgeraete-Modus die angezeigten Links fuer Spieler*in A, Spieler*in B und optional das Board an die Endgeraete verteilen.
4. Die beiden Spielenden treten mit ihren eigenen Geraeten bei oder die Solo-Partie laeuft sofort gegen den Systempartner an.
5. Im Mehrgeraete-Modus startet das Spiel automatisch, sobald Sitz A und B verbunden sind.

Der Server gibt beim Start auch die LAN-/WLAN-Adressen aus. Genau diese URL muessen die anderen Geraete im selben Netz verwenden.

## Oeffentlich deployen

Die App ist jetzt auch fuer einen echten Node-Host vorbereitet:

- `package.json` fuer Startskript und Node-Version
- `Dockerfile` fuer Container-Deployments
- `.github/workflows/aletheia-check.yml` im Repo-Root fuer GitHub-Checks
- `.github/workflows/aletheia-publish-ghcr.yml` im Repo-Root fuer automatisches Container-Publishing nach GHCR
- `render.yaml` fuer Render-Blueprint-Deployments
- `railway.json` fuer Railway-Deployments
- `PORT`- und `HOST`-Support ueber Umgebungsvariablen

Jeder Node- oder Docker-Host funktioniert, solange `server.mjs` als Webdienst gestartet wird.

Die konkrete Schritt-fuer-Schritt-Anleitung steht in [DEPLOY.md](/Users/patrickfischer/Documents/New%20project/aletheia-wirklichkeitslabor/DEPLOY.md).

Wichtig:

- GitHub Pages allein reicht fuer dieses Spiel nicht aus.
- Die GitHub-Loesung hier ist deshalb: Repository + Actions + Container-Image + echter Web-Host.

### Variante A: Node-Host

```bash
npm start
```

Der Host muss eingehende Verbindungen auf dem vom Provider gesetzten `PORT` erlauben. Das Skript liest `PORT` automatisch aus der Umgebung.

### Variante B: Docker-Host

```bash
docker build -t aletheia-wirklichkeitslabor .
docker run -p 8787:8787 aletheia-wirklichkeitslabor
```

### Geeignete Plattformen

- jeder VPS mit Node 20+
- jeder Container-Host, der ein `Dockerfile` starten kann
- klassische Web-App-Hosts fuer Node-Dienste

Wichtig:

- Die aktuelle Spielstate liegt im Arbeitsspeicher des Servers.
- Ein Neustart des Servers loescht laufende Raeume und Partien.
- Fuer Unterricht mit echten Klassen sollte der Dienst deshalb stabil durchlaufen und nicht schlafen gelegt werden.

## Modi

- `Host`: Raum anlegen, Join-Links kopieren, Systemmotor beobachten
- `Solo`: eine Person spielt direkt gegen einen digitalen Systempartner mit eigener Gegenlogik
- `Player`: private Rolle, geheimes Briefing, private Inbox und Aktionsformulare
- `Board`: gemeinsame Szene, Feed, Metriken, aber keine geheimen Infos

## Spielphasen

1. Fragment waehlen und metaphorischen Hinweis senden
2. Hinweis des Gegenuebers einer Achse zuordnen
3. Doktrin verwerfen und setzen
4. Schattenakteur markieren, Vertrauensfigur benennen, Intervention waehlen
5. Reflexion archivieren

## Reaktive Engine

Die Serverlogik reagiert live auf:

- Realitaetsdruck
- Ambiguitaet
- Vertrauen
- Enthuellung

Ab bestimmten Schwellen aktiviert sie Ereignisse wie:

- `Saeuberungsprotokoll`
- `Nebelmaschine`
- `Spaltungsmatrix`
- `Gegenzeugin`

Diese Eingriffe erzeugen neue Systemmeldungen und private Zuschriften und veraendern die Metriken unmittelbar.
