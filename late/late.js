/* 지각 체커용 화면. 날짜별로 번호를 눌러 지각을 기록하고,
   목요일 분리수거 당번(수요일 아침 서버가 자동 배정)의 완료를 체크한다.
   서버는 번호만 돌려주고 이름·개인코드는 보내지 않는다. */
(() => {
  'use strict';

  const API_URL = window.CLASS_NOTICE_CONFIG.apiUrl;
  const KEY_STORE = 'classNotice.lateKey.v1';
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];

  const state = { key: '', date: '', feed: null };
  const $ = (selector) => document.querySelector(selector);

  const ui = {
    setupView: $('#setupView'), setupForm: $('#setupForm'), keyInput: $('#keyInput'), setupError: $('#setupError'),
    mainView: $('#mainView'), status: $('#status'), dateLabel: $('#dateLabel'),
    prevDay: $('#prevDay'), nextDay: $('#nextDay'), todayBtn: $('#todayBtn'),
    numberGrid: $('#numberGrid'), daySummary: $('#daySummary'),
    perWeek: $('#perWeek'), dutyList: $('#dutyList'), queueList: $('#queueList'), forgetBtn: $('#forgetBtn'),
  };

  function getKey() {
    try { return localStorage.getItem(KEY_STORE) || ''; } catch (error) { return ''; }
  }
  function setKey(key) {
    try {
      if (key) localStorage.setItem(KEY_STORE, key);
      else localStorage.removeItem(KEY_STORE);
    } catch (error) { /* 저장 못해도 이번 세션은 쓴다 */ }
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    })[char]);
  }

  function shiftDate(dateStr, days) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + days));
    return date.toISOString().slice(0, 10);
  }
  function dateText(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return `${m}월 ${d}일 (${DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`;
  }

  function setStatus(text, isError) {
    ui.status.textContent = text;
    ui.status.classList.toggle('error', !!isError);
  }

  async function load(date) {
    const params = new URLSearchParams({ action: 'late', key: state.key });
    if (date) params.set('date', date);
    const response = await fetch(`${API_URL}?${params}`);
    if (!response.ok) throw new Error(`서버 연결 실패 (${response.status})`);
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || '불러오지 못했습니다.');
    // 서버(Apps Script)를 새 버전으로 배포하기 전에는 학생 피드가 돌아온다.
    if (!Array.isArray(result.numbers)) throw new Error('서버가 아직 지각 체크를 지원하지 않아요. 선생님께 말씀드려 주세요.');
    return result;
  }

  async function post(body) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ key: state.key }, body)),
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || '저장하지 못했습니다.');
    return result;
  }

  async function refresh(date) {
    setStatus('불러오는 중');
    const feed = await load(date || state.date);
    state.feed = feed;
    state.date = feed.date;
    render();
    setStatus(`저장됨 · ${new Date().toTimeString().slice(0, 5)}`);
  }

  function render() {
    const feed = state.feed;
    ui.dateLabel.textContent = dateText(state.date) + (state.date === feed.today ? ' · 오늘' : '');
    ui.nextDay.disabled = state.date >= feed.today;
    ui.todayBtn.classList.toggle('hidden', state.date === feed.today);
    ui.perWeek.textContent = feed.perWeek || 2;

    const lateByNumber = new Map(feed.lates.map((late) => [late.number, late]));
    ui.numberGrid.innerHTML = feed.numbers.map((number) => {
      const late = lateByNumber.get(number);
      const cls = ['num', late ? (late.assigned ? 'locked' : 'on') : ''].join(' ');
      const title = late && late.assigned ? '분리수거 당번으로 정해져서 취소할 수 없어요' : '';
      return `<button class="${cls}" type="button" data-number="${number}" aria-pressed="${!!late}" title="${title}">${number}</button>`;
    }).join('');
    const checked = feed.lates.map((late) => late.number).sort((a, b) => a - b);
    ui.daySummary.textContent = checked.length
      ? `이날 지각 ${checked.length}명: ${checked.map((n) => `${n}번`).join(', ')}`
      : '이날 지각 없음';

    const weeks = [...new Set(feed.duties.map((duty) => duty.date))].sort().reverse();
    ui.dutyList.innerHTML = weeks.length ? weeks.map((date) => {
      const rows = feed.duties.filter((duty) => duty.date === date);
      return `<div class="duty-week">
        <div class="duty-week-head">${esc(dateText(date))}</div>
        ${rows.map(dutyHtml).join('')}
      </div>`;
    }).join('') : '<p class="empty">아직 정해진 당번이 없어요.</p>';

    ui.queueList.innerHTML = feed.queue.length
      ? feed.queue.map((item) => `<span class="chip${item.carried ? ' carried' : ''}">${item.number}번${item.carried ? ' (지난주 못 함)' : ''}</span>`).join('')
      : '<span class="empty">대기 중인 지각 기록이 없어요. 지각자가 없으면 원래 담당이 해요.</span>';
  }

  function dutyHtml(duty) {
    if (duty.status === '완료') {
      return `<div class="duty done"><span class="duty-num">${duty.number}번</span>
        <span class="duty-state">완료 ✓</span>
        <button class="undo-btn" type="button" data-duty="${esc(duty.id)}" data-done="0">완료 취소</button></div>`;
    }
    if (duty.status === '미완료') {
      return `<div class="duty missed"><span class="duty-num">${duty.number}번</span>
        <span class="duty-state">못 해서 다음 주로 넘어감</span></div>`;
    }
    return `<div class="duty"><span class="duty-num">${duty.number}번</span>
      <span class="duty-state">${duty.carried ? '지난주에서 넘어옴' : '당번'}</span>
      <button class="done-btn" type="button" data-duty="${esc(duty.id)}" data-done="1">완료</button></div>`;
  }

  /* 누르는 즉시 색을 바꾸고 저장은 뒤에서 한다. 같은 번호를 연달아 누르면
     마지막 상태만 보낸다. 다 저장되고 잠시 조용해지면 한 번만 새로 불러온다. */
  const saving = new Map(); // "날짜|번호" → { want, sent, running }
  let reloadTimer = 0;

  function pendingCount() {
    let count = 0;
    saving.forEach((job) => { if (job.running || job.want !== job.sent) count += 1; });
    return count;
  }

  function scheduleReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      if (pendingCount()) return;
      refresh().catch((error) => setStatus(error.message, true));
    }, 1500);
  }

  async function flush(jobKey, date, number) {
    const job = saving.get(jobKey);
    if (job.running) return;
    job.running = true;
    try {
      while (job.want !== job.sent) {
        const want = job.want;
        await post({ action: 'setLate', date, number, late: want });
        job.sent = want;
      }
    } catch (error) {
      saving.delete(jobKey);
      setStatus(error.message, true);
      refresh().catch(() => {});
      return;
    } finally {
      job.running = false;
    }
    saving.delete(jobKey);
    if (!pendingCount()) {
      setStatus(`저장됨 · ${new Date().toTimeString().slice(0, 5)}`);
      scheduleReload();
    }
  }

  function toggleLate(number) {
    const feed = state.feed;
    const late = feed.lates.find((row) => row.number === number);
    if (late && late.assigned) {
      setStatus('분리수거 당번으로 정해진 기록은 취소할 수 없어요. 선생님께 말씀드려 주세요.', true);
      return;
    }
    const want = !late;
    if (want) feed.lates.push({ id: '', number, assigned: false });
    else feed.lates = feed.lates.filter((row) => row.number !== number);
    render();

    const jobKey = `${state.date}|${number}`;
    const job = saving.get(jobKey) || { want: !want, sent: !want, running: false };
    job.want = want;
    saving.set(jobKey, job);
    clearTimeout(reloadTimer);
    setStatus('저장 중…');
    flush(jobKey, state.date, number);
  }

  async function markDuty(dutyId, done, button) {
    button.disabled = true;
    try {
      await post({ action: 'setDuty', dutyId, done });
      await refresh();
    } catch (error) {
      button.disabled = false;
      setStatus(error.message, true);
    }
  }

  async function start(key) {
    state.key = key;
    try {
      await refresh();
    } catch (error) {
      if (/비밀번호/.test(error.message)) setKey('');
      throw error;
    }
    setKey(key);
    ui.setupView.classList.add('hidden');
    ui.mainView.classList.remove('hidden');
  }

  ui.setupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = ui.setupForm.querySelector('button');
    button.disabled = true;
    ui.setupError.textContent = '';
    try {
      await start(ui.keyInput.value.trim());
    } catch (error) {
      ui.setupError.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  ui.numberGrid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-number]');
    if (button) toggleLate(Number(button.dataset.number));
  });
  ui.dutyList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-duty]');
    if (button) markDuty(button.dataset.duty, button.dataset.done === '1', button);
  });
  const go = (date) => refresh(date).catch((error) => setStatus(error.message, true));
  ui.prevDay.addEventListener('click', () => go(shiftDate(state.date, -1)));
  ui.nextDay.addEventListener('click', () => go(shiftDate(state.date, 1)));
  ui.todayBtn.addEventListener('click', () => go(state.feed.today));
  ui.forgetBtn.addEventListener('click', () => {
    setKey('');
    location.reload();
  });

  const saved = getKey();
  if (saved) {
    start(saved).catch((error) => { ui.setupError.textContent = error.message; });
  }
})();
