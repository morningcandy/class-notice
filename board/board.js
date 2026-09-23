/* 교실 컴퓨터에 띄워두는 전체 화면 호출판.
   탭이 다른 창에 가려져 있어도 계속 확인하고, 새 호출이 오면
   알림음 + 윈도우 알림으로 알린다. 그래서 문서가 숨겨져도 폴링을 멈추지 않는다.
   공통 로직(코드 보관·조회·알림)은 ../call-feed.js에 있다. */
(() => {
  'use strict';

  const API_URL = window.CLASS_NOTICE_CONFIG.apiUrl;
  const calls = window.ClassNoticeCalls;

  const state = { key: '', calls: [], seen: new Set(), timer: 0 };
  const $ = (selector) => document.querySelector(selector);

  const ui = {
    setupView: $('#setupView'), setupForm: $('#setupForm'), keyInput: $('#keyInput'),
    setupError: $('#setupError'), boardView: $('#boardView'), callList: $('#callList'),
    emptyState: $('#emptyState'), status: $('#status'), clock: $('#clock'),
    doneList: $('#doneList'), notifyBtn: $('#notifyBtn'),
  };

  function syncNotifyButton() {
    const needsAsk = 'Notification' in window && Notification.permission === 'default';
    ui.notifyBtn.classList.toggle('hidden', !needsAsk);
  }

  async function ack(callId, button) {
    button.disabled = true;
    button.textContent = '처리 중…';
    try {
      await calls.ack(API_URL, state.key, callId);
      await refresh();
    } catch (error) {
      button.disabled = false;
      button.textContent = '전달 완료';
      setStatus(error.message, true);
    }
  }

  function render(list) {
    const waiting = calls.waiting(list);
    const done = calls.done(list);

    ui.callList.innerHTML = waiting.map((call) => `
      <article class="call${state.seen.has(call.id) ? '' : ' flash'}">
        <span class="num">${calls.esc(call.number)}</span>
        <div class="body">
          <p class="caller">${calls.esc(call.caller)}</p>
          ${call.reason ? `<p class="reason">${calls.esc(call.reason)}</p>` : ''}
          <p class="since">${calls.esc(calls.sinceLabel(call.createdAt))}</p>
        </div>
        <button class="primary ack" type="button" data-call="${calls.esc(call.id)}">전달 완료</button>
      </article>
    `).join('');

    ui.callList.classList.toggle('hidden', !waiting.length);
    ui.emptyState.classList.toggle('hidden', !!waiting.length);
    ui.doneList.innerHTML = done.length
      ? `오늘 전달 완료: ${done.map((call) => `<b>${calls.esc(call.number)}번</b>`).join(' ')}`
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
      const list = await calls.fetchCalls(API_URL, state.key);
      const fresh = calls.waiting(list).filter((call) => !state.seen.has(call.id));
      render(list);
      if (fresh.length) {
        calls.beep();
        fresh.forEach(calls.notify);
      }
      list.forEach((call) => state.seen.add(call.id));
      state.calls = list;
      setStatus(`${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준`);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function start(key) {
    state.key = key;
    calls.setKey(key);
    ui.setupView.classList.add('hidden');
    ui.boardView.classList.remove('hidden');
    syncNotifyButton();
    tickClock();
    setInterval(tickClock, 15000);
    refresh();
    clearInterval(state.timer);
    state.timer = setInterval(refresh, calls.POLL_MS);
  }

  ui.setupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const key = ui.keyInput.value.trim();
    if (!key) return;
    ui.setupError.textContent = '';
    state.key = key;
    try {
      await calls.fetchCalls(API_URL, key);
    } catch (error) {
      ui.setupError.textContent = error.message;
      return;
    }
    /* 이 클릭이 소리와 알림 권한을 여는 유일한 기회다. */
    calls.beep();
    await calls.requestNotify();
    start(key);
  });

  ui.notifyBtn.addEventListener('click', async () => {
    await calls.requestNotify();
    syncNotifyButton();
  });

  const saved = calls.getKey();
  if (saved) {
    ui.keyInput.value = saved;
    /* 저장된 코드가 있어도 시작 버튼은 누르게 둔다. 그 클릭이 있어야 알림음이 난다. */
  }
})();
