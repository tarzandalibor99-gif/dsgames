// ╔══════════════════════════════════════════════════════╗
// ║  IGRA: Imposter                                      ║
// ╚══════════════════════════════════════════════════════╝

registerGame({
  id: 'imposter',
  name: 'Imposter',
  icon: '🕵️',
  desc: 'Ko nije dobio istu reč kao vi?',

  screens: `
  <!-- ══ IMPOSTER ROOMS ══ -->
  <div class="screen" id="screen-imposter-rooms">
    <div class="rooms-header">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="btn btn-outline btn-sm" onclick="showScreen('home')">← Nazad</button>
        <div>
          <h2 style="font-family:'Fredoka One',cursive;font-size:1.4rem">🕵️ Imposter</h2>
          <p style="color:var(--soft);font-size:.82rem;margin-top:2px">Uđi u sobu ili napravi svoju</p>
        </div>
      </div>
      <button class="btn btn-green" onclick="impOpenCreateRoom()" style="white-space:nowrap">➕ Nova soba</button>
    </div>
    <div id="imposter-rooms-grid" class="rooms-grid">
      <div class="empty-rooms"><div class="er-icon">🕵️</div><p>Nema aktivnih soba.<br>Budi prvi — napravi sobu!</p></div>
    </div>
  </div>

  <!-- ══ IMPOSTER LOBBY ══ -->
  <div class="screen" id="screen-imposter-lobby">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <button class="btn btn-outline btn-sm" onclick="impLeaveRoom()">← Izađi</button>
      <div style="flex:1">
        <div style="font-family:'Fredoka One',cursive;font-size:1.4rem">🕵️ <span id="imp-lobby-room-name">Soba</span></div>
        <div style="color:var(--soft);font-size:.82rem">Čekaonica — spremi se za igru!</div>
      </div>
    </div>
    <div class="card"><h2>👥 Igrači u sobi</h2><div id="imp-lobby-list"></div></div>
    <div id="imp-admin-panel" style="display:none">
      <div class="card">
        <h2>⚙️ Reč za rundu <span class="admin-badge">👑 Samo za tebe</span></h2>
        <div style="background:var(--deep);border-radius:14px;padding:16px 20px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:12px">
          <div>
            <div style="font-size:.78rem;color:var(--soft);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Odabrana reč</div>
            <div id="imp-word-preview" style="font-family:'Fredoka One',cursive;font-size:1.6rem;color:var(--gold)">?</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="impRandomWord()">🎲 Promeni reč</button>
        </div>
        <div style="text-align:center">
          <button class="btn btn-primary" onclick="impAdminStart()" style="font-size:1.1rem;padding:14px 44px">🕵️ Pokreni igru!</button>
          <p style="color:var(--soft);font-size:.82rem;margin-top:8px">Random igrač će biti Imposter</p>
        </div>
      </div>
    </div>
    <div id="imp-non-admin" style="display:none">
      <div class="waiting-notice">⏳ Čekaj da admin pokrene igru...</div>
    </div>
  </div>

  <!-- ══ IMPOSTER ROLE ══ -->
  <div class="screen" id="screen-imposter-role">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <button class="btn btn-outline btn-sm" onclick="impLeaveRoom()">← Izađi</button>
      <div style="font-family:'Fredoka One',cursive;font-size:1.2rem;color:var(--soft)">🕵️ Tvoja uloga</div>
    </div>
    <div id="imp-cover" onclick="impReveal()" style="background:var(--card);border-radius:24px;padding:40px 28px;border:2px dashed rgba(255,255,255,.2);max-width:360px;margin:0 auto;text-align:center;cursor:pointer;transition:border-color .2s;">
      <div style="font-size:4rem;margin-bottom:14px">👆</div>
      <div style="font-family:'Fredoka One',cursive;font-size:1.4rem;margin-bottom:8px">Tapni da vidiš ulogu</div>
      <div style="color:var(--soft);font-size:.88rem">Pazi da niko drugi ne gleda!</div>
    </div>
    <div id="imp-reveal" style="display:none;text-align:center">
      <div id="imp-card-crew" style="display:none;background:linear-gradient(135deg,rgba(78,203,113,.2),rgba(79,195,247,.2));border:2px solid rgba(78,203,113,.4);border-radius:24px;padding:36px 28px;max-width:360px;margin:0 auto">
        <div style="font-size:3.5rem;margin-bottom:10px">✅</div>
        <div style="font-family:'Fredoka One',cursive;font-size:1.6rem;color:var(--green);margin-bottom:10px">Crewmate</div>
        <div style="color:var(--soft);font-size:.88rem;margin-bottom:8px">Tvoja tajna reč je:</div>
        <div id="imp-word-display" style="font-family:'Fredoka One',cursive;font-size:3rem;background:rgba(255,255,255,.1);border-radius:16px;padding:16px 28px;letter-spacing:2px;display:inline-block;margin-top:8px"></div>
        <div style="color:var(--soft);font-size:.82rem;margin-top:14px">Razgovarajte i pronađite Impostera!</div>
      </div>
      <div id="imp-card-imp" style="display:none;background:linear-gradient(135deg,rgba(233,69,96,.2),rgba(179,136,255,.2));border:2px solid rgba(233,69,96,.4);border-radius:24px;padding:36px 28px;max-width:360px;margin:0 auto">
        <div style="font-size:3.5rem;margin-bottom:10px">🕵️</div>
        <div style="font-family:'Fredoka One',cursive;font-size:1.6rem;color:var(--accent);margin-bottom:12px">Ti si Imposter!</div>
        <div style="background:rgba(233,69,96,.12);border-radius:14px;padding:14px;color:var(--soft);font-size:.88rem;line-height:1.6">Ostali imaju tajnu reč, ti ne.<br>Blefuj i ne daj se otkriti! 😈</div>
      </div>
      <button class="btn btn-outline" onclick="impHide()" style="margin-top:16px">🙈 Sakrij ulogu</button>
    </div>
    <div style="padding:0 16px;margin-top:24px">
      <button onclick="impGoToVote()" style="background:linear-gradient(135deg,#e94560,#c0392b);color:white;border:none;border-radius:20px;padding:18px 40px;font-family:'Fredoka One',cursive;font-size:1.5rem;cursor:pointer;width:100%;box-shadow:0 0 30px rgba(233,69,96,.6);animation:pulse 1.5s infinite;letter-spacing:1px;">🚨 UZBUNA — Glasaj ko je Imposter!</button>
    </div>
  </div>

  <!-- ══ IMPOSTER GLASANJE ══ -->
  <div class="screen" id="screen-imposter-vote">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
      <button class="btn btn-outline btn-sm" onclick="showScreen('imposter-role')">← Nazad</button>
      <div>
        <div style="font-family:'Fredoka One',cursive;font-size:1.4rem;color:var(--accent)">🚨 Glasanje</div>
        <div style="color:var(--soft);font-size:.82rem">Ko je Imposter?</div>
      </div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <h2>🗳️ Glasaj za Impostera</h2>
      <p style="color:var(--soft);font-size:.88rem;margin-bottom:16px">Klikni na igrača za koga misliš da je Imposter</p>
      <div id="imp-vote-players"></div>
    </div>
    <div class="card">
      <h2>📊 Rezultati glasanja</h2>
      <div id="imp-vote-results"></div>
    </div>
    <div style="text-align:center;margin-top:16px">
      <div id="imp-reveal-admin-btn" style="display:none">
        <button class="btn btn-primary" onclick="impAdminReveal()" style="font-size:1.05rem;padding:14px 40px">🎭 Otkrij Impostera!</button>
      </div>
      <div id="imp-reveal-wait" style="display:none">
        <div class="waiting-notice">⏳ Čekaj admina da otkrije Impostera...</div>
      </div>
    </div>
  </div>

  <!-- ══ IMPOSTER OTKRIVANJE ══ -->
  <div class="screen" id="screen-imposter-reveal">
    <div style="text-align:center;padding:20px 0">
      <div style="font-size:3rem;margin-bottom:8px">🎭</div>
      <div style="font-family:'Fredoka One',cursive;font-size:2rem;margin-bottom:28px;background:linear-gradient(135deg,var(--accent),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Otkrivanje!</div>
      <div class="card" style="max-width:400px;margin:0 auto 16px">
        <div style="font-size:.82rem;color:var(--soft);margin-bottom:6px;text-transform:uppercase;font-weight:700;letter-spacing:1px">Tajna reč bila je</div>
        <div id="imp-reveal-word" style="font-family:'Fredoka One',cursive;font-size:3rem;color:var(--gold)"></div>
      </div>
      <div class="card" style="max-width:400px;margin:0 auto 16px">
        <div style="font-size:.82rem;color:var(--soft);margin-bottom:10px;text-transform:uppercase;font-weight:700;letter-spacing:1px">Imposter je bio</div>
        <div id="imp-reveal-name" style="font-family:'Fredoka One',cursive;font-size:2.2rem;color:var(--accent)"></div>
        <div style="font-size:3.5rem;margin-top:6px">🕵️</div>
      </div>
      <div class="card" style="max-width:400px;margin:0 auto 24px">
        <div style="font-size:.82rem;color:var(--soft);margin-bottom:10px;text-transform:uppercase;font-weight:700;letter-spacing:1px">Glasanje</div>
        <div id="imp-final-vote-results"></div>
      </div>
      <div id="imp-reveal-btns"></div>
    </div>
  </div>
  `,

  css: `
  .vote-player-btn{display:flex;align-items:center;gap:12px;width:100%;background:var(--card);border:2px solid rgba(255,255,255,.08);border-radius:16px;padding:14px 18px;cursor:pointer;font-family:'Nunito',sans-serif;font-weight:700;font-size:1rem;color:var(--text);transition:all .2s;margin-bottom:10px;}
  .vote-player-btn:hover{border-color:var(--accent);background:rgba(233,69,96,.1);}
  .vote-player-btn.voted{border-color:var(--accent);background:rgba(233,69,96,.2);}
  .vote-count{margin-left:auto;background:var(--accent);color:white;border-radius:50px;padding:2px 12px;font-family:'Fredoka One',cursive;font-size:1rem;}
  .vote-count.zero{background:rgba(255,255,255,.1);color:var(--soft);}
  `,

  handleMessage(data) {
    if(data.type==='imposter_room_list'){ impRoomList=data.rooms; impRenderRooms(); }
    if(data.type==='imposter_joined'){
      impMyRoomId=data.roomId; currentAdminUser=data.adminUser;
      me.isAdmin=data.isAdmin;
      document.getElementById('header-uname').textContent=me.username+(me.isAdmin?' 👑':'');
      document.getElementById('imp-lobby-room-name').textContent=data.roomName;
      impCurrentWord=''; impRandomWord();
      impUpdateLobbyUI();
      showScreen('imposter-lobby');
      if(me.isAdmin) toast('👑 Ti si admin ove sobe!','var(--gold)');
    }
    if(data.type==='imposter_players'){
      impLobbyPlayers=data.players; currentAdminUser=data.adminUser;
      me.isAdmin=me.username===currentAdminUser;
      document.getElementById('header-uname').textContent=me.username+(me.isAdmin?' 👑':'');
      impUpdateLobbyUI();
    }
    if(data.type==='imposter_role'){
      impState.myRole=data.role; impState.myWord=data.word||null; impState.players=data.players; impState.votes={};
      document.getElementById('imp-cover').style.display='block';
      document.getElementById('imp-reveal').style.display='none';
      document.getElementById('imp-card-crew').style.display='none';
      document.getElementById('imp-card-imp').style.display='none';
      showScreen('imposter-role');
    }
    if(data.type==='imposter_vote_update'){ impState.votes=data.votes; impRenderVotes(); }
    if(data.type==='imposter_reveal'){ impState.word=data.word; impState.imposter=data.imposter; impShowReveal(); }
    if(data.type==='imposter_left'){ impMyRoomId=null; impLobbyPlayers=[]; showScreen('imposter-rooms'); }
    if(data.type==='room_created' && window._creatingGameType==='imposter'){
      window._creatingGameType=null;
      send({type:'imposter_join_room', roomId:data.roomId, password:''});
    }
  },

  init() {}
});

// ── STATE ──
const IMP_WORDS=['igla','lopta','stolica','telefon','auto','sunce','drvo','knjiga','cipela','kafa','prozor','sat','lampa','novac','pas','mačka','hleb','voda','more','planina','vetar','kiša','sneg','vatra','brod','avion','bicikl','muzika','film','slika','torba','kaput','ključ','ogledalo','šešir','rukavice','sveća','med','so','šećer','banana','jabuka','narandža','limun','jagoda','lubenica','grožđe','gitara','bubanj','klavir','violina','fudbal','košarka','tenis','plivanje','skijanje','boks'];
let impState={myRole:null,myWord:null,players:[],word:null,imposter:null,votes:{}};
let impMyRoomId=null;
let impLobbyPlayers=[];
let impCurrentWord='';
let impRoomList=[];

// ── SOBE ──
function impRenderRooms(){
  const grid=document.getElementById('imposter-rooms-grid'); if(!grid) return;
  if(!impRoomList.length){
    grid.innerHTML='<div class="empty-rooms"><div class="er-icon">🕵️</div><p>Nema aktivnih soba.<br>Budi prvi — napravi sobu!</p></div>'; return;
  }
  grid.innerHTML=impRoomList.map(r=>`
    <div class="room-card ${r.gameActive?'room-playing':''}" onclick="impTryJoinRoom('${r.id}',${r.hasPassword})">
      <div class="room-count">${r.playerCount}/${r.maxPlayers} 👤</div>
      <div class="room-name">🕵️ ${r.name}</div>
      <div class="room-meta">
        <span>👤 ${r.owner}</span>
        ${r.hasPassword?'<span class="room-badge badge-lock">🔒 Lozinka</span>':''}
        <span class="room-badge ${r.gameActive?'badge-playing':'badge-waiting'}">${r.gameActive?'🎮 U igri':'✅ Čeka'}</span>
      </div>
    </div>`).join('');
}

function impOpenCreateRoom(){
  window._creatingGameType='imposter';
  document.getElementById('cr-name').value='';
  document.getElementById('cr-password').value='';
  document.getElementById('create-room-modal').style.display='block';
  document.getElementById('cr-overlay').style.display='block';
  setTimeout(()=>document.getElementById('cr-name').focus(),100);
}

function impTryJoinRoom(roomId,hasPassword){
  if(hasPassword){
    pendingJoinRoomId=roomId; window._joiningImposterRoom=true;
    document.getElementById('join-password').value='';
    document.getElementById('join-error').style.display='none';
    document.getElementById('join-modal').style.display='block';
    document.getElementById('cr-overlay').style.display='block';
  } else {
    send({type:'imposter_join_room',roomId,password:''});
  }
}

// ── LOBBY ──
function impUpdateLobbyUI(){
  const list=document.getElementById('imp-lobby-list'); if(!list) return;
  list.innerHTML=impLobbyPlayers.map((p,i)=>{
    const color=AVATAR_COLORS[i%AVATAR_COLORS.length];
    const isMe=p.username===me.username, isAdm=p.username===currentAdminUser;
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06)">
      <div style="width:36px;height:36px;border-radius:50%;background:${color}20;color:${color};border:1.5px solid ${color}40;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.9rem;flex-shrink:0">${p.username.slice(0,2).toUpperCase()}</div>
      <div style="flex:1;font-weight:700">${p.username}${isAdm?'<span class="admin-badge">👑</span>':''}${isMe?'<span style="color:var(--soft);font-size:.72rem;margin-left:5px">(ti)</span>':''}</div>
      <span style="padding:4px 12px;border-radius:50px;font-size:.76rem;font-weight:700;background:rgba(79,195,247,.1);color:var(--blue);border:1px solid rgba(79,195,247,.2)">🟢 Online</span>
    </div>`;
  }).join('');
  if(me.isAdmin){
    document.getElementById('imp-admin-panel').style.display='block';
    document.getElementById('imp-non-admin').style.display='none';
    if(!impCurrentWord) impRandomWord();
  } else {
    document.getElementById('imp-admin-panel').style.display='none';
    document.getElementById('imp-non-admin').style.display='block';
  }
}

function impRandomWord(){
  impCurrentWord=IMP_WORDS[Math.floor(Math.random()*IMP_WORDS.length)];
  const el=document.getElementById('imp-word-preview'); if(el) el.textContent=impCurrentWord;
}

function impAdminStart(){
  if(!impCurrentWord) impRandomWord();
  const online=impLobbyPlayers.map(p=>p.username);
  if(online.length<2){toast('Potrebna su minimum 2 igrača!','var(--accent)');return;}
  const imposter=online[Math.floor(Math.random()*online.length)];
  send({type:'imposter_start',roomId:impMyRoomId,word:impCurrentWord,imposter,players:online});
}

function impLeaveRoom(){
  send({type:'imposter_leave',roomId:impMyRoomId});
  impMyRoomId=null; impLobbyPlayers=[]; impState={myRole:null,myWord:null,players:[],word:null,imposter:null,votes:{}};
  showScreen('imposter-rooms');
}

// ── ROLE ──
function impReveal(){
  document.getElementById('imp-cover').style.display='none';
  document.getElementById('imp-reveal').style.display='block';
  if(impState.myRole==='imposter') document.getElementById('imp-card-imp').style.display='block';
  else { document.getElementById('imp-card-crew').style.display='block'; document.getElementById('imp-word-display').textContent=impState.myWord||''; }
}
function impHide(){ document.getElementById('imp-cover').style.display='block'; document.getElementById('imp-reveal').style.display='none'; }

// ── GLASANJE ──
function impGoToVote(){
  impRenderVotes();
  document.getElementById('imp-reveal-admin-btn').style.display=me.isAdmin?'block':'none';
  document.getElementById('imp-reveal-wait').style.display=me.isAdmin?'none':'block';
  showScreen('imposter-vote');
}

function impRenderVotes(){
  const container=document.getElementById('imp-vote-players'); if(!container) return;
  const votes=impState.votes||{};
  const voteCounts={};
  impState.players.forEach(p=>{voteCounts[p]=0;});
  Object.values(votes).forEach(t=>{if(voteCounts[t]!==undefined)voteCounts[t]++;});
  const myVote=votes[me.username];
  container.innerHTML=impState.players.filter(p=>p!==me.username).map((p,i)=>{
    const color=AVATAR_COLORS[i%AVATAR_COLORS.length];
    const count=voteCounts[p]||0, isVoted=myVote===p;
    return `<button class="vote-player-btn ${isVoted?'voted':''}" onclick="impCastVote('${p}')">
      <div style="width:36px;height:36px;border-radius:50%;background:${color}20;color:${color};border:1.5px solid ${color}40;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.9rem;flex-shrink:0">${p.slice(0,2).toUpperCase()}</div>
      <div style="flex:1;text-align:left">${p}${isVoted?' ✓':''}</div>
      <div class="vote-count ${count===0?'zero':''}">${count} ${count===1?'glas':'glasova'}</div>
    </button>`;
  }).join('');
  const results=document.getElementById('imp-vote-results'); if(!results) return;
  results.innerHTML=Object.entries(voteCounts).sort((a,b)=>b[1]-a[1]).map(([p,c])=>`
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)">
      <div style="flex:1;font-weight:700">${p}</div>
      <div style="background:rgba(255,255,255,.08);border-radius:50px;height:8px;flex:2;overflow:hidden"><div style="height:100%;border-radius:50px;background:var(--accent);width:${impState.players.length>1?c/(impState.players.length-1)*100:0}%;transition:width .4s"></div></div>
      <div style="font-family:'Fredoka One',cursive;font-size:1.1rem;color:var(--gold);min-width:24px;text-align:right">${c}</div>
    </div>`).join('');
}

function impCastVote(target){
  impState.votes[me.username]=target;
  send({type:'imposter_vote',roomId:impMyRoomId,voter:me.username,target});
  impRenderVotes(); toast(`Glasao si za: ${target}`,'var(--accent)');
}

function impAdminReveal(){ send({type:'imposter_reveal_req',roomId:impMyRoomId}); }

function impShowReveal(){
  document.getElementById('imp-reveal-word').textContent=impState.word||'?';
  document.getElementById('imp-reveal-name').textContent=impState.imposter||'?';
  const votes=impState.votes||{}, voteCounts={};
  impState.players.forEach(p=>{voteCounts[p]=0;});
  Object.values(votes).forEach(t=>{if(voteCounts[t]!==undefined)voteCounts[t]++;});
  document.getElementById('imp-final-vote-results').innerHTML=Object.entries(voteCounts).sort((a,b)=>b[1]-a[1]).map(([p,c])=>`
    <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)">
      <span style="flex:1;font-weight:700${p===impState.imposter?';color:var(--accent)':''}">${p}${p===impState.imposter?' 🕵️':''}</span>
      <span style="font-family:'Fredoka One',cursive;color:var(--gold)">${c} ${c===1?'glas':'glasova'}</span>
    </div>`).join('');
  const btns=document.getElementById('imp-reveal-btns');
  if(me.isAdmin){
    btns.innerHTML=`<button class="btn btn-green" onclick="impPlayAgain()" style="font-size:1.05rem;padding:14px 34px;margin:6px">🔄 Nova runda</button><button class="btn btn-outline" onclick="impLeaveRoom()" style="font-size:1.05rem;padding:14px 34px;margin:6px">🏠 Izađi</button>`;
  } else {
    btns.innerHTML=`<button class="btn btn-outline" onclick="impLeaveRoom()" style="margin:6px">🏠 Izađi</button>`;
  }
  showScreen('imposter-reveal');
}

function impPlayAgain(){
  impState={myRole:null,myWord:null,players:[],word:null,imposter:null,votes:{}};
  impCurrentWord=''; impRandomWord(); impUpdateLobbyUI(); showScreen('imposter-lobby');
}
