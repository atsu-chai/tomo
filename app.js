const APP_KEY = 'dorm_tomokore_local_app_data';
const BACKUP_META_KEY = 'dorm_tomokore_local_backup_meta';
const VERSION = '1.0.0';

const HOBBIES = ['ゲーム', '映画', '音楽', '読書', '散歩', '料理', 'アニメ'];
const LIFESTYLES = ['朝型', '夜型', '静かめ', 'にぎやか', 'インドア', 'アウトドア'];
const GRADES = ['1年', '2年', '3年', '4年', '院生', '社会人'];
const INTERACTIONS = ['少し話した', '一緒に食事した', '手伝ってもらった', 'イベントに参加した', '初めて話した'];
const PLACES = ['部屋', 'ラウンジ', '食堂', '掲示板スペース'];
const AVATAR_TYPES = ['circle', 'square', 'star', 'leaf'];
const RANDOM_NICKNAME_HEAD = ['あお', 'みんと', 'こはく', 'しずく', 'ゆき', 'そら', 'つむぎ', 'なぎ'];
const RANDOM_NICKNAME_TAIL = ['ねこ', 'くま', 'ぺん', 'もち', 'まる', 'どり', 'うさ', 'はな'];
const RANDOM_COMMENTS = ['最近は食堂メニュー開拓中', 'ラウンジでのんびり派', '掲示板のイベントが気になる', '朝に散歩するのが好き', '夜は静かに読書してます', '話しかけてもらえると嬉しい'];

const state = { appData: loadAppData(), view: 'home', selectedFloor: 1, selectedResidentId: null, error: '' };
const app = document.getElementById('app');

function now(){ return new Date().toISOString(); }
function uid(prefix){ return `${prefix}_${Math.random().toString(36).slice(2,9)}`; }

function createEmptyAppData() {
  const time = now();
  return {
    version: VERSION,
    createdAt: time,
    updatedAt: time,
    setupCompleted: false,
    dormConfig: { dormName: '', floors: [], sharedSpaces: ['ラウンジ', '食堂', '掲示板スペース'] },
    userProfile: null,
    residents: [],
    interactions: [],
    suggestions: [],
    boardPosts: [],
    announcements: [{ id: uid('ann'), title: 'ようこそ', body: 'このアプリは端末内だけに保存されます。', createdAt: time, source: 'system' }]
  };
}

function loadAppData() {
  try {
    const raw = localStorage.getItem(APP_KEY);
    if (!raw) return createEmptyAppData();
    const parsed = JSON.parse(raw);
    if (!parsed.version || !Array.isArray(parsed.residents)) throw new Error('schema');
    return parsed;
  } catch {
    return createEmptyAppData();
  }
}

function saveAppData() {
  state.appData.updatedAt = now();
  localStorage.setItem(APP_KEY, JSON.stringify(state.appData));
}

function tagsFromForm(form, key) {
  return [...form.querySelectorAll(`input[name="${key}"]:checked`)].map((e) => e.value);
}

function relabel(score) {
  if (score >= 10) return ['一緒に過ごしやすい'];
  if (score >= 7) return ['話しやすい'];
  if (score >= 4) return ['よく会う'];
  if (score >= 2) return ['顔見知り'];
  return [];
}

function scoreFor(type, place) {
  const base = { '初めて話した': 2, '少し話した': 1, '一緒に食事した': 2, '手伝ってもらった': 2, 'イベントに参加した': 1 }[type] ?? 0;
  const bonus = ['ラウンジ', '食堂', '掲示板スペース'].includes(place) ? 0.5 : 0;
  return base + bonus;
}

function updateRelationship(residentId, delta) {
  const self = state.appData.userProfile;
  if (!self) return;
  const idx = self.relationshipStates.findIndex((r) => r.targetResidentId === residentId);
  if (idx === -1) self.relationshipStates.push({ targetResidentId: residentId, score: delta, labels: relabel(delta), lastInteractionAt: now(), interactionCount: 1 });
  else {
    const rel = self.relationshipStates[idx];
    rel.score += delta;
    rel.labels = relabel(rel.score);
    rel.lastInteractionAt = now();
    rel.interactionCount += 1;
  }
}

function generateSuggestions() {
  const today = new Date().toISOString().slice(0,10);
  const existing = state.appData.suggestions.filter((s) => s.createdAt.slice(0,10) === today);
  if (existing.length >= 1) return;
  const residents = state.appData.residents.filter((r) => !r.isSelf);
  const relMap = new Map((state.appData.userProfile?.relationshipStates || []).map((r) => [r.targetResidentId, r]));
  const low = residents.find((r) => (relMap.get(r.id)?.interactionCount || 0) < 2);
  const picks = [];
  if (low) picks.push({ type: '話しかけ候補', residentId: low.id, message: `${low.nickname}さんに「おつかれさま〜」と軽く声をかけてみよう。` });
  const meal = state.appData.boardPosts.find((p) => p.category === 'ごはん');
  if (meal) picks.push({ type: 'スペース活用候補', message: '食堂でタイミングが合う人と軽くごはんトークしてみる？' });
  const event = state.appData.boardPosts.find((p) => p.category === 'イベント');
  if (event) picks.push({ type: 'イベント参加候補', message: '掲示板のイベントメモをチェックして、行けそうなら顔を出してみよう。' });
  while (picks.length === 0) picks.push({ type: '共通点候補', message: '趣味タグが近い人を1人見つけて、短く話してみるのがおすすめ。' });
  state.appData.suggestions = picks.slice(0,3).map((p) => ({ id: uid('sug'), ...p, createdAt: now(), expiresAt: new Date(Date.now() + 86400000).toISOString() }));
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function pickRandomMany(list, min, max) {
  const size = Math.floor(Math.random() * (max - min + 1)) + min;
  const pool = [...list].sort(() => Math.random() - 0.5);
  return pool.slice(0, size);
}

function randomResidentNickname() {
  return `${pickRandom(RANDOM_NICKNAME_HEAD)}${pickRandom(RANDOM_NICKNAME_TAIL)}`;
}

function randomResidentComment() {
  return Math.random() < 0.45 ? '' : pickRandom(RANDOM_COMMENTS);
}

function generateDormTemplate({ floors, roomsPerFloor, density }) {
  const residents = [];
  const floorConfigs = [];
  for (let f=1; f<=floors; f++) {
    const rooms = [];
    for (let r=1; r<=roomsPerFloor; r++) {
      const roomNumber = `${f}${String(r).padStart(2, '0')}`;
      const occupied = Math.random() < density;
      const room = { roomId: uid('room'), roomNumber, isEmpty: !occupied };
      if (occupied) {
        const resident = {
          id: uid('res'),
          nickname: randomResidentNickname(),
          roomNumber,
          gradeOrRole: pickRandom(GRADES),
          hobbyTags: pickRandomMany(HOBBIES, 1, 3),
          lifestyleTags: pickRandomMany(LIFESTYLES, 1, 2),
          comment: randomResidentComment(),
          avatarType: pickRandom(AVATAR_TYPES),
          avatarColor: `hsl(${Math.random()*360} 80% 75%)`,
          isSelf: false,
          relationshipStates: [],
          createdAt: now(),
          updatedAt: now()
        };
        room.residentId = resident.id;
        residents.push(resident);
      }
      rooms.push(room);
    }
    floorConfigs.push({ floorId: uid('floor'), floorNumber: f, rooms });
  }
  return { floorConfigs, residents };
}

function setupProfileAndDorm(form) {
  const nickname = form.nickname.value.trim();
  const roomNumber = form.roomNumber.value.trim();
  if (!nickname || nickname.length > 20 || !roomNumber || roomNumber.length > 10) return (state.error='入力条件を確認してください。', render());

  const profile = {
    id: uid('self'), nickname, roomNumber, gradeOrRole: form.gradeOrRole.value,
    hobbyTags: tagsFromForm(form, 'hobbyTags'), lifestyleTags: tagsFromForm(form, 'lifestyleTags'),
    comment: form.comment.value.trim().slice(0,80), avatarType: 'circle', avatarColor: form.avatarColor.value,
    isSelf: true, relationshipStates: [], createdAt: now(), updatedAt: now()
  };

  const floors = Number(form.floors.value || 3);
  const roomsPerFloor = Number(form.roomsPerFloor.value || 10);
  const density = Number(form.density.value || 0.7);
  const { floorConfigs, residents } = generateDormTemplate({ floors, roomsPerFloor, density });
  const targetRoom = floorConfigs.flatMap((f) => f.rooms).find((r) => r.roomNumber === roomNumber) || floorConfigs[0].rooms[0];
  targetRoom.isEmpty = false;
  targetRoom.residentId = profile.id;

  state.appData = {
    ...state.appData,
    setupCompleted: true,
    dormConfig: { dormName: form.dormName.value.trim(), floors: floorConfigs, sharedSpaces: ['ラウンジ', '食堂', '掲示板スペース'] },
    userProfile: profile,
    residents: [profile, ...residents.filter((r) => r.roomNumber !== targetRoom.roomNumber)]
  };
  generateSuggestions();
  saveAppData();
  state.view = 'home';
  state.error = '';
  render();
}

function postBoard(form) {
  const body = form.body.value.trim();
  if (!body || body.length > 120) return;
  state.appData.boardPosts.unshift({ id: uid('post'), category: form.category.value, title: form.title.value.trim(), body, createdAt: now() });
  generateSuggestions();
  saveAppData();
  render();
}

function recordInteraction(form) {
  const residentId = form.residentId.value;
  const interactionType = form.interactionType.value;
  const place = form.place.value || undefined;
  const memo = form.memo.value.trim().slice(0,80);
  if (!residentId || !interactionType) return;
  state.appData.interactions.unshift({ id: uid('log'), residentId, interactionType, place, memo, createdAt: now() });
  updateRelationship(residentId, scoreFor(interactionType, place));
  generateSuggestions();
  saveAppData();
  state.view = 'home';
  render();
}

function exportJson() {
  const ymd = new Date().toISOString().slice(0,10).replaceAll('-', '');
  const blob = new Blob([JSON.stringify(state.appData, null, 2)], { type: 'application/json;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `dorm-local-backup-${ymd}.json`;
  a.click();
  localStorage.setItem(BACKUP_META_KEY, JSON.stringify({ exportedAt: now() }));
}

function importJson(file) {
  file.text().then((text) => {
    try {
      const parsed = JSON.parse(text);
      if (!parsed.version || !Array.isArray(parsed.residents) || !parsed.dormConfig) throw new Error('schema');
      state.appData = parsed;
      saveAppData();
      alert('インポートに成功しました。');
      render();
    } catch {
      alert('インポート失敗: JSON構造を確認してください。');
    }
  });
}

function header() {
  return `<div class="card"><h1>🏠 寮版トモコレ風ローカルアプリ</h1><p class="small">完全ローカル保存 / 外部送信なし</p></div>`;
}

function renderWelcome() {
  return `${header()}<div class="card stack"><h2>はじめよう</h2><p>ゆるく交流を記録して、次の一歩を見つけるローカルアプリです。</p><button id="start">はじめる</button></div>`;
}

function renderSetup() {
  const checkboxes = (name, list) => list.map((v) => `<label class="badge"><input type="checkbox" name="${name}" value="${v}"> ${v}</label>`).join('');
  return `${header()}<form id="setupForm" class="stack">
    <div class="card grid two">
      <div><label>ニックネーム（必須）</label><input name="nickname" maxlength="20" required></div>
      <div><label>部屋番号（必須）</label><input name="roomNumber" maxlength="10" required></div>
      <div><label>学年 / 属性</label><select name="gradeOrRole">${GRADES.map((g)=>`<option>${g}</option>`).join('')}</select></div>
      <div><label>アバター色</label><input name="avatarColor" type="color" value="#ff9fb2"></div>
      <div class="grid"><label>趣味タグ</label><div class="row">${checkboxes('hobbyTags', HOBBIES)}</div></div>
      <div class="grid"><label>生活スタイルタグ</label><div class="row">${checkboxes('lifestyleTags', LIFESTYLES)}</div></div>
      <div style="grid-column:1 / -1"><label>ひとこと（0〜80文字）</label><textarea name="comment" maxlength="80"></textarea></div>
    </div>
    <div class="card grid three">
      <div><label>寮名（任意）</label><input name="dormName"></div>
      <div><label>階数</label><input name="floors" type="number" min="1" max="20" value="3"></div>
      <div><label>各階の部屋数</label><input name="roomsPerFloor" type="number" min="1" max="50" value="10"></div>
      <div><label>住人密度(0.1-1.0)</label><input name="density" type="number" min="0.1" max="1" step="0.1" value="0.7"></div>
    </div>
    ${state.error ? `<div class="error">${state.error}</div>` : ''}
    <button>セットアップ完了</button>
  </form>`;
}

function residentById(id){ return state.appData.residents.find((r)=>r.id===id); }

function renderHome() {
  const timeline = state.appData.interactions.slice(0,5).map((x)=> {
    const r = residentById(x.residentId);
    return `<div class="room"><strong>${x.interactionType}</strong> / ${r?.nickname ?? '不明'} <span class="small">${new Date(x.createdAt).toLocaleDateString()}</span></div>`;
  }).join('') || '<p class="small">まだ記録がありません。</p>';
  const sug = state.appData.suggestions.slice(0,3).map((s)=>`<div class="room"><span class="badge">${s.type}</span><p>${s.message}</p></div>`).join('');
  const posts = state.appData.boardPosts.slice(0,3).map((p)=>`<div class="room"><span class="badge">${p.category}</span><p>${p.title || '(無題)'}</p><p class="small">${p.body}</p></div>`).join('') || '<p class="small">投稿はまだありません。</p>';
  return `${header()}<div class="grid two">
    <div class="card"><h3>今日のゆる提案</h3>${sug}</div>
    <div class="card"><h3>最近の出来事</h3>${timeline}</div>
    <div class="card"><h3>掲示板サマリ</h3>${posts}</div>
    <div class="card"><h3>お知らせ</h3>${state.appData.announcements.slice(0,2).map((a)=>`<p>・${a.title}</p>`).join('')}</div>
  </div>${nav()}`;
}

function nav() {
  return `<div class="nav"><div class="row">
    <button class="ghost" data-nav="home">ホーム</button>
    <button class="ghost" data-nav="map">マップ</button>
    <button class="ghost" data-nav="interaction">記録</button>
    <button class="ghost" data-nav="board">掲示板</button>
    <button class="ghost" data-nav="settings">設定</button>
  </div></div>`;
}

function renderMap() {
  const floors = state.appData.dormConfig.floors;
  const floor = floors.find((f)=>f.floorNumber===state.selectedFloor) || floors[0];
  const floorTabs = floors.map((f)=>`<button class="${f.floorNumber===floor.floorNumber?'secondary':'ghost'}" data-floor="${f.floorNumber}">${f.floorNumber}F</button>`).join('');
  const rooms = floor.rooms.map((room)=> {
    const res = residentById(room.residentId);
    const rel = state.appData.userProfile.relationshipStates.find((r)=>r.targetResidentId===res?.id)?.labels[0] || '';
    return `<div class="room"><p><strong>${room.roomNumber}</strong></p>${res ? `<p>${res.nickname}</p><p class="small">${rel}</p><button data-resident="${res.id}" class="secondary">詳細</button>` : '<p class="small">空室</p>'}</div>`;
  }).join('');
  return `${header()}<div class="card stack"><h2>フロアマップ</h2><div class="row">${floorTabs}</div><div class="grid three">${rooms}</div><div class="row"><span class="badge">ラウンジ</span><span class="badge">食堂</span><span class="badge">掲示板スペース</span></div></div>${renderResidentDetail()}${nav()}`;
}

function renderResidentDetail() {
  if (!state.selectedResidentId) return '';
  const r = residentById(state.selectedResidentId);
  if (!r) return '';
  const rel = state.appData.userProfile.relationshipStates.find((x)=>x.targetResidentId===r.id);
  const logs = state.appData.interactions.filter((x)=>x.residentId===r.id).slice(0,5).map((x)=>`<li>${x.interactionType} (${new Date(x.createdAt).toLocaleDateString()})</li>`).join('');
  return `<div class="card stack"><h3>${r.nickname}の詳細</h3><p>部屋: ${r.roomNumber}</p><p>${r.gradeOrRole}</p><p>${r.comment || 'コメントなし'}</p><p>関係: ${rel?.labels[0] || 'ラベルなし'}</p><ul>${logs || '<li>記録なし</li>'}</ul><button id="closeResident" class="secondary">閉じる</button></div>`;
}

function renderInteraction() {
  const options = state.appData.residents.filter((r)=>!r.isSelf).map((r)=>`<option value="${r.id}">${r.nickname}</option>`).join('');
  return `${header()}<form id="interactionForm" class="card stack"><h2>今日の出来事を記録</h2>
    <div><label>相手</label><select name="residentId" required>${options}</select></div>
    <div><label>出来事カード</label><select name="interactionType" required>${INTERACTIONS.map((x)=>`<option>${x}</option>`).join('')}</select></div>
    <div><label>場所（任意）</label><select name="place"><option value="">未選択</option>${PLACES.map((x)=>`<option>${x}</option>`).join('')}</select></div>
    <div><label>メモ（任意 / 80文字）</label><textarea name="memo" maxlength="80"></textarea></div>
    <button>保存</button>
  </form>${nav()}`;
}

function renderBoard() {
  const posts = state.appData.boardPosts.map((p)=>`<div class="room"><span class="badge">${p.category}</span><p><strong>${p.title || '(無題)'}</strong></p><p>${p.body}</p><p class="small">${new Date(p.createdAt).toLocaleString()}</p></div>`).join('') || '<p class="small">投稿なし</p>';
  return `${header()}<div class="grid two"><form id="boardForm" class="card stack"><h2>掲示板に投稿</h2><div><label>カテゴリ</label><select name="category"><option>お知らせ</option><option>ごはん</option><option>イベント</option><option>相談</option><option>その他</option></select></div><div><label>タイトル（任意）</label><input name="title"></div><div><label>本文（必須 1〜120）</label><textarea name="body" maxlength="120" required></textarea></div><button>投稿</button></form><div class="card"><h2>投稿一覧</h2>${posts}</div></div>${nav()}`;
}

function renderSettings() {
  return `${header()}<div class="card stack"><h2>設定</h2><div class="row"><button id="goSetup" class="secondary">プロフィール/寮設定の見直し</button><button id="exportBtn">JSONエクスポート</button><label class="ghost" style="padding:10px 14px;border-radius:999px;cursor:pointer;display:inline-flex;align-items:center;">JSONインポート<input id="importInput" type="file" accept="application/json" style="display:none;"></label><button id="resetBtn" class="ghost">全データ初期化</button></div><p class="small">保存先キー: ${APP_KEY}</p></div>${nav()}`;
}

function render() {
  if (!state.appData.setupCompleted && state.view === 'home') {
    app.innerHTML = renderWelcome();
  } else if (!state.appData.setupCompleted) {
    app.innerHTML = renderSetup();
  } else if (state.view === 'home') app.innerHTML = renderHome();
  else if (state.view === 'map') app.innerHTML = renderMap();
  else if (state.view === 'interaction') app.innerHTML = renderInteraction();
  else if (state.view === 'board') app.innerHTML = renderBoard();
  else if (state.view === 'settings') app.innerHTML = renderSettings();

  document.getElementById('start')?.addEventListener('click', ()=> { state.view='setup'; render(); });
  document.getElementById('setupForm')?.addEventListener('submit', (e)=> { e.preventDefault(); setupProfileAndDorm(e.target); });
  document.getElementById('interactionForm')?.addEventListener('submit', (e)=> { e.preventDefault(); recordInteraction(e.target); });
  document.getElementById('boardForm')?.addEventListener('submit', (e)=> { e.preventDefault(); postBoard(e.target); });
  document.querySelectorAll('[data-nav]').forEach((btn)=>btn.addEventListener('click', ()=>{ state.view = btn.dataset.nav; state.selectedResidentId = null; render(); }));
  document.querySelectorAll('[data-floor]').forEach((btn)=>btn.addEventListener('click', ()=>{ state.selectedFloor = Number(btn.dataset.floor); render(); }));
  document.querySelectorAll('[data-resident]').forEach((btn)=>btn.addEventListener('click', ()=>{ state.selectedResidentId = btn.dataset.resident; render(); }));
  document.getElementById('closeResident')?.addEventListener('click', ()=>{ state.selectedResidentId = null; render(); });
  document.getElementById('goSetup')?.addEventListener('click', ()=> { state.view='setup'; render(); });
  document.getElementById('exportBtn')?.addEventListener('click', exportJson);
  document.getElementById('importInput')?.addEventListener('change', (e)=> { const file = e.target.files?.[0]; if (file) importJson(file); });
  document.getElementById('resetBtn')?.addEventListener('click', ()=> { if (confirm('全データを初期化しますか？')) { localStorage.removeItem(APP_KEY); state.appData=createEmptyAppData(); state.view='home'; render(); } });
}

render();
