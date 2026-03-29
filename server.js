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

// ── Zaključavanje igara (samo Dalibor može)
let lockedGames = { geo: false, imposter: false, roulette: false, xo: false };

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
    id, name: r.name, hasPassword: !!r.password, owner: r.owner,
    playerCount: Object.values(r.players).filter(p => p.online).length,
    maxPlayers: r.maxPlayers, gameActive: r.gameActive,
    roundTime: r.roundTime, gameType: r.gameType || 'geo',
  }));
}

// ── XO Helpers ──
function xoMakeGame(playerX, playerO, size, totalRounds, allPlayers) {
  return { playerX, playerO, board: Array(size*size).fill(''), turn:'X', size, totalRounds, round:1,
    winner:null, draw:false, scores:{[playerX]:0,[playerO]:0}, allPlayers };
}

function xoServerCheckWin(board, size, mark) {
  const need = size===3?3:5;
  const idx=(r,c)=>r*size+c;
  for(let r=0;r<size;r++) for(let c=0;c<=size-need;c++) if(Array.from({length:need},(_,i)=>board[idx(r,c+i)]).every(v=>v===mark)) return true;
  for(let c=0;c<size;c++) for(let r=0;r<=size-need;r++) if(Array.from({length:need},(_,i)=>board[idx(r+i,c)]).every(v=>v===mark)) return true;
  for(let r=0;r<=size-need;r++) for(let c=0;c<=size-need;c++) if(Array.from({length:need},(_,i)=>board[idx(r+i,c+i)]).every(v=>v===mark)) return true;
  for(let r=0;r<=size-need;r++) for(let c=need-1;c<size;c++) if(Array.from({length:need},(_,i)=>board[idx(r+i,c-i)]).every(v=>v===mark)) return true;
  return false;
}

function xoTournamentView(s) {
  return { matches: s.matches, currentMatch: s.currentMatch, scores: s.scores, done: s.done };
}

function xoTournamentWinner(s) {
  const sorted = Object.entries(s.scores).sort((a,b)=>b[1]-a[1]);
  return sorted[0][1] > sorted[1][1] ? sorted[0][0] : null;
}

function broadcastOnlineUsers() {
  const users = Object.entries(globalPlayers)
    .filter(([, p]) => p.online)
    .map(([u]) => u);
  // Also include users in rooms
  Object.values(rooms).forEach(r => {
    Object.entries(r.players).forEach(([u, p]) => {
      if(p.online && !users.includes(u)) users.push(u);
    });
  });
  broadcastGlobal({ type: "online_users", users });
}

function broadcastRoomList() {  const all = getRoomList();
  broadcastGlobal({ type: "room_list",          rooms: all.filter(r => r.gameType !== 'imposter' && r.gameType !== 'roulette' && r.gameType !== 'xo') });
  broadcastGlobal({ type: "imposter_room_list", rooms: all.filter(r => r.gameType === 'imposter') });
  broadcastGlobal({ type: "roulette_room_list", rooms: all.filter(r => r.gameType === 'roulette') });
  broadcastGlobal({ type: "xo_room_list",       rooms: all.filter(r => r.gameType === 'xo') });
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
        lockedGames,
        rejoinRoom,
      });
      broadcastRoomList();
      // Broadcast updated online user list to all
      broadcastOnlineUsers();
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
        gameType: data.gameType || 'geo',
        players: {},
        answers: {},
        submitted: 0,
        gameActive: false,
        imposterGame: null,
      };
      console.log(`🏠 ${myUser} napravio sobu: ${rooms[id].name}`);
      broadcastRoomList();
      // Auto-join creator
      sendTo(ws, { type: "room_created", roomId: id });
    }

    // ── Uđi u sobu ──
    if (data.type === "join_room") {
      if (!myUser) return;
      if (lockedGames.geo && myUser !== SUPER_ADMIN) { sendTo(ws, { type: "room_error", msg: "🔒 Geografija je zaključana!" }); return; }
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
      const time = new Date().toLocaleTimeString('sr',{hour:'2-digit',minute:'2-digit'});
      if(data.dm && data.to) {
        // Private message — send only to sender and recipient
        const msgData = { type:"chat_msg", username:data.username, msg:data.msg, time, dm:true, to:data.to };
        sendTo(ws, msgData); // echo back to sender
        // Find recipient anywhere (global or in a room)
        const recipientGlobal = globalPlayers[data.to];
        if(recipientGlobal && recipientGlobal.ws) sendTo(recipientGlobal.ws, msgData);
        else {
          // Search in rooms
          Object.values(rooms).forEach(r => {
            if(r.players[data.to] && r.players[data.to].online) sendTo(r.players[data.to].ws, msgData);
          });
        }
      } else {
        // Global message — broadcast to everyone
        const msgData = { type:"chat_msg", username:data.username, msg:data.msg, time };
        broadcastGlobal(msgData);
      }
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

    if (data.type === "sa_lock_game") {
      if (myUser !== SUPER_ADMIN) return;
      const { game, locked } = data;
      if (!lockedGames.hasOwnProperty(game)) return;
      lockedGames[game] = locked;
      console.log(`🔒 ${myUser} ${locked ? 'zaključao' : 'otključao'} igru: ${game}`);
      broadcastGlobal({ type: "sa_game_lock_update", game, locked, lockedGames });
    }

    // ════ IMPOSTER ════
    if (data.type === "imposter_join_room") {
      if (!myUser) return;
      if (lockedGames.imposter && myUser !== SUPER_ADMIN) { sendTo(ws, { type:"room_error", msg:"🔒 Imposter je zaključan!" }); return; }
      const room = rooms[data.roomId];
      if (!room) { sendTo(ws, { type:"room_error", msg:"Soba ne postoji!" }); return; }
      if (room.password && room.password !== data.password) { sendTo(ws, { type:"room_error", msg:"Pogrešna lozinka!" }); return; }
      myRoomId = data.roomId;
      if (!room.players[myUser]) room.players[myUser] = { ws, online:true, locked:false };
      else { room.players[myUser].ws = ws; room.players[myUser].online = true; }
      recalcRoomAdmin(room);
      sendTo(ws, { type:'imposter_joined', roomId:room.id, roomName:room.name, isAdmin:myUser===room.adminUser, adminUser:room.adminUser });
      const plist = Object.keys(room.players).filter(u=>room.players[u].online).map(u=>({username:u,online:true,isAdmin:u===room.adminUser}));
      broadcastRoom(room, { type:'imposter_players', players:plist, adminUser:room.adminUser });
      broadcastRoomList();
    }

    if (data.type === "imposter_start") {
      const room = myRoomId ? rooms[myRoomId] : null; if (!room || myUser !== room.adminUser) return;
      room.imposterGame = { word:data.word, imposter:data.imposter, votes:{} };
      room.gameActive = true;
      data.players.forEach(u => {
        sendToUser(u, { type:'imposter_role', role:u===data.imposter?'imposter':'crewmate', word:u===data.imposter?null:data.word, players:data.players }, room);
      });
      broadcastRoomList();
    }

    if (data.type === "imposter_vote") {
      const room = myRoomId ? rooms[myRoomId] : null; if (!room || !room.imposterGame) return;
      room.imposterGame.votes[data.voter] = data.target;
      broadcastRoom(room, { type:'imposter_vote_update', votes:room.imposterGame.votes });
    }

    if (data.type === "imposter_vote_start") {
      const room = myRoomId ? rooms[myRoomId] : null; if (!room) return;
      console.log(`🚨 ${myUser} pokrenuo glasanje`);
      broadcastRoom(room, { type:'imposter_vote_start' });
    }

    if (data.type === "imposter_continue") {
      const room = myRoomId ? rooms[myRoomId] : null; if (!room || myUser !== room.adminUser) return;
      console.log(`▶️ Admin nastavio igru`);
      broadcastRoom(room, { type:'imposter_continue' });
    }

    if (data.type === "imposter_reveal_req") {
      const room = myRoomId ? rooms[myRoomId] : null; if (!room || myUser !== room.adminUser || !room.imposterGame) return;
      broadcastRoom(room, { type:'imposter_reveal', word:room.imposterGame.word, imposter:room.imposterGame.imposter });
      room.gameActive = false; broadcastRoomList();
    }

    if (data.type === "imposter_play_again") {
      const room = myRoomId ? rooms[myRoomId] : null; if (!room || myUser !== room.adminUser) return;
      room.imposterGame = null;
      room.gameActive = false;
      broadcastRoom(room, { type: 'imposter_play_again' });
      broadcastRoomList();
    }

    if (data.type === "imposter_leave") {
      const room = myRoomId ? rooms[myRoomId] : null;
      if (room && room.players[myUser]) {
        room.players[myUser].online = false;
        const plist = Object.keys(room.players).filter(u=>room.players[u].online).map(u=>({username:u,online:true,isAdmin:u===room.adminUser}));
        broadcastRoom(room, { type:'imposter_players', players:plist, adminUser:room.adminUser });
        if (Object.values(room.players).every(p=>!p.online)) delete rooms[myRoomId];
        broadcastRoomList();
      }
      myRoomId = null;
      sendTo(ws, { type:'imposter_left' });
    }

    // ════ ROULETTE ════
    if (data.type === "roulette_join_room") {
      if (!myUser) return;
      if (lockedGames.roulette && myUser !== SUPER_ADMIN) { sendTo(ws, { type:"room_error", msg:"🔒 Rulet je zaključan!" }); return; }
      const room = rooms[data.roomId];
      if (!room) { sendTo(ws, { type:"room_error", msg:"Soba ne postoji!" }); return; }
      if (room.password && room.password !== data.password) { sendTo(ws, { type:"room_error", msg:"Pogrešna lozinka!" }); return; }
      myRoomId = data.roomId;
      if (!room.players[myUser]) room.players[myUser] = { ws, online:true, locked:false, chips:1000 };
      else { room.players[myUser].ws = ws; room.players[myUser].online = true; }
      if (!room.players[myUser].chips) room.players[myUser].chips = 1000;
      recalcRoomAdmin(room);
      sendTo(ws, { type:'roulette_joined', roomId:room.id, roomName:room.name, isAdmin:myUser===room.adminUser, adminUser:room.adminUser, chips:room.players[myUser].chips });
      const plist = Object.keys(room.players).filter(u=>room.players[u].online).map(u=>({username:u,online:true,isAdmin:u===room.adminUser}));
      broadcastRoom(room, { type:'roulette_players', players:plist, adminUser:room.adminUser });
      broadcastRoomList();
    }

    if (data.type === "roulette_start") {
      const room = myRoomId ? rooms[myRoomId] : null; if (!room || myUser !== room.adminUser) return;
      const players = data.players;
      players.forEach(u => { if (room.players[u]) room.players[u].chips = 1000; });
      room.rouletteGame = { round: 1, bets: {}, chips: Object.fromEntries(players.map(u=>[u,1000])) };
      room.gameActive = true;
      broadcastRoom(room, { type:'roulette_game_start', players, chips: room.rouletteGame.chips });
      broadcastRoomList();
    }

    if (data.type === "roulette_bet") {
      const room = myRoomId ? rooms[myRoomId] : null; if (!room || !room.rouletteGame) return;
      room.rouletteGame.bets[myUser] = { type: data.betType, num: data.betNum, stake: data.stake };
      const betsOut = {};
      Object.entries(room.rouletteGame.bets).forEach(([u,b]) => { betsOut[u] = {type:b.type, num:b.num, stake:b.stake}; });
      broadcastRoom(room, { type:'roulette_bet_update', bets: betsOut });
    }

    if (data.type === "roulette_spin") {
      const room = myRoomId ? rooms[myRoomId] : null; if (!room || myUser !== room.adminUser || !room.rouletteGame) return;
      const result = Math.floor(Math.random() * 37);
      const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
      const game = room.rouletteGame;
      const payouts = {};
      Object.entries(game.bets).forEach(([u, bet]) => {
        const n = result;
        const isRed = RED.has(n), isBlack = n!==0 && !isRed;
        let mult = 0;
        switch(bet.type){
          case 'red':    mult = isRed?2:0; break;
          case 'black':  mult = isBlack?2:0; break;
          case 'zero':   mult = n===0?36:0; break;
          case 'even':   mult = n!==0&&n%2===0?2:0; break;
          case 'odd':    mult = n!==0&&n%2===1?2:0; break;
          case 'low':    mult = n>=1&&n<=18?2:0; break;
          case 'high':   mult = n>=19&&n<=36?2:0; break;
          case 'dozen1': mult = n>=1&&n<=12?3:0; break;
          case 'dozen2': mult = n>=13&&n<=24?3:0; break;
          case 'dozen3': mult = n>=25&&n<=36?3:0; break;
          case 'col1':   mult = n!==0&&n%3===1?3:0; break;
          case 'col2':   mult = n!==0&&n%3===2?3:0; break;
          case 'col3':   mult = n!==0&&n%3===0?3:0; break;
          case 'number': mult = bet.num===n?36:0; break;
        }
        const win = mult > 0 ? bet.stake * mult : 0;
        payouts[u] = { betType: bet.type, betNum: bet.num, stake: bet.stake, win };
        if (!game.chips[u]) game.chips[u] = 1000;
        game.chips[u] = Math.max(0, game.chips[u] - bet.stake + win);
      });
      Object.entries(game.chips).forEach(([u,c]) => { if (room.players[u]) room.players[u].chips = c; });
      game.bets = {};
      broadcastRoom(room, { type:'roulette_spin_start', result });
      // Send result after spin animation time (4.5s on client)
      setTimeout(() => {
        broadcastRoom(room, { type:'roulette_round_result', result, payouts, chips: game.chips });
      }, 100);
    }

    if (data.type === "roulette_next_round") {
      const room = myRoomId ? rooms[myRoomId] : null; if (!room || myUser !== room.adminUser || !room.rouletteGame) return;
      room.rouletteGame.round++;
      room.rouletteGame.bets = {};
      const players = Object.keys(room.players).filter(u=>room.players[u].online);
      broadcastRoom(room, { type:'roulette_next_round', round: room.rouletteGame.round, players, chips: room.rouletteGame.chips });
    }

    if (data.type === "roulette_leave") {
      const room = myRoomId ? rooms[myRoomId] : null;
      if (room && room.players[myUser]) {
        room.players[myUser].online = false;
        recalcRoomAdmin(room);
        const plist = Object.keys(room.players).filter(u=>room.players[u].online).map(u=>({username:u,online:true,isAdmin:u===room.adminUser}));
        broadcastRoom(room, { type:'roulette_players', players:plist, adminUser:room.adminUser });
        if (Object.values(room.players).every(p=>!p.online)) { delete rooms[myRoomId]; }
        broadcastRoomList();
      }
      myRoomId = null;
      sendTo(ws, { type:'roulette_left' });
    }

    // ════ X/O ════
    if (data.type === "xo_join_room") {
      if (!myUser) return;
      if (lockedGames.xo && myUser !== SUPER_ADMIN) { sendTo(ws, { type:"room_error", msg:"🔒 X/O je zaključana!" }); return; }
      const room = rooms[data.roomId];
      if (!room) { sendTo(ws, { type:"room_error", msg:"Soba ne postoji!" }); return; }
      if (room.password && room.password !== data.password) { sendTo(ws, { type:"room_error", msg:"Pogrešna lozinka!" }); return; }
      myRoomId = data.roomId;
      if (!room.players[myUser]) room.players[myUser] = { ws, online:true, locked:false };
      else { room.players[myUser].ws = ws; room.players[myUser].online = true; }
      recalcRoomAdmin(room);
      sendTo(ws, { type:'xo_joined', roomId:room.id, roomName:room.name, isAdmin:myUser===room.adminUser, adminUser:room.adminUser });
      const plist = Object.keys(room.players).filter(u=>room.players[u].online).map(u=>({username:u,online:true,isAdmin:u===room.adminUser}));
      broadcastRoom(room, { type:'xo_players', players:plist, adminUser:room.adminUser });
      broadcastRoomList();
    }

    if (data.type === "xo_start") {
      const room = myRoomId ? rooms[myRoomId] : null; if (!room || myUser !== room.adminUser) return;
      const { mode, size, rounds, allPlayers } = data;
      room.gameActive = true;

      if (mode === '1v1') {
        const game = xoMakeGame(data.playerX, data.playerO, size, rounds, allPlayers);
        room.xoState = { mode:'1v1', game, scores: {[data.playerX]:0,[data.playerO]:0}, allPlayers };
        broadcastRoom(room, { type:'xo_game_state', game });
      } else {
        // Tournament — build bracket
        const matches = [];
        const shuffled = [...allPlayers];
        for (let i = 0; i < shuffled.length - 1; i += 2) {
          matches.push({ playerX: shuffled[i], playerO: shuffled[i+1], winner: null, scores:{[shuffled[i]]:0,[shuffled[i+1]]:0} });
        }
        const scores = Object.fromEntries(allPlayers.map(u=>[u,0]));
        room.xoState = { mode:'tournament', matches, currentMatch:0, scores, size, rounds, allPlayers, done:false };
        // Start first match immediately
        const firstMatch = matches[0];
        const firstGame = xoMakeGame(firstMatch.playerX, firstMatch.playerO, size, rounds, allPlayers);
        room.xoState.game = firstGame;
        firstMatch.scores = firstGame.scores;
        broadcastRoom(room, { type:'xo_tournament_state', tournament: xoTournamentView(room.xoState) });
        setTimeout(() => broadcastRoom(room, { type:'xo_game_state', game: firstGame }), 1500);
        broadcastRoomList();
      }
    }

    if (data.type === "xo_move") {
      const room = myRoomId ? rooms[myRoomId] : null; if (!room || !room.xoState) return;
      const game = room.xoState.game; if (!game) return;
      if (data.mark !== game.turn) return;
      if (myUser !== (game.turn==='X' ? game.playerX : game.playerO)) return;
      if (game.board[data.index] !== '') return;
      game.board[data.index] = data.mark;

      // Check win
      const won = xoServerCheckWin(game.board, game.size, data.mark);
      const draw = !won && game.board.every(c=>c!=='');
      if (won) { game.winner = data.mark; game.scores[myUser] = (game.scores[myUser]||0)+1; if(room.xoState.scores) room.xoState.scores[myUser]=(room.xoState.scores[myUser]||0)+1; }
      else if (draw) { game.draw = true; }
      else { game.turn = game.turn==='X'?'O':'X'; }

      broadcastRoom(room, { type:'xo_game_state', game });
    }

    if (data.type === "xo_next_round") {
      const room = myRoomId ? rooms[myRoomId] : null; if (!room || myUser !== room.adminUser || !room.xoState) return;
      const s = room.xoState;
      if (s.mode === '1v1') {
        s.game.round++;
        // Swap who starts
        const nextX = s.game.playerO, nextO = s.game.playerX;
        s.game.playerX = nextX; s.game.playerO = nextO;
        s.game.board = Array(s.game.size*s.game.size).fill('');
        s.game.turn = 'X'; s.game.winner = null; s.game.draw = false;
        broadcastRoom(room, { type:'xo_game_state', game: s.game });
      } else if (s.mode === 'tournament') {
        const m = s.matches[s.currentMatch];
        // Update match scores from game
        if (s.game) m.scores = s.game.scores;
        s.game.board = Array(s.game.size*s.game.size).fill('');
        s.game.turn = 'X'; s.game.winner = null; s.game.draw = false;
        s.game.round = (s.game.round||1)+1;
        broadcastRoom(room, { type:'xo_game_state', game: s.game });
      }
    }

    if (data.type === "xo_end_game") {
      const room = myRoomId ? rooms[myRoomId] : null; if (!room || myUser !== room.adminUser || !room.xoState) return;
      const s = room.xoState;
      if (s.mode === '1v1') {
        const scores = s.game.scores;
        const winner = Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];
        const winnerName = winner[1] > 0 ? winner[0] : null;
        broadcastRoom(room, { type:'xo_result', winner:winnerName, scores, mode:'1v1' });
      } else {
        broadcastRoom(room, { type:'xo_result', winner: xoTournamentWinner(s), scores:s.scores, mode:'tournament' });
      }
      room.gameActive = false;
      broadcastRoomList();
    }

    if (data.type === "xo_tournament_next") {
      const room = myRoomId ? rooms[myRoomId] : null; if (!room || myUser !== room.adminUser || !room.xoState) return;
      const s = room.xoState; if (s.mode !== 'tournament') return;
      const prevMatch = s.matches[s.currentMatch];
      // Finalize prev match winner
      if (prevMatch && !prevMatch.winner) {
        const sc = prevMatch.scores||{};
        const sorted = Object.entries(sc).sort((a,b)=>b[1]-a[1]);
        prevMatch.winner = sorted[0][1]>sorted[1][1] ? sorted[0][0] : null;
        if (prevMatch.winner) s.scores[prevMatch.winner] = (s.scores[prevMatch.winner]||0)+2;
        else { s.scores[sorted[0][0]]=(s.scores[sorted[0][0]]||0)+1; s.scores[sorted[1][0]]=(s.scores[sorted[1][0]]||0)+1; }
      }
      s.currentMatch++;
      if (s.currentMatch >= s.matches.length) {
        s.done = true;
        broadcastRoom(room, { type:'xo_tournament_state', tournament: xoTournamentView(s) });
      } else {
        const m = s.matches[s.currentMatch];
        s.game = xoMakeGame(m.playerX, m.playerO, s.size, s.rounds, s.allPlayers);
        m.scores = s.game.scores;
        broadcastRoom(room, { type:'xo_game_state', game: s.game });
      }
    }

    if (data.type === "xo_back_lobby") {
      const room = myRoomId ? rooms[myRoomId] : null; if (!room || myUser !== room.adminUser) return;
      room.xoState = null; room.gameActive = false;
      const plist = Object.keys(room.players).filter(u=>room.players[u].online).map(u=>({username:u,online:true,isAdmin:u===room.adminUser}));
      broadcastRoom(room, { type:'xo_back_lobby' });
      broadcastRoom(room, { type:'xo_players', players:plist, adminUser:room.adminUser });
      broadcastRoomList();
    }

    if (data.type === "xo_leave") {
      const room = myRoomId ? rooms[myRoomId] : null;
      if (room && room.players[myUser]) {
        room.players[myUser].online = false;
        recalcRoomAdmin(room);
        const plist = Object.keys(room.players).filter(u=>room.players[u].online).map(u=>({username:u,online:true,isAdmin:u===room.adminUser}));
        broadcastRoom(room, { type:'xo_players', players:plist, adminUser:room.adminUser });
        if (Object.values(room.players).every(p=>!p.online)) { delete rooms[myRoomId]; }
        broadcastRoomList();
      }
      myRoomId = null;
      sendTo(ws, { type:'xo_left' });
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
      broadcastOnlineUsers();
    }
  });

  ws.on("close", () => {
    if (!myUser) return;
    const room = myRoom();
    if (room && room.players[myUser]) {
      room.players[myUser].online = false;
      const capturedUser = myUser;
      const capturedRoomId = myRoomId;
      lastRoom[capturedUser] = {
        roomId: capturedRoomId,
        timer: setTimeout(() => {
          delete lastRoom[capturedUser];
          const r = rooms[capturedRoomId];
          if (!r || !r.players[capturedUser] || r.players[capturedUser].online) return;
          const wasAdmin = capturedUser === r.adminUser;
          if (wasAdmin) { r.adminUser = null; recalcRoomAdmin(r); if (r.adminUser) sendToUser(r.adminUser, { type: "you_are_admin" }, r); }
          broadcastRoomPlayers(r);
          if (Object.values(r.players).every(p => !p.online)) { delete rooms[capturedRoomId]; broadcastRoomList(); }
          broadcastOnlineUsers();
        }, 30000)
      };
      broadcastRoomPlayers(room);
    }
    if (globalPlayers[myUser]) globalPlayers[myUser].online = false;
    broadcastOnlineUsers();
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
