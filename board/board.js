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
    boardOnlyBtn: $('#boardOnlyBtn'), connectedBox: $('#connectedBox'), disconnectBtn: $('#disconnectBtn'),
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
    ui.setupView.classList.add('hidden');
    ui.boardView.classList.remove('hidden');
    syncNotifyButton();
    tickClock();
    setInterval(tickClock, 15000);
    refresh();
    clearInterval(state.timer);
    state.timer = setInterval(refresh, calls.POLL_MS);
  }

  /* 호출키가 맞는지 서버에 물어보고, 이 기기에 실제로 저장됐는지까지 확인한다.
     시크릿 창처럼 저장이 막힌 브라우저면 알림장으로 돌아가도 호출이 안 뜨므로 여기서 알린다. */
  async function connect() {
    const key = ui.keyInput.value.trim();
    if (!key) { ui.keyInput.focus(); return ''; }
    ui.setupError.className = 'form-error';
    ui.setupError.textContent = '확인 중…';
    try {
      await calls.fetchCalls(API_URL, key);
    } catch (error) {
      ui.setupError.textContent = error.message;
      return '';
    }
    if (!calls.setKey(key)) {
      ui.setupError.textContent = '이 브라우저가 저장을 막고 있어 연결을 기억하지 못합니다. 시크릿 창·게스트 모드가 아닌 일반 창에서 다시 해주세요.';
      return '';
    }
    ui.setupError.textContent = '';
    /* 이 클릭이 소리와 알림 권한을 여는 기회다. */
    calls.beep();
    await calls.requestNotify();
    return key;
  }

  ui.setupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!(await connect())) return;
    ui.setupError.className = 'form-ok';
    ui.setupError.textContent = '연결됐어요! 학급 알림장으로 돌아갑니다…';
    calls.markJustConnected();
    setTimeout(() => { location.href = '../'; }, 900);
  });

  ui.boardOnlyBtn.addEventListener('click', async () => {
    const key = await connect();
    if (key) start(key);
  });

  ui.disconnectBtn.addEventListener('click', () => {
    calls.clearKey();
    ui.keyInput.value = '';
    ui.connectedBox.classList.add('hidden');
    ui.setupError.className = 'form-ok';
    ui.setupError.textContent = '연결을 해제했습니다. 이 컴퓨터에는 더 이상 호출이 뜨지 않습니다.';
  });

  ui.notifyBtn.addEventListener('click', async () => {
    await calls.requestNotify();
    syncNotifyButton();
  });

  const saved = calls.getKey();
  if (saved) {
    ui.keyInput.value = saved;
    ui.connectedBox.classList.remove('hidden');
  }
})();
