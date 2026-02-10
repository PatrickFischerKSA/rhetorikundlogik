const path = require('path');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = new Map();

function getRoom(code) {
  if (!rooms.has(code)) {
    rooms.set(code, {
      code,
      clients: new Map(),
      state: null,
      hostId: null,
      updatedAt: Date.now()
    });
  }
  return rooms.get(code);
}

function broadcast(room, message, exceptId = null) {
  const data = JSON.stringify(message);
  for (const [clientId, ws] of room.clients.entries()) {
    if (clientId === exceptId) continue;
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

function cleanupRooms() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (room.clients.size === 0 && now - room.updatedAt > 1000 * 60 * 30) {
      rooms.delete(code);
    }
  }
}

setInterval(cleanupRooms, 1000 * 60 * 5);

wss.on('connection', (ws) => {
  let room = null;
  let clientId = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === 'join') {
      const { code, id, asHost } = msg;
      room = getRoom(code);
      clientId = id;
      room.clients.set(id, ws);
      room.updatedAt = Date.now();
      if (asHost || !room.hostId) room.hostId = id;

      ws.send(JSON.stringify({
        type: 'joined',
        code: room.code,
        hostId: room.hostId,
        state: room.state
      }));

      broadcast(room, { type: 'presence', id, joined: true }, id);
      return;
    }

    if (!room) return;

    if (msg.type === 'state') {
      if (room.hostId !== clientId) return;
      room.state = msg.state;
      room.updatedAt = Date.now();
      broadcast(room, { type: 'state', state: msg.state }, clientId);
      return;
    }

    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', t: Date.now() }));
      return;
    }
  });

  ws.on('close', () => {
    if (room && clientId) {
      room.clients.delete(clientId);
      room.updatedAt = Date.now();
      if (room.hostId === clientId) {
        // promote first remaining client to host
        const next = room.clients.keys().next().value || null;
        room.hostId = next;
        if (next) broadcast(room, { type: 'host', hostId: next });
      }
      broadcast(room, { type: 'presence', id: clientId, joined: false }, clientId);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running at http://localhost:${PORT}`);
});
