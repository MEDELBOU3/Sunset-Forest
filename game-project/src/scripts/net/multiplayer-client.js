export function createMultiplayerClient({ room = 'lobby', getAuthPayload } = {}) {
  let ws = null;
  let connected = false;
  let playerId = null;
  const listeners = new Set();

  function emit(evt) {
    for (const cb of listeners) cb(evt);
  }

  async function connect() {
    if (ws) return;
    const payload = typeof getAuthPayload === 'function' ? await getAuthPayload() : null;
    if (!payload || (typeof payload.token !== 'string' && !payload.guest)) {
      emit({ t: 'status', status: 'auth_required' });
      return;
    }

    const url = new URL('/ws', window.location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(url.toString());

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ t: 'auth', room, ...payload }));
    });

    ws.addEventListener('message', (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }

      if (msg.t === 'welcome') {
        connected = true;
        playerId = msg.playerId;
        emit({ t: 'status', status: 'connected', playerId, roomId: msg.roomId, profile: msg.profile || null });
        return;
      }

      emit(msg);
    });

    ws.addEventListener('close', () => {
      connected = false;
      ws = null;
      emit({ t: 'status', status: 'disconnected' });
    });
  }

  function disconnect() {
    if (ws) ws.close();
  }

  function sendState({ pos, rotY }) {
    if (!ws || !connected) return;
    ws.send(JSON.stringify({ t: 'state', pos, rotY }));
  }

  function on(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  return {
    connect,
    disconnect,
    on,
    sendState,
    get playerId() {
      return playerId;
    }
  };
}
