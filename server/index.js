import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';
import { verifyFirebaseIdToken } from './lib/firebaseAdmin.js';
import { createGameServer } from './lib/gameServer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const STATIC_ROOT = path.resolve(__dirname, '..', 'game-project');

const app = express();
app.disable('x-powered-by');
app.use(express.static(STATIC_ROOT, { extensions: ['html'] }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const game = createGameServer();

function sanitizeGuestProfile(guest) {
  if (!guest || typeof guest !== 'object') return null;
  const rawId = typeof guest.id === 'string' ? guest.id : '';
  const rawName = typeof guest.name === 'string' ? guest.name : '';
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
  const name = rawName.replace(/[^\w\s-]/g, '').trim().slice(0, 24);
  if (!id) return null;
  return {
    playerId: id,
    profile: {
      name: name || `Guest-${id.slice(-4)}`,
      guest: true
    }
  };
}

wss.on('connection', (ws, req) => {
  let authed = false;
  let playerId = null;
  let roomId = null;

  ws.on('message', async (data) => {
    let msg;
    try {
      msg = JSON.parse(String(data));
    } catch {
      return;
    }

    if (!authed) {
      if (!msg || msg.t !== 'auth') {
        ws.close(1008, 'auth_required');
        return;
      }

      if (typeof msg.token === 'string' && msg.token) {
        try {
          const decoded = await verifyFirebaseIdToken(msg.token);
          authed = true;
          playerId = decoded.uid;
          roomId = typeof msg.room === 'string' && msg.room ? msg.room : 'lobby';

          const profile = { name: decoded.name || decoded.email || decoded.uid };
          game.join({ ws, playerId, roomId, profile });
          ws.send(JSON.stringify({ t: 'welcome', playerId, roomId, profile, serverTime: Date.now() }));
        } catch {
          ws.close(1008, 'invalid_token');
        }
        return;
      }

      const guestIdentity = sanitizeGuestProfile(msg.guest);
      if (!guestIdentity) {
        ws.close(1008, 'invalid_guest');
        return;
      }

      authed = true;
      playerId = guestIdentity.playerId;
      roomId = typeof msg.room === 'string' && msg.room ? msg.room : 'lobby';
      game.join({ ws, playerId, roomId, profile: guestIdentity.profile });
      ws.send(JSON.stringify({
        t: 'welcome',
        playerId,
        roomId,
        profile: guestIdentity.profile,
        serverTime: Date.now()
      }));
      return;
    }

    game.onMessage({ ws, playerId, roomId, msg });
  });

  ws.on('close', () => {
    if (authed && playerId && roomId) game.leave({ playerId, roomId });
  });
});

server.listen(PORT, HOST, () => {
  const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`Server running: http://${displayHost}:${PORT}`);
  console.log(`WebSocket: ws://${displayHost}:${PORT}/ws`);
});
