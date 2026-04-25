const TICK_MS = 50; // 20Hz snapshots

function safeSend(ws, obj) {
  if (!ws || ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(obj));
}

export function createGameServer() {
  const rooms = new Map(); // roomId -> { players: Map(playerId -> player) }

  function getRoom(roomId) {
    let room = rooms.get(roomId);
    if (!room) {
      room = { players: new Map() };
      rooms.set(roomId, room);
    }
    return room;
  }

  function join({ ws, playerId, roomId, profile }) {
    const room = getRoom(roomId);
    room.players.set(playerId, {
      ws,
      playerId,
      profile,
      pos: { x: 0, y: 0, z: 0 },
      rotY: 0,
      hp: 100
    });

    for (const [otherId, p] of room.players) {
      if (otherId === playerId) continue;
      safeSend(p.ws, {
        t: 'player_join',
        player: { id: playerId, profile, pos: { x: 0, y: 0, z: 0 }, rotY: 0, hp: 100 }
      });
    }
  }

  function leave({ playerId, roomId }) {
    const room = rooms.get(roomId);
    if (!room) return;
    room.players.delete(playerId);
    for (const p of room.players.values()) {
      safeSend(p.ws, { t: 'player_leave', playerId });
    }
  }

  function onMessage({ playerId, roomId, msg }) {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player) return;

    if (msg.t === 'state') {
      if (msg.pos && typeof msg.pos.x === 'number') player.pos = msg.pos;
      if (typeof msg.rotY === 'number') player.rotY = msg.rotY;
    }
  }

  setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of rooms) {
      if (room.players.size === 0) continue;
      const players = [];
      for (const p of room.players.values()) {
        players.push({ id: p.playerId, profile: p.profile, pos: p.pos, rotY: p.rotY, hp: p.hp });
      }
      for (const p of room.players.values()) {
        safeSend(p.ws, { t: 'snapshot', now, roomId, players });
      }
    }
  }, TICK_MS);

  return { join, leave, onMessage };
}

