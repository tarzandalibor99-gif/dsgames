// ╔══════════════════════════════════════════════════════╗
// ║  ZANIMLJIVA GEOGRAFIJA — SERVER                      ║
// ║  Pokretanje: node server.js                          ║
// ║  Prvi koji se prijavi = ADMIN 👑                     ║
// ╚══════════════════════════════════════════════════════╝

const WebSocket = require("ws");
const http      = require("http");
const fs        = require("fs");
const path      = require("path");
const os        = require("os");

const PORT = process.env.PORT || 3000;

// ════════════════════════════════════════════════════
//  KORISNICI — izmeni po potrebi
// ════════════════════════════════════════════════════
const KORISNICI = [
  { username: "dalibor", password: "1234"  },
  { username: "marko",   password: "5678"  },
  { username: "ana",     password: "ana123"},
  { username: "nikola",  password: "nik123"},
  { username: "admin",   password: "admin" },
];
// ════════════════════════════════════════════════════

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
    if (err) { res.writeHead(404); res.end("index.html nije pronađen!"); return; }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ noServer: true });

// Eksplicitni upgrade handler — Railway zahtijeva ovo
httpServer.on('upgrade', (request, socket, head) => {
  const url = request.url;
  if (url === '/ws' || url === '/') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Server state
let players   = {};
let adminUser = null;
let answers   = {};
let submitted = 0;
let imposterGame = { word: null, imposter: null, players: [] };

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
      username: u,
      online:   players[u].online,
      locked:   players[u].locked,
      isAdmin:  u === adminUser,
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

    // ── Prijava ──
    if (data.type === "login") {
      const found = KORISNICI.find(k => k.username === data.ime && k.password === data.lozinka);
      if (!found) {
        ws.send(JSON.stringify({ type: "login_error", msg: "Pogrešno ime ili lozinka!" }));
        return;
      }
      myUser = data.ime;
      ws.username = myUser;
      players[myUser] = { ws, online: true, locked: false };

      // Prvi koji se prijavi postaje admin
      if (!adminUser) {
        adminUser = myUser;
        console.log(`👑 ${myUser} je prvi — postaje ADMIN`);
      }

      console.log(`✅ ${myUser} se prijavio`);
      ws.send(JSON.stringify({ type: "login_ok", username: myUser, isAdmin: myUser === adminUser, adminUser }));
      broadcastPlayers();
    }

    // ── Toggle lock ──
    if (data.type === "toggle_lock") {
      if (!players[data.username]) return;
      players[data.username].locked = data.locked;
      broadcastPlayers();
    }

    // ── Admin pokreće igru ──
    if (data.type === "start_game") {
      if (myUser !== adminUser) return;
      answers = {}; submitted = 0;
      const playerList = getPlayerList().map(p => p.username);
      console.log(`🎮 Igra počinje! Slovo: ${data.letter}`);
      broadcast({ type: "game_start", letter: data.letter, roundTime: data.roundTime, players: playerList });
    }

    // ── Predaja odgovora ──
    if (data.type === "submit_answers") {
      answers[data.username] = data.answers;
      submitted++;
      broadcast({ type: "player_submitted", username: data.username });
      const onlineCount = getPlayerList().length;
      if (submitted >= onlineCount) {
        broadcast({ type: "all_answers", answers });
      }
    }

    // ── Završi bodovanje ──
    if (data.type === "finish_scoring") {
      if (myUser !== adminUser) return;
      broadcast({ type: "scores_update", roundScores: data.roundScores });
    }

    // ── Nova runda ──
    if (data.type === "next_round") {
      if (myUser !== adminUser) return;
      answers = {}; submitted = 0;
      Object.keys(players).forEach(u => { players[u].locked = false; });
      const playerList = getPlayerList().map(p => p.username);
      broadcast({ type: "new_round", letter: data.letter, roundTime: data.roundTime, players: playerList });
    }

    // ── KICK igrača ──
    if (data.type === "kick_player") {
      if (myUser !== adminUser) return;
      const target = data.username;
      if (!players[target]) return;
      console.log(`🥾 ${adminUser} kickovao ${target}`);
      sendTo(target, { type: "kicked", msg: `${adminUser} te je izbacio iz igre!` });
      players[target].online = false;
      players[target].locked = false;
      broadcastPlayers();
    }

    // ── Prenos admin prava ──
    if (data.type === "transfer_admin") {
      if (myUser !== adminUser) return;
      const newAdmin = data.username;
      if (!players[newAdmin] || !players[newAdmin].online) return;
      console.log(`👑 Admin prenijet sa ${adminUser} na ${newAdmin}`);
      adminUser = newAdmin;
      sendTo(newAdmin, { type: "you_are_admin" });
      broadcastPlayers();
    }

    // ── IMPOSTER: Admin pokreće ──
    if (data.type === "imposter_start") {
      if (myUser !== adminUser) return;
      imposterGame = { word: data.word, imposter: data.imposter, players: data.players };
      console.log(`🕵️ Imposter! Reč: ${data.word} | Imposter: ${data.imposter}`);
      data.players.forEach(u => {
        sendTo(u, {
          type:    'imposter_role',
          role:    u === data.imposter ? 'imposter' : 'crewmate',
          word:    u === data.imposter ? null : data.word,
          players: data.players,
        });
      });
    }

    // ── IMPOSTER: Admin otkriva ──
    if (data.type === "imposter_reveal_req") {
      if (myUser !== adminUser) return;
      broadcast({ type: 'imposter_reveal', word: imposterGame.word, imposter: imposterGame.imposter });
      console.log(`🎭 Imposter otkriven: ${imposterGame.imposter}`);
    }

    // ── Restart ──
    if (data.type === "restart") {
      if (myUser !== adminUser) return;
      answers = {}; submitted = 0;
      Object.keys(players).forEach(u => { players[u].locked = false; });
      broadcast({ type: "restart", players: getPlayerList(), adminUser });
    }

    // ── Odjava ──
    if (data.type === "logout") {
      if (players[data.username]) {
        players[data.username].online = false;
        players[data.username].locked = false;
        // Ako se admin odjavio, prvi online postaje novi admin
        if (data.username === adminUser) {
          const next = Object.keys(players).find(u => players[u].online);
          adminUser = next || null;
          if (adminUser) {
            console.log(`👑 Admin odjava — ${adminUser} postaje novi admin`);
            sendTo(adminUser, { type: "you_are_admin" });
          }
        }
        broadcastPlayers();
      }
    }
  });

  ws.on("close", () => {
    if (myUser && players[myUser]) {
      players[myUser].online = false;
      players[myUser].locked = false;
      console.log(`❌ ${myUser} se diskonektovao`);
      if (myUser === adminUser) {
        const next = Object.keys(players).find(u => players[u].online);
        adminUser = next || null;
        if (adminUser) {
          console.log(`👑 Admin diskonekt — ${adminUser} postaje novi admin`);
          sendTo(adminUser, { type: "you_are_admin" });
        }
      }
      broadcastPlayers();
    }
  });

  ws.on("error", () => {});
});

httpServer.listen(PORT, '0.0.0.0', () => {
  const ip = getLanIP();
  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║        🌍 ZANIMLJIVA GEOGRAFIJA — SERVER             ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log("║  ✅ Server radi!                                     ║");
  console.log("║                                                      ║");
  console.log("║  Ti otvori u browseru:                               ║");
  console.log(`║  👉  http://localhost:${PORT}                           ║`);
  console.log("║                                                      ║");
  console.log("║  Prijatelji na istom WiFi-u:                         ║");
  console.log(`║  👉  http://${ip}:${PORT}`.padEnd(55) + "║");
  console.log("║                                                      ║");
  console.log("║  ⚡ Prvi koji se prijavi = ADMIN                     ║");
  console.log("║                                                      ║");
  console.log("║  Korisnici:                                          ║");
  KORISNICI.forEach(k => {
    const line = `║    👤 ${k.username} / ${k.password}`;
    console.log(line.padEnd(55) + "║");
  });
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");
});
