/* 교실 컴퓨터에 띄워두는 호출 화면.
   탭이 다른 창에 가려져 있어도 계속 확인하고, 새 호출이 오면
   알림음 + 윈도우 알림으로 알린다. 그래서 문서가 숨겨져도 폴링을 멈추지 않는다. */
(() => {
  'use strict';

  const API_URL = window.CLASS_NOTICE_CONFIG.apiUrl;
  const KEY_STORE = 'classNotice.boardKey.v1';
  const POLL_MS = 20000;

  const state = { key: '', calls: [], seen: new Set(), timer: 0, audio: null };
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[char]);

  const ui = {
    setupView: $('#setupView'), setupForm: $('#setupForm'), keyInput: $('#keyInput'),
    setupError: $('#setupError'), boardView: $('#boardView'), callList: $('#callList'),
    emptyState: $('#emptyState'), status: $('#status'), clock: $('#clock'),
    doneList: $('#doneList'), notifyBtn: $('#notifyBtn'),
  };

  /* ── 알림 ── */

  /* 소리 파일을 두지 않고 짧은 두 번의 삐 소리를 만든다.
     브라우저 정책상 사람이 한 번 클릭한 뒤에만 소리가 난다. */
  function beep() {
    try {
      if (!state.audio) state.audio = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = state.audio;
      if (ctx.state === 'suspended') ctx.resume();
      [0, 0.32].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.26);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.3);
      });
    } catch (error) { /* 소리가 막혀도 화면 표시는 계속한다 */ }
  }

  function toast(call) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const body = call.reason ? `${call.caller} · ${call.reason}` : String(call.caller);
      new Notification(`${call.number}번 호출`, { body, tag: call.id, renotify: true });
    } catch (error) { /* 알림이 막혀도 화면 표시는 계속한다 */ }
  }

  function syncNotifyButton() {
    const supported = 'Notification' in window;
    const needsAsk = supported && Notification.permission === 'default';
    ui.notifyBtn.classList.toggle('hidden', !needsAsk);
  }

  /* ── 서버 ── */

  async function fetchBoard() {
    const url = `${API_URL}?action=board&board=${encodeURIComponent(state.key)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`서버 연결 실패 (${response.status})`);
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || '호출을 불러오지 못했습니다.');
    return Array.isArray(result.calls) ? result.calls : [];
  }

  async function ack(callId, button) {
    button.disabled = true;
    button.textContent = '처리 중…';
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'ackCall', board: state.key, callId }),
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || '처리하지 못했습니다.');
      await refresh();
    } catch (error) {
      button.disabled = false;
      button.textContent = '전달 완료';
      setStatus(error.message, true);
    }
  }

  /* ── 화면 ── */

  function sinceLabel(createdAt) {
    const started = Date.parse(createdAt);
    if (Number.isNaN(started)) return '';
    const minutes = Math.max(0, Math.floor((Date.now() - started) / 60000));
    if (minutes < 1) return '방금';
    if (minutes < 60) return `${minutes}분 전`;
    return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분 전`;
  }

  function render(calls) {
    const waiting = calls.filter((call) => call.status === '호출중');
    const done = calls.filter((call) => call.status === '전달완료');

    ui.callList.innerHTML = waiting.map((call) => `
      <article class="call${state.seen.has(call.id) ? '' : ' flash'}">
        <span class="num">${esc(call.number)}</span>
        <div class="body">
          <p class="caller">${esc(call.caller)}</p>
          ${call.reason ? `<p class="reason">${esc(call.reason)}</p>` : ''}
          <p class="since">${esc(sinceLabel(call.createdAt))}</p>
        </div>
        <button class="primary ack" type="button" data-call="${esc(call.id)}">전달 완료</button>
      </article>
    `).join('');

    ui.callList.classList.toggle('hidden', !waiting.length);
    ui.emptyState.classList.toggle('hidden', !!waiting.length);
    ui.doneList.innerHTML = done.length
      ? `오늘 전달 완료: ${done.map((call) => `<b>${esc(call.number)}번</b>`).join(' ')}`
      : '';

    [...ui.callList.querySelectorAll('.ack')].forEach((button) => {
      button.addEventListener('click', () => ack(button.dataset.call, button));
    });
  }

  function setStatus(message, error = false) {
    ui.status.textContent = message;
    ui.status.className = `status${error ? ' error' : ''}`;
  }

  function tickClock() {
    const now = new Date();
    ui.clock.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  async function refresh() {
    try {
      const calls = await fetchBoard();
      const fresh = calls.filter((call) => call.status === '호출중' && !state.seen.has(call.id));
      render(calls);
      if (fresh.length) {
        beep();
        fresh.forEach(toast);
      }
      calls.forEach((call) => state.seen.add(call.id));
      state.calls = calls;
      setStatus(`${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준`);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function start(key) {
    state.key = key;
    localStorage.setItem(KEY_STORE, key);
    ui.setupView.classList.add('hidden');
    ui.boardView.classList.remove('hidden');
    syncNotifyButton();
    tickClock();
    setInterval(tickClock, 15000);
    refresh();
    clearInterval(state.timer);
    state.timer = setInterval(refresh, POLL_MS);
  }

  ui.setupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const key = ui.keyInput.value.trim();
    if (!key) return;
    ui.setupError.textContent = '';
    state.key = key;
    try {
      await fetchBoard();
    } catch (error) {
      ui.setupError.textContent = error.message;
      return;
    }
    /* 이 클릭이 소리와 알림 권한을 여는 유일한 기회다. */
    beep();
    if ('Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch (error) { /* 거부해도 화면은 쓸 수 있다 */ }
    }
    start(key);
  });

  ui.notifyBtn.addEventListener('click', async () => {
    try { await Notification.requestPermission(); } catch (error) { /* 무시 */ }
    syncNotifyButton();
  });

  const saved = localStorage.getItem(KEY_STORE) || '';
  if (saved) {
    ui.keyInput.value = saved;
    /* 저장된 코드가 있어도 시작 버튼은 누르게 둔다. 그 클릭이 있어야 알림음이 난다. */
  }
})();
