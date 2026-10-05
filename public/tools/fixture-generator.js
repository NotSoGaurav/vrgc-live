/* ═══════════════════════════════════════════════════════════════════
   VRGC FIXTURE GENERATOR — fixture-generator.js
   Phase 1: Step nav, game type, panels, team entry, validation
   Phase 2: Bracket & points-table generation, SVG connectors
   Phase 3: Results entry, live standings, auto-advance
   Phase 4: Poster generator, 4 design templates, PNG export
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ─── GLOBAL STATE ─── */
const FG = {
  step: 1,
  gameType: null,
  teams: [],
  // Bracket
  bracketType: 'single',
  bestOf: 1,
  bracketRounds: [],     // [[{team1,team2,winner,id},...],...]
  // Points table
  matchCount: 6,
  squadsPerLobby: 16,
  placementPoints: [],   // [0-indexed rank] => pts
  killPts: 1,
  killCap: 8,
  wwcdOn: false,
  wwcdBonus: 0,
  pointsResults: [],     // [matchIdx][squadIdx] = {placement:int, kills:int}
  // Round robin
  rrMatches: [],         // [{t1,t2,winner}]
  rrStandings: {},
  currentPreset: 'bgmi-standard',
  posterTemplate: 0,
};

/* ─── PRESETS ─── */
const PRESETS = {
  'bgmi-standard': [
    { label: '#1', pts: 15 }, { label: '#2', pts: 12 }, { label: '#3', pts: 10 },
    { label: '#4', pts: 8  }, { label: '#5', pts: 6  }, { label: '#6', pts: 4  },
    { label: '#7', pts: 3  }, { label: '#8', pts: 2  }, { label: '#9', pts: 1  },
    { label: '#10', pts: 1 }, { label: '#11', pts: 1 }, { label: '#12', pts: 1 },
    { label: '#13+', pts: 0 },
  ],
  'bgmi-esports': [
    { label: '#1', pts: 12 }, { label: '#2', pts: 9 }, { label: '#3', pts: 8 },
    { label: '#4', pts: 7  }, { label: '#5', pts: 6 }, { label: '#6', pts: 5 },
    { label: '#7', pts: 4  }, { label: '#8', pts: 3 }, { label: '#9', pts: 2 },
    { label: '#10', pts: 1 }, { label: '#11+', pts: 0 },
  ],
  'ff-standard': [
    { label: '#1', pts: 10 }, { label: '#2', pts: 6 }, { label: '#3', pts: 5 },
    { label: '#4', pts: 4  }, { label: '#5', pts: 3 }, { label: '#6', pts: 2 },
    { label: '#7', pts: 1  }, { label: '#8+', pts: 0 },
  ],
  'custom': [
    { label: '#1', pts: 15 }, { label: '#2', pts: 12 }, { label: '#3', pts: 10 },
    { label: '#4+', pts: 0 },
  ],
};

const MAPS_BGMI = ['Erangel','Miramar','Sanhok','Vikendi','Livik','Deston'];
const MAPS_FF   = ['Bermuda','Purgatory','Kalahari','Alpine','Nexterra','Bermuda'];
const MAPS_VAL  = ['Bind','Haven','Split','Ascent','Icebox','Breeze','Fracture','Pearl','Lotus','Sunset'];
const MAPS_CS2  = ['Mirage','Inferno','Dust 2','Nuke','Ancient','Overpass','Anubis','Vertigo'];

/* ─── STEP NAVIGATION ─── */
function goToStep(n) {
  if (n > 1 && !FG.gameType) { shakeElement('step1-next'); return; }
  const oldPanel = document.getElementById('panel-step-' + FG.step);
  const newPanel = document.getElementById('panel-step-' + n);
  if (!newPanel) return;
  oldPanel.classList.remove('active');
  newPanel.classList.add('active');
  for (let i = 1; i <= 4; i++) {
    const item = document.getElementById('step-item-' + i);
    if (!item) continue;
    item.classList.remove('active', 'done');
    if (i < n) item.classList.add('done');
    else if (i === n) item.classList.add('active');
  }
  for (let i = 1; i <= 3; i++) {
    const conn = document.getElementById('conn-' + i + '-' + (i+1));
    if (conn) conn.classList.toggle('done', i < n);
  }
  FG.step = n;
  document.querySelector('.fg-main').scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (n === 3) { updateTeamCounter(); updateGenerateBtn(); }
  if (n === 4 && FG.bracketRounds.length > 0) {
    setTimeout(() => drawBracketConnectors(), 100);
  }
}

/* ─── GAME TYPE SELECTION ─── */
function selectGameType(type) {
  FG.gameType = type;
  FG.teams = [];
  ['bracket','points'].forEach(t => {
    document.getElementById('card-' + t).classList.toggle('selected', t === type);
  });
  document.getElementById('step1-next').disabled = false;
  document.querySelectorAll('.fg-rules-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('rules-' + type).classList.add('active');
  document.getElementById('step3-title-word').textContent = type === 'bracket' ? 'TEAMS' : 'SQUADS';
  document.getElementById('step3-sub').textContent = type === 'bracket'
    ? 'Enter team names. Add one by one or paste a list. Drag ⬆ to reorder seeding.'
    : 'Enter squad names. Each squad plays all matches. Lobbies auto-assigned.';
  document.getElementById('counter-label').textContent = type === 'bracket' ? 'Teams Added' : 'Squads Added';
}

/* ─── TOGGLE GROUPS ─── */
function setToggle(btn, groupId) {
  const group = document.getElementById(groupId);
  group.querySelectorAll('.fg-toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
function getToggleValue(groupId) {
  const group = document.getElementById(groupId);
  const active = group.querySelector('.fg-toggle-btn.active');
  return active ? active.textContent.trim() : '';
}

/* ─── STEPPER ─── */
function stepperChange(id, delta, min, max) {
  if (min === undefined) min = 1; if (max === undefined) max = 999;
  const el = document.getElementById(id);
  let val = parseInt(el.textContent) + delta;
  val = Math.max(min, Math.min(max, val));
  el.textContent = val;
  if (id === 'bracket-teams') updateByesPill(val);
  if (id === 'kill-cap') updateKillCapHint();
  if (id === 'pts-matches') updateMatchesHint();
}

function updateByesPill(n) {
  const pill = document.getElementById('bracket-byes-pill');
  const hint = document.getElementById('bracket-teams-hint');
  const nextPow2 = nextPowerOf2(n);
  const byes = nextPow2 - n;
  if (byes === 0) { pill.classList.add('hidden'); hint.textContent = 'Power of 2 — no byes needed'; }
  else {
    pill.classList.remove('hidden');
    document.getElementById('bracket-byes-count').textContent = byes;
    hint.textContent = 'Next bracket size: ' + nextPow2 + ' slots';
  }
}
function nextPowerOf2(n) { if (n <= 1) return 1; let p = 1; while (p < n) p <<= 1; return p; }
function updateKillCapHint() {
  const cap = parseInt(document.getElementById('kill-cap').textContent);
  document.getElementById('kill-cap-hint').textContent = cap === 0 ? 'No kill point cap' : 'Max ' + cap + ' kill pts per match';
}
function updateMatchesHint() {
  document.getElementById('pts-matches-hint').textContent = document.getElementById('pts-matches').textContent;
}

/* ─── PLACEMENT TABLE ─── */
function renderPlacementTable(preset) {
  const tbody = document.getElementById('placement-tbody');
  tbody.innerHTML = '';
  preset.forEach((row, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
    const tr = document.createElement('tr');
    tr.innerHTML = '<td class="fg-pts-rank">' + medal + ' ' + row.label + '</td>' +
      '<td><input class="fg-pts-input" type="number" min="0" max="999" value="' + row.pts + '"></td>' +
      '<td style="width:40px;text-align:center;"><button onclick="removeThisRow(this)" style="color:var(--white-subtle);font-size:0.9rem;opacity:0.5;transition:opacity 0.2s,color 0.2s;" onmouseover="this.style.opacity=1;this.style.color=\'#ef4444\'" onmouseout="this.style.opacity=0.5;this.style.color=\'var(--white-subtle)\'">&#10005;</button></td>';
    tbody.appendChild(tr);
  });
}
function loadPreset(presetKey, btn) {
  FG.currentPreset = presetKey;
  document.querySelectorAll('.fg-preset-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderPlacementTable(PRESETS[presetKey]);
}
function addPlacementRow() {
  const tbody = document.getElementById('placement-tbody');
  const rowNum = tbody.children.length + 1;
  const tr = document.createElement('tr');
  tr.innerHTML = '<td class="fg-pts-rank"><input style="background:none;border:none;border-bottom:1px solid rgba(255,255,255,0.2);color:var(--white-muted);font-family:var(--font-mono);font-size:0.78rem;width:90px;" type="text" placeholder="#' + rowNum + '"></td>' +
    '<td><input class="fg-pts-input" type="number" min="0" max="999" value="0"></td>' +
    '<td style="width:40px;text-align:center;"><button onclick="removeThisRow(this)" style="color:var(--white-subtle);font-size:0.9rem;opacity:0.5;transition:opacity 0.2s,color 0.2s;" onmouseover="this.style.opacity=1;this.style.color=\'#ef4444\'" onmouseout="this.style.opacity=0.5;this.style.color=\'var(--white-subtle)\'">&#10005;</button></td>';
  tbody.appendChild(tr);
}
function removeThisRow(btn) { const row = btn.closest('tr'); if (row) row.remove(); }
function removeLastPlacementRow() {
  const tbody = document.getElementById('placement-tbody');
  if (tbody.children.length > 1) tbody.removeChild(tbody.lastElementChild);
}
function resetToPreset() { renderPlacementTable(PRESETS[FG.currentPreset]); }

/* Read placement points from table UI */
function readPlacementPointsFromTable() {
  const rows = document.querySelectorAll('#placement-tbody tr');
  const result = [];
  rows.forEach(row => {
    const input = row.querySelector('.fg-pts-input');
    result.push(parseInt(input ? input.value : 0) || 0);
  });
  return result;
}

/* ─── TEAM ENTRY ─── */
function addTeam() {
  const input = document.getElementById('add-team-input');
  const name = input.value.trim();
  if (!name) { shakeElement('add-team-input'); return; }
  FG.teams.push(name);
  input.value = '';
  renderTeamList();
  updateTeamCounter();
  updateGenerateBtn();
  input.focus();
}
function removeTeam(idx) {
  FG.teams.splice(idx, 1);
  renderTeamList();
  updateTeamCounter();
  updateGenerateBtn();
}
function renderTeamList() {
  const list = document.getElementById('team-list');
  list.innerHTML = '';
  FG.teams.forEach((name, i) => {
    const row = document.createElement('div');
    row.className = 'fg-team-row';
    row.draggable = true;
    row.dataset.idx = i;
    row.innerHTML =
      '<span class="fg-team-num">' + String(i+1).padStart(2,'0') + '</span>' +
      '<span class="fg-team-drag-handle" title="Drag to reorder">&#10756;</span>' +
      '<input class="fg-team-name-input" type="text" value="' + escHtml(name) + '" ' +
        'oninput="FG.teams[' + i + ']=this.value;updateGenerateBtn()" placeholder="Name...">' +
      '<button class="fg-team-remove" onclick="removeTeam(' + i + ')" title="Remove">&#10005;</button>';
    list.appendChild(row);
    row.addEventListener('dragstart', e => { dragSrcIdx = parseInt(e.currentTarget.dataset.idx); e.currentTarget.style.opacity='0.5'; });
    row.addEventListener('dragend', e => { e.currentTarget.style.opacity='1'; });
    row.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect='move'; });
    row.addEventListener('drop', e => {
      e.preventDefault();
      const destIdx = parseInt(e.currentTarget.dataset.idx);
      if (dragSrcIdx === null || dragSrcIdx === destIdx) return;
      const [moved] = FG.teams.splice(dragSrcIdx, 1);
      FG.teams.splice(destIdx, 0, moved);
      renderTeamList(); updateTeamCounter();
    });
  });
}
let dragSrcIdx = null;

function parsePasteList(text) {
  FG.teams = text.split('\n').map(s => s.trim()).filter(s => s.length > 0);
  updateTeamCounter();
  updateGenerateBtn();
}

/* ─── COUNTERS ─── */
function updateTeamCounter() {
  const count = FG.teams.filter(t => t.trim() !== '').length;
  const valEl = document.getElementById('counter-val');
  const reqEl = document.getElementById('counter-required');
  const stEl  = document.getElementById('counter-status');
  const byeEl = document.getElementById('byes-pill-step3');
  valEl.textContent = count;
  valEl.className = 'fg-counter-val' + (count >= 2 ? ' ok' : '');
  if (FG.gameType === 'bracket') {
    const bracketTeams = parseInt(document.getElementById('bracket-teams').textContent);
    reqEl.textContent = bracketTeams;
    const diff = bracketTeams - count;
    if (diff > 0) { stEl.textContent = diff + ' more to reach target'; stEl.className = 'fg-counter-status warn'; }
    else if (diff < 0) { stEl.textContent = (count-bracketTeams) + ' over target'; stEl.className = 'fg-counter-status warn'; }
    else { stEl.textContent = 'Bracket full — ready!'; stEl.className = 'fg-counter-status ok'; }
    const byes = nextPowerOf2(count) - count;
    if (byes > 0 && count >= 2) { byeEl.classList.remove('hidden'); document.getElementById('byes-step3-count').textContent = byes; }
    else byeEl.classList.add('hidden');
  } else {
    const squads = parseInt(document.getElementById('pts-squads').textContent);
    reqEl.textContent = squads;
    if (count < 4) { stEl.textContent = 'Min 4 squads required'; stEl.className = 'fg-counter-status warn'; }
    else if (count < squads) { stEl.textContent = (squads-count) + ' more to target'; stEl.className = 'fg-counter-status warn'; }
    else { stEl.textContent = count + ' squads ready!'; stEl.className = 'fg-counter-status ok'; }
    byeEl.classList.add('hidden');
  }
}
function updateGenerateBtn() {
  const btn = document.getElementById('generate-btn');
  const validTeams = FG.teams.filter(t => t.trim() !== '');
  btn.disabled = !(validTeams.length >= (FG.gameType === 'points' ? 4 : 2));
}
function switchTeamTab(tab) {
  ['one','paste'].forEach(t => {
    document.getElementById('tab-' + t).classList.toggle('active', t === tab);
    document.getElementById('tab-panel-' + t).classList.toggle('active', t === tab);
  });
  if (tab === 'one') renderTeamList();
}

/* ═══════════════════════════════════════════════════
   PHASE 2: FIXTURE GENERATION
   ═══════════════════════════════════════════════════ */

function generateFixture() {
  const validTeams = FG.teams.filter(t => t.trim() !== '');
  if (validTeams.length < 2) return;

  // Collect rule settings
  FG.placementPoints = readPlacementPointsFromTable();
  FG.killPts  = parseInt(document.getElementById('kill-pts') ? document.getElementById('kill-pts').textContent : 1);
  FG.killCap  = parseInt(document.getElementById('kill-cap') ? document.getElementById('kill-cap').textContent : 0);
  FG.matchCount = parseInt(document.getElementById('pts-matches') ? document.getElementById('pts-matches').textContent : 6);

  const wwcdToggle = document.getElementById('wwcd-toggle');
  FG.wwcdOn = wwcdToggle && wwcdToggle.querySelector('.fg-toggle-btn.active') && wwcdToggle.querySelector('.fg-toggle-btn.active').textContent.trim() === 'ON';
  FG.wwcdBonus = parseInt(document.getElementById('wwcd-pts') ? document.getElementById('wwcd-pts').textContent : 0);

  if (FG.gameType === 'bracket') {
    const fmtToggle = document.getElementById('bracket-format-toggle');
    const fmtActive = fmtToggle ? fmtToggle.querySelector('.fg-toggle-btn.active') : null;
    FG.bracketType = fmtActive ? fmtActive.textContent.trim().toLowerCase().replace(' ','') : 'single';

    const boToggle = document.getElementById('bestof-toggle');
    const boActive = boToggle ? boToggle.querySelector('.fg-toggle-btn.active') : null;
    FG.bestOf = boActive ? parseInt(boActive.textContent.replace('Bo','')) : 1;

    if (FG.bracketType === 'roundrobin') generateRoundRobin(validTeams);
    else if (FG.bracketType === 'double') generateDoubleElim(validTeams);
    else generateSingleElim(validTeams);
  } else {
    generatePointsTable(validTeams);
  }

  goToStep(4);
  renderStep4();
}

/* ── SINGLE ELIMINATION ── */
function generateSingleElim(teams) {
  FG.bracketType = 'single';
  const size = nextPowerOf2(teams.length);
  const seeded = [...teams];
  while (seeded.length < size) seeded.push('BYE');

  FG.bracketRounds = [];
  let currentSlots = seeded.map((name, i) => ({ name, seed: i+1, isBye: name === 'BYE' }));

  while (currentSlots.length > 1) {
    const matches = [];
    for (let i = 0; i < currentSlots.length; i += 2) {
      const t1 = currentSlots[i];
      const t2 = currentSlots[i+1];
      const isByeMatch = t2.isBye || t1.isBye;
      const winner = isByeMatch ? (t1.isBye ? t2 : t1) : null;
      matches.push({ id: FG.bracketRounds.length + '-' + (i/2), team1: t1, team2: t2, winner, isBye: isByeMatch, bestOf: FG.bestOf });
    }
    FG.bracketRounds.push(matches);
    currentSlots = matches.map(m => m.winner ? {...m.winner} : { name: 'TBD', seed: null, isBye: false });
  }
}

/* ── DOUBLE ELIMINATION ── */
function generateDoubleElim(teams) {
  // Generates winners bracket + losers bracket (simplified but functional)
  FG.bracketType = 'double';
  generateSingleElim(teams); // Start with single elim as winners bracket
  // Losers bracket is managed reactively when losers are captured
  // Store the losers bracket structure
  FG.losersBracket = { rounds: [], teams: [] };
}

/* ── ROUND ROBIN ── */
function generateRoundRobin(teams) {
  FG.bracketType = 'roundrobin';
  FG.rrMatches = [];
  FG.rrStandings = {};
  teams.forEach(t => FG.rrStandings[t] = { wins: 0, losses: 0, pts: 0 });

  let matchNum = 1;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i+1; j < teams.length; j++) {
      FG.rrMatches.push({ id: 'rr-' + matchNum++, t1: teams[i], t2: teams[j], winner: null, bestOf: FG.bestOf });
    }
  }
  // Group into rounds (round-robin scheduling)
  FG.bracketRounds = chunkRRRounds(teams, FG.rrMatches);
}

function chunkRRRounds(teams, matches) {
  // Simple round grouping: pair teams in rounds using circle algorithm
  const n = teams.length % 2 === 0 ? teams.length : teams.length + 1;
  const rounds = [];
  const t = [...teams];
  if (t.length % 2 !== 0) t.push('BYE');
  for (let r = 0; r < t.length - 1; r++) {
    const roundMatches = [];
    for (let i = 0; i < t.length / 2; i++) {
      const a = t[i]; const b = t[t.length - 1 - i];
      if (a !== 'BYE' && b !== 'BYE') {
        const found = matches.find(m => (m.t1 === a && m.t2 === b) || (m.t1 === b && m.t2 === a));
        if (found) roundMatches.push(found);
      }
    }
    if (roundMatches.length) rounds.push(roundMatches);
    // Rotate (keep first fixed, rotate rest)
    const last = t.pop();
    t.splice(1, 0, last);
  }
  return rounds;
}

/* ── POINTS TABLE ── */
function generatePointsTable(squads) {
  FG.gameType = 'points';
  FG.pointsResults = [];
  for (let m = 0; m < FG.matchCount; m++) {
    const matchData = [];
    squads.forEach((s, i) => {
      matchData.push({ squadIdx: i, squadName: s, placement: 0, kills: 0 });
    });
    FG.pointsResults.push(matchData);
  }
  FG.squads = squads;
}

/* ─── STEP 4 RENDERING ─── */
function renderStep4() {
  const tag = document.getElementById('step4-tag');
  const title = document.getElementById('step4-title');
  const sub = document.getElementById('step4-sub');

  document.getElementById('bracket-view-wrap').style.display = 'none';
  document.getElementById('points-view-wrap').style.display = 'none';
  document.getElementById('roundrobin-view-wrap').style.display = 'none';

  if (FG.gameType === 'bracket') {
    if (FG.bracketType === 'roundrobin') {
      tag.textContent = 'Round Robin Schedule';
      title.innerHTML = 'ROUND <span>ROBIN</span>';
      sub.textContent = 'All teams play each other. Click to record match winners and track standings.';
      document.getElementById('roundrobin-view-wrap').style.display = 'block';
      renderRoundRobin();
    } else {
      tag.textContent = FG.bracketType === 'double' ? 'Double Elimination Bracket' : 'Single Elimination Bracket';
      title.innerHTML = 'BRACKET <span>VIEW</span>';
      sub.textContent = 'Click a team slot to mark them as winner. Bracket auto-advances after each pick.';
      document.getElementById('bracket-view-wrap').style.display = 'block';
      renderBracket();
      setTimeout(() => drawBracketConnectors(), 200);
    }
  } else {
    tag.textContent = 'Points Table Fixture';
    title.innerHTML = 'STANDINGS <span>' + (FG.squads.length) + ' SQUADS</span>';
    sub.textContent = 'Enter placement and kill count for each squad per match. Standings auto-update.';
    document.getElementById('points-view-wrap').style.display = 'block';
    renderPointsTable();
  }
}

/* ─── BRACKET RENDERING ─── */
function renderBracket() {
  const container = document.getElementById('bk-container');
  container.innerHTML = '';

  FG.bracketRounds.forEach((round, rIdx) => {
    const roundDiv = document.createElement('div');
    roundDiv.className = 'bk-round';
    roundDiv.id = 'bk-round-' + rIdx;

    const label = document.createElement('div');
    label.className = 'bk-round-label';
    label.textContent = getRoundLabel(FG.bracketRounds.length, rIdx);
    roundDiv.appendChild(label);

    round.forEach((match, mIdx) => {
      const wrap = document.createElement('div');
      wrap.className = 'bk-match-wrap';

      const matchDiv = document.createElement('div');
      matchDiv.className = 'bk-match' + (match.winner ? ' completed' : '');
      matchDiv.id = 'bk-match-' + rIdx + '-' + mIdx;

      matchDiv.appendChild(makeTeamSlot(match.team1, rIdx, mIdx, 0, match));
      const div = document.createElement('div'); div.className = 'bk-divider';
      matchDiv.appendChild(div);
      matchDiv.appendChild(makeTeamSlot(match.team2, rIdx, mIdx, 1, match));

      wrap.appendChild(matchDiv);
      roundDiv.appendChild(wrap);
    });

    container.appendChild(roundDiv);
  });

  // Champion column
  const champDiv = document.createElement('div');
  champDiv.className = 'bk-round';
  const champLabel = document.createElement('div');
  champLabel.className = 'bk-round-label';
  champLabel.textContent = '🏆 CHAMPION';
  champDiv.appendChild(champLabel);
  const champWrap = document.createElement('div');
  champWrap.className = 'bk-champion-wrap';
  const champ = document.createElement('div');
  champ.className = 'bk-champion';
  champ.id = 'bk-champion';
  const lastRound = FG.bracketRounds[FG.bracketRounds.length - 1];
  const champion = lastRound && lastRound[0] && lastRound[0].winner;
  champ.innerHTML = '<div class="bc-trophy">🏆</div><div class="bc-label">CHAMPION</div><div class="bc-name">' + (champion ? champion.name : 'TBD') + '</div>';
  champWrap.appendChild(champ);
  champDiv.appendChild(champWrap);
  container.appendChild(champDiv);
}

function makeTeamSlot(team, rIdx, mIdx, slot, match) {
  const div = document.createElement('div');
  let cls = 'bk-team';
  if (team.isBye) cls += ' bye';
  else if (match.winner) {
    if (match.winner.name === team.name) cls += ' winner';
    else cls += ' loser';
  }
  div.className = cls;
  div.dataset.r = rIdx; div.dataset.m = mIdx; div.dataset.s = slot;
  if (!team.isBye && team.name !== 'TBD') {
    div.onclick = () => pickWinner(rIdx, mIdx, slot);
    div.title = 'Click to mark ' + team.name + ' as winner';
  }
  div.innerHTML = '<span class="bk-seed">' + (team.seed ? '#' + team.seed : '—') + '</span>' +
    '<span class="bk-name">' + (team.name || 'TBD') + '</span>';
  return div;
}

function getRoundLabel(total, idx) {
  const remaining = total - idx;
  const matchCount = Math.pow(2, remaining - 1);
  if (remaining === 1) return 'GRAND FINAL';
  if (remaining === 2) return 'SEMI-FINALS';
  if (remaining === 3) return 'QUARTER-FINALS';
  return 'ROUND OF ' + (matchCount * 2);
}

/* ─── BRACKET SVG CONNECTORS ─── */
function drawBracketConnectors() {
  const container = document.getElementById('bk-container');
  const scrollWrap = document.querySelector('.bk-scroll-wrap');
  if (!container || !scrollWrap) return;
  let svg = document.getElementById('bk-svg');
  if (!svg) return;

  const scrollRect = scrollWrap.getBoundingClientRect();
  const cRect = container.getBoundingClientRect();
  svg.style.width = cRect.width + 'px';
  svg.style.height = Math.max(cRect.height, scrollRect.height) + 'px';
  svg.setAttribute('width', cRect.width);
  svg.setAttribute('height', Math.max(cRect.height, scrollRect.height));
  svg.innerHTML = '';

  const rounds = container.querySelectorAll('.bk-round');
  for (let r = 0; r < rounds.length - 2; r++) { // exclude champion column
    const curMatches = rounds[r].querySelectorAll('.bk-match-wrap');
    const nextMatches = rounds[r+1].querySelectorAll('.bk-match-wrap');
    for (let n = 0; n < nextMatches.length; n++) {
      const topWrap = curMatches[n * 2];
      const botWrap = curMatches[n * 2 + 1];
      const nxtWrap = nextMatches[n];
      if (!topWrap || !botWrap || !nxtWrap) continue;

      const tr = topWrap.querySelector('.bk-match').getBoundingClientRect();
      const br = botWrap.querySelector('.bk-match').getBoundingClientRect();
      const nr = nxtWrap.querySelector('.bk-match').getBoundingClientRect();
      const base = cRect;

      const tx = tr.right - base.left;
      const ty = (tr.top + tr.bottom) / 2 - base.top;
      const bx = br.right - base.left;
      const by = (br.top + br.bottom) / 2 - base.top;
      const nx = nr.left - base.left;
      const ny = (nr.top + nr.bottom) / 2 - base.top;
      const midX = tx + (nx - tx) * 0.5;
      const midY = (ty + by) / 2;

      // Determine color based on whether winner is set
      const match1 = FG.bracketRounds[r][n*2];
      const match2 = FG.bracketRounds[r][n*2+1];
      const color = (match1 && match1.winner && match2 && match2.winner) ? 'rgba(123,47,255,0.7)' : 'rgba(123,47,255,0.25)';

      drawLine(svg, tx, ty, midX, ty, color);    // top → mid
      drawLine(svg, bx, by, midX, by, color);    // bottom → mid
      drawLine(svg, midX, ty, midX, by, color);  // vertical connector
      drawLine(svg, midX, midY, nx, ny, color);  // mid → next match
    }
  }
}

function drawLine(svg, x1, y1, x2, y2, color) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', x1); line.setAttribute('y1', y1);
  line.setAttribute('x2', x2); line.setAttribute('y2', y2);
  line.setAttribute('stroke', color); line.setAttribute('stroke-width', '2');
  line.setAttribute('stroke-linecap', 'round');
  svg.appendChild(line);
}

/* ─── PICK WINNER (BRACKET) ─── */
function pickWinner(rIdx, mIdx, slot) {
  const match = FG.bracketRounds[rIdx][mIdx];
  if (!match) return;
  const chosen = slot === 0 ? match.team1 : match.team2;
  if (!chosen || chosen.isBye || chosen.name === 'TBD') return;

  // Set winner
  match.winner = { ...chosen };

  // Advance to next round
  if (rIdx + 1 < FG.bracketRounds.length) {
    const nextMatchIdx = Math.floor(mIdx / 2);
    const nextSlot = mIdx % 2;
    const nextMatch = FG.bracketRounds[rIdx + 1][nextMatchIdx];
    if (nextMatch) {
      if (nextSlot === 0) nextMatch.team1 = { ...chosen };
      else nextMatch.team2 = { ...chosen };
      nextMatch.winner = null; // reset in case user changed a previous result
    }
  }

  // Update champion display
  if (rIdx === FG.bracketRounds.length - 1) {
    const champEl = document.getElementById('bk-champion');
    if (champEl) champEl.innerHTML = '<div class="bc-trophy">🏆</div><div class="bc-label">CHAMPION</div><div class="bc-name">' + chosen.name + '</div>';
  }

  // Re-render bracket
  renderBracket();
  setTimeout(() => drawBracketConnectors(), 100);
}

/* ─── ROUND ROBIN RENDERING ─── */
function renderRoundRobin() {
  const wrap = document.getElementById('rr-schedule-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  const gameTitle = getGameTitle();
  const maps = getMapRotation(gameTitle);

  FG.bracketRounds.forEach((roundMatches, rIdx) => {
    const roundBlock = document.createElement('div');
    roundBlock.className = 'rr-round-block';
    roundBlock.innerHTML = '<div class="rr-round-title">Round ' + (rIdx+1) + ' — ' + roundMatches.length + ' Matches</div>';

    roundMatches.forEach((match, mIdx) => {
      const globalIdx = FG.rrMatches.indexOf(match);
      const row = document.createElement('div');
      row.className = 'rr-match-row';
      row.id = 'rr-row-' + globalIdx;
      const mapName = maps[globalIdx % maps.length] || ('Map ' + (globalIdx+1));
      row.innerHTML =
        '<span class="rr-match-num">M' + (globalIdx+1) + '</span>' +
        '<span class="rr-team">' + match.t1 + '</span>' +
        '<span class="rr-vs">VS</span>' +
        '<span class="rr-team">' + match.t2 + '</span>' +
        '<span style="font-family:var(--font-mono);font-size:0.6rem;color:var(--white-subtle);">' + mapName + '</span>' +
        '<div class="rr-winner-btns">' +
          '<button class="rr-winner-btn ' + (match.winner === match.t1 ? 'picked' : '') + '" onclick="setRRWinner(' + globalIdx + ',\'t1\',this)">' + match.t1.split(' ')[0] + ' W</button>' +
          '<button class="rr-winner-btn ' + (match.winner === match.t2 ? 'picked' : '') + '" onclick="setRRWinner(' + globalIdx + ',\'t2\',this)">' + match.t2.split(' ')[0] + ' W</button>' +
        '</div>';
      roundBlock.appendChild(row);
    });

    wrap.appendChild(roundBlock);
  });

  // Standings block
  const standBlock = document.createElement('div');
  standBlock.className = 'rr-standings-wrap';
  standBlock.innerHTML = '<div class="pts-section-label" style="margin-top:2rem;">&#128202; Round Robin Standings</div>';
  const tbl = document.createElement('table');
  tbl.className = 'pts-standings-table';
  tbl.innerHTML = '<thead><tr><th>#</th><th>Team</th><th>W</th><th>L</th><th>Pts</th></tr></thead>';
  tbl.innerHTML += '<tbody id="rr-standings-body"></tbody>';
  standBlock.appendChild(tbl);
  wrap.appendChild(standBlock);

  updateRRStandings();
}

function setRRWinner(matchIdx, side, btn) {
  const match = FG.rrMatches[matchIdx];
  if (!match) return;
  const winner = side === 't1' ? match.t1 : match.t2;
  match.winner = winner;

  // Update button UI
  const row = document.getElementById('rr-row-' + matchIdx);
  if (row) {
    row.querySelectorAll('.rr-winner-btn').forEach(b => b.classList.remove('picked'));
    btn.classList.add('picked');
  }
  updateRRStandings();
}

function updateRRStandings() {
  const standings = {};
  FG.rrMatches.forEach(m => {
    [m.t1, m.t2].forEach(t => { if (!standings[t]) standings[t] = { w: 0, l: 0, pts: 0 }; });
    if (m.winner) {
      const loser = m.winner === m.t1 ? m.t2 : m.t1;
      standings[m.winner].w++; standings[m.winner].pts += 3;
      standings[loser].l++;
    }
  });
  const sorted = Object.entries(standings).sort((a,b) => b[1].pts - a[1].pts || b[1].w - a[1].w);
  const tbody = document.getElementById('rr-standings-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  sorted.forEach(([name, data], i) => {
    const rankClass = i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : '';
    tbody.innerHTML += '<tr><td><span class="pts-rank-num ' + rankClass + '">' + (i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)) + '</span></td>' +
      '<td class="pts-squad-name">' + name + '</td>' +
      '<td class="pts-cell">' + data.w + '</td><td class="pts-cell">' + data.l + '</td>' +
      '<td class="pts-total-cell">' + data.pts + '</td></tr>';
  });
}

/* ─── POINTS TABLE RENDERING ─── */
function renderPointsTable() {
  renderStandings();
  renderMatchEntryGrid();
}

function calcMatchPoints(placement, kills) {
  // placement: 1-indexed
  const ppts = FG.placementPoints[Math.min(placement - 1, FG.placementPoints.length - 1)] || 0;
  let kpts = kills * FG.killPts;
  if (FG.killCap > 0) kpts = Math.min(kpts, FG.killCap);
  const wwcd = (FG.wwcdOn && placement === 1) ? FG.wwcdBonus : 0;
  return ppts + kpts + wwcd;
}

function getSquadTotals(squadIdx) {
  let totalKills = 0, totalPlace = 0, totalPts = 0, matches = 0;
  FG.pointsResults.forEach(matchData => {
    const entry = matchData[squadIdx];
    if (entry && entry.placement > 0) {
      matches++;
      totalKills += entry.kills;
      const ppts = FG.placementPoints[Math.min(entry.placement - 1, FG.placementPoints.length - 1)] || 0;
      totalPlace += ppts;
      let kpts = entry.kills * FG.killPts;
      if (FG.killCap > 0) kpts = Math.min(kpts, FG.killCap);
      const wwcd = (FG.wwcdOn && entry.placement === 1) ? FG.wwcdBonus : 0;
      totalPts += ppts + kpts + wwcd;
    }
  });
  return { totalKills, totalPlace, totalPts, matches };
}

function renderStandings() {
  const tbody = document.getElementById('pts-standings-body');
  if (!tbody) return;
  const standings = FG.squads.map((name, idx) => ({ name, idx, ...getSquadTotals(idx) }));
  standings.sort((a, b) => b.totalPts - a.totalPts || b.totalKills - a.totalKills);

  tbody.innerHTML = '';
  standings.forEach((s, rank) => {
    const rankClass = rank === 0 ? 'top-1' : rank === 1 ? 'top-2' : rank === 2 ? 'top-3' : '';
    const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '#' + (rank+1);
    tbody.innerHTML += '<tr><td><span class="pts-rank-num ' + rankClass + '">' + medal + '</span></td>' +
      '<td class="pts-squad-name">' + s.name + '</td>' +
      '<td class="pts-cell">' + s.matches + '</td>' +
      '<td class="pts-cell">' + s.totalKills + '</td>' +
      '<td class="pts-cell">' + s.totalPlace + '</td>' +
      '<td class="pts-cell">' + (FG.wwcdOn ? s.totalPts - s.totalKills * FG.killPts - s.totalPlace : '—') + '</td>' +
      '<td class="pts-total-cell">' + s.totalPts + '</td></tr>';
  });
}

function renderMatchEntryGrid() {
  const grid = document.getElementById('pts-match-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const gameTitle = getGameTitle();
  const maps = getMapRotation(gameTitle);

  for (let mIdx = 0; mIdx < FG.matchCount; mIdx++) {
    const card = document.createElement('div');
    card.className = 'pts-match-card';
    card.id = 'pmc-' + mIdx;
    const mapName = maps[mIdx % maps.length] || ('Map ' + (mIdx+1));

    let rows = '';
    FG.squads.forEach((squadName, sIdx) => {
      const entry = FG.pointsResults[mIdx][sIdx];
      const pts = entry.placement > 0 ? calcMatchPoints(entry.placement, entry.kills) : 0;
      rows += '<tr>' +
        '<td class="pmc-squad">' + squadName + '</td>' +
        '<td><input class="pmc-input" type="number" min="1" max="25" value="' + (entry.placement || '') + '" placeholder="—" ' +
          'oninput="updateMatchResult(' + mIdx + ',' + sIdx + ',\'placement\',this.value)">' +
        '</td>' +
        '<td><input class="pmc-input" type="number" min="0" max="99" value="' + (entry.kills || 0) + '" ' +
          'oninput="updateMatchResult(' + mIdx + ',' + sIdx + ',\'kills\',this.value)">' +
        '</td>' +
        '<td class="pmc-pts-cell" id="pmc-pts-' + mIdx + '-' + sIdx + '">' + (entry.placement > 0 ? pts : '—') + '</td>' +
        '</tr>';
    });

    card.innerHTML = '<div class="pmc-header"><span class="pmc-title">Match ' + (mIdx+1) + '</span><span class="pmc-map">' + mapName + '</span></div>' +
      '<div class="pmc-body"><table class="pmc-table">' +
        '<thead><tr><th>Squad</th><th>Placement</th><th>Kills</th><th>Pts</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div>';
    grid.appendChild(card);
  }
}

function updateMatchResult(mIdx, sIdx, field, val) {
  const entry = FG.pointsResults[mIdx][sIdx];
  if (field === 'placement') entry.placement = parseInt(val) || 0;
  else if (field === 'kills') entry.kills = parseInt(val) || 0;

  const pts = entry.placement > 0 ? calcMatchPoints(entry.placement, entry.kills) : 0;
  const ptsEl = document.getElementById('pmc-pts-' + mIdx + '-' + sIdx);
  if (ptsEl) ptsEl.textContent = entry.placement > 0 ? pts : '—';

  renderStandings();
}

/* ─── HELPERS ─── */
function getGameTitle() {
  if (FG.gameType === 'bracket') {
    const sel = document.getElementById('bracket-game-title');
    return sel ? sel.value : 'valorant';
  }
  const sel = document.getElementById('pts-game-title');
  return sel ? sel.value : 'bgmi';
}

function getMapRotation(game) {
  if (game === 'valorant') return MAPS_VAL;
  if (game === 'cs2') return MAPS_CS2;
  if (game === 'bgmi' || game === 'pubg' || game === 'cod') return MAPS_BGMI;
  return MAPS_FF;
}

function resetAndGoBack() {
  FG.bracketRounds = [];
  FG.pointsResults = [];
  FG.rrMatches = [];
  renderTeamList();
  goToStep(3);
}

/* ═══════════════════════════════════════════════════
   PHASE 4: POSTER GENERATOR — TRUE BRACKET & STANDINGS
   ═══════════════════════════════════════════════════ */

function openPosterModal() {
  // Pre-fill poster fields from rule inputs
  const nameField = document.getElementById('poster-event-name');
  if (nameField && !nameField.value) {
    const bracketName = document.getElementById('bracket-name');
    const ptsName     = document.getElementById('pts-name');
    nameField.value = (bracketName && bracketName.value) || (ptsName && ptsName.value) || 'VRGC VALORANT CAMPUS CUP S4';
  }
  const dateField = document.getElementById('poster-date');
  if (dateField && !dateField.value) {
    const d1 = document.getElementById('bracket-date'); const d2 = document.getElementById('pts-date');
    dateField.value = (d1 && d1.value) || (d2 && d2.value) || 'OCTOBER 15, 2026';
  }
  const prizeField = document.getElementById('poster-prize');
  if (prizeField && !prizeField.value) {
    const p1 = document.getElementById('bracket-prize'); const p2 = document.getElementById('pts-prize');
    prizeField.value = (p1 && p1.value) || (p2 && p2.value) || '₹1,50,000 CASH POOL';
  }
  const subField = document.getElementById('poster-subtitle');
  if (subField && !subField.value) {
    subField.value = FG.gameType === 'points' ? 'BATTLE ROYALE STANDINGS' : 'OFFICIAL TOURNAMENT BRACKET';
  }

  const overlay = document.getElementById('poster-overlay');
  overlay.classList.add('open');
  renderPosterCanvas();
}

function closePosterModal(e) {
  if (e && e.target !== document.getElementById('poster-overlay')) return;
  document.getElementById('poster-overlay').classList.remove('open');
}

function selectPosterTemplate(n) {
  FG.posterTemplate = n;
  document.querySelectorAll('.poster-tpl-btn').forEach((b, i) => b.classList.toggle('active', i === n));
  renderPosterCanvas();
}

/* ─── CANVAS RENDERING & DYNAMIC SCALING ─── */
function renderPosterCanvas() {
  const canvas = document.getElementById('poster-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Determine dimensions from size toggle
  const sizeToggle = document.getElementById('poster-size-toggle');
  const sizeActive = sizeToggle ? sizeToggle.querySelector('.fg-toggle-btn.active') : null;
  const sizeLabel = sizeActive ? sizeActive.textContent.trim() : 'Square';

  let W = 1080, H = 1080;
  if (sizeLabel.includes('Story')) { W = 1080; H = 1920; }
  else if (sizeLabel.includes('Wide')) { W = 1920; H = 1080; }

  // Legibility warning check
  const warnEl = document.getElementById('poster-scale-warning');
  if (warnEl) {
    const teamCount = (FG.gameType === 'points')
      ? ((FG.squads && FG.squads.length) || (FG.teams && FG.teams.length) || 16)
      : ((FG.bracketRounds && FG.bracketRounds[0]) ? FG.bracketRounds[0].length * 2 : (FG.teams && FG.teams.filter(t => t.trim() !== '').length) || 8);

    if (FG.gameType === 'bracket' && teamCount >= 16 && sizeLabel.includes('Square')) {
      warnEl.style.display = 'block';
      warnEl.innerHTML = '⚠️ <strong>' + teamCount + ' Teams Bracket:</strong> "Wide (1920x1080)" export size is recommended for optimal bracket line spacing and legible text.';
    } else if (FG.gameType === 'bracket' && teamCount >= 32) {
      warnEl.style.display = 'block';
      warnEl.innerHTML = '⚠️ <strong>Large 32-team bracket:</strong> Wide (1920x1080) export is recommended to preserve line clarity.';
    } else {
      warnEl.style.display = 'none';
    }
  }

  // Set canvas to preview size (scaled)
  const previewW = 540;
  const scale = previewW / W;
  canvas.width = previewW;
  canvas.height = Math.round(H * scale);
  canvas.dataset.exportW = W;
  canvas.dataset.exportH = H;

  ctx.save();
  ctx.scale(scale, scale);
  drawPoster(ctx, W, H, FG.posterTemplate);
  ctx.restore();
}

/* ─── MAIN POSTER DRAW ROUTINE ─── */
function drawPoster(ctx, W, H, tpl) {
  // Theme palette setup
  let theme = {
    bgGrad: ['#080010', '#18022b', '#080010'],
    glowColor: 'rgba(123,47,255,0.3)',
    accent: '#a855f7',
    accentGlow: 'rgba(168,85,247,0.5)',
    boxBg: 'rgba(18, 3, 36, 0.88)',
    boxBorder: 'rgba(168,85,247,0.35)',
    lineColor: '#a855f7',
    lineGlow: 'rgba(168,85,247,0.6)',
    winBg: 'rgba(123,47,255,0.25)',
    gold: '#f59e0b',
    silver: '#9ca3af',
    bronze: '#cd7c2f'
  };

  if (tpl === 1) { // Neon Cyber
    theme.bgGrad = ['#000d1a', '#001426', '#000810'];
    theme.glowColor = 'rgba(0,255,247,0.18)';
    theme.accent = '#00fff7';
    theme.accentGlow = 'rgba(0,255,247,0.6)';
    theme.boxBg = 'rgba(0, 18, 34, 0.9)';
    theme.boxBorder = 'rgba(0,255,247,0.4)';
    theme.lineColor = '#00fff7';
    theme.lineGlow = 'rgba(0,255,247,0.6)';
    theme.winBg = 'rgba(0,255,247,0.18)';
  } else if (tpl === 2) { // Minimal Dark
    theme.bgGrad = ['#0a0a0a', '#141414', '#0a0a0a'];
    theme.glowColor = 'rgba(255,255,255,0.05)';
    theme.accent = '#ffffff';
    theme.accentGlow = 'rgba(255,255,255,0.3)';
    theme.boxBg = 'rgba(24, 24, 24, 0.9)';
    theme.boxBorder = 'rgba(255,255,255,0.18)';
    theme.lineColor = 'rgba(255,255,255,0.35)';
    theme.lineGlow = null;
    theme.winBg = 'rgba(255,255,255,0.12)';
  } else if (tpl === 3) { // Champion Gold
    theme.bgGrad = ['#0a0500', '#1c0d00', '#0a0500'];
    theme.glowColor = 'rgba(245,158,11,0.25)';
    theme.accent = '#f59e0b';
    theme.accentGlow = 'rgba(245,158,11,0.5)';
    theme.boxBg = 'rgba(26, 12, 1, 0.9)';
    theme.boxBorder = 'rgba(245,158,11,0.4)';
    theme.lineColor = '#f59e0b';
    theme.lineGlow = 'rgba(245,158,11,0.5)';
    theme.winBg = 'rgba(245,158,11,0.22)';
  }

  // 1. Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, theme.bgGrad[0]);
  bg.addColorStop(0.5, theme.bgGrad[1]);
  bg.addColorStop(1, theme.bgGrad[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Background radial glow
  const rg = ctx.createRadialGradient(W / 2, H * 0.35, 0, W / 2, H * 0.35, W * 0.55);
  rg.addColorStop(0, theme.glowColor);
  rg.addColorStop(1, 'transparent');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid lines for Neon Cyber template
  if (tpl === 1) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,255,247,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();
  }

  // 2. Corner Bracket Tech Lines
  ctx.save();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.6;
  const cornerLen = Math.round(W * 0.05);
  // Top-left
  ctx.beginPath(); ctx.moveTo(35, 35); ctx.lineTo(35 + cornerLen, 35); ctx.moveTo(35, 35); ctx.lineTo(35, 35 + cornerLen); ctx.stroke();
  // Top-right
  ctx.beginPath(); ctx.moveTo(W - 35, 35); ctx.lineTo(W - 35 - cornerLen, 35); ctx.moveTo(W - 35, 35); ctx.lineTo(W - 35, 35 + cornerLen); ctx.stroke();
  // Bottom-left
  ctx.beginPath(); ctx.moveTo(35, H - 35); ctx.lineTo(35 + cornerLen, H - 35); ctx.moveTo(35, H - 35); ctx.lineTo(35, H - 35 - cornerLen); ctx.stroke();
  // Bottom-right
  ctx.beginPath(); ctx.moveTo(W - 35, H - 35); ctx.lineTo(W - 35 - cornerLen, H - 35); ctx.moveTo(W - 35, H - 35); ctx.lineTo(W - 35, H - 35 - cornerLen); ctx.stroke();
  ctx.restore();

  // 3. Header Section
  const yStart = H < 1150 ? 40 : 65;

  // VRGC Brand Title
  ctx.save();
  ctx.textAlign = 'center';
  const logoFontSize = Math.round(W * 0.068);
  ctx.font = 'bold ' + logoFontSize + 'px "Bebas Neue", Impact, sans-serif';
  ctx.fillStyle = theme.accent;
  ctx.shadowColor = theme.accentGlow;
  ctx.shadowBlur = 14;
  ctx.fillText('VRGC', W / 2, yStart + logoFontSize);
  ctx.shadowBlur = 0;

  // Subtitle
  const subFontSize = Math.max(10, Math.round(W * 0.0125));
  ctx.font = 'bold ' + subFontSize + 'px "Space Grotesk", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.letterSpacing = '0.35em';
  ctx.fillText('VIRTUAL REALITY AND GAMING CLUB • CAMPUS ESPORTS', W / 2, yStart + logoFontSize + subFontSize + 6);
  ctx.restore();

  // Divider Line
  const divY1 = yStart + logoFontSize + subFontSize + 18;
  ctx.save();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(W * 0.18, divY1);
  ctx.lineTo(W * 0.82, divY1);
  ctx.stroke();
  ctx.restore();

  // Event Name
  const eventName = (document.getElementById('poster-event-name') || {}).value || 'VRGC VALORANT CAMPUS CUP S4';
  ctx.save();
  ctx.textAlign = 'center';
  const eventFontSize = Math.min(Math.round(W * 0.042), 64);
  ctx.font = 'bold ' + eventFontSize + 'px "Bebas Neue", Impact, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = theme.accentGlow;
  ctx.shadowBlur = 16;
  const eventY = divY1 + eventFontSize + 10;
  ctx.fillText(eventName.toUpperCase(), W / 2, eventY);
  ctx.shadowBlur = 0;
  ctx.restore();

  // Subtitle / Tagline
  const subtitle = (document.getElementById('poster-subtitle') || {}).value ||
    (FG.gameType === 'points' ? 'BATTLE ROYALE TOURNAMENT STANDINGS' : 'OFFICIAL TOURNAMENT FIXTURE BRACKET');
  ctx.save();
  ctx.textAlign = 'center';
  const tagFontSize = Math.max(11, Math.round(W * 0.015));
  ctx.font = 'bold ' + tagFontSize + 'px "Space Grotesk", Arial, sans-serif';
  ctx.fillStyle = theme.accent;
  const tagY = eventY + tagFontSize + 8;
  ctx.fillText(subtitle.toUpperCase(), W / 2, tagY);
  ctx.restore();

  // Date & Prize Pool
  const date = (document.getElementById('poster-date') || {}).value || '';
  const prize = (document.getElementById('poster-prize') || {}).value || '';
  let metaY = tagY;
  if (date || prize) {
    ctx.save();
    ctx.textAlign = 'center';
    const metaFontSize = Math.max(10, Math.round(W * 0.0135));
    ctx.font = metaFontSize + 'px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    const metaLine = [date, prize].filter(Boolean).join('   •   ');
    metaY = tagY + metaFontSize + 10;
    ctx.fillText(metaLine, W / 2, metaY);
    ctx.restore();
  }

  // Divider Line before body
  const bodyTop = metaY + 18;
  ctx.save();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.moveTo(W * 0.08, bodyTop);
  ctx.lineTo(W * 0.92, bodyTop);
  ctx.stroke();
  ctx.restore();

  // 4. Body Content: Bracket Tree OR Standings Table
  const bodyH = (H - 65) - bodyTop;
  if (FG.gameType === 'points') {
    drawPosterPointsTable(ctx, W, H, bodyTop, bodyH, theme);
  } else {
    drawPosterBracket(ctx, W, H, bodyTop, bodyH, theme);
  }

  // 5. Footer Bar
  ctx.save();
  const footH = 55;
  const footY = H - footH;
  ctx.fillStyle = tpl === 1 ? 'rgba(0,255,247,0.06)' : tpl === 3 ? 'rgba(245,158,11,0.06)' : 'rgba(123,47,255,0.06)';
  ctx.fillRect(0, footY, W, footH);
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.moveTo(0, footY);
  ctx.lineTo(W, footY);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.font = 'bold ' + Math.max(10, Math.round(W * 0.0115)) + 'px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('VIT BHOPAL UNIVERSITY   •   VRGC ORGANIZER SUITE   •   CAMPUS ESPORTS NETWORK', W / 2, footY + 34);
  ctx.restore();
}

/* ─── DRAW REAL BRACKET TREE ON POSTER CANVAS ─── */
function drawPosterBracket(ctx, W, H, bodyTop, bodyH, theme) {
  // 1. Gather rounds data (use real fixture if generated, otherwise sample 8-team 3-round tournament)
  let rounds = FG.bracketRounds;
  if (!rounds || rounds.length === 0 || FG.gameType !== 'bracket') {
    rounds = [
      // Round 1 (Quarter-Finals)
      [
        { team1: { name: 'Team Alpha', seed: 1 }, team2: { name: 'Team Theta', seed: 8 }, score1: 2, score2: 0, winner: { name: 'Team Alpha' } },
        { team1: { name: 'Team Delta', seed: 4 }, team2: { name: 'Team Epsilon', seed: 5 }, score1: 2, score2: 1, winner: { name: 'Team Delta' } },
        { team1: { name: 'Team Beta', seed: 2 }, team2: { name: 'Team Eta', seed: 7 }, score1: 2, score2: 0, winner: { name: 'Team Beta' } },
        { team1: { name: 'Team Gamma', seed: 3 }, team2: { name: 'Team Zeta', seed: 6 }, score1: 2, score2: 1, winner: { name: 'Team Gamma' } }
      ],
      // Round 2 (Semi-Finals)
      [
        { team1: { name: 'Team Alpha', seed: 1 }, team2: { name: 'Team Delta', seed: 4 }, score1: 2, score2: 1, winner: { name: 'Team Alpha' } },
        { team1: { name: 'Team Beta', seed: 2 }, team2: { name: 'Team Gamma', seed: 3 }, score1: 2, score2: 0, winner: { name: 'Team Beta' } }
      ],
      // Round 3 (Grand Final)
      [
        { team1: { name: 'Team Alpha', seed: 1 }, team2: { name: 'Team Beta', seed: 2 }, score1: 3, score2: 1, winner: { name: 'Team Alpha' } }
      ]
    ];
  }

  const numRounds = rounds.length;
  // Total columns = tournament rounds + Champion box
  const totalCols = numRounds + 1;
  const bodyX = W * 0.04;
  const bodyW = W * 0.92;

  // Compute column width and horizontal gap
  const colW = Math.min((bodyW - (totalCols - 1) * 28) / totalCols, W * 0.22);
  const gapX = (bodyW - totalCols * colW) / (totalCols - 1);

  // Compute match coordinates
  const roundHeaderH = 34;
  const usableH = bodyH - roundHeaderH - 20;
  const numR1Matches = rounds[0].length;

  // Determine slot height dynamically based on match count
  const slotH = Math.max(36, Math.min((usableH / numR1Matches) * 0.65, 64));

  // Step A: Calculate match centers for Round 0
  for (let m = 0; m < numR1Matches; m++) {
    rounds[0][m].centerY = bodyTop + roundHeaderH + 15 + (m + 0.5) * (usableH / numR1Matches);
    rounds[0][m].colX = bodyX;
    rounds[0][m].colW = colW;
    rounds[0][m].slotH = slotH;
  }

  // Step B: Calculate match centers for subsequent rounds
  for (let r = 1; r < numRounds; r++) {
    const colX = bodyX + r * (colW + gapX);
    for (let m = 0; m < rounds[r].length; m++) {
      const p1 = rounds[r - 1][m * 2];
      const p2 = rounds[r - 1][m * 2 + 1];
      const centerY = (p1 && p2) ? (p1.centerY + p2.centerY) / 2 : (p1 ? p1.centerY : bodyTop + 100);
      rounds[r][m].centerY = centerY;
      rounds[r][m].colX = colX;
      rounds[r][m].colW = colW;
      rounds[r][m].slotH = slotH;
    }
  }

  // Step C: Champion slot position
  const champColX = bodyX + numRounds * (colW + gapX);
  const finalMatch = rounds[numRounds - 1][0];
  const champCenterY = finalMatch.centerY;
  const champW = colW;
  const champH = slotH * 1.55;

  // 2. DRAW CONNECTING BRACKET LINES (Horizontal + Vertical feeder lines)
  ctx.save();
  ctx.lineWidth = Math.max(2, Math.round(W * 0.0018));
  ctx.strokeStyle = theme.lineColor;
  if (theme.lineGlow) {
    ctx.shadowColor = theme.lineGlow;
    ctx.shadowBlur = 8;
  }

  for (let r = 0; r < numRounds - 1; r++) {
    for (let m = 0; m < rounds[r + 1].length; m++) {
      const p1 = rounds[r][m * 2];
      const p2 = rounds[r][m * 2 + 1];
      const curr = rounds[r + 1][m];
      if (!p1 || !p2 || !curr) continue;

      const rightX = p1.colX + p1.colW;
      const midX = rightX + gapX * 0.5;
      const targetLeftX = curr.colX;
      const y1 = p1.centerY;
      const y2 = p2.centerY;
      const yTarget = curr.centerY;

      // 4 connecting orthogonal segments (Cyber line-art aesthetic)
      ctx.beginPath();
      // Feeder 1 horizontal to mid
      ctx.moveTo(rightX, y1);
      ctx.lineTo(midX, y1);
      // Feeder 2 horizontal to mid
      ctx.moveTo(rightX, y2);
      ctx.lineTo(midX, y2);
      // Vertical connector trunk
      ctx.moveTo(midX, y1);
      ctx.lineTo(midX, y2);
      // Advance forward to next round match slot
      ctx.moveTo(midX, yTarget);
      ctx.lineTo(targetLeftX, yTarget);
      ctx.stroke();
    }
  }

  // Final connector line to Champion Box
  const finalRightX = finalMatch.colX + finalMatch.colW;
  ctx.beginPath();
  ctx.moveTo(finalRightX, finalMatch.centerY);
  ctx.lineTo(champColX, champCenterY);
  ctx.stroke();
  ctx.restore();

  // 3. DRAW ROUND LABELS ABOVE COLUMNS
  for (let r = 0; r < numRounds; r++) {
    const colX = bodyX + r * (colW + gapX);
    const label = getRoundLabel(numRounds, r);

    ctx.save();
    // Header capsule pill
    ctx.fillStyle = theme.boxBg;
    ctx.strokeStyle = theme.boxBorder;
    ctx.lineWidth = 1;
    roundRect(ctx, colX, bodyTop + 6, colW, roundHeaderH - 8, 4, true, true);

    ctx.textAlign = 'center';
    ctx.fillStyle = theme.accent;
    const roundLabelSize = Math.max(9, Math.min(Math.round(colW * 0.075), 14));
    ctx.font = 'bold ' + roundLabelSize + 'px "JetBrains Mono", monospace';
    ctx.fillText(label, colX + colW / 2, bodyTop + 6 + (roundHeaderH - 8) / 2 + 4);
    ctx.restore();
  }

  // Champion Column Header
  ctx.save();
  ctx.fillStyle = theme.boxBg;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 1.5;
  roundRect(ctx, champColX, bodyTop + 6, champW, roundHeaderH - 8, 4, true, true);
  ctx.textAlign = 'center';
  ctx.fillStyle = theme.accent;
  const champLabelSize = Math.max(9, Math.min(Math.round(champW * 0.075), 14));
  ctx.font = 'bold ' + champLabelSize + 'px "JetBrains Mono", monospace';
  ctx.fillText('🏆 CHAMPION', champColX + champW / 2, bodyTop + 6 + (roundHeaderH - 8) / 2 + 4);
  ctx.restore();

  // 4. DRAW MATCH SLOTS (Stacked pair with score/vs indicator)
  for (let r = 0; r < numRounds; r++) {
    for (let m = 0; m < rounds[r].length; m++) {
      const match = rounds[r][m];
      drawPosterMatchSlot(ctx, match, theme);
    }
  }

  // 5. DRAW CHAMPION PODIUM BOX
  ctx.save();
  const champBoxX = champColX;
  const champBoxY = champCenterY - champH / 2;

  // Glowing background
  ctx.fillStyle = theme.boxBg;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2.5;
  if (theme.accentGlow) {
    ctx.shadowColor = theme.accentGlow;
    ctx.shadowBlur = 18;
  }
  roundRect(ctx, champBoxX, champBoxY, champW, champH, 8, true, true);
  ctx.shadowBlur = 0;

  // Trophy icon & title
  ctx.textAlign = 'center';
  const trophySize = Math.max(18, Math.round(champH * 0.28));
  ctx.font = trophySize + 'px sans-serif';
  ctx.fillText('🏆', champBoxX + champW / 2, champBoxY + trophySize + 6);

  ctx.font = 'bold ' + Math.max(9, Math.round(champW * 0.065)) + 'px "JetBrains Mono", monospace';
  ctx.fillStyle = theme.accent;
  ctx.fillText('TOURNAMENT WINNER', champBoxX + champW / 2, champBoxY + trophySize + 22);

  // Winner team name
  const champTeam = (finalMatch && finalMatch.winner) ? finalMatch.winner.name : 'TBD';
  ctx.font = 'bold ' + Math.max(11, Math.round(champW * 0.09)) + 'px "Space Grotesk", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(champTeam, champBoxX + champW / 2, champBoxY + champH - 12);
  ctx.restore();
}

/* ─── DRAW INDIVIDUAL MATCH SLOT ON POSTER ─── */
function drawPosterMatchSlot(ctx, match, theme) {
  const x = match.colX;
  const y = match.centerY - match.slotH / 2;
  const w = match.colW;
  const h = match.slotH;
  const halfH = h / 2;

  ctx.save();
  // 1. Box outer container
  ctx.fillStyle = theme.boxBg;
  ctx.strokeStyle = match.winner ? theme.accent : theme.boxBorder;
  ctx.lineWidth = match.winner ? 1.5 : 1;
  roundRect(ctx, x, y, w, h, 6, true, true);

  // 2. Middle divider line
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + halfH);
  ctx.lineTo(x + w, y + halfH);
  ctx.stroke();

  // 3. Team 1 (Top Slot)
  const t1 = match.team1 || { name: 'TBD', seed: null };
  const t1IsWinner = match.winner && match.winner.name === t1.name && !t1.isBye && t1.name !== 'TBD';
  const t1IsLoser  = match.winner && match.winner.name !== t1.name && !t1.isBye && t1.name !== 'TBD';

  if (t1IsWinner) {
    ctx.fillStyle = theme.winBg;
    roundRect(ctx, x + 1, y + 1, w - 2, halfH - 1, { tl: 5, tr: 5, br: 0, bl: 0 }, true, false);
  }

  // Draw Team 1 Text & Score
  drawSlotTeamText(ctx, t1, x, y, w, halfH, t1IsWinner, t1IsLoser, match.score1, theme);

  // 4. Team 2 (Bottom Slot)
  const t2 = match.team2 || { name: 'TBD', seed: null };
  const t2IsWinner = match.winner && match.winner.name === t2.name && !t2.isBye && t2.name !== 'TBD';
  const t2IsLoser  = match.winner && match.winner.name !== t2.name && !t2.isBye && t2.name !== 'TBD';

  if (t2IsWinner) {
    ctx.fillStyle = theme.winBg;
    roundRect(ctx, x + 1, y + halfH, w - 2, halfH - 1, { tl: 0, tr: 0, br: 5, bl: 5 }, true, false);
  }

  // Draw Team 2 Text & Score
  drawSlotTeamText(ctx, t2, x, y + halfH, w, halfH, t2IsWinner, t2IsLoser, match.score2, theme);

  // 5. VS indicator badge if match is pending (no scores, neither marked as winner)
  const hasScores = match.score1 !== undefined || match.score2 !== undefined;
  if (!match.winner && !hasScores && t1.name !== 'TBD' && t2.name !== 'TBD' && !t1.isBye && !t2.isBye) {
    ctx.save();
    const badgeW = 20;
    const badgeH = 13;
    const badgeX = x + w - badgeW - 8;
    const badgeY = y + halfH - badgeH / 2;
    ctx.fillStyle = theme.boxBg;
    ctx.strokeStyle = theme.boxBorder;
    ctx.lineWidth = 1;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 3, true, true);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.fillText('VS', badgeX + badgeW / 2, badgeY + badgeH - 3.5);
    ctx.restore();
  }

  ctx.restore();
}

function drawSlotTeamText(ctx, team, x, y, w, h, isWinner, isLoser, score, theme) {
  const padX = 8;
  const centerY = y + h / 2;

  // Seed badge
  if (team.seed) {
    ctx.save();
    ctx.font = 'bold ' + Math.max(8, Math.round(h * 0.38)) + 'px "JetBrains Mono", monospace';
    ctx.fillStyle = theme.accent;
    ctx.textAlign = 'left';
    ctx.fillText('#' + team.seed, x + padX, centerY + 3.5);
    ctx.restore();
  }

  // Team Name text styling
  ctx.save();
  const fontSize = Math.max(9, Math.min(Math.round(h * 0.44), Math.round(w * 0.082)));
  ctx.font = (isWinner ? 'bold ' : '500 ') + fontSize + 'px "Space Grotesk", sans-serif';

  if (team.isBye) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = 'italic ' + fontSize + 'px sans-serif';
  } else if (isWinner) {
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = theme.accentGlow;
    ctx.shadowBlur = 6;
  } else if (isLoser) {
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
  }

  const seedOffset = team.seed ? Math.round(fontSize * 1.6) : 0;
  const nameX = x + padX + seedOffset;
  const scoreReserve = score !== undefined ? 28 : (isWinner ? 20 : 8);
  const maxTextW = w - (nameX - x) - scoreReserve;
  const displayName = truncateText(ctx, team.name || 'TBD', maxTextW);

  ctx.textAlign = 'left';
  ctx.fillText(displayName, nameX, centerY + Math.round(fontSize * 0.35));

  // Score Box or Checkmark
  if (score !== undefined) {
    ctx.save();
    const scoreBoxW = 20;
    const scoreBoxH = Math.round(h * 0.72);
    const scoreBoxX = x + w - scoreBoxW - 6;
    const scoreBoxY = centerY - scoreBoxH / 2;

    ctx.fillStyle = isWinner ? theme.winBg : 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = isWinner ? theme.accent : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    roundRect(ctx, scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH, 3, true, true);

    ctx.textAlign = 'center';
    ctx.font = 'bold ' + Math.max(9, Math.round(fontSize * 0.95)) + 'px "JetBrains Mono", monospace';
    ctx.fillStyle = isWinner ? '#ffffff' : 'rgba(255,255,255,0.4)';
    if (isWinner && theme.accentGlow) {
      ctx.shadowColor = theme.accentGlow;
      ctx.shadowBlur = 5;
    }
    ctx.fillText(String(score), scoreBoxX + scoreBoxW / 2, centerY + Math.round(fontSize * 0.35));
    ctx.restore();
  } else if (isWinner) {
    ctx.fillStyle = theme.accent;
    ctx.font = 'bold ' + Math.max(10, Math.round(fontSize * 1.05)) + 'px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('✓', x + w - 8, centerY + Math.round(fontSize * 0.35));
  }
  ctx.restore();
}

/* ─── DRAW POINTS TABLE STANDINGS ON POSTER ─── */
function drawPosterPointsTable(ctx, W, H, bodyTop, bodyH, theme) {
  // 1. Gather squads standings data
  let standings = [];
  if (FG.squads && FG.squads.length > 0) {
    standings = FG.squads.map((name, idx) => ({ name, ...getSquadTotals(idx) }));
    standings.sort((a, b) => b.totalPts - a.totalPts || b.totalKills - a.totalKills);
  } else {
    // High quality sample Battle Royale squads data for poster preview
    standings = [
      { name: 'Soul Esports', matches: 6, totalKills: 44, totalPlace: 58, totalPts: 102 },
      { name: 'GodLike Esports', matches: 6, totalKills: 40, totalPlace: 52, totalPts: 92 },
      { name: 'Team XSpark', matches: 6, totalKills: 36, totalPlace: 46, totalPts: 82 },
      { name: 'Blind Esports', matches: 6, totalKills: 32, totalPlace: 42, totalPts: 74 },
      { name: 'Entity Gaming', matches: 6, totalKills: 28, totalPlace: 40, totalPts: 68 },
      { name: 'Orangutan Esports', matches: 6, totalKills: 26, totalPlace: 36, totalPts: 62 },
      { name: 'Revenant Esports', matches: 6, totalKills: 22, totalPlace: 34, totalPts: 56 },
      { name: 'Carnival Gaming', matches: 6, totalKills: 20, totalPlace: 30, totalPts: 50 },
      { name: 'Gladiators Esports', matches: 6, totalKills: 18, totalPlace: 26, totalPts: 44 },
      { name: 'Medal Esports', matches: 6, totalKills: 15, totalPlace: 22, totalPts: 37 }
    ];
  }

  const tableX = W * 0.07;
  const tableW = W * 0.86;
  const tableY = bodyTop + 15;
  const maxRows = Math.min(standings.length, 16);
  const rowH = Math.max(30, Math.min((bodyH - 55) / (maxRows + 1.2), 48));
  const colWidths = [
    tableW * 0.10, // Rank
    tableW * 0.42, // Squad
    tableW * 0.12, // Matches
    tableW * 0.12, // Kills
    tableW * 0.12, // Place Pts
    tableW * 0.12  // Total Pts
  ];

  // 2. Draw Table Header
  ctx.save();
  ctx.fillStyle = theme.boxBg;
  ctx.strokeStyle = theme.boxBorder;
  ctx.lineWidth = 1;
  roundRect(ctx, tableX, tableY, tableW, rowH, 6, true, true);

  ctx.textAlign = 'center';
  ctx.fillStyle = theme.accent;
  const headerFontSize = Math.max(9, Math.round(rowH * 0.34));
  ctx.font = 'bold ' + headerFontSize + 'px "JetBrains Mono", monospace';

  let curColX = tableX;
  ctx.fillText('RANK', curColX + colWidths[0] / 2, tableY + rowH / 2 + 4);
  curColX += colWidths[0];

  ctx.textAlign = 'left';
  ctx.fillText('SQUAD NAME', curColX + 16, tableY + rowH / 2 + 4);
  curColX += colWidths[1];

  ctx.textAlign = 'center';
  ctx.fillText('MATCHES', curColX + colWidths[2] / 2, tableY + rowH / 2 + 4);
  curColX += colWidths[2];

  ctx.fillText('ELIMS', curColX + colWidths[3] / 2, tableY + rowH / 2 + 4);
  curColX += colWidths[3];

  ctx.fillText('PLACE PTS', curColX + colWidths[4] / 2, tableY + rowH / 2 + 4);
  curColX += colWidths[4];

  ctx.fillStyle = '#ffffff';
  ctx.fillText('TOTAL PTS', curColX + colWidths[5] / 2, tableY + rowH / 2 + 4);
  ctx.restore();

  // 3. Draw Standings Rows
  for (let i = 0; i < maxRows; i++) {
    const s = standings[i];
    const rowY = tableY + (i + 1) * rowH;
    const isTop1 = i === 0;
    const isTop2 = i === 1;
    const isTop3 = i === 2;

    ctx.save();
    // Row background
    if (isTop1) {
      ctx.fillStyle = 'rgba(245,158,11,0.14)';
      ctx.strokeStyle = 'rgba(245,158,11,0.45)';
      ctx.lineWidth = 1.5;
    } else if (isTop2) {
      ctx.fillStyle = 'rgba(156,163,175,0.12)';
      ctx.strokeStyle = 'rgba(156,163,175,0.35)';
      ctx.lineWidth = 1;
    } else if (isTop3) {
      ctx.fillStyle = 'rgba(205,124,47,0.12)';
      ctx.strokeStyle = 'rgba(205,124,47,0.35)';
      ctx.lineWidth = 1;
    } else {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.01)';
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
    }

    roundRect(ctx, tableX, rowY + 1, tableW, rowH - 2, 4, true, true);

    const cellFontSize = Math.max(10, Math.round(rowH * 0.38));
    let cellX = tableX;

    // Rank Column
    ctx.textAlign = 'center';
    ctx.font = 'bold ' + cellFontSize + 'px "JetBrains Mono", monospace';
    if (isTop1) { ctx.fillStyle = theme.gold; ctx.fillText('🥇 #1', cellX + colWidths[0] / 2, rowY + rowH / 2 + 4); }
    else if (isTop2) { ctx.fillStyle = theme.silver; ctx.fillText('🥈 #2', cellX + colWidths[0] / 2, rowY + rowH / 2 + 4); }
    else if (isTop3) { ctx.fillStyle = theme.bronze; ctx.fillText('🥉 #3', cellX + colWidths[0] / 2, rowY + rowH / 2 + 4); }
    else { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillText('#' + (i + 1), cellX + colWidths[0] / 2, rowY + rowH / 2 + 4); }
    cellX += colWidths[0];

    // Squad Name
    ctx.textAlign = 'left';
    ctx.font = (isTop1 || isTop2 || isTop3 ? 'bold ' : '500 ') + cellFontSize + 'px "Space Grotesk", sans-serif';
    ctx.fillStyle = isTop1 ? '#ffffff' : (isTop2 || isTop3 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)');
    ctx.fillText(truncateText(ctx, s.name, colWidths[1] - 24), cellX + 16, rowY + rowH / 2 + 4);
    cellX += colWidths[1];

    // Matches
    ctx.textAlign = 'center';
    ctx.font = cellFontSize + 'px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText(String(s.matches || 0), cellX + colWidths[2] / 2, rowY + rowH / 2 + 4);
    cellX += colWidths[2];

    // Total Kills
    ctx.fillText(String(s.totalKills || 0), cellX + colWidths[3] / 2, rowY + rowH / 2 + 4);
    cellX += colWidths[3];

    // Place Pts
    ctx.fillText(String(s.totalPlace || 0), cellX + colWidths[4] / 2, rowY + rowH / 2 + 4);
    cellX += colWidths[4];

    // Total Points (Bold accent)
    ctx.font = 'bold ' + Math.round(cellFontSize * 1.15) + 'px "Bebas Neue", Impact, sans-serif';
    ctx.fillStyle = isTop1 ? theme.gold : theme.accent;
    ctx.fillText(String(s.totalPts || 0), cellX + colWidths[5] / 2, rowY + rowH / 2 + 5);

    ctx.restore();
  }
}

/* ─── CANVAS UTILITIES: ROUNDED RECT & TRUNCATE ─── */
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  if (typeof r === 'number') {
    r = { tl: r, tr: r, br: r, bl: r };
  } else {
    const defaultR = { tl: 0, tr: 0, br: 0, bl: 0 };
    for (let side in defaultR) { r[side] = r[side] || defaultR[side]; }
  }
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function truncateText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 2 && ctx.measureText(t + '…').width > maxW) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

/* ─── FULL RESOLUTION PNG EXPORT ─── */
function exportPosterPNG() {
  const exportCanvas = document.createElement('canvas');
  const previewCanvas = document.getElementById('poster-canvas');
  const W = parseInt(previewCanvas.dataset.exportW) || 1080;
  const H = parseInt(previewCanvas.dataset.exportH) || 1080;
  exportCanvas.width = W;
  exportCanvas.height = H;

  const ctx = exportCanvas.getContext('2d');
  drawPoster(ctx, W, H, FG.posterTemplate);

  const link = document.createElement('a');
  const eventName = (document.getElementById('poster-event-name') || {}).value || 'VRGC-Tournament';
  const sanitized = eventName.replace(/[^a-zA-Z0-9_-]/g, '-');
  link.download = sanitized + '-Poster.png';
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
}

/* ─── UTILS ─── */
function shakeElement(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'fgShake 0.4s var(--ease)';
  setTimeout(() => { el.style.animation = ''; }, 400);
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ─── INIT ─── */
document.addEventListener('DOMContentLoaded', () => {
  renderPlacementTable(PRESETS['bgmi-standard']);
  const style = document.createElement('style');
  style.textContent = '@keyframes fgShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}';
  document.head.appendChild(style);
  window.addEventListener('resize', () => {
    if (FG.step === 4 && FG.bracketRounds.length > 0) drawBracketConnectors();
  });
});
