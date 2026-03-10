const SESSION_KEY = "aletheia_multidevice_session_v1";
const BUILD_ID = "Multi-Device Build 2026-03-09 11:27";
const PUBLIC_APP_URL = "https://aletheia-wirklichkeitslabor.onrender.com";

const state = {
  view: "landing",
  roomId: "",
  seat: "",
  token: "",
  hostToken: "",
  snapshot: null,
  stream: null,
  connection: "idle",
  uiTab: "live",
  joinDraft: {
    roomId: "",
    seat: "A",
    name: ""
  },
  createDraft: {
    teamName: "",
    className: "",
    playerName: "",
    roundLimit: 6
  },
  error: "",
  backendReady: null
};

const root = document.getElementById("app");

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return;
    }
    const saved = JSON.parse(raw);
    Object.assign(state, {
      view: saved.view || state.view,
      roomId: saved.roomId || "",
      seat: saved.seat || "",
      token: saved.token || "",
      hostToken: saved.hostToken || "",
      uiTab: saved.uiTab || "live",
      createDraft: { ...state.createDraft, ...(saved.createDraft || {}) },
      joinDraft: { ...state.joinDraft, ...(saved.joinDraft || {}) }
    });
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }
}

function saveSession() {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    view: state.view,
    roomId: state.roomId,
    seat: state.seat,
    token: state.token,
    hostToken: state.hostToken,
    uiTab: state.uiTab,
    createDraft: state.createDraft,
    joinDraft: state.joinDraft
  }));
}

function applyUrlHints() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const room = params.get("room");
  const seat = params.get("seat");
  if (room) {
    state.roomId = room.toUpperCase();
    state.joinDraft.roomId = state.roomId;
  }
  if (seat === "A" || seat === "B") {
    state.seat = seat;
    state.joinDraft.seat = seat;
  }
  if (mode === "player" || mode === "board" || mode === "host" || mode === "solo") {
    state.view = mode;
  }
}

function setError(message) {
  state.error = message;
  render();
}

async function checkBackend() {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    if (!response.ok) {
      state.backendReady = false;
      return false;
    }
    const data = await response.json().catch(() => null);
    state.backendReady = Boolean(data?.ok);
    return state.backendReady;
  } catch {
    state.backendReady = false;
    return false;
  }
}

async function ensureBackend() {
  const ready = await checkBackend();
  if (ready) {
    return true;
  }
  throw new Error(`Diese geoeffnete Seite kommt nicht vom laufenden Spielserver. Aktuell offen: ${currentOrigin()}. Starte lokal \`node server.mjs --host 0.0.0.0 --port 8787\` oder oeffne die korrekt deployte Server-URL. Eine statische Vorschau oder falsche Domain reicht nicht aus.`);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Serverfehler (${response.status})`);
    }
    return data;
  }
  const text = await response.text().catch(() => "");
  if (!response.ok) {
    throw new Error(text?.trim() ? `Falscher Server antwortet statt der Spiel-API (${response.status}).` : `Serverfehler (${response.status})`);
  }
  throw new Error("Die API hat keine JSON-Antwort geliefert. Wahrscheinlich läuft nicht `server.mjs`, sondern nur ein statischer Webserver.");
}

function viewerParams() {
  if (state.view === "host") {
    return { viewer: "host", token: state.hostToken };
  }
  if (state.view === "player") {
    return { viewer: "player", seat: state.seat, token: state.token };
  }
  if (state.view === "solo") {
    return { viewer: "solo", token: state.hostToken };
  }
  if (state.view === "board") {
    return { viewer: "board" };
  }
  return { viewer: "board" };
}

function queryString(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });
  return search.toString();
}

async function fetchSnapshot() {
  if (!state.roomId || state.view === "landing") {
    return;
  }
  try {
    const query = queryString(viewerParams());
    state.snapshot = await api(`/api/rooms/${state.roomId}?${query}`, {
      method: "GET",
      headers: {}
    });
    state.connection = "live";
    state.error = "";
    render();
  } catch (error) {
    state.connection = "offline";
    state.error = error.message;
    render();
  }
}

function closeStream() {
  if (state.stream) {
    state.stream.close();
    state.stream = null;
  }
}

function connectStream() {
  closeStream();
  if (!state.roomId || state.view === "landing") {
    return;
  }
  const query = queryString(viewerParams());
  state.stream = new EventSource(`/api/rooms/${state.roomId}/stream?${query}`);
  state.connection = "connecting";
  state.stream.onmessage = (event) => {
    state.snapshot = JSON.parse(event.data);
    state.connection = "live";
    state.error = "";
    render();
  };
  state.stream.onerror = () => {
    state.connection = "offline";
    renderConnectionOnly();
  };
}

async function createRoom() {
  try {
    await ensureBackend();
    const result = await api("/api/rooms", {
      method: "POST",
      body: JSON.stringify(state.createDraft)
    });
    state.view = "host";
    state.roomId = result.roomId;
    state.hostToken = result.hostToken;
    state.snapshot = null;
    state.error = "";
    saveSession();
    await fetchSnapshot();
    connectStream();
  } catch (error) {
    setError(error.message);
  }
}

async function createSoloGame() {
  try {
    await ensureBackend();
    const result = await api("/api/rooms", {
      method: "POST",
      body: JSON.stringify({
        ...state.createDraft,
        mode: "solo"
      })
    });
    state.view = "solo";
    state.roomId = result.roomId;
    state.hostToken = result.hostToken;
    state.seat = "A";
    state.token = result.hostToken;
    state.snapshot = null;
    state.error = "";
    saveSession();
    await fetchSnapshot();
    connectStream();
  } catch (error) {
    setError(error.message);
  }
}

async function joinRoom() {
  try {
    await ensureBackend();
    const result = await api(`/api/rooms/${state.joinDraft.roomId.toUpperCase()}/join`, {
      method: "POST",
      body: JSON.stringify({
        seat: state.joinDraft.seat,
        name: state.joinDraft.name
      })
    });
    state.view = "player";
    state.roomId = result.roomId;
    state.seat = result.seat;
    state.token = result.token;
    state.joinDraft.roomId = result.roomId;
    state.snapshot = null;
    state.error = "";
    saveSession();
    await fetchSnapshot();
    connectStream();
  } catch (error) {
    setError(error.message);
  }
}

async function openBoard() {
  try {
    await ensureBackend();
    state.view = "board";
    state.roomId = state.joinDraft.roomId.toUpperCase();
    state.error = "";
    saveSession();
    await fetchSnapshot();
    connectStream();
  } catch (error) {
    setError(error.message);
  }
}

async function sendAction(type, payload = {}) {
  try {
    await ensureBackend();
    await api(`/api/rooms/${state.roomId}/action`, {
      method: "POST",
      body: JSON.stringify({
        viewer: state.view === "host"
          ? { mode: "host", token: state.hostToken }
          : state.view === "player"
            ? { mode: "player", seat: state.seat, token: state.token }
            : state.view === "solo"
              ? { mode: "solo", token: state.hostToken }
            : { mode: "board" },
        type,
        payload
      })
    });
  } catch (error) {
    setError(error.message);
  }
}

function formatTime(isoString) {
  if (!isoString) {
    return "";
  }
  const date = new Date(isoString);
  return date.toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function germanize(value) {
  const replacements = {
    Ambiguitaet: "Ambiguität",
    Aufklaerung: "Aufklärung",
    Aussenfigur: "Außenfigur",
    Aussenperspektive: "Außenperspektive",
    Ausschluesse: "Ausschlüsse",
    Autoritaer: "Autoritär",
    Autoritaet: "Autorität",
    Begruenden: "Begründen",
    begruenden: "begründen",
    Bezugsflaeche: "Bezugsfläche",
    Buecherbarriere: "Bücherbarriere",
    Buechern: "Büchern",
    Druckerschwaerze: "Druckerschwärze",
    Endgeraet: "Endgerät",
    Endgeraete: "Endgeräte",
    Enthuellung: "Enthüllung",
    Enthuellungspunkte: "Enthüllungspunkte",
    Faehrte: "Fährte",
    Fluesterstimmen: "Flüsterstimmen",
    Fuer: "Für",
    fuer: "für",
    Fuersorge: "Fürsorge",
    Geraet: "Gerät",
    Geraete: "Geräte",
    Gegenmassnahme: "Gegenmaßnahme",
    Gegenueber: "Gegenüber",
    gegenueber: "gegenüber",
    Gefaehrlich: "Gefährlich",
    gefaehrlich: "gefährlich",
    gewaehlten: "gewählten",
    geoeffnete: "geöffnete",
    Geruechte: "Gerüchte",
    grossen: "großen",
    groessere: "größere",
    haertere: "härtere",
    kleinbuergerlich: "kleinbürgerlich",
    Klaerung: "Klärung",
    klaerung: "klärung",
    Koennen: "Können",
    koennen: "können",
    Koerper: "Körper",
    Laeuft: "Läuft",
    laeuft: "läuft",
    Lehreruebersicht: "Lehrerübersicht",
    Loesung: "Lösung",
    Loesungen: "Lösungen",
    Loyalitaet: "Loyalität",
    Mehrgeraete: "Mehrgeräte",
    Moeglich: "Möglich",
    moeglich: "möglich",
    Muessen: "Müssen",
    muessen: "müssen",
    naechste: "nächste",
    Naechste: "Nächste",
    Neutralitaet: "Neutralität",
    Oeffentliche: "Öffentliche",
    Oeffentlichen: "Öffentlichen",
    Oeffentlicher: "Öffentlicher",
    Oeffentlich: "Öffentlich",
    Oeffne: "Öffne",
    Oeffnen: "Öffnen",
    Oberflaecheneindruck: "Oberflächeneindruck",
    oeffentliche: "öffentliche",
    oeffentlichen: "öffentlichen",
    oeffentlicher: "öffentlicher",
    oeffentlich: "öffentlich",
    oeffne: "öffne",
    oeffnen: "öffnen",
    oeffnet: "öffnet",
    Oeffnet: "Öffnet",
    Praezision: "Präzision",
    prueft: "prüft",
    Pruefe: "Prüfe",
    pruefe: "prüfe",
    Raeumlich: "Räumlich",
    raeumlich: "räumlich",
    Realitaetsdruck: "Realitätsdruck",
    rueckbinden: "rückbinden",
    rueckgesetzt: "rückgesetzt",
    Saeuberung: "Säuberung",
    Saeuberungsprotokoll: "Säuberungsprotokoll",
    Saetze: "Sätze",
    schwaechere: "schwächere",
    Schwaechere: "Schwächere",
    schuetzen: "schützen",
    spaeter: "später",
    staerker: "stärker",
    Startgeraet: "Startgerät",
    ueber: "über",
    Ueber: "Über",
    uebergeben: "übergeben",
    ueberholt: "überholt",
    uebersteigt: "übersteigt",
    uebersetzt: "übersetzt",
    uebrig: "übrig",
    uebrigen: "übrigen",
    uebriggebliebene: "übriggebliebene",
    Ungueltige: "Ungültige",
    Ungueltiger: "Ungültiger",
    ungueltig: "ungültig",
    verfuegbar: "verfügbar",
    verhaelt: "verhält",
    verknuepfen: "verknüpfen",
    veroeffentlichen: "veröffentlichen",
    veraendert: "verändert",
    vervielfaeltigt: "vervielfältigt",
    vertrauenswuerdige: "vertrauenswürdige",
    vollstaendig: "vollständig",
    Waehrend: "Während",
    waehrend: "während",
    Waehlen: "Wählen",
    waehle: "wähle",
    waehlen: "wählen",
    waehlt: "wählt",
    weisse: "weiße",
    weiss: "weiß",
    Zuege: "Züge",
    zuege: "züge",
    zugaenglich: "zugänglich",
    zurueck: "zurück",
    Zurueck: "Zurück",
    zurueckdreht: "zurückdreht"
  };

  return String(value || "").replace(/\b[A-Za-z]+\b/g, (word) => replacements[word] || word);
}

function deadlineText(deadline) {
  if (!deadline) {
    return "ohne Timer";
  }
  const diff = Math.max(0, deadline - Date.now());
  const seconds = Math.ceil(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return germanize(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function button(label, action, className = "") {
  return `<button type="button" data-action="${action}" class="${className}">${label}</button>`;
}

function currentOrigin() {
  return window.location.origin;
}

function isPublicDeployment() {
  return currentOrigin() === PUBLIC_APP_URL;
}

function isUnsupportedStaticOrigin() {
  const { protocol, hostname } = window.location;
  return protocol === "file:" || hostname.endsWith("github.io");
}

function renderStaticBlocker() {
  root.innerHTML = germanize(`
    <section class="hero">
      <div>
        <p class="eyebrow">Falsche Instanz</p>
        <h1 class="title">Diese Version ist nur eine statische Vorschau</h1>
        <p class="lead">Hier laeuft keine Spiel-API. Raumanlage, Join, Solo-Modus und Reset funktionieren nur auf einem lokal gestarteten oder richtig deployten Spielserver.</p>
      </div>
      <div class="hero-actions">
        <div class="meta-list">
          <span class="meta-badge">Aktuell geoeffnet: ${escapeHtml(currentOrigin())}</span>
          <span class="meta-badge">GitHub-/statische Version erkannt</span>
          <span class="meta-badge">Ohne Backend nicht spielbar</span>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="danger-note">
        <strong>Diese Seite ist absichtlich gesperrt.</strong>
        <p>Oeffne stattdessen direkt die spielbare Live-Version:</p>
        <p><a class="linkbox" href="${PUBLIC_APP_URL}" target="_blank" rel="noreferrer">${PUBLIC_APP_URL}</a></p>
        <p>Nur fuer lokale Entwicklung gilt alternativ weiter <code>http://localhost:8787</code>.</p>
      </div>
    </section>
  `);
}

function renderLanding() {
  if (isUnsupportedStaticOrigin()) {
    renderStaticBlocker();
    return;
  }
  root.innerHTML = germanize(`
    <section class="hero">
      <div>
        <p class="eyebrow">Synchronisierte Lernlandschaft fuer "Die echtere Wirklichkeit"</p>
        <h1 class="title">Aletheia Wirklichkeitslabor</h1>
        <p class="lead">Ein Solo- und Mehrgeraete-Rollenspiel mit Host-, Player- und Board-Modus. Du kannst allein gegen einen digitalen Systempartner spielen oder zu zweit auf getrennten Endgeraeten, waehrend die Engine mit Live-Feeds, privaten Zuschriften, Eingriffsereignissen und synchronisierten Phasen den Verlauf laufend veraendert.</p>
        <div class="chip-row">
          <button type="button" class="chip-button" data-action="jump-create">Host-Modus wählen</button>
          <button type="button" class="chip-button" data-action="jump-solo">Solo-Modus wählen</button>
          <button type="button" class="chip-button" data-action="jump-join">Spieler*in wählen</button>
          <button type="button" class="chip-button" data-action="jump-board">Board wählen</button>
          <button type="button" class="chip-button" data-action="jump-system">Spielprinzip ansehen</button>
        </div>
      </div>
      <div class="hero-actions">
        <div class="meta-list">
          <span class="meta-badge">${isPublicDeployment() ? "Oeffentliche Live-Version" : "Lokal oder per Deploy erreichbar"}</span>
          <span class="meta-badge">Solo oder zwei Endgeraete + optionales Board</span>
          <span class="meta-badge">Raumcode + Live-Synchronisierung</span>
          <span class="meta-badge">${BUILD_ID}</span>
          <span class="meta-badge">${state.backendReady === false ? "API nicht erreichbar" : state.backendReady === true ? "API bereit" : "API wird geprüft"}</span>
          <span class="meta-badge">Aktuelle URL: ${escapeHtml(currentOrigin())}</span>
        </div>
        ${state.error ? `<div class="danger-note">${escapeHtml(state.error)}</div>` : ""}
      </div>
    </section>

    <section class="panel">
      <div class="danger-note">
        <strong>Wichtig: Alle Geraete muessen dieselbe Server-URL verwenden.</strong>
        <p>Aktuelle Adresse: <a class="linkbox" href="${escapeHtml(currentOrigin())}" target="_blank" rel="noreferrer">${escapeHtml(currentOrigin())}</a></p>
        <p>${isPublicDeployment() ? `Fuer Unterricht mit mehreren Endgeraeten reicht jetzt genau diese eine Live-URL: <code>${PUBLIC_APP_URL}</code>.` : "Lokal ist das meist <code>http://192.168.1.207:8787</code>. Auf der oeffentlichen Web-Version ist es stattdessen die normale <code>https://...</code>-Adresse."}</p>
      </div>
    </section>

    <section class="panel image-stage" aria-label="Byproxy-Bild">
      <div class="image-stage-media">
        <img src="./assets/byproxy.jpg" alt="Byproxy im Rollstuhl" class="stage-image">
      </div>
      <div class="image-stage-overlay">
        <div class="image-stage-copy">
          <p class="eyebrow">Visuelle Leitfigur</p>
          <h2 class="section-title">Byproxy zwischen Beobachtung, Verletzlichkeit und Deutungsmacht</h2>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="section-head">
        <div>
          <h2 class="section-title">Zugang waehlen</h2>
          <p class="subtle">Ein Raum wird einmal angelegt und danach ueber einen Raumcode oder direkte Links betreten.</p>
        </div>
      </div>
      <div class="mode-grid">
        <div class="mode-card" id="create-card">
          <h3>Spielraum anlegen</h3>
          <p>Ein Geraet startet den Raum und erhaelt Host-Rechte. Danach koennen Join-Links fuer Spieler*in A, Spieler*in B und Board verteilt werden.</p>
          <form id="create-room-form" class="stack">
            <label class="field">
              Teamname
              <input type="text" name="teamName" value="${escapeHtml(state.createDraft.teamName)}" placeholder="z. B. Gruppe Aletheia 3A">
            </label>
            <label class="field">
              Klasse / Kurs
              <input type="text" name="className" value="${escapeHtml(state.createDraft.className)}" placeholder="z. B. Gym 3A">
            </label>
            <label class="field">
              Runden
              <select name="roundLimit">
                ${[4, 5, 6, 7, 8].map((count) => `<option value="${count}" ${Number(state.createDraft.roundLimit) === count ? "selected" : ""}>${count}</option>`).join("")}
              </select>
            </label>
            <button type="submit">Raum anlegen</button>
          </form>
        </div>

        <div class="mode-card" id="solo-card">
          <h3>Alleine spielen</h3>
          <p>Ein einzelnes Geraet startet direkt in die Partie. Du spielst gegen einen Systempartner, der im Hintergrund eigene Fragmente, Deutungen, Doktrinen und Interventionen setzt.</p>
          <form id="solo-room-form" class="stack">
            <label class="field">
              Teamname
              <input type="text" name="teamName" value="${escapeHtml(state.createDraft.teamName)}" placeholder="z. B. Solo Aletheia">
            </label>
            <label class="field">
              Name
              <input type="text" name="playerName" value="${escapeHtml(state.createDraft.playerName)}" placeholder="z. B. Mia">
            </label>
            <label class="field">
              Klasse / Kurs
              <input type="text" name="className" value="${escapeHtml(state.createDraft.className)}" placeholder="z. B. Gym 3A">
            </label>
            <label class="field">
              Runden
              <select name="roundLimit">
                ${[4, 5, 6, 7, 8].map((count) => `<option value="${count}" ${Number(state.createDraft.roundLimit) === count ? "selected" : ""}>${count}</option>`).join("")}
              </select>
            </label>
            <button type="submit" class="secondary">Solo-Partie starten</button>
          </form>
        </div>

        <div class="mode-card" id="join-card">
          <h3>Als Spieler*in beitreten</h3>
          <p>Jedes Endgeraet bekommt eine eigene private Rolle, Inbox und Eingabemaske. Beide Geraete sehen dieselbe gemeinsame Lage, aber unterschiedliche Handlungsauftraege.</p>
          <form id="join-room-form" class="stack">
            <label class="field">
              Raumcode
              <input type="text" name="roomId" value="${escapeHtml(state.joinDraft.roomId)}" placeholder="z. B. A7KQ3">
            </label>
            <label class="field">
              Sitz
              <select name="seat">
                <option value="A" ${state.joinDraft.seat === "A" ? "selected" : ""}>Spieler*in A</option>
                <option value="B" ${state.joinDraft.seat === "B" ? "selected" : ""}>Spieler*in B</option>
              </select>
            </label>
            <label class="field">
              Name
              <input type="text" name="name" value="${escapeHtml(state.joinDraft.name)}" placeholder="Name auf diesem Geraet">
            </label>
            <button type="submit" class="secondary">Als Spieler*in beitreten</button>
          </form>
        </div>

        <div class="mode-card" id="board-card">
          <h3>Board / Beamer oeffnen</h3>
          <p>Der Board-Modus zeigt die gemeinsame Szene, Metriken und den oeffentlichen Feed, aber keine privaten Rollen oder geheimen Karten.</p>
          <form id="board-room-form" class="stack">
            <label class="field">
              Raumcode
              <input type="text" name="roomId" value="${escapeHtml(state.joinDraft.roomId)}" placeholder="z. B. A7KQ3">
            </label>
            <button type="submit" class="ghost">Board verbinden</button>
          </form>
        </div>
      </div>
    </section>

    <section class="panel" id="system-card">
      <div class="section-head">
        <div>
          <h2 class="section-title">Spielprinzip</h2>
          <p class="subtle">Die Modi sind Host, Solo, Spieler*in und Board. Die Schnellwahl oben springt direkt in den passenden Bereich.</p>
        </div>
      </div>
      <div class="dual-grid">
        <article class="archive-card">
          <strong>Host</strong>
          <p>Legt den Raum an, verteilt Links und steuert den Start der Partie.</p>
        </article>
        <article class="archive-card">
          <strong>Spieler*in</strong>
          <p>Tritt mit eigenem Geraet bei und bekommt eine private Rolle, Inbox und verdeckte Aktionen.</p>
        </article>
        <article class="archive-card">
          <strong>Solo</strong>
          <p>Startet direkt gegen einen digitalen Systempartner, der jede Runde mit eigenen verdeckten Zuegen beantwortet.</p>
        </article>
        <article class="archive-card">
          <strong>Board</strong>
          <p>Zeigt die gemeinsame Lage fuer Beamer oder Begleitgeraet ohne geheime Informationen.</p>
        </article>
        <article class="archive-card">
          <strong>Mechanik</strong>
          <p>Werwolf-Verdacht, Secret-Hitler-Doktrinen, Dixit-Deutung und eine reaktive Systemengine greifen zusammen.</p>
        </article>
      </div>
    </section>

    <p class="footer-note">${BUILD_ID} | Wenn ein Endgeraet die URL des Host-Geraets im selben WLAN oeffnet, wird die Partie live synchronisiert.</p>
  `);
}

function renderNav() {
  const tabs = [
    ["live", "Live-Spiel"],
    ["archive", "Figurenarchiv"],
    ["system", "Systemlogik"],
    ["teacher", "Lehrkraft"]
  ];
  return `
    <aside class="nav-tabs">
      ${tabs.map(([id, label]) => `<button type="button" class="tab-button ${state.uiTab === id ? "active" : ""}" data-tab="${id}">${label}</button>`).join("")}
      <div class="panel" style="margin-top:12px; padding:14px;">
        <strong>${escapeHtml(state.snapshot.teamName || "Aletheia")}</strong>
        <p class="subtle">Raumcode: <strong>${escapeHtml(state.roomId)}</strong></p>
        <p class="pulse ${state.connection === "live" ? "" : "offline"}">${state.connection === "live" ? "synchronisiert" : state.connection === "connecting" ? "verbinde..." : "Verbindung instabil"}</p>
        <div class="chip-row" style="margin-top:10px;">
          <span class="chip">Runde ${state.snapshot.round} / ${state.snapshot.roundLimit}</span>
          <span class="chip">${escapeHtml(state.snapshot.shared.phaseTitle)}</span>
        </div>
      </div>
    </aside>
  `;
}

function renderMetricBars(metrics) {
  return `
    <div class="metric-strip">
      ${renderMetric("Realitaetsdruck", metrics.druck, "pressure")}
      ${renderMetric("Ambiguitaet", metrics.ambig, "ambiguity")}
      ${renderMetric("Vertrauen", metrics.vertrauen, "trust")}
      ${renderMetric("Enthuellung", metrics.revelation, "revelation")}
    </div>
  `;
}

function renderMetric(label, value, variant) {
  return `
    <div class="metric">
      <div class="metric-head"><span>${label}</span><strong>${value}</strong></div>
      <div class="bar ${variant}"><span style="width:${value}%"></span></div>
    </div>
  `;
}

function baseLinks() {
  const origin = window.location.origin;
  return {
    playerA: `${origin}/?mode=player&room=${state.roomId}&seat=A`,
    playerB: `${origin}/?mode=player&room=${state.roomId}&seat=B`,
    board: `${origin}/?mode=board&room=${state.roomId}`
  };
}

function renderSharedBoard() {
  const { shared, seats } = state.snapshot;
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Gemeinsame Lage</p>
          <h2 class="section-title">${escapeHtml(shared.title)}</h2>
          <p class="lead">${escapeHtml(shared.teaser)}</p>
        </div>
        <div>
          <div class="phase-chip">${escapeHtml(shared.phaseTitle)}</div>
          <p class="deadline">Restzeit: <span data-deadline="${shared.deadline || ""}">${deadlineText(shared.deadline)}</span></p>
        </div>
      </div>
      <div class="dual-grid">
        <div class="status-banner">
          <div>
            <strong>Einsatz der Runde</strong>
            <p>${escapeHtml(shared.stakes)}</p>
          </div>
          <div class="chip-row">
            ${shared.tags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}
          </div>
          ${shared.interrupt ? `<div class="danger-note"><strong>${escapeHtml(shared.interrupt.title)}</strong><p>${escapeHtml(shared.interrupt.text)}</p></div>` : ""}
          <div class="system-note"><strong>Phasenauftrag</strong><p>${escapeHtml(shared.phaseText)}</p></div>
        </div>
        <div class="panel" style="padding:16px;">
          <div class="section-head">
            <h3 class="section-title">Teamstatus</h3>
            <p class="subtle">${escapeHtml(seats.A.name)} / ${escapeHtml(seats.B.name)}</p>
          </div>
          ${renderMetricBars(state.snapshot.metrics)}
          <div class="kpi-grid" style="margin-top:16px;">
            <div class="kpi-card"><strong>Absolutheit</strong><div class="kpi-value">${state.snapshot.doctrineTracks.absolut}</div></div>
            <div class="kpi-card"><strong>Nebel</strong><div class="kpi-value">${state.snapshot.doctrineTracks.nebel}</div></div>
            <div class="kpi-card"><strong>Vermittlung</strong><div class="kpi-value">${state.snapshot.doctrineTracks.vermittlung}</div></div>
            <div class="kpi-card"><strong>Aktion</strong><div class="kpi-value">${state.snapshot.doctrineTracks.aktion}</div></div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderFeed(title, items, emptyText) {
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <h2 class="section-title">${title}</h2>
          <p class="subtle">Zeitkritische Systemmeldungen und Archivspur.</p>
        </div>
      </div>
      <div class="feed-list">
        ${items.length ? items.map((item) => `
          <article class="feed-card">
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.text)}</p>
            <div class="feed-meta">${escapeHtml(formatTime(item.createdAt))}</div>
          </article>
        `).join("") : `<div class="empty">${emptyText}</div>`}
      </div>
    </section>
  `;
}

function soloPhaseCopy(taskType) {
  const map = {
    "fragment-submit": {
      title: "Du setzt das erste Signal",
      text: "Waehle dein Fragment und sende einen Bildsatz. Danach antwortet der Systempartner verdeckt mit einem eigenen Deutungsimpuls."
    },
    "fragment-guess": {
      title: "Die Maschine hat bereits geantwortet",
      text: "Der Systempartner hat ein Gegenfragment gesetzt. Lies seinen Hinweis als ideologische Spur und ordne ihn einer Achse zu."
    },
    "doctrine-discard": {
      title: "Du verengst den Doktrinraum",
      text: "Streiche eine Karte aus dem Spiel. Der Systempartner setzt danach sofort die uebrig gebliebene Linie und verschiebt die Metriken."
    },
    response: {
      title: "Verdacht gegen Gegenkraft",
      text: "Markiere Schattenakteur, Vertrauensfigur und Eingriff. Der Systempartner meldet im Anschluss seine verdeckte Gegenmassnahme."
    },
    reflection: {
      title: "Letzte Deutung der Runde",
      text: "Deine Reflexion schliesst die Runde nicht allein ab: Danach schreibt auch der Systempartner seine Lesart ins Protokoll."
    },
    lobby: {
      title: "Solo-Partie bereit",
      text: "Die Engine hat Rollen und Gegenspiel vorbereitet. Sobald die Runde startet, antwortet der Systempartner automatisch in jeder Phase."
    },
    interlude: {
      title: "Zwischenstand lesen",
      text: "Die Runde ist archiviert. Pruefe, wie stark der Systempartner Druck, Ambiguitaet und Vertrauen verschoben hat."
    },
    finished: {
      title: "Finale Auswertung",
      text: "Die Solo-Partie ist abgeschlossen. Vergleiche dein Missionsziel mit dem Verlauf der Gegenkraft im Archiv."
    }
  };
  return map[taskType] || {
    title: "Systempartner aktiv",
    text: "Die Engine reagiert nicht bloss dekorativ, sondern setzt verdeckte Gegenzuege und schreibt den weiteren Verlauf mit."
  };
}

function renderSoloDuelPanel() {
  const actor = state.snapshot.actor || {};
  const task = actor.task || {};
  const copy = soloPhaseCopy(task.type || state.snapshot.phase);
  return `
    <section class="panel solo-stage">
      <div class="section-head">
        <div>
          <p class="eyebrow">Solo-Duell</p>
          <h2 class="section-title">Du gegen ${escapeHtml(actor.systemPartner || "Systempartner")}</h2>
          <p class="subtle">Die Partie spielt sich als asymmetrischer Konflikt zwischen deinem Briefing und einer verdeckten digitalen Gegenlogik.</p>
        </div>
        <div class="solo-phase-badge">${escapeHtml(state.snapshot.shared.phaseTitle)}</div>
      </div>
      <div class="solo-duel-grid">
        <article class="solo-actor-card solo-player">
          <span class="solo-label">Deine Seite</span>
          <h3>${escapeHtml(actor.name || "Solo-Spieler*in")}</h3>
          <p>Du steuerst Auswahl, Verdacht, Intervention und Enddeutung direkt.</p>
        </article>
        <article class="solo-actor-card solo-system">
          <span class="solo-label">Digitale Gegenkraft</span>
          <h3>${escapeHtml(actor.systemPartner || "Systempartner")}</h3>
          <p>Die Engine waehlt verdeckt Fragmente, Doktrinen und Eingriffe und verschiebt dadurch den Verlauf.</p>
        </article>
      </div>
      <div class="solo-directive">
        <strong>${escapeHtml(copy.title)}</strong>
        <p>${escapeHtml(copy.text)}</p>
      </div>
    </section>
  `;
}

function renderSoloPartnerPanel() {
  const actor = state.snapshot.actor || {};
  const task = actor.task || {};
  const copy = soloPhaseCopy(task.type || state.snapshot.phase);
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <h2 class="section-title">Systempartner-Logik</h2>
          <p class="subtle">Was die Gegenkraft in dieser Phase tut und warum der Solo-Modus nicht nur eine Ein-Personen-Kopie ist.</p>
        </div>
      </div>
      <div class="stack">
        <div class="status-banner">
          <div>
            <strong>Aktuelle Gegenbewegung</strong>
            <p>${escapeHtml(copy.text)}</p>
          </div>
          <div class="chip-row">
            <span class="chip">Rolle: verdeckter Mitspieler</span>
            <span class="chip">Antwortet automatisch</span>
            <span class="chip">Metriken werden live verschoben</span>
          </div>
        </div>
        <div class="dual-grid">
          <article class="archive-card">
            <strong>Wie der Systempartner spielt</strong>
            <p>Er liest Szenentags, dominante Doktrinen, Druck- und Vertrauenswerte und erzeugt daraus eigene Gegenzuege.</p>
          </article>
          <article class="archive-card">
            <strong>Worauf du achten solltest</strong>
            <p>Die eigentliche Spannung liegt nicht nur in deiner Wahl, sondern darin, wie die Engine dieselbe Lage gegen deine Lesart zurueckdreht.</p>
          </article>
        </div>
      </div>
    </section>
  `;
}

function renderPlayerTask() {
  const task = state.snapshot.actor?.task;
  if (!task) {
    return `<section class="panel"><div class="empty">Keine private Aufgabe verfuegbar.</div></section>`;
  }
  const seatName = state.view === "solo"
    ? (state.snapshot.actor.name || "Solo-Spieler*in")
    : (state.snapshot.actor.name || `Spieler*in ${state.seat}`);
  let inner = "";
  if (task.type === "fragment-submit") {
    inner = `
      <form id="fragment-submit-form" class="stack">
        <div class="choice-list">
          ${task.hand.map((fragment) => `
            <label class="choice">
              <input type="radio" name="fragmentId" value="${fragment.id}" ${task.selection?.fragmentId === fragment.id ? "checked" : ""}>
              <strong>${escapeHtml(fragment.title)}</strong>
              <p>${escapeHtml(fragment.text)}</p>
            </label>
          `).join("")}
        </div>
        <label class="field">
          Hinweiswort oder kurzer Bildsatz
          <input type="text" name="clue" value="${escapeHtml(task.selection?.clue || "")}" placeholder="z. B. 'sauber, aber gefaehrlich'">
        </label>
        <button type="submit">Fragment senden</button>
      </form>
    `;
  } else if (task.type === "fragment-guess") {
    inner = `
      <form id="fragment-guess-form" class="stack">
        <div class="task-card">
          <h3>${escapeHtml(task.opponentFragment.title)}</h3>
          <p>${escapeHtml(task.opponentFragment.text)}</p>
          <p><strong>Hinweis:</strong> ${escapeHtml(task.clue)}</p>
        </div>
        <label class="field">
          Welche Achse steckt dahinter?
          <select name="axisId">
            <option value="">Bitte waehlen</option>
            ${task.axisOptions.map((axis) => `<option value="${axis.id}" ${task.guessAxis === axis.id ? "selected" : ""}>${escapeHtml(axis.title)}</option>`).join("")}
          </select>
        </label>
        <button type="submit">Deutung senden</button>
      </form>
    `;
  } else if (task.type === "doctrine-discard" || task.type === "doctrine-enact") {
    inner = `
      <form id="${task.type === "doctrine-discard" ? "doctrine-discard-form" : "doctrine-enact-form"}" class="stack">
        <div class="choice-list">
          ${task.hand.map((card) => `
            <label class="choice">
              <input type="radio" name="cardId" value="${card.id}" ${task.chosen === card.id ? "checked" : ""}>
              <strong>${escapeHtml(card.title)}</strong>
              <p>${escapeHtml(card.text)}</p>
              <p><strong>Familie:</strong> ${escapeHtml(card.family)}</p>
            </label>
          `).join("")}
        </div>
        <button type="submit">${task.type === "doctrine-discard" ? "Doktrin verwerfen" : "Doktrin setzen"}</button>
      </form>
    `;
  } else if (task.type === "response") {
    inner = `
      <form id="response-form" class="stack">
        <label class="field">
          Schattenakteur
          <select name="suspectId">
            <option value="">Bitte waehlen</option>
            ${task.suspectOptions.map((figure) => `<option value="${figure.id}" ${task.selection?.suspectId === figure.id ? "selected" : ""}>${escapeHtml(figure.name)}</option>`).join("")}
          </select>
        </label>
        <label class="field">
          Wem vertraust du in dieser Szene am ehesten?
          <select name="trustFigureId">
            <option value="">Bitte waehlen</option>
            ${task.trustOptions.map((figure) => `<option value="${figure.id}" ${task.selection?.trustFigureId === figure.id ? "selected" : ""}>${escapeHtml(figure.name)}</option>`).join("")}
          </select>
        </label>
        <div class="choice-list">
          ${task.moveOptions.map((move) => `
            <label class="choice">
              <input type="radio" name="moveId" value="${move.id}" ${task.selection?.moveId === move.id ? "checked" : ""}>
              <strong>${escapeHtml(move.title)}</strong>
              <p>${escapeHtml(move.text)}</p>
            </label>
          `).join("")}
        </div>
        <label class="field">
          <span>Ich glaube, mein Gegenueber verdeckt absichtlich etwas.</span>
          <input type="checkbox" name="accusePartner" ${task.selection?.accusePartner ? "checked" : ""}>
        </label>
        <button type="submit">Verdacht und Intervention senden</button>
      </form>
    `;
  } else if (task.type === "reflection") {
    inner = `
      <form id="reflection-form" class="stack">
        <label class="field">
          Kurze Deutung
          <textarea name="text" placeholder="2-5 Saetze">${escapeHtml(task.value || "")}</textarea>
        </label>
        <button type="submit">Reflexion archivieren</button>
      </form>
    `;
  } else {
    inner = `<div class="empty">${escapeHtml(task.text)}</div>`;
  }
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <h2 class="section-title">${state.view === "solo" ? `Deine Solo-Konsole: ${escapeHtml(seatName)}` : `Private Konsole von ${escapeHtml(seatName)}`}</h2>
          <p class="subtle">${escapeHtml(task.title)}</p>
        </div>
      </div>
      <div class="task-card">
        <h3>${escapeHtml(task.title)}</h3>
        <p>${escapeHtml(task.text)}</p>
      </div>
      ${inner}
    </section>
  `;
}

function renderMissionCard() {
  const mission = state.snapshot.actor?.mission;
  if (!mission) {
    return "";
  }
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <h2 class="section-title">${state.view === "solo" ? "Dein Einsatzprofil" : "Geheimes Briefing"}</h2>
          <p class="subtle">${state.view === "solo" ? "Dein Soloprofil gegen die digitale Gegenkraft." : "Nur auf diesem Endgeraet sichtbar."}</p>
        </div>
      </div>
      <div class="task-card">
        <h3>${escapeHtml(mission.title)}</h3>
        <p><strong>Rolle:</strong> ${escapeHtml(mission.role)}</p>
        <p><strong>Ziel:</strong> ${escapeHtml(mission.goal)}</p>
        <p><strong>Blinder Fleck:</strong> ${escapeHtml(mission.blindSpot)}</p>
      </div>
    </section>
  `;
}

function renderHostPanel() {
  const hidden = state.snapshot.actor?.hidden;
  const links = baseLinks();
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <h2 class="section-title">Host-Konsole</h2>
          <p class="subtle">Verteile die Links an die Endgeraete und beobachte den verborgenen Motor.</p>
        </div>
        <div class="button-row">
          ${state.snapshot.canStart ? button("Partie starten", "start-game") : ""}
          ${state.snapshot.canNextRound ? button("Naechste Runde", "next-round", "secondary") : ""}
          ${button("Reset", "restart-game", "warn")}
          ${button("Markdown exportieren", "export-markdown", "ghost")}
        </div>
      </div>
      <div class="stack">
        <div class="danger-note">
          <strong>Alle Endgeraete muessen exakt diese Server-URL verwenden.</strong>
          <p>Die Basisadresse lautet hier: <code>${escapeHtml(currentOrigin())}</code>. Lokal ist das meist eine <code>http://</code>-Adresse, bei einer oeffentlichen Web-Version eine <code>https://</code>-Adresse.</p>
        </div>
        <div class="connection-card">
          <strong>Join-Links</strong>
          <div class="stack" style="margin-top:12px;">
            <div class="linkline"><a class="linkbox" href="${escapeHtml(links.playerA)}" target="_blank" rel="noreferrer">${escapeHtml(links.playerA)}</a>${button("Link A kopieren", "copy-playerA", "ghost")}</div>
            <div class="linkline"><a class="linkbox" href="${escapeHtml(links.playerB)}" target="_blank" rel="noreferrer">${escapeHtml(links.playerB)}</a>${button("Link B kopieren", "copy-playerB", "ghost")}</div>
            <div class="linkline"><a class="linkbox" href="${escapeHtml(links.board)}" target="_blank" rel="noreferrer">${escapeHtml(links.board)}</a>${button("Board-Link kopieren", "copy-board", "ghost")}</div>
          </div>
        </div>
        <div class="dual-grid">
          <div class="status-card">
            <strong>Verbundene Sitze</strong>
            <p>A: ${state.snapshot.seats.A.joined ? "verbunden" : "offen"} | ${escapeHtml(state.snapshot.seats.A.name)}</p>
            <p>B: ${state.snapshot.seats.B.joined ? "verbunden" : "offen"} | ${escapeHtml(state.snapshot.seats.B.name)}</p>
          </div>
          <div class="status-card">
            <strong>Spielraum</strong>
            <p>Raumcode ${escapeHtml(state.roomId)} | ${escapeHtml(state.snapshot.teamName)}</p>
            <p>${escapeHtml(state.snapshot.className || "ohne Kursangabe")}</p>
          </div>
        </div>
        ${hidden ? `
          <div class="triple-grid">
            <div class="mini-card">
              <strong>Schattenakteur</strong>
              <p>${escapeHtml(hidden.shadowFigure)}</p>
            </div>
            <div class="mini-card">
              <strong>Nachtshift</strong>
              <p>D ${signed(hidden.nightShift.druck)}, A ${signed(hidden.nightShift.ambig)}, V ${signed(hidden.nightShift.vertrauen)}</p>
            </div>
            <div class="mini-card">
              <strong>Spielerstatus</strong>
              <p>Fragmente A/B: ${hidden.fragmentSubmitted.A ? "ja" : "nein"} / ${hidden.fragmentSubmitted.B ? "ja" : "nein"}</p>
            </div>
          </div>
        ` : ""}
      </div>
    </section>
  `;
}

function signed(value) {
  return value > 0 ? `+${value}` : `${value}`;
}

function renderLiveView() {
  if (state.view === "host") {
    return `
      <div class="surface">
        ${renderSharedBoard()}
        <div class="phase-grid">
          ${renderHostPanel()}
          ${renderFeed("Oeffentlicher Feed", state.snapshot.feed, "Noch keine Systemmeldungen.")} 
        </div>
      </div>
    `;
  }
  if (state.view === "solo") {
    return `
      <div class="surface">
        ${renderSoloDuelPanel()}
        ${renderSharedBoard()}
        <div class="phase-grid">
          <div class="surface">
            ${renderMissionCard()}
            ${renderPlayerTask()}
          </div>
          <div class="surface">
            ${renderSoloPartnerPanel()}
            ${renderFeed("Private Inbox", state.snapshot.actor?.privateFeed || [], "Noch keine privaten Zuschriften.")}
            ${renderFeed("Oeffentlicher Feed", state.snapshot.feed, "Noch keine oeffentlichen Meldungen.")}
          </div>
        </div>
      </div>
    `;
  }
  if (state.view === "player") {
    return `
      <div class="surface">
        ${renderSharedBoard()}
        <div class="phase-grid">
          <div class="surface">
            ${renderMissionCard()}
            ${renderPlayerTask()}
          </div>
          <div class="surface">
            ${renderFeed("Private Inbox", state.snapshot.actor?.privateFeed || [], "Noch keine privaten Zuschriften.")}
            ${renderFeed("Oeffentlicher Feed", state.snapshot.feed, "Noch keine oeffentlichen Meldungen.")}
          </div>
        </div>
      </div>
    `;
  }
  return `
    <div class="surface">
      ${renderSharedBoard()}
      <div class="phase-grid">
        ${renderFeed("Oeffentlicher Feed", state.snapshot.feed, "Noch keine Meldungen.")}
        ${renderHistoryPanel()}
      </div>
    </div>
  `;
}

function renderHistoryPanel() {
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <h2 class="section-title">Rundenarchiv</h2>
          <p class="subtle">Archivierte Szenen, Doktrinen und Reflexionen.</p>
        </div>
      </div>
      <div class="scroll">
        ${state.snapshot.history.length ? state.snapshot.history.map((entry) => `
          <article class="history-card">
            <strong>Runde ${entry.round}: ${escapeHtml(entry.title)}</strong>
            <p><strong>Doktrin:</strong> ${escapeHtml(entry.doctrine)}</p>
            <p><strong>Schattenakteur:</strong> ${escapeHtml(entry.shadowFigure)}</p>
            <p>${escapeHtml(entry.summary)}</p>
          </article>
        `).join("") : `<div class="empty">Noch keine abgeschlossene Runde.</div>`}
      </div>
    </section>
  `;
}

function renderArchiveTab() {
  return `
    <div class="surface">
      <section class="panel">
        <div class="section-head">
          <div>
            <h2 class="section-title">Figurenmatrix</h2>
            <p class="subtle">Verdichtet aus Factsheets, Lehreruebersicht, Figurenanalyse und Postertexten.</p>
          </div>
        </div>
        <div class="card-grid">
          ${state.snapshot.library.figures.map((figure) => `
            <article class="archive-card">
              <strong>${escapeHtml(figure.name)}</strong>
              <p><strong>Rolle:</strong> ${escapeHtml(figure.role)}</p>
              <p><strong>Mindset:</strong> ${escapeHtml(figure.mindset)}</p>
              <p><strong>Funktion:</strong> ${escapeHtml(figure.function)}</p>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="panel">
        <div class="section-head">
          <div>
            <h2 class="section-title">Interpretationsachsen</h2>
            <p class="subtle">Diese Konfliktlinien strukturieren Spiel und literarische Auswertung.</p>
          </div>
        </div>
        <div class="dual-grid">
          ${state.snapshot.library.axes.map((axis) => `
            <article class="archive-card">
              <strong>${escapeHtml(axis.title)}</strong>
              <p>${escapeHtml(axis.description)}</p>
            </article>
          `).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderSystemTab() {
  return `
    <div class="surface">
      <section class="panel">
        <div class="section-head">
          <div>
            <h2 class="section-title">Systemlogik</h2>
            <p class="subtle">Das Spiel reagiert nicht nur auf Eingaben, sondern auf Metrikschwellen und Schatteneffekte.</p>
          </div>
        </div>
        <div class="dual-grid">
          ${state.snapshot.library.mechanics.map((entry) => `
            <article class="archive-card">
              <strong>${escapeHtml(entry.title)}</strong>
              <p>${escapeHtml(entry.text)}</p>
            </article>
          `).join("")}
        </div>
      </section>
      ${renderHistoryPanel()}
    </div>
  `;
}

function renderTeacherTab() {
  return `
    <div class="surface">
      <section class="panel">
        <div class="section-head">
          <div>
            <h2 class="section-title">Lehrkraft-Notizen</h2>
            <p class="subtle">Einsatz, Auswertung und Differenzierung fuer den Unterricht.</p>
          </div>
        </div>
        <div class="dual-grid">
          ${state.snapshot.library.teacher.map((entry) => `
            <article class="archive-card">
              <strong>${escapeHtml(entry.title)}</strong>
              <p>${escapeHtml(entry.text)}</p>
            </article>
          `).join("")}
        </div>
      </section>
      ${state.snapshot.outcome ? `
        <section class="panel">
          <div class="section-head">
            <div>
              <h2 class="section-title">Endurteil</h2>
              <p class="subtle">Gemeinsames Ergebnis und individuelle Auftraege.</p>
            </div>
          </div>
          <div class="status-banner">
            <h3 class="status-phase">${escapeHtml(state.snapshot.outcome.headline)}</h3>
            <p>${escapeHtml(state.snapshot.outcome.verdict)}</p>
            <div class="dual-grid">
              <div class="task-card">
                <h3>${escapeHtml(state.snapshot.outcome.missionA.title)}</h3>
                <p>${state.snapshot.outcome.missionA.success ? "erfuellt" : "nicht erfuellt"}</p>
              </div>
              <div class="task-card">
                <h3>${escapeHtml(state.snapshot.outcome.missionB.title)}</h3>
                <p>${state.snapshot.outcome.missionB.success ? "erfuellt" : "nicht erfuellt"}</p>
              </div>
            </div>
          </div>
        </section>
      ` : ""}
    </div>
  `;
}

function renderConnected() {
  root.innerHTML = germanize(`
    <section class="hero">
      <div>
        <p class="eyebrow">${state.view === "host" ? "Host-Modus" : state.view === "player" ? `Privatmodus ${escapeHtml(state.seat)}` : state.view === "solo" ? "Solo-Modus" : "Board-Modus"}</p>
        <h1 class="title">${escapeHtml(state.snapshot.teamName || "Aletheia")}</h1>
        <p class="lead">${state.view === "solo" ? `Einzelpartie gegen ${escapeHtml(state.snapshot.actor?.systemPartner || "den Systempartner")}. Jede deiner Entscheidungen wird sofort von einer verdeckten digitalen Gegenlogik beantwortet.` : escapeHtml(state.snapshot.className || "Synchronisierte Mehrgeraete-Partie")}</p>
        <div class="chip-row">
          <span class="chip">Raum ${escapeHtml(state.roomId)}</span>
          <span class="chip">${escapeHtml(state.snapshot.shared.phaseTitle)}</span>
          <span class="chip">Runde ${state.snapshot.round} / ${state.snapshot.roundLimit}</span>
        </div>
      </div>
      <div class="hero-actions">
        <div class="meta-list">
          <span class="meta-badge">Sitz A: ${state.snapshot.seats.A.joined ? escapeHtml(state.snapshot.seats.A.name) : "offen"}</span>
          <span class="meta-badge">Sitz B: ${state.snapshot.seats.B.joined ? escapeHtml(state.snapshot.seats.B.name) : "offen"}</span>
          ${state.view === "solo" ? `<span class="meta-badge">Systempartner aktiv</span>` : ""}
          <span class="meta-badge">${state.connection === "live" ? "Live synchronisiert" : state.connection === "connecting" ? "Verbindung wird aufgebaut" : "Verbindung instabil"}</span>
        </div>
        <div class="button-row">
          ${button("Zur Startseite", "go-home", "ghost")}
          ${button("Neu laden", "refresh", "ghost")}
          ${state.view === "host" || state.view === "solo" ? button("Reset", "restart-game", "warn") : ""}
          ${button("JSON exportieren", "export-json", "ghost")}
        </div>
        ${state.error ? `<div class="danger-note">${escapeHtml(state.error)}</div>` : ""}
      </div>
    </section>

    <div class="layout">
      ${renderNav()}
      <section class="surface">
        ${state.uiTab === "live" ? renderLiveView() : ""}
        ${state.uiTab === "archive" ? renderArchiveTab() : ""}
        ${state.uiTab === "system" ? renderSystemTab() : ""}
        ${state.uiTab === "teacher" ? renderTeacherTab() : ""}
      </section>
    </div>
    <p class="footer-note">${BUILD_ID} | Alle Inhalte bleiben lokal im Klassennetz auf dem gestarteten Server. Keine externen Dienste.</p>
  `);
}

function render() {
  saveSession();
  if (state.view === "landing" || !state.roomId || !state.snapshot) {
    renderLanding();
    return;
  }
  renderConnected();
}

function renderConnectionOnly() {
  const pulses = root.querySelectorAll("[data-deadline]");
  pulses.forEach((node) => {
    node.textContent = deadlineText(Number(node.dataset.deadline) || null);
  });
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportJson() {
  if (!state.snapshot) {
    return;
  }
  download(`aletheia-${state.roomId}.json`, JSON.stringify(state.snapshot, null, 2), "application/json");
}

function exportMarkdown() {
  if (!state.snapshot) {
    return;
  }
  const lines = [
    `# Aletheia Wirklichkeitslabor`,
    ``,
    `- Raumcode: ${state.roomId}`,
    `- Team: ${state.snapshot.teamName}`,
    `- Klasse/Kurs: ${state.snapshot.className || "-"}`,
    `- Runde: ${state.snapshot.round} / ${state.snapshot.roundLimit}`,
    ``,
    `## Endstand`,
    `- Realitaetsdruck: ${state.snapshot.metrics.druck}`,
    `- Ambiguitaet: ${state.snapshot.metrics.ambig}`,
    `- Vertrauen: ${state.snapshot.metrics.vertrauen}`,
    `- Enthuellung: ${state.snapshot.metrics.revelation}`,
    ``
  ];
  if (state.snapshot.outcome) {
    lines.push(`## Urteil`);
    lines.push(`**${state.snapshot.outcome.headline}**`);
    lines.push(``);
    lines.push(state.snapshot.outcome.verdict);
    lines.push(``);
  }
  lines.push(`## Rundenarchiv`);
  state.snapshot.history.slice().reverse().forEach((entry) => {
    lines.push(`### Runde ${entry.round}: ${entry.title}`);
    lines.push(`- Doktrin: ${entry.doctrine}`);
    lines.push(`- Schattenakteur: ${entry.shadowFigure}`);
    lines.push(`- Zusammenfassung: ${entry.summary}`);
    lines.push(`- Reflexion A: ${entry.reflectionA || "-"}`);
    lines.push(`- Reflexion B: ${entry.reflectionB || "-"}`);
    lines.push(``);
  });
  download(`aletheia-${state.roomId}.md`, lines.join("\n"), "text/markdown;charset=utf-8");
}

async function copyLink(kind) {
  const links = baseLinks();
  await navigator.clipboard.writeText(links[kind]);
}

function clearSession() {
  closeStream();
  state.view = "landing";
  state.roomId = "";
  state.seat = "";
  state.token = "";
  state.hostToken = "";
  state.snapshot = null;
  state.error = "";
  render();
}

function jumpToCard(id, focusSelector) {
  const target = document.getElementById(id);
  if (!target) {
    return;
  }
  document.querySelectorAll(".mode-card, .panel").forEach((node) => {
    node.classList.remove("highlight");
  });
  target.classList.add("highlight");
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  if (focusSelector) {
    window.setTimeout(() => {
      const field = target.querySelector(focusSelector);
      field?.focus();
    }, 220);
  }
}

window.addEventListener("beforeunload", () => {
  closeStream();
});

document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action], [data-tab]");
  if (!target) {
    return;
  }
  if (target.dataset.tab) {
    state.uiTab = target.dataset.tab;
    saveSession();
    render();
    return;
  }
  const action = target.dataset.action;
  if (action === "go-home") {
    clearSession();
    return;
  }
  if (action === "jump-create") {
    jumpToCard("create-card", 'input[name="teamName"]');
    return;
  }
  if (action === "jump-solo") {
    jumpToCard("solo-card", 'input[name="playerName"]');
    return;
  }
  if (action === "jump-join") {
    jumpToCard("join-card", 'input[name="roomId"]');
    return;
  }
  if (action === "jump-board") {
    jumpToCard("board-card", 'input[name="roomId"]');
    return;
  }
  if (action === "jump-system") {
    jumpToCard("system-card");
    return;
  }
  if (action === "refresh") {
    await fetchSnapshot();
    return;
  }
  if (action === "start-game") {
    await sendAction("start-game");
    return;
  }
  if (action === "next-round") {
    await sendAction("next-round");
    return;
  }
  if (action === "restart-game") {
    await sendAction("restart-game");
    return;
  }
  if (action === "export-json") {
    exportJson();
    return;
  }
  if (action === "export-markdown") {
    exportMarkdown();
    return;
  }
  if (action === "copy-playerA") {
    await copyLink("playerA");
    return;
  }
  if (action === "copy-playerB") {
    await copyLink("playerB");
    return;
  }
  if (action === "copy-board") {
    await copyLink("board");
  }
});

document.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  if (form.id === "create-room-form") {
    const data = new FormData(form);
    state.createDraft = {
      teamName: String(data.get("teamName") || ""),
      className: String(data.get("className") || ""),
      playerName: state.createDraft.playerName,
      roundLimit: Number(data.get("roundLimit") || 6)
    };
    await createRoom();
    return;
  }
  if (form.id === "solo-room-form") {
    const data = new FormData(form);
    state.createDraft = {
      teamName: String(data.get("teamName") || ""),
      className: String(data.get("className") || ""),
      playerName: String(data.get("playerName") || ""),
      roundLimit: Number(data.get("roundLimit") || 6)
    };
    await createSoloGame();
    return;
  }
  if (form.id === "join-room-form") {
    const data = new FormData(form);
    state.joinDraft = {
      roomId: String(data.get("roomId") || "").toUpperCase(),
      seat: String(data.get("seat") || "A"),
      name: String(data.get("name") || "")
    };
    await joinRoom();
    return;
  }
  if (form.id === "board-room-form") {
    const data = new FormData(form);
    state.joinDraft.roomId = String(data.get("roomId") || "").toUpperCase();
    await openBoard();
    return;
  }
  if (form.id === "fragment-submit-form") {
    const data = new FormData(form);
    await sendAction("fragment-submit", {
      fragmentId: String(data.get("fragmentId") || ""),
      clue: String(data.get("clue") || "")
    });
    return;
  }
  if (form.id === "fragment-guess-form") {
    const data = new FormData(form);
    await sendAction("fragment-guess", {
      axisId: String(data.get("axisId") || "")
    });
    return;
  }
  if (form.id === "doctrine-discard-form") {
    const data = new FormData(form);
    await sendAction("doctrine-discard", {
      cardId: String(data.get("cardId") || "")
    });
    return;
  }
  if (form.id === "doctrine-enact-form") {
    const data = new FormData(form);
    await sendAction("doctrine-enact", {
      cardId: String(data.get("cardId") || "")
    });
    return;
  }
  if (form.id === "response-form") {
    const data = new FormData(form);
    await sendAction("response-submit", {
      suspectId: String(data.get("suspectId") || ""),
      trustFigureId: String(data.get("trustFigureId") || ""),
      moveId: String(data.get("moveId") || ""),
      accusePartner: data.get("accusePartner") === "on"
    });
    return;
  }
  if (form.id === "reflection-form") {
    const data = new FormData(form);
    await sendAction("reflection-submit", {
      text: String(data.get("text") || "")
    });
  }
});

setInterval(() => {
  renderConnectionOnly();
}, 1000);

loadSession();
applyUrlHints();
saveSession();

checkBackend().then(render);

if (state.roomId && state.view !== "landing") {
  fetchSnapshot().then(connectStream);
} else {
  render();
}
