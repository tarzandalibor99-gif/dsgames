// ╔══════════════════════════════════════════════════════╗
// ║  IGRA: Zanimljiva Geografija                         ║
// ║  Registracija: automatska pri učitavanju             ║
// ╚══════════════════════════════════════════════════════╝

registerGame({
  id: 'geo',
  name: 'Zanimljiva Geografija',
  icon: '🗺️',
  desc: 'Država, grad, reka, planina i još mnogo toga!',

  // ── HTML ekrani ──────────────────────────────────────
  screens: `
  <!-- ══ GEO ROOMS ══ -->
  <div class="screen" id="screen-geo-rooms">
    <div class="rooms-header">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="btn btn-outline btn-sm" onclick="showScreen('home')">← Nazad</button>
        <div>
          <h2 style="font-family:'Fredoka One',cursive;font-size:1.4rem;">🗺️ Zanimljiva Geografija</h2>
          <p style="color:var(--soft);font-size:.82rem;margin-top:2px">Uđi u sobu ili napravi svoju</p>
        </div>
      </div>
      <button class="btn btn-green" onclick="geoOpenCreateRoom()" style="white-space:nowrap">➕ Nova soba</button>
    </div>
    <div id="geo-rooms-grid" class="rooms-grid">
      <div class="empty-rooms"><div class="er-icon">🏠</div><p>Nema aktivnih soba.<br>Budi prvi — napravi sobu!</p></div>
    </div>
  </div>

  <!-- ══ GEO LOBBY ══ -->
  <div class="screen" id="screen-lobby">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <button class="btn btn-outline btn-sm" onclick="leaveRoom()">← Izađi</button>
      <div style="flex:1">
        <div style="font-family:'Fredoka One',cursive;font-size:1.4rem">🗺️ <span id="lobby-room-name">Soba</span></div>
        <div style="color:var(--soft);font-size:.82rem" id="lobby-subtitle">Čekaonica</div>
      </div>
    </div>
    <div class="card"><h2>👥 Igrači u sobi</h2><div id="lobby-list"></div></div>
    <div style="text-align:center;margin-bottom:16px">
      <button class="btn btn-blue" id="btn-lock" onclick="sendToggleLock()" style="font-size:1.05rem;padding:14px 36px">🔓 Zaključaj se!</button>
      <p style="color:var(--soft);font-size:.82rem;margin-top:8px">Svi moraju da se zaključaju pre početka</p>
    </div>
    <div id="admin-panel" style="display:none">
      <div class="card">
        <h2>⚙️ Podešavanja <span class="admin-badge">👑 Samo za tebe</span></h2>
        <div style="background:var(--deep);border-radius:14px;padding:16px;margin-bottom:16px">
          <div style="font-size:.8rem;font-weight:700;color:var(--soft);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">⏱️ Vreme po rundi</div>
          <div class="flex-row">
            <button class="btn btn-sm time-btn" data-sec="60">1 min</button>
            <button class="btn btn-sm time-btn active-time" data-sec="120">2 min</button>
            <button class="btn btn-sm time-btn" data-sec="180">3 min</button>
            <button class="btn btn-sm time-btn" data-sec="0">Bez tajmera</button>
          </div>
        </div>
        <div style="text-align:center">
          <button class="btn btn-primary" id="btn-start" disabled onclick="adminStartGame()" style="font-size:1.05rem;padding:14px 40px">🎲 Pokreni igru!</button>
          <p style="color:var(--soft);font-size:.82rem;margin-top:8px" id="start-hint">Čekaj da se svi zaključaju...</p>
        </div>
      </div>
    </div>
    <div id="non-admin-wait" style="display:none">
      <div class="waiting-notice">⏳ Čekaj admina (<span id="admin-name-lbl">-</span>) da pokrene igru...</div>
    </div>
  </div>

  <!-- ══ LETTER ══ -->
  <div class="screen" id="screen-letter">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <button class="btn btn-outline btn-sm" onclick="confirmLeaveGame()">← Izađi</button>
      <div class="round-badge" id="round-lbl" style="margin-bottom:0">🎯 Runda 1</div>
    </div>
    <div class="letter-display">
      <div class="letter-circle"><span id="drawn-letter" class="rolling-letter">?</span></div>
      <p style="color:var(--soft);font-size:1.1rem">Izvučeno slovo je:</p>
    </div>
    <div style="text-align:center">
      <button class="btn btn-green" onclick="goToWriting()" style="font-size:1.1rem;padding:14px 40px">✏️ Kreni sa pisanjem!</button>
    </div>
  </div>

  <!-- ══ WRITING ══ -->
  <div class="screen" id="screen-writing">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <button class="btn btn-outline btn-sm" onclick="confirmLeaveGame()">← Izađi</button>
      <div class="round-badge" id="writing-round-lbl" style="margin-bottom:0">🎯 Runda 1</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div><span style="font-size:1.1rem;color:var(--soft)">Slovo: </span>
        <span id="writing-letter" style="font-family:'Fredoka One',cursive;font-size:2rem;color:var(--gold)">A</span></div>
      <div class="timer-text" id="timer-text">2:00</div>
    </div>
    <div class="timer-bar"><div class="timer-fill" id="timer-fill" style="width:100%"></div></div>
    <div id="writing-categories" class="categories-grid"></div>
    <div style="text-align:center;margin-top:20px">
      <button class="btn btn-gold" onclick="submitAnswers()" id="btn-submit" style="font-size:1.1rem;padding:14px 40px">✅ Predaj odgovore</button>
    </div>
    <div id="admin-change-letter" style="display:none;text-align:center;margin-top:12px">
      <div style="color:var(--soft);font-size:.8rem;margin-bottom:8px;font-weight:700">👑 Admin — promeni slovo:</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:500px;margin:0 auto" id="letter-btns"></div>
    </div>
    <div class="submitted-chips" id="submitted-chips"></div>
  </div>

  <!-- ══ SCORING ══ -->
  <div class="screen" id="screen-scoring">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <button class="btn btn-outline btn-sm" onclick="confirmLeaveGame()">← Izađi</button>
      <div class="round-badge" id="scoring-round-lbl" style="margin-bottom:0">🎯 Runda 1</div>
    </div>
    <div class="section-title">📋 Pregled odgovora</div>
    <p style="color:var(--soft);margin-bottom:16px;font-size:.9rem" id="scoring-sub"></p>
    <div id="scoring-content"></div>
    <div style="text-align:center;margin-top:24px" id="scoring-btns"></div>
  </div>

  <!-- ══ RESULTS ══ -->
  <div class="screen" id="screen-results">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <button class="btn btn-outline btn-sm" onclick="confirmLeaveGame()">← Izađi</button>
      <div class="round-badge" id="results-round-lbl" style="margin-bottom:0">📊 Nakon runde 1</div>
    </div>
    <div class="section-title">🏆 Trenutni plasman</div>
    <div id="leaderboard"></div>
    <div class="divider"></div>
    <div style="text-align:center;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:10px" id="results-btns"></div>
  </div>
  `,

  // ── CSS ──────────────────────────────────────────────
  css: `
  .letter-display{text-align:center;margin:30px 0;}
  .letter-circle{width:160px;height:160px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--purple));display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 0 60px rgba(233,69,96,.5);}
  .letter-circle span{font-family:'Fredoka One',cursive;font-size:6rem;color:white;}
  .rolling-letter{display:inline-block;animation:rollIn .8s cubic-bezier(.34,1.56,.64,1);}
  @keyframes rollIn{0%{transform:rotateY(90deg) scale(.5);opacity:0}100%{transform:rotateY(0) scale(1);opacity:1}}
  .categories-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin:20px 0;}
  .category-item{background:var(--deep);border:1.5px solid rgba(255,255,255,.1);border-radius:14px;padding:14px 16px;transition:border-color .2s;}
  .category-item:focus-within{border-color:var(--blue);}
  .category-label{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--soft);margin-bottom:8px;display:flex;align-items:center;gap:6px;}
  .category-item input{width:100%;background:transparent;border:none;border-bottom:1.5px solid rgba(255,255,255,.15);border-radius:0;padding:4px 0;font-size:1rem;font-weight:700;color:white;}
  .category-item input:focus{outline:none;border-bottom-color:var(--blue);}
  .category-item input:disabled{opacity:.4;}
  .timer-bar{background:rgba(255,255,255,.08);border-radius:50px;height:8px;margin:16px 0;overflow:hidden;}
  .timer-fill{height:100%;border-radius:50px;background:linear-gradient(90deg,var(--green),var(--gold),var(--accent));transition:width 1s linear;}
  .timer-text{text-align:right;font-size:.85rem;color:var(--soft);margin-bottom:4px;font-weight:700;}
  .submitted-chips{margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;}
  .sub-chip{background:rgba(78,203,113,.15);border:1px solid rgba(78,203,113,.3);border-radius:50px;padding:4px 12px;font-size:.82rem;font-weight:700;color:var(--green);}
  .answers-review{background:var(--deep);border-radius:16px;padding:20px;margin:16px 0;border:1px solid rgba(255,255,255,.07);}
  .answers-review h3{font-size:1rem;color:var(--soft);margin-bottom:14px;font-weight:700;}
  .leaderboard-item{display:flex;align-items:center;gap:14px;background:var(--card);border-radius:14px;padding:16px 20px;margin-bottom:10px;border:1.5px solid rgba(255,255,255,.06);animation:slideIn .4s ease backwards;}
  .leaderboard-item:nth-child(1){border-color:rgba(245,166,35,.4)}
  .leaderboard-item:nth-child(2){border-color:rgba(192,192,192,.3)}
  .leaderboard-item:nth-child(3){border-color:rgba(205,127,50,.3)}
  .rank-badge{font-family:'Fredoka One',cursive;font-size:1.6rem;width:40px;text-align:center;}
  .lb-name{flex:1;font-weight:800;font-size:1.1rem;}
  .lb-score{font-family:'Fredoka One',cursive;font-size:1.8rem;color:var(--gold);}
  .section-title{font-family:'Fredoka One',cursive;font-size:1.4rem;margin-bottom:16px;color:var(--blue);}
  .divider{height:1px;background:rgba(255,255,255,.07);margin:20px 0;}
  @media(max-width:640px){
    .categories-grid{grid-template-columns:1fr 1fr;}
    .letter-circle{width:120px;height:120px;}
    .letter-circle span{font-size:4.5rem;}
  }
  `,

  // ── WS PORUKE ────────────────────────────────────────
  handleMessage(data) {
    if(data.type==='room_list'){ geoRoomList=data.rooms; geoRenderRooms(); }
    if(data.type==='joined_room'){
      myRoomId=data.roomId; myRoomName=data.roomName;
      roundTime=data.roundTime||120; me.isAdmin=data.isAdmin; currentAdminUser=data.adminUser;
      document.getElementById('header-uname').textContent=me.username+(me.isAdmin?' 👑':'');
      document.getElementById('lobby-room-name').textContent=data.roomName;
      document.getElementById('chat-panel').style.display='flex';
      totalScores={}; myLocked=false;
      showScreen('lobby');
      if(me.isAdmin) toast('👑 Ti si admin ove sobe!','var(--gold)');
    }
    if(data.type==='left_room'){
      myRoomId=null; myRoomName=''; me.isAdmin=false; currentAdminUser=null;
      document.getElementById('header-uname').textContent=me.username;
      document.getElementById('chat-panel').style.display='none';
      document.getElementById('chat-messages').innerHTML='';
      showScreen('geo-rooms');
    }
    if(data.type==='room_deleted'){
      toast('🗑️ '+data.msg,'var(--accent)');
      myRoomId=null; myRoomName=''; me.isAdmin=false;
      document.getElementById('chat-panel').style.display='none';
      showScreen('geo-rooms');
    }
    if(data.type==='room_error'){
      const je=document.getElementById('join-error');
      if(je){ je.textContent=data.msg; je.style.display='block'; }
      toast('❌ '+data.msg,'var(--accent)');
    }
    if(data.type==='players'){
      lobbyPlayers=data.players; currentAdminUser=data.adminUser;
      me.isAdmin=me.username===currentAdminUser;
      document.getElementById('header-uname').textContent=me.username+(me.isAdmin?' 👑':'');
      updateLobbyUI(); updatePresenceBar(lobbyPlayers);
    }
    if(data.type==='you_are_admin'){
      me.isAdmin=true; currentAdminUser=me.username;
      document.getElementById('header-uname').textContent=me.username+' 👑';
      toast('👑 Ti si sada admin!','var(--gold)'); updateLobbyUI();
    }
    if(data.type==='kicked'){ alert(`🥾 ${data.msg}`); doLogout(); }
    if(data.type==='game_start'){
      gamePlayers=data.players; currentLetter=data.letter; roundTime=data.roundTime;
      gameRound=1; submitted=new Set(); myAnswers={}; pendingRoundScores={};
      showRoundLetter();
    }
    if(data.type==='player_submitted'){ submitted.add(data.username); updateSubmitted(); }
    if(data.type==='all_answers'){ allAnswers=data.answers; clearInterval(timerInterval); buildScoringScreen(); showScreen('scoring'); }
    if(data.type==='scores_update'){
      Object.entries(data.roundScores).forEach(([u,p])=>{ totalScores[u]=(totalScores[u]||0)+p; });
      pendingRoundScores=data.roundScores; buildResultsScreen(); showScreen('results');
    }
    if(data.type==='new_round'){
      gamePlayers=data.players; currentLetter=data.letter; roundTime=data.roundTime;
      gameRound++; submitted=new Set(); myAnswers={}; pendingRoundScores={};
      showRoundLetter();
    }
    if(data.type==='letter_changed'){
      currentLetter=data.letter;
      document.getElementById('drawn-letter').textContent=data.letter;
      document.getElementById('writing-letter').textContent=data.letter;
      const acl=document.getElementById('admin-cur-letter'); if(acl) acl.textContent=data.letter;
      document.querySelectorAll('[id^=cat-]').forEach(inp=>inp.placeholder=`Na slovo ${data.letter}...`);
      toast(`🔄 Admin je promenio slovo na: ${data.letter}`,'var(--purple)');
    }
    if(data.type==='restart'){
      totalScores={}; myLocked=false;
      lobbyPlayers=data.players||[]; currentAdminUser=data.adminUser||currentAdminUser;
      me.isAdmin=me.username===currentAdminUser;
      document.getElementById('header-uname').textContent=me.username+(me.isAdmin?' 👑':'');
      updateLobbyUI(); showScreen('lobby');
    }
    if(data.type==='room_created'){
      myRoomId=data.roomId;
      send({type:'join_room', roomId:data.roomId, password:'', gameType:'geo'});
    }
  },

  // ── INIT ─────────────────────────────────────────────
  init() {
    // Poveži time buttons
    document.querySelectorAll('.time-btn').forEach(btn=>{
      btn.onclick=()=>{ document.querySelectorAll('.time-btn').forEach(b=>b.classList.remove('active-time')); btn.classList.add('active-time'); roundTime=parseInt(btn.dataset.sec); };
    });
  }
});

// ── GEO ROOMS ──
let geoRoomList = [];

function geoRenderRooms(){
  const grid=document.getElementById('geo-rooms-grid'); if(!grid) return;
  if(!geoRoomList.length){
    grid.innerHTML='<div class="empty-rooms"><div class="er-icon">🏠</div><p>Nema aktivnih soba.<br>Budi prvi — napravi sobu!</p></div>';
    return;
  }
  grid.innerHTML='';
  geoRoomList.forEach(r=>{
    const isFull=r.playerCount>=r.maxPlayers;
    const card=document.createElement('div');
    card.className='room-card'+(isFull?' room-full':'')+(r.gameActive?' room-playing':'');
    card.onclick=isFull?null:()=>geoTryJoinRoom(r.id,r.hasPassword);
    card.innerHTML=`
      <div class="room-count">${r.playerCount}/${r.maxPlayers} 👤</div>
      <div class="room-name">🏠 ${r.name}</div>
      <div class="room-meta">
        <span>👤 ${r.owner}</span>
        <span>⏱️ ${r.roundTime>0?Math.floor(r.roundTime/60)+'min':'∞'}</span>
        ${r.hasPassword?'<span class="room-badge badge-lock">🔒 Lozinka</span>':''}
        <span class="room-badge ${r.gameActive?'badge-playing':'badge-waiting'}">${r.gameActive?'🎮 U igri':'✅ Čeka'}</span>
      </div>`;
    grid.appendChild(card);
  });
}

function geoOpenCreateRoom(){
  window._creatingGameType='geo';
  document.getElementById('cr-name').value='';
  document.getElementById('cr-password').value='';
  document.getElementById('create-room-modal').style.display='block';
  document.getElementById('cr-overlay').style.display='block';
  setTimeout(()=>document.getElementById('cr-name').focus(),100);
}

function geoTryJoinRoom(roomId,hasPassword){
  if(hasPassword){
    pendingJoinRoomId=roomId;
    document.getElementById('join-password').value='';
    document.getElementById('join-error').style.display='none';
    document.getElementById('join-modal').style.display='block';
    document.getElementById('cr-overlay').style.display='block';
    setTimeout(()=>document.getElementById('join-password').focus(),100);
  } else {
    send({type:'join_room', roomId, password:'', gameType:'geo'});
  }
}

// ── LOBBY ──
function leaveRoom(){
  if(!confirm('Napustiš sobu?')) return;
  send({type:'leave_room'});
}

function updateLobbyUI(){
  const list=document.getElementById('lobby-list'); list.innerHTML='';
  lobbyPlayers.forEach((p,i)=>{
    const color=AVATAR_COLORS[i%AVATAR_COLORS.length];
    const isMe=p.username===me.username;
    const isAdm=p.username===currentAdminUser;
    let adminBtns='';
    if(me.isAdmin&&!isMe){
      adminBtns=`<button class="kick-btn" onclick="kickPlayer('${p.username}')">🥾 Kick</button>
        <button class="makeadmin-btn" onclick="transferAdmin('${p.username}')">👑 Admin</button>`;
    }
    const row=document.createElement('div'); row.className='player-row';
    row.innerHTML=`
      <div class="avatar" style="background:${color}20;color:${color};border:1.5px solid ${color}40">${p.username.slice(0,2).toUpperCase()}</div>
      <div class="player-row-name">${p.username}${isAdm?'<span class="admin-badge">👑 Admin</span>':''}${isMe?'<span style="color:var(--soft);font-size:.72rem;margin-left:5px">(ti)</span>':''}</div>
      <div class="activity-dot ${p.active!==false?'dot-active':'dot-away'}"></div>
      <span class="status-chip ${p.locked?'chip-ready':'chip-wait'}">${p.locked?'✅ Spreman':'⏳ Čeka'}</span>
      ${adminBtns}`;
    list.appendChild(row);
  });
  const lockBtn=document.getElementById('btn-lock');
  if(myLocked){ lockBtn.textContent='✅ Zaključan! (klikni da otključaš)'; lockBtn.className='btn btn-green'; }
  else { lockBtn.textContent='🔓 Zaključaj se (spreman sam!)'; lockBtn.className='btn btn-blue'; }
  const online=lobbyPlayers.length, locked=lobbyPlayers.filter(p=>p.locked).length, allReady=online>=2&&locked===online;
  if(me.isAdmin){
    document.getElementById('admin-panel').style.display='block';
    document.getElementById('non-admin-wait').style.display='none';
    document.getElementById('lobby-subtitle').textContent='Čekaonica — ti si admin 👑';
    const startBtn=document.getElementById('btn-start');
    startBtn.disabled=!allReady;
    document.getElementById('start-hint').textContent=allReady?'✅ Svi su spremni!':`${locked}/${online} zaključano`;
    document.getElementById('start-hint').style.color=allReady?'var(--green)':'var(--soft)';
  } else {
    document.getElementById('admin-panel').style.display='none';
    document.getElementById('non-admin-wait').style.display='block';
    document.getElementById('lobby-subtitle').textContent='Čekaonica';
    document.getElementById('admin-name-lbl').textContent=currentAdminUser||'admin';
  }
}

function sendToggleLock(){ myLocked=!myLocked; send({type:'toggle_lock',username:me.username,locked:myLocked}); }
function kickPlayer(u){ if(!confirm(`Kick ${u}?`)) return; send({type:'kick_player',username:u}); }
function transferAdmin(u){ if(!confirm(`Dati admin prava igraču ${u}?`)) return; send({type:'transfer_admin',username:u}); }

// ── GAME ──
const CATEGORIES=[
  {key:'drzava',label:'Država',emoji:'🌍'},{key:'grad',label:'Grad',emoji:'🏙️'},
  {key:'selo',label:'Selo',emoji:'🏡'},{key:'reka',label:'Reka',emoji:'🌊'},
  {key:'planina',label:'Planina',emoji:'⛰️'},{key:'zivotinja',label:'Životinja',emoji:'🦁'},
  {key:'biljka',label:'Biljka',emoji:'🌿'},{key:'predmet',label:'Predmet',emoji:'📦'},
  {key:'ime',label:'Ime',emoji:'👤'},
];
const LETTER_POOL=['A','B','V','G','D','E','Ž','Z','I','K','L','M','N','O','P','R','S','T','U','F','H','C','Č','Š'];
const SCORE_RULES={same:5,unique:10,bonus:20};
let _letterBag=[];

function randomLetter(exclude){
  if(_letterBag.length===0) _letterBag=[...LETTER_POOL].sort(()=>Math.random()-.5);
  if(exclude&&_letterBag.length>1){ const idx=_letterBag.indexOf(exclude); if(idx!==-1)_letterBag.splice(idx,1); }
  return _letterBag.shift();
}

function adminStartGame(){ send({type:'start_game',letter:randomLetter(currentLetter),roundTime}); }

function showRoundLetter(){
  document.getElementById('round-lbl').textContent=`🎯 Runda ${gameRound}`;
  const lEl=document.getElementById('drawn-letter');
  lEl.textContent=currentLetter; lEl.classList.remove('rolling-letter'); void lEl.offsetWidth; lEl.classList.add('rolling-letter');
  showScreen('letter');
}

function goToWriting(){
  document.getElementById('writing-round-lbl').textContent=`🎯 Runda ${gameRound}`;
  document.getElementById('writing-letter').textContent=currentLetter;
  const grid=document.getElementById('writing-categories'); grid.innerHTML='';
  myAnswers={};
  CATEGORIES.forEach(c=>{
    myAnswers[c.key]='';
    const item=document.createElement('div'); item.className='category-item';
    item.innerHTML=`<div class="category-label"><span>${c.emoji}</span>${c.label}</div>
      <input type="text" id="cat-${c.key}" placeholder="Na slovo ${currentLetter}..." autocomplete="off">`;
    grid.appendChild(item);
  });
  document.querySelectorAll('[id^=cat-]').forEach(inp=>{ const key=inp.id.replace('cat-',''); inp.oninput=()=>{myAnswers[key]=inp.value;}; });
  document.getElementById('btn-submit').disabled=false;
  document.getElementById('submitted-chips').innerHTML='';
  submitted=new Set();
  if(me.isAdmin){
    document.getElementById('admin-change-letter').style.display='block';
    const lb=document.getElementById('letter-btns'); lb.innerHTML='';
    const randBtn=document.createElement('button');
    randBtn.className='btn btn-sm'; randBtn.style.cssText='background:linear-gradient(135deg,var(--purple),#7c4dff);color:white;';
    randBtn.innerHTML='🎲 Novo slovo';
    randBtn.onclick=()=>{ send({type:'change_letter',letter:randomLetter(currentLetter)}); };
    lb.appendChild(randBtn);
    const cur=document.createElement('span');
    cur.style.cssText='color:var(--gold);font-family:Fredoka One,cursive;font-size:1.3rem;display:flex;align-items:center;gap:6px;';
    cur.innerHTML='Slovo: <span id="admin-cur-letter">'+currentLetter+'</span>';
    lb.appendChild(cur);
  } else {
    document.getElementById('admin-change-letter').style.display='none';
  }
  showScreen('writing');
  if(roundTime>0) startTimer();
}

function startTimer(){
  let t=roundTime; updateTimer(t); clearInterval(timerInterval);
  timerInterval=setInterval(()=>{ t--; updateTimer(t); if(t<=0){clearInterval(timerInterval);submitAnswers();} },1000);
}
function updateTimer(t){
  const m=Math.floor(t/60),s=t%60;
  document.getElementById('timer-text').textContent=`${m}:${s.toString().padStart(2,'0')}`;
  const pct=roundTime>0?(t/roundTime)*100:100;
  document.getElementById('timer-fill').style.width=pct+'%';
  if(pct<20) document.getElementById('timer-fill').style.background='var(--accent)';
}

function submitAnswers(){
  clearInterval(timerInterval);
  document.getElementById('btn-submit').disabled=true;
  CATEGORIES.forEach(c=>{ const el=document.getElementById('cat-'+c.key); if(el){myAnswers[c.key]=el.value.trim();el.disabled=true;} });
  send({type:'submit_answers',username:me.username,answers:myAnswers});
  submitted.add(me.username); updateSubmitted();
}
function updateSubmitted(){
  const el=document.getElementById('submitted-chips');
  el.innerHTML=`<span style="color:var(--soft);font-size:.85rem">Predali: ${submitted.size}/${gamePlayers.length}</span> `+[...submitted].map(n=>`<span class="sub-chip">✓ ${n}</span>`).join('');
}

function normalizuj(str){ if(!str) return ''; return str.toLowerCase().trim().replace(/š/g,'s').replace(/č/g,'c').replace(/ć/g,'c').replace(/ž/g,'z').replace(/đ/g,'dj').replace(/dž/g,'dz').replace(/\s+/g,' '); }

function calcCatScores(){
  catScores={};
  gamePlayers.forEach(p=>{catScores[p]={};});
  CATEGORIES.forEach(c=>{
    const valid={};
    gamePlayers.forEach(p=>{ const val=((allAnswers[p]||{})[c.key]||'').trim(); if(val&&normalizuj(val[0]).toUpperCase()===normalizuj(currentLetter).toUpperCase()) valid[p]=normalizuj(val); });
    const vals=Object.values(valid);
    gamePlayers.forEach(p=>{
      if(!valid[p]){catScores[p][c.key]=0;return;}
      const sc=vals.filter(v=>v===valid[p]).length;
      if(vals.length===1) catScores[p][c.key]=SCORE_RULES.bonus;
      else if(sc>1) catScores[p][c.key]=SCORE_RULES.same;
      else catScores[p][c.key]=SCORE_RULES.unique;
    });
  });
}
function getTotal(p){ return Object.values(catScores[p]||{}).reduce((a,b)=>a+b,0); }

function buildScoringScreen(){
  document.getElementById('scoring-round-lbl').textContent=`🎯 Runda ${gameRound}`;
  calcCatScores();
  const content=document.getElementById('scoring-content'); content.innerHTML='';
  const table=document.createElement('div'); table.className='answers-review';
  const cols=`140px ${gamePlayers.map(()=>'1fr').join(' ')}`;
  const hdr=document.createElement('div');
  hdr.style.cssText=`display:grid;grid-template-columns:${cols};gap:8px;padding:8px 0;border-bottom:2px solid rgba(255,255,255,.1);margin-bottom:4px`;
  hdr.innerHTML=`<div style="font-size:.75rem;color:var(--soft);font-weight:700;text-transform:uppercase">Kategorija</div>`+gamePlayers.map(p=>`<div style="font-weight:800;font-size:.9rem;text-align:center">${p}</div>`).join('');
  table.appendChild(hdr);
  CATEGORIES.forEach(c=>{
    const row=document.createElement('div');
    row.style.cssText=`display:grid;grid-template-columns:${cols};gap:8px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);align-items:center`;
    let html=`<div style="font-size:.82rem;color:var(--soft)">${c.emoji} ${c.label}</div>`;
    const scoringVals=gamePlayers.filter(p=>catScores[p][c.key]>0).map(p=>normalizuj(((allAnswers[p]||{})[c.key]||'')));
    gamePlayers.forEach(p=>{
      const val=((allAnswers[p]||{})[c.key]||'').trim();
      const pts=catScores[p][c.key];
      if(!val){html+=`<div style="text-align:center;color:rgba(255,255,255,.2);font-size:.85rem">—</div>`;return;}
      const sc=scoringVals.filter(v=>v===normalizuj(val)).length;
      let ptsColor,ptsLabel;
      if(scoringVals.length===1&&pts>0){ptsColor='var(--green)';ptsLabel='jedini!';}
      else if(sc>1){ptsColor='var(--gold)';ptsLabel='isti';}
      else{ptsColor='var(--blue)';ptsLabel='jedinstven';}
      const origPts=scoringVals.length===1?SCORE_RULES.bonus:sc>1?SCORE_RULES.same:SCORE_RULES.unique;
      if(me.isAdmin){
        html+=`<div style="text-align:center">
          <div style="font-weight:700;font-size:.9rem">${val}</div>
          <div id="pts-lbl-${p}-${c.key}" style="font-size:.75rem;color:${pts>0?ptsColor:'rgba(255,255,255,.3)'};font-weight:700;margin:2px 0">${pts>0?pts+' pts ('+ptsLabel+')':'0 pts (poništeno)'}</div>
          <button id="pts-btn-${p}-${c.key}" onclick="toggleCat('${p}','${c.key}',${origPts},'${ptsColor}','${ptsLabel}')"
            style="padding:3px 10px;border-radius:50px;border:none;cursor:pointer;font-size:.74rem;font-weight:700;background:${pts>0?'rgba(233,69,96,.2)':'rgba(78,203,113,.2)'};color:${pts>0?'var(--accent)':'var(--green)'};border:1px solid ${pts>0?'rgba(233,69,96,.3)':'rgba(78,203,113,.3)'}">${pts>0?'✕ Poništi':'↩ Vrati'}</button>
        </div>`;
      } else {
        html+=`<div style="text-align:center"><div style="font-weight:700;font-size:.9rem">${val}</div><div style="font-size:.75rem;color:${pts>0?ptsColor:'rgba(255,255,255,.3)'};font-weight:700">${pts>0?pts+' pts':'0 pts'}</div></div>`;
      }
    });
    row.innerHTML=html; table.appendChild(row);
  });
  const tot=document.createElement('div');
  tot.style.cssText=`display:grid;grid-template-columns:${cols};gap:8px;padding:12px 0;border-top:2px solid rgba(255,255,255,.1);align-items:center`;
  tot.innerHTML=`<div style="font-weight:800;color:var(--soft);font-size:.85rem">UKUPNO RUNDA</div>`+gamePlayers.map(p=>`<div id="total-cell-${p}" style="text-align:center;font-family:'Fredoka One',cursive;font-size:1.6rem;color:var(--gold)">${getTotal(p)}</div>`).join('');
  table.appendChild(tot); content.appendChild(table);
  const btns=document.getElementById('scoring-btns');
  if(me.isAdmin){ document.getElementById('scoring-sub').textContent='Klikni Poništi ako odgovor nije validan'; btns.innerHTML=`<button class="btn btn-primary" onclick="adminFinishScoring()" style="font-size:1.1rem;padding:14px 40px">🏆 Zaključi rundu</button>`; }
  else { document.getElementById('scoring-sub').textContent='Admin proverava odgovore...'; btns.innerHTML=`<div class="waiting-notice">⏳ Čekaj admina da zaključi rundu...</div>`; }
}
function toggleCat(player,catKey,origPts,color,label){
  const cur=catScores[player][catKey]; catScores[player][catKey]=cur>0?0:origPts;
  const newVal=catScores[player][catKey];
  const lbl=document.getElementById(`pts-lbl-${player}-${catKey}`); const btn=document.getElementById(`pts-btn-${player}-${catKey}`);
  if(lbl){lbl.textContent=newVal>0?`${newVal} pts (${label})`:'0 pts (poništeno)';lbl.style.color=newVal>0?color:'rgba(255,255,255,.3)';}
  if(btn){btn.textContent=newVal>0?'✕ Poništi':'↩ Vrati';btn.style.background=newVal>0?'rgba(233,69,96,.2)':'rgba(78,203,113,.2)';btn.style.color=newVal>0?'var(--accent)':'var(--green)';}
  const cell=document.getElementById(`total-cell-${player}`); if(cell) cell.textContent=getTotal(player);
}
function adminFinishScoring(){
  pendingRoundScores={};
  gamePlayers.forEach(p=>{pendingRoundScores[p]=getTotal(p);});
  send({type:'finish_scoring',roundScores:pendingRoundScores});
}
function buildResultsScreen(){
  document.getElementById('results-round-lbl').textContent=`📊 Nakon runde ${gameRound}`;
  const sorted=gamePlayers.map(ime=>({ime,total:totalScores[ime]||0,round:pendingRoundScores[ime]||0})).sort((a,b)=>b.total-a.total);
  const medals=['🥇','🥈','🥉'];
  const lb=document.getElementById('leaderboard'); lb.innerHTML='';
  sorted.forEach((p,rank)=>{
    const item=document.createElement('div'); item.className='leaderboard-item'; item.style.animationDelay=(rank*.1)+'s';
    item.innerHTML=`<div class="rank-badge">${medals[rank]||'#'+(rank+1)}</div><div class="lb-name">${p.ime}${p.ime===currentAdminUser?'<span class="admin-badge">👑</span>':''}</div><div style="text-align:right"><div class="lb-score">${p.total}</div><div style="font-size:.78rem;color:var(--soft)">+${p.round} ova runda</div></div>`;
    lb.appendChild(item);
  });
  if(gameRound>1){
    const hist=document.createElement('div'); hist.className='answers-review'; hist.style.marginTop='16px';
    hist.innerHTML=`<h3>📈 Ukupan zbir</h3>`+sorted.map((p,i)=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)"><span style="font-size:1.2rem">${medals[i]||'•'}</span><span style="flex:1;font-weight:700">${p.ime}</span><span style="font-family:'Fredoka One',cursive;font-size:1.3rem;color:var(--gold)">${p.total} pts</span></div>`).join('');
    lb.appendChild(hist);
  }
  const btns=document.getElementById('results-btns');
  if(me.isAdmin){
    btns.innerHTML=`<button class="btn btn-green" onclick="adminNextRound()" style="font-size:1.1rem;padding:14px 34px">🎲 Sledeća runda!</button><button class="btn btn-outline" onclick="adminEndGame()" style="font-size:1.1rem;padding:14px 34px">🏠 Završi igru</button>`;
  } else {
    btns.innerHTML=`<div class="waiting-notice">⏳ Čekaj admina da pokrene sledeću rundu...</div>`;
  }
}
function adminNextRound(){ send({type:'next_round',letter:randomLetter(currentLetter),roundTime,players:gamePlayers}); }
function adminEndGame(){ send({type:'restart'}); totalScores={}; }
function confirmLeaveGame(){ if(!confirm('Napusti igru i vrati se na izbor igara?')) return; clearInterval(timerInterval); send({type:'leave_room'}); }
