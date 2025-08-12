/* app.js — ZynMission frontend (vanilla JS)
   Local-first demo: stores users & data in localStorage but prepared to call backend API.
   To connect backend: set API_BASE and implement endpoints described in earlier messages.
*/

const API_BASE = ""; // if you have backend, put its base URL e.g. "https://yourbackend.com/api"

const PTS_PER_MISSION = 50;
const DAILY_POINTS = 20;
const CONVERT_RATE_PTS = 500; // 500 pts
const CONVERT_RATE_ZYN = 3;   // => 3 ZYN

// State
let state = {
  user: null,
  points: 0,
  zyn: 0,
  ref: null,
  leaderboard: []
};

// DOM refs
const el = id => document.getElementById(id);
const show = (pageId) => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  el(pageId).classList.add('active');
};

// Utils: storage key
const STORAGE_KEY = "zynmission_data_v1";

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { state = JSON.parse(raw); } catch(e){ console.warn("bad storage") }
  } else {
    // initial sample leaderboard
    state.leaderboard = [
      {name:"AliZyn", pts:9400, zyn: 30},
      {name:"ZahraX", pts:8800, zyn:22},
      {name:"NeoBetor", pts:8500, zyn:18}
    ];
    saveState();
  }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Telegram WebApp detection
function initTelegramProfile() {
  try {
    if (window?.Telegram?.WebApp?.initDataUnsafe?.user) {
      const u = window.Telegram.WebApp.initDataUnsafe.user;
      const name = (u.first_name||"") + (u.last_name ? " "+u.last_name : "");
      const avatar = u.photo_url || "default-avatar.png";
      const id = String(u.id);
      state.user = { name, avatar, id };
      // referral in URL
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      if (ref) state.ref = ref;
      // register locally (if new)
      if (!state.profileId) {
        state.profileId = id;
        // if ref exists credit referrer locally
        if (ref && ref !== id) {
          // find referrer in leaderboard by id or name - here we simulate
          const found = state.leaderboard.find(x => x.name === ("User"+ref)) || null;
          if (found) found.pts += 20;
        }
      }
      saveState();
    } else {
      // not in telegram web app — allow guest name entry
      if (!state.user) {
        state.user = { name: "Guest Player", avatar:"default-avatar.png", id: "guest" + Math.floor(Math.random()*9999) };
      }
    }
  } catch(e){ console.warn(e) }
}

function renderProfile() {
  el('profileName').textContent = state.user?.name || "Guest Player";
  el('profileId').textContent = state.user?.id ? "ID: " + state.user.id : "ID: —";
  el('points').textContent = state.points;
  el('zyn').textContent = state.zyn;
  el('refCount').textContent = state.ref ? 1 : 0;
  el('profileAvatar').src = state.user?.avatar || "default-avatar.png";

  // profile page
  el('pName').textContent = state.user?.name || "Guest";
  el('pId').textContent = state.user?.id || "—";
  el('pPoints').textContent = state.points;
  el('pZyn').textContent = state.zyn;
  el('pRefs').textContent = state.ref ? 1 : 0;
  el('pAvatar').src = state.user?.avatar || "default-avatar.png";

  // referral link
  const link = `${location.origin}${location.pathname}?ref=${state.user?.id || "guest"}`;
  el('referralLink').value = link;
}

function renderLeaderboard() {
  const list = el('leaderboardList');
  list.innerHTML = "";
  state.leaderboard.slice(0,10).forEach(p => {
    const li = document.createElement('li');
    li.textContent = `${p.name} — ${p.pts} pts • ${p.zyn} ZYN`;
    list.appendChild(li);
  });
  const full = el('leaderListFull');
  full.innerHTML = "";
  state.leaderboard.forEach(p => {
    const li = document.createElement('li');
    li.textContent = `${p.name} — ${p.pts} pts • ${p.zyn} ZYN`;
    full.appendChild(li);
  });
}

// Game logic — Stage & Challenges
const TOTAL_STAGES = 15;
const CHALLENGES_PER_STAGE = 8;
let currentStage = 1;
let currentChallenge = 1;

function startGame(stage = 1, challenge = 1) {
  currentStage = stage;
  currentChallenge = challenge;
  show('gamePage');
  el('stageNo').textContent = currentStage;
  el('challengeNo').textContent = currentChallenge;
  el('gamePoints').textContent = state.points;
  renderChallenge();
}

function renderChallenge() {
  const area = el('challengeArea');
  area.innerHTML = "";
  // For demo, we cycle types: quick-reaction, mcq, puzzle (simple)
  const typeId = (currentChallenge % 3);
  if (typeId === 1) {
    // MCQ
    const q = document.createElement('div');
    q.innerHTML = `<h3>Riddle #${currentStage}.${currentChallenge}</h3>
      <p>Solve: What has keys but can't open locks?</p>`;
    const options = ['A Piano','A Map','A Clock','A River'];
    options.forEach(o => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.style.margin='6px';
      b.textContent = o;
      b.onclick = ()=> { checkAnswer(o === 'A Piano'); };
      q.appendChild(b);
    });
    area.appendChild(q);
  } else if (typeId === 2) {
    // Reaction test
    const q = document.createElement('div');
    q.innerHTML = `<h3>Reaction Test #${currentStage}.${currentChallenge}</h3><p>Wait for green then click!</p>`;
    const box = document.createElement('div');
    box.style.width='200px';box.style.height='100px';box.style.background='#922';box.style.borderRadius='8px';box.style.marginTop='12px';box.style.display='flex';box.style.alignItems='center';box.style.justifyContent='center';box.style.cursor='pointer';
    box.textContent='WAIT';
    q.appendChild(box);
    area.appendChild(q);
    let clicked=false;
    let ready=false;
    const to = Math.random()*2500 + 800;
    setTimeout(()=>{box.style.background = '#292';box.textContent='CLICK'; ready=true;}, to);
    box.onclick = ()=> {
      if (!ready && !clicked) { // early click fail
        checkAnswer(false); clicked=true;
      } else if (ready && !clicked) { checkAnswer(true); clicked=true; }
    };
  } else {
    // Puzzle: simple math
    const a = Math.floor(Math.random()*12)+1;
    const b = Math.floor(Math.random()*9)+1;
    const correct = a*b;
    const q = document.createElement('div');
    q.innerHTML = `<h3>Puzzle #${currentStage}.${currentChallenge}</h3><p>Compute: ${a} × ${b} = ?</p>`;
    const input = document.createElement('input');
    input.type='number';
    input.placeholder='Your answer';
    input.style.padding='8px';input.style.marginTop='12px';
    const sub = document.createElement('button');
    sub.className='btn primary';sub.textContent='Submit';
    sub.onclick = ()=> { checkAnswer(Number(input.value) === correct); };
    q.appendChild(input);q.appendChild(document.createElement('br'));q.appendChild(sub);
    area.appendChild(q);
  }
}

function nextChallengeOrStage(win) {
  if (win) {
    // award points per challenge success
    state.points += PTS_PER_MISSION;
    el('gamePoints').textContent = state.points;
    // persist
    saveState();
    renderProfile();
  }
  // advance
  if (currentChallenge < CHALLENGES_PER_STAGE) {
    currentChallenge++;
  } else {
    if (currentStage < TOTAL_STAGES) {
      currentStage++;
      currentChallenge = 1;
    } else {
      // finished all — loop or stay at last
      alert("You finished all stages! Great job. We'll add more soon.");
      currentStage = TOTAL_STAGES;
      currentChallenge = CHALLENGES_PER_STAGE;
    }
  }
  el('stageNo').textContent = currentStage;
  el('challengeNo').textContent = currentChallenge;
  renderChallenge();
}

function checkAnswer(isCorrect) {
  if (isCorrect) {
    // success flow
    toast("Correct! +50 pts");
    nextChallengeOrStage(true);
  } else {
    toast("Wrong or failed. No points. Try next.");
    nextChallengeOrStage(false);
  }
}

// small toast
function toast(txt) {
  const t = document.createElement('div');
  t.textContent = txt;
  t.style.position='fixed';t.style.bottom='20px';t.style.left='50%';t.style.transform='translateX(-50%)';
  t.style.background='rgba(0,0,0,0.6)';t.style.padding='10px 14px';t.style.borderRadius='10px';t.style.color='white';
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),1800);
}

// Buttons binding
function bindUI() {
  el('btn-open-game').onclick = ()=> startGame();
  el('startMissionBtn').onclick = ()=> {
    // quick win
    state.points += PTS_PER_MISSION;
    saveState();
    renderProfile();
    toast("+50 pts added (quick mission)");
  };
  el('claimDaily').onclick = async ()=> {
    // check lastDaily in state (we use per local date)
    const last = state.lastDaily ? new Date(state.lastDaily) : null;
    const now = new Date();
    if (!last || (now - last) > 24*3600*1000) {
      state.points += DAILY_POINTS;
      state.lastDaily = now.toISOString();
      saveState();
      renderProfile();
      toast("+20 pts claimed");
    } else {
      toast("Daily already claimed");
    }
  };
  el('convertBtn').onclick = async ()=> {
    if (state.points < CONVERT_RATE_PTS) return toast("Not enough points to convert");
    const chunks = Math.floor(state.points / CONVERT_RATE_PTS);
    const gain = chunks * CONVERT_RATE_ZYN;
    state.points -= chunks * CONVERT_RATE_PTS;
    state.zyn += gain;
    saveState();
    renderProfile();
    toast(`Converted ${chunks*CONVERT_RATE_PTS} pts → ${gain} ZYN`);
    // update leaderboard: add user if notable
    state.leaderboard.unshift({name: state.user?.name || 'Player', pts: state.points, zyn: state.zyn});
    if (state.leaderboard.length>30) state.leaderboard.pop();
    saveState(); renderLeaderboard();
  };

  el('btn-wallet').onclick = ()=>{
    // TonConnect integration placeholder
    if (window.TonConnectUI) {
      // if TonConnect UI loaded, you can open widget (advanced integration needed)
      toast("TonConnect available: implement wallet connect flow (see README)");
    } else {
      toast("TonConnect not available (CDN not loaded) — production: configure TonConnect library");
    }
  };

  el('gameBack').onclick = ()=> { show('dashboard'); renderProfile(); renderLeaderboard(); };
  el('lbBack').onclick = ()=> { show('dashboard'); };
  el('profileBack').onclick = ()=> { show('dashboard'); };
}

// init
(function(){
  loadState();
  initTelegramProfile();
  renderProfile();
  renderLeaderboard();
  bindUI();
  // show dashboard by default
  show('dashboard');
})();
