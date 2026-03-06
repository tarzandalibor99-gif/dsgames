// ╔══════════════════════════════════════════════════════╗
// ║  GEOIGRE — SERVER sa sobama                          ║
// ║  Dalibor = SUPER ADMIN uvek 👑                       ║
// ╚══════════════════════════════════════════════════════╝

const WebSocket = require("ws");
const http      = require("http");
const fs        = require("fs");
const path      = require("path");
const os        = require("os");

const PORT = process.env.PORT || 3000;
const SUPER_ADMIN = "Dalibor";

let korisnici = [
  { username: "Dalibor", password: "3199"   },
  { username: "Sanja",   password: "1234"   },
  { username: "Aleksandar",     password: "1234" },
  { username: "Andjela",  password: "1234" },
  { username: "Demo",   password: "1234"  },
];

// ── Sobe: { roomId: { name, password, owner, players:{}, answers:{}, submitted, adminUser, gameActive } }
let rooms = {};
let roomCounter = 0;

// ── Globalni igrači (pre ulaska u sobu)
let globalPlayers = {}; // { username: { ws, online } }

// Pamti poslednju sobu svakog igrača za rejoin (30s grace period)
let lastRoom = {}; // { username: { roomId, timer } }

function getLanIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    const n = name.toLowerCase();
    if (n.includes('wi-fi') || n.includes('wifi') || n.includes('wlan')) {
      for (const iface of ifaces[name]) {
        if (iface.family === "IPv4" && !iface.internal) return iface.address;
      }
    }
  }
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return "localhost";
}

const httpServer = http.createServer((req, res) => {
  fs.readFile(path.join(__dirname, "index.html"), (err, data) => {
    if (err) { res.writeHead(404); res.end("index.html nije pronadjen!"); return; }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server: httpServer });

function sendTo(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function sendToUser(username, data, room) {
  const p = room ? room.players[username] : globalPlayers[username];
  if (p && p.ws) sendTo(p.ws, data);
}

function broadcastRoom(room, data) {
  const msg = JSON.stringify(data);
  Object.values(room.players).forEach(p => {
    if (p.ws && p.ws.readyState === WebSocket.OPEN) p.ws.send(msg);
  });
}

function broadcastGlobal(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
}

function getRoomList() {
  return Object.entries(rooms).map(([id, r]) => ({
    id,
    name: r.name,
    hasPassword: !!r.password,
    owner: r.owner,
    playerCount: Object.values(r.players).filter(p => p.online).length,
    maxPlayers: r.maxPlayers,
    gameActive: r.gameActive,
    roundTime: r.roundTime,
  }));
}

function broadcastRoomList() {
  broadcastGlobal({ type: "room_list", rooms: getRoomList() });
}

function getRoomPlayers(room) {
  return Object.entries(room.players)
    .filter(([, p]) => p.online)
    .map(([username, p]) => ({
      username,
      online: p.online,
      locked: p.locked,
      active: p.active !== false,
      isAdmin: username === room.adminUser,
      isSuperAdmin: username === SUPER_ADMIN,
    }));
}

function broadcastRoomPlayers(room) {
  broadcastRoom(room, { type: "players", players: getRoomPlayers(room), adminUser: room.adminUser });
}

function recalcRoomAdmin(room) {
  // Dalibor je admin ako je u sobi i online
  if (room.players[SUPER_ADMIN] && room.players[SUPER_ADMIN].online) {
    room.adminUser = SUPER_ADMIN;
    return;
  }
  if (!room.adminUser || !room.players[room.adminUser] || !room.players[room.adminUser].online) {
    // Owner prvi, pa bilo ko
    if (room.players[room.owner] && room.players[room.owner].online) {
      room.adminUser = room.owner;
    } else {
      const next = Object.keys(room.players).find(u => room.players[u].online);
      room.adminUser = next || null;
    }
  }
}

wss.on("connection", (ws) => {
  let myUser = null;
  let myRoomId = null;

  function myRoom() { return myRoomId ? rooms[myRoomId] : null; }

  ws.on("message", (raw) => {
    let data;
    try { data = JSON.parse(raw); } catch { return; }

    // ── Prijava ──
    if (data.type === "login") {
      const found = korisnici.find(k => k.username === data.ime && k.password === data.lozinka);
      if (!found) { sendTo(ws, { type: "login_error", msg: "Pogresno ime ili lozinka!" }); return; }
      myUser = data.ime;
      globalPlayers[myUser] = { ws, online: true };
      console.log(`✅ ${myUser} se prijavio`);

      // Ako je imao aktivnu sobu (refresh), otkaži brisanje i ponudi rejoin
      let rejoinRoom = null;
      if (lastRoom[myUser]) {
        clearTimeout(lastRoom[myUser].timer);
        const rid = lastRoom[myUser].roomId;
        delete lastRoom[myUser];
        if (rooms[rid] && rooms[rid].players[myUser]) {
          myRoomId = rid;
          const room = rooms[rid];
          room.players[myUser].ws = ws;
          room.players[myUser].online = true;
          room.players[myUser].lastSeen = Date.now();
          recalcRoomAdmin(room);
          rejoinRoom = { roomId: rid, roomName: room.name, isAdmin: myUser === room.adminUser, adminUser: room.adminUser, roundTime: room.roundTime, gameActive: room.gameActive };
          console.log('🔄 ' + myUser + ' se vratio u sobu: ' + room.name);
          broadcastRoomPlayers(room);
          broadcastRoomList();
        }
      }

      sendTo(ws, {
        type: "login_ok",
        username: myUser,
        isSuperAdmin: myUser === SUPER_ADMIN,
        korisnici: myUser === SUPER_ADMIN ? korisnici : undefined,
        rejoinRoom,
      });
      broadcastRoomList();
    }

    // ── Napravi sobu ──
    if (data.type === "create_room") {
      if (!myUser) return;
      const id = 'room_' + (++roomCounter);
      rooms[id] = {
        id,
        name: data.name || `Soba ${roomCounter}`,
        password: data.password || '',
        owner: myUser,
        adminUser: myUser,
        maxPlayers: data.maxPlayers || 8,
        roundTime: data.roundTime || 120,
        players: {},
        answers: {},
        submitted: 0,
        gameActive: false,
      };
      console.log(`🏠 ${myUser} napravio sobu: ${rooms[id].name}`);
      broadcastRoomList();
      // Auto-join creator
      sendTo(ws, { type: "room_created", roomId: id });
    }

    // ── Uđi u sobu ──
    if (data.type === "join_room") {
      if (!myUser) return;
      const room = rooms[data.roomId];
      if (!room) { sendTo(ws, { type: "room_error", msg: "Soba ne postoji!" }); return; }
      if (room.password && room.password !== data.password) {
        sendTo(ws, { type: "room_error", msg: "Pogrešna lozinka sobe!" }); return;
      }
      if (Object.values(room.players).filter(p=>p.online).length >= room.maxPlayers && !room.players[myUser]) {
        sendTo(ws, { type: "room_error", msg: "Soba je puna!" }); return;
      }

      myRoomId = data.roomId;
      room.players[myUser] = { ws, online: true, locked: false, active: true };
      recalcRoomAdmin(room);

      console.log(`🚪 ${myUser} ušao u sobu: ${room.name}`);
      sendTo(ws, {
        type: "joined_room",
        roomId: myRoomId,
        roomName: room.name,
        isAdmin: myUser === room.adminUser,
        isSuperAdmin: myUser === SUPER_ADMIN,
        adminUser: room.adminUser,
        roundTime: room.roundTime,
      });
      broadcastRoomPlayers(room);
      broadcastRoomList();
    }

    // ── Izađi iz sobe ──
    if (data.type === "leave_room") {
      const room = myRoom();
      if (!room) return;
      room.players[myUser].online = false;
      room.players[myUser].locked = false;
      const wasAdmin = myUser === room.adminUser;
      if (wasAdmin) { room.adminUser = null; recalcRoomAdmin(room); }
      if (room.adminUser) sendToUser(room.adminUser, { type: "you_are_admin" }, room);
      broadcastRoomPlayers(room);
      // Obriši sobu ako prazna
      if (Object.values(room.players).every(p => !p.online)) {
        delete rooms[myRoomId];
        console.log(`🗑️ Soba obrisana: ${myRoomId}`);
      }
      myRoomId = null;
      broadcastRoomList();
      sendTo(ws, { type: "left_room" });
    }

    // ── Toggle lock ──
    if (data.type === "toggle_lock") {
      const room = myRoom(); if (!room || !room.players[myUser]) return;
      room.players[myUser].locked = data.locked;
      broadcastRoomPlayers(room);
    }

    // ── Start game ──
    if (data.type === "start_game") {
      const room = myRoom(); if (!room || myUser !== room.adminUser) return;
      room.answers = {}; room.submitted = 0; room.gameActive = true;
      const playerList = getRoomPlayers(room).map(p => p.username);
      broadcastRoom(room, { type: "game_start", letter: data.letter, roundTime: data.roundTime, players: playerList });
      broadcastRoomList();
    }

    // ── Submit answers ──
    if (data.type === "submit_answers") {
      const room = myRoom(); if (!room) return;
      room.answers[data.username] = data.answers;
      room.submitted++;
      broadcastRoom(room, { type: "player_submitted", username: data.username });
      const onlineCount = getRoomPlayers(room).length;
      if (room.submitted >= onlineCount) broadcastRoom(room, { type: "all_answers", answers: room.answers });
    }

    // ── Finish scoring ──
    if (data.type === "finish_scoring") {
      const room = myRoom(); if (!room || myUser !== room.adminUser) return;
      broadcastRoom(room, { type: "scores_update", roundScores: data.roundScores });
    }

    // ── Next round ──
    if (data.type === "next_round") {
      const room = myRoom(); if (!room || myUser !== room.adminUser) return;
      room.answers = {}; room.submitted = 0;
      Object.keys(room.players).forEach(u => { room.players[u].locked = false; });
      const playerList = getRoomPlayers(room).map(p => p.username);
      broadcastRoom(room, { type: "new_round", letter: data.letter, roundTime: data.roundTime, players: playerList });
    }

    // ── Kick ──
    if (data.type === "kick_player") {
      const room = myRoom(); if (!room || myUser !== room.adminUser) return;
      const target = data.username;
      if (!room.players[target]) return;
      sendToUser(target, { type: "kicked", msg: `${room.adminUser} te je izbacio!` }, room);
      room.players[target].online = false;
      broadcastRoomPlayers(room);
      broadcastRoomList();
    }

    // ── Transfer admin ──
    if (data.type === "transfer_admin") {
      const room = myRoom(); if (!room || myUser !== room.adminUser) return;
      if (room.players[SUPER_ADMIN] && room.players[SUPER_ADMIN].online) return;
      const newAdmin = data.username;
      if (!room.players[newAdmin] || !room.players[newAdmin].online) return;
      room.adminUser = newAdmin;
      sendToUser(newAdmin, { type: "you_are_admin" }, room);
      broadcastRoomPlayers(room);
    }

    // ── Chat ──
    if (data.type === "chat_msg") {
      const room = myRoom(); if (!room) return;
      broadcastRoom(room, { type: "chat_msg", username: data.username, msg: data.msg, time: new Date().toLocaleTimeString('sr',{hour:'2-digit',minute:'2-digit'}) });
    }

    // ── Activity ──
    if (data.type === "activity") {
      const room = myRoom(); if (!room || !room.players[myUser]) return;
      room.players[myUser].active = data.active;
      room.players[myUser].lastSeen = Date.now();
      broadcastRoomPlayers(room);
    }

    // ── Heartbeat ping ──
    if (data.type === "ping") {
      const room = myRoom();
      if (room && room.players[myUser]) {
        room.players[myUser].lastSeen = Date.now();
        // Ako je bio označen kao offline, vrati online
        if (!room.players[myUser].online) {
          room.players[myUser].online = true;
          recalcRoomAdmin(room);
          broadcastRoomPlayers(room);
          broadcastRoomList();
        }
      }
      if (globalPlayers[myUser]) globalPlayers[myUser].lastSeen = Date.now();
      sendTo(ws, { type: "pong" });
    }

    // ── Change letter ──
    if (data.type === "change_letter") {
      const room = myRoom(); if (!room || myUser !== room.adminUser) return;
      broadcastRoom(room, { type: "letter_changed", letter: data.letter });
    }

    // ── Restart ──
    if (data.type === "restart") {
      const room = myRoom(); if (!room || myUser !== room.adminUser) return;
      room.answers = {}; room.submitted = 0; room.gameActive = false;
      Object.keys(room.players).forEach(u => { room.players[u].locked = false; });
      broadcastRoom(room, { type: "restart", players: getRoomPlayers(room), adminUser: room.adminUser });
      broadcastRoomList();
    }

    // ── Obrisi sobu (samo owner ili superadmin) ──
    if (data.type === "delete_room") {
      const room = myRoom() || rooms[data.roomId];
      if (!room) return;
      if (myUser !== room.owner && myUser !== SUPER_ADMIN) return;
      broadcastRoom(room, { type: "room_deleted", msg: "Soba je obrisana!" });
      delete rooms[room.id || data.roomId];
      broadcastRoomList();
    }

    // ════ SUPER ADMIN — korisnici ════
    if (data.type === "sa_add_user") {
      if (myUser !== SUPER_ADMIN) return;
      const { username, password } = data;
      if (!username || !password) { sendTo(ws, { type: "sa_error", msg: "Ime i lozinka su obavezni!" }); return; }
      if (korisnici.find(k => k.username === username)) { sendTo(ws, { type: "sa_error", msg: "Korisnik vec postoji!" }); return; }
      korisnici.push({ username, password });
      sendTo(ws, { type: "sa_users_update", korisnici });
    }

    if (data.type === "sa_edit_user") {
      if (myUser !== SUPER_ADMIN) return;
      const { oldUsername, newUsername, newPassword } = data;
      const idx = korisnici.findIndex(k => k.username === oldUsername);
      if (idx === -1) { sendTo(ws, { type: "sa_error", msg: "Korisnik nije pronadjen!" }); return; }
      if (newUsername && newUsername !== oldUsername && korisnici.find(k => k.username === newUsername)) {
        sendTo(ws, { type: "sa_error", msg: "To ime vec postoji!" }); return;
      }
      if (newUsername) korisnici[idx].username = newUsername;
      if (newPassword) korisnici[idx].password = newPassword;
      sendTo(ws, { type: "sa_users_update", korisnici });
    }

    if (data.type === "sa_delete_user") {
      if (myUser !== SUPER_ADMIN) return;
      const { username } = data;
      if (username === SUPER_ADMIN) { sendTo(ws, { type: "sa_error", msg: "Ne mozes obrisati sebe!" }); return; }
      korisnici = korisnici.filter(k => k.username !== username);
      sendTo(ws, { type: "sa_users_update", korisnici });
    }

    // ── Logout ──
    if (data.type === "logout") {
      const room = myRoom();
      if (room && room.players[myUser]) {
        room.players[myUser].online = false;
        const wasAdmin = myUser === room.adminUser;
        if (wasAdmin) { room.adminUser = null; recalcRoomAdmin(room); if (room.adminUser) sendToUser(room.adminUser, { type: "you_are_admin" }, room); }
        broadcastRoomPlayers(room);
        if (Object.values(room.players).every(p => !p.online)) { delete rooms[myRoomId]; }
        myRoomId = null;
        broadcastRoomList();
      }
      if (globalPlayers[myUser]) globalPlayers[myUser].online = false;
    }
  });

  ws.on("close", () => {
    if (!myUser) return;
    const room = myRoom();
    if (room && room.players[myUser]) {
      // Daj 30 sekundi grace period za refresh
      room.players[myUser].online = false;
      const capturedUser = myUser;
      const capturedRoomId = myRoomId;
      lastRoom[capturedUser] = {
        roomId: capturedRoomId,
        timer: setTimeout(() => {
          delete lastRoom[capturedUser];
          const r = rooms[capturedRoomId];
          if (!r || !r.players[capturedUser] || r.players[capturedUser].online) return;
          // Zaista otisao — finalize
          const wasAdmin = capturedUser === r.adminUser;
          if (wasAdmin) { r.adminUser = null; recalcRoomAdmin(r); if (r.adminUser) sendToUser(r.adminUser, { type: "you_are_admin" }, r); }
          broadcastRoomPlayers(r);
          if (Object.values(r.players).every(p => !p.online)) { delete rooms[capturedRoomId]; broadcastRoomList(); }
        }, 30000)
      };
      broadcastRoomPlayers(room); // prikazuje offline odmah vizuelno
    }
    if (globalPlayers[myUser]) globalPlayers[myUser].online = false;
  });

  ws.on("error", () => {});
});

// ── Heartbeat checker — svake 10s provjeri ko nije pingao 20s ──
setInterval(() => {
  const now = Date.now();
  Object.values(rooms).forEach(room => {
    let changed = false;
    Object.entries(room.players).forEach(([username, p]) => {
      if (!p.online) return;
      if (p.lastSeen && now - p.lastSeen > 6000) {
        console.log(`💤 ${username} timeout — označen offline`);
        p.online = false;
        p.active = false;
        changed = true;
        // Ako je admin, preračunaj
        if (username === room.adminUser) {
          room.adminUser = null;
          recalcRoomAdmin(room);
          if (room.adminUser) sendToUser(room.adminUser, { type: "you_are_admin" }, room);
        }
        // Obriši sobu ako prazna
        if (Object.values(room.players).every(p2 => !p2.online)) {
          delete rooms[room.id];
          broadcastRoomList();
          return;
        }
      }
    });
    if (changed) { broadcastRoomPlayers(room); broadcastRoomList(); }
  });
}, 3000);

httpServer.listen(PORT, () => {
  const ip = getLanIP();
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║        🌍 GEOIGRE — SERVER SA SOBAMA                ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log(`║  👉  http://localhost:${PORT}                           ║`);
  console.log(`║  👉  http://${ip}:${PORT}`.padEnd(55) + "║");
  console.log("║  👑 Dalibor = SUPER ADMIN uvek                       ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");
});
