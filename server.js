// ╔══════════════════════════════════════════════════════╗
// ║  ZANIMLJIVA GEOGRAFIJA — SERVER                      ║
// ║  Pokretanje: node server.js                          ║
// ║  dalibor = SUPER ADMIN uvek 👑                       ║
// ╚══════════════════════════════════════════════════════╝

const WebSocket = require("ws");
const http      = require("http");
const fs        = require("fs");
const path      = require("path");
const os        = require("os");

const PORT = process.env.PORT || 3000;
const SUPER_ADMIN = "dalibor";

let korisnici = [
  { username: "dalibor", password: "1234"   },
  { username: "marko",   password: "5678"   },
  { username: "ana",     password: "ana123" },
  { username: "nikola",  password: "nik123" },
  { username: "admin",   password: "admin"  },
];

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
      if (iface.family === "IPv4" && !iface.internal && !iface.address.startsWith("192.168.25.")) {
        return iface.address;
      }
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

let players   = {};
let adminUser = null;
let answers   = {};
let submitted = 0;

function recalcAdmin() {
  if (players[SUPER_ADMIN] && players[SUPER_ADMIN].online) {
    adminUser = SUPER_ADMIN;
    return;
  }
  if (!adminUser || !players[adminUser] || !players[adminUser].online) {
    const next = Object.keys(players).find(u => players[u].online);
    adminUser = next || null;
  }
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
}

function sendTo(username, data) {
  const p = players[username];
  if (p && p.ws && p.ws.readyState === WebSocket.OPEN) {
    p.ws.send(JSON.stringify(data));
  }
}

function getPlayerList() {
  return Object.keys(players)
    .filter(u => players[u].online)
    .map(u => ({
      username:     u,
      online:       players[u].online,
      locked:       players[u].locked,
      active:       players[u].active !== false,
      isAdmin:      u === adminUser,
      isSuperAdmin: u === SUPER_ADMIN,
    }));
}

function broadcastPlayers() {
  broadcast({ type: "players", players: getPlayerList(), adminUser });
}

wss.on("connection", (ws) => {
  let myUser = null;

  ws.on("message", (raw) => {
    let data;
    try { data = JSON.parse(raw); } catch { return; }

    if (data.type === "login") {
      const found = korisnici.find(k => k.username === data.ime && k.password === data.lozinka);
      if (!found) {
        ws.send(JSON.stringify({ type: "login_error", msg: "Pogresno ime ili lozinka!" }));
        return;
      }
      myUser = data.ime;
      ws.username = myUser;
      players[myUser] = { ws, online: true, locked: false, active: true };
      recalcAdmin();
      if (myUser === adminUser) console.log(`👑 ${myUser} je admin`);
      console.log(`✅ ${myUser} se prijavio`);
      ws.send(JSON.stringify({
        type: "login_ok",
        username: myUser,
        isAdmin: myUser === adminUser,
        isSuperAdmin: myUser === SUPER_ADMIN,
        adminUser,
        korisnici: myUser === SUPER_ADMIN ? korisnici : undefined,
      }));
      broadcastPlayers();
    }

    if (data.type === "toggle_lock") {
      if (!players[data.username]) return;
      players[data.username].locked = data.locked;
      broadcastPlayers();
    }

    if (data.type === "start_game") {
      if (myUser !== adminUser) return;
      answers = {}; submitted = 0;
      const playerList = getPlayerList().map(p => p.username);
      broadcast({ type: "game_start", letter: data.letter, roundTime: data.roundTime, players: playerList });
    }

    if (data.type === "submit_answers") {
      answers[data.username] = data.answers;
      submitted++;
      broadcast({ type: "player_submitted", username: data.username });
      const onlineCount = getPlayerList().length;
      if (submitted >= onlineCount) broadcast({ type: "all_answers", answers });
    }

    if (data.type === "finish_scoring") {
      if (myUser !== adminUser) return;
      broadcast({ type: "scores_update", roundScores: data.roundScores });
    }

    if (data.type === "next_round") {
      if (myUser !== adminUser) return;
      answers = {}; submitted = 0;
      Object.keys(players).forEach(u => { players[u].locked = false; });
      const playerList = getPlayerList().map(p => p.username);
      broadcast({ type: "new_round", letter: data.letter, roundTime: data.roundTime, players: playerList });
    }

    if (data.type === "kick_player") {
      if (myUser !== adminUser) return;
      const target = data.username;
      if (!players[target]) return;
      sendTo(target, { type: "kicked", msg: `${adminUser} te je izbacio iz igre!` });
      players[target].online = false;
      players[target].locked = false;
      broadcastPlayers();
    }

    if (data.type === "transfer_admin") {
      if (myUser !== adminUser) return;
      if (players[SUPER_ADMIN] && players[SUPER_ADMIN].online) return;
      const newAdmin = data.username;
      if (!players[newAdmin] || !players[newAdmin].online) return;
      adminUser = newAdmin;
      sendTo(newAdmin, { type: "you_are_admin" });
      broadcastPlayers();
    }

    if (data.type === "chat_msg") {
      broadcast({ type: "chat_msg", username: data.username, msg: data.msg, time: new Date().toLocaleTimeString('sr',{hour:'2-digit',minute:'2-digit'}) });
    }

    if (data.type === "activity") {
      if (players[data.username]) {
        players[data.username].active = data.active;
        broadcastPlayers();
      }
    }

    if (data.type === "change_letter") {
      if (myUser !== adminUser) return;
      broadcast({ type: "letter_changed", letter: data.letter });
    }

    if (data.type === "restart") {
      if (myUser !== adminUser) return;
      answers = {}; submitted = 0;
      Object.keys(players).forEach(u => { players[u].locked = false; });
      broadcast({ type: "restart", players: getPlayerList(), adminUser });
    }

    // ═══ SUPER ADMIN — upravljanje korisnicima ═══

    if (data.type === "sa_add_user") {
      if (myUser !== SUPER_ADMIN) return;
      const { username, password } = data;
      if (!username || !password) { sendTo(myUser, { type: "sa_error", msg: "Ime i lozinka su obavezni!" }); return; }
      if (korisnici.find(k => k.username === username)) { sendTo(myUser, { type: "sa_error", msg: "Korisnik vec postoji!" }); return; }
      korisnici.push({ username, password });
      console.log(`➕ Dalibor dodao korisnika: ${username}`);
      sendTo(myUser, { type: "sa_users_update", korisnici });
    }

    if (data.type === "sa_edit_user") {
      if (myUser !== SUPER_ADMIN) return;
      const { oldUsername, newUsername, newPassword } = data;
      const idx = korisnici.findIndex(k => k.username === oldUsername);
      if (idx === -1) { sendTo(myUser, { type: "sa_error", msg: "Korisnik nije pronadjen!" }); return; }
      if (newUsername && newUsername !== oldUsername && korisnici.find(k => k.username === newUsername)) {
        sendTo(myUser, { type: "sa_error", msg: "To korisnicko ime vec postoji!" }); return;
      }
      if (newUsername) korisnici[idx].username = newUsername;
      if (newPassword) korisnici[idx].password = newPassword;
      console.log(`✏️ Dalibor izmenio: ${oldUsername}`);
      sendTo(myUser, { type: "sa_users_update", korisnici });
    }

    if (data.type === "sa_delete_user") {
      if (myUser !== SUPER_ADMIN) return;
      const { username } = data;
      if (username === SUPER_ADMIN) { sendTo(myUser, { type: "sa_error", msg: "Ne mozes obrisati sebe!" }); return; }
      korisnici = korisnici.filter(k => k.username !== username);
      if (players[username] && players[username].online) {
        sendTo(username, { type: "kicked", msg: "Tvoj nalog je obrisan!" });
        players[username].online = false;
        broadcastPlayers();
      }
      console.log(`🗑️ Dalibor obrisao korisnika: ${username}`);
      sendTo(myUser, { type: "sa_users_update", korisnici });
    }

    if (data.type === "logout") {
      if (players[data.username]) {
        players[data.username].online = false;
        players[data.username].locked = false;
        const wasAdmin = data.username === adminUser;
        if (wasAdmin) {
          adminUser = null;
          recalcAdmin();
          if (adminUser) sendTo(adminUser, { type: "you_are_admin" });
        }
        broadcastPlayers();
      }
    }
  });

  ws.on("close", () => {
    if (myUser && players[myUser]) {
      players[myUser].online = false;
      players[myUser].locked = false;
      const wasAdmin = myUser === adminUser;
      if (wasAdmin) {
        adminUser = null;
        recalcAdmin();
        if (adminUser) sendTo(adminUser, { type: "you_are_admin" });
      }
      broadcastPlayers();
    }
  });

  ws.on("error", () => {});
});

httpServer.listen(PORT, () => {
  const ip = getLanIP();
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║        🌍 ZANIMLJIVA GEOGRAFIJA — SERVER             ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log(`║  👉  http://localhost:${PORT}                           ║`);
  console.log(`║  👉  http://${ip}:${PORT}`.padEnd(55) + "║");
  console.log("║  👑 dalibor = SUPER ADMIN uvek                       ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");
});
