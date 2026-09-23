/* 학급 알림장 헤더 오른쪽의 호출 칸.
   교실 컴퓨터처럼 교실 화면 코드가 저장된 기기에서만 나타난다.
   학생 개인 기기에는 코드가 없어 아무것도 그리지 않고 서버도 부르지 않는다. */
(function () {
  'use strict';

  const calls = window.ClassNoticeCalls;
  const config = window.CLASS_NOTICE_CONFIG;
  if (!calls || !config || !config.apiUrl) return;

  const key = calls.getKey();
  if (!key) return;

  const API_URL = config.apiUrl;
  const state = { calls: [], seen: new Set(), audioReady: false };

  const style = document.createElement('style');
  style.textContent = `
    header .title-row { flex-wrap: wrap; }
    .call-dock { margin-left: auto; min-width: 210px; max-width: 340px; padding: 9px 12px;
      border: 1px solid #fdba74; border-radius: 12px; background: #fff7ed; }
    .call-dock.quiet { border-color: var(--border, #e5e7eb); background: #f8fafc; }
    .call-dock-head { display: flex; align-items: center; justify-content: space-between; gap: 8px;
      font-size: 11px; font-weight: 800; letter-spacing: .06em; color: #9a3412; }
    .call-dock.quiet .call-dock-head { color: #94a3b8; }
    .call-dock-list { display: grid; gap: 7px; margin-top: 7px; }
    .call-dock-item { display: flex; align-items: center; gap: 9px; }
    .call-dock-num { font-size: 26px; font-weight: 900; line-height: 1; color: #c2410c; }
    .call-dock-body { flex: 1; min-width: 0; font-size: 12px; line-height: 1.4; }
    .call-dock-reason { color: #9a3412; font-weight: 700; word-break: keep-all; }
    .call-dock-since { color: #a8a29e; font-size: 11px; }
    .call-dock button { border: 0; border-radius: 8px; padding: 7px 10px; background: #f97316;
      color: #fff; font-size: 12px; font-weight: 800; cursor: pointer; }
    .call-dock button.ghost { background: #e2e8f0; color: #475569; }
    .call-dock-empty { margin-top: 5px; color: #94a3b8; font-size: 12px; font-weight: 700; }
    .call-dock.ring { animation: callDockRing 1s ease-in-out 3; }
    @keyframes callDockRing { 0%, 100% { background: #fff7ed; } 50% { background: #fed7aa; } }
    @media (max-width: 620px) { .call-dock { margin-left: 0; width: 100%; max-width: none; } }
    @media (prefers-reduced-motion: reduce) { .call-dock.ring { animation: none; } }
  `;
  document.head.appendChild(style);

  const dock = document.createElement('div');
  dock.className = 'call-dock quiet';
  dock.innerHTML = '<div class="call-dock-head"><span>호출</span><span id="callDockState">확인 중</span></div><div class="call-dock-list" id="callDockList"></div>';
  const titleRow = document.querySelector('header .title-row');
  if (!titleRow) return;
  titleRow.appendChild(dock);

  const list = dock.querySelector('#callDockList');
  const stateLabel = dock.querySelector('#callDockState');

  /* 알림음은 사람이 한 번 클릭한 뒤부터 난다. 교실 컴퓨터에서 화면을
     아무 데나 한 번 누르면 켜지도록 해 둔다. */
  document.addEventListener('click', () => {
    if (state.audioReady) return;
    state.audioReady = true;
    calls.requestNotify();
  }, { once: true });

  function render() {
    const waiting = calls.waiting(state.calls);
    const done = calls.done(state.calls);
    dock.classList.toggle('quiet', !waiting.length);

    list.innerHTML = waiting.length ? waiting.map((call) => `
      <div class="call-dock-item">
        <span class="call-dock-num">${calls.esc(call.number)}</span>
        <div class="call-dock-body">
          <div>${calls.esc(call.caller)}</div>
          ${call.reason ? `<div class="call-dock-reason">${calls.esc(call.reason)}</div>` : ''}
          <div class="call-dock-since">${calls.esc(calls.sinceLabel(call.createdAt))}</div>
        </div>
        <button type="button" data-call="${calls.esc(call.id)}">전달 완료</button>
      </div>
    `).join('') : `<div class="call-dock-empty">${done.length ? `오늘 전달 완료 ${done.length}건` : '지금은 없습니다'}</div>`;

    [...list.querySelectorAll('button[data-call]')].forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        button.textContent = '처리 중…';
        try {
          await calls.ack(API_URL, key, button.dataset.call);
          await refresh();
        } catch (error) {
          button.disabled = false;
          button.textContent = '전달 완료';
          stateLabel.textContent = error.message;
        }
      });
    });
  }

  async function refresh() {
    try {
      const fetched = await calls.fetchCalls(API_URL, key);
      const fresh = calls.waiting(fetched).filter((call) => !state.seen.has(call.id));
      state.calls = fetched;
      render();
      if (fresh.length) {
        if (state.audioReady) calls.beep();
        fresh.forEach(calls.notify);
        dock.classList.remove('ring');
        void dock.offsetWidth;
        dock.classList.add('ring');
      }
      fetched.forEach((call) => state.seen.add(call.id));
      stateLabel.textContent = state.audioReady ? '켜짐' : '화면 클릭 시 소리';
    } catch (error) {
      stateLabel.textContent = error.message;
    }
  }

  refresh();
  setInterval(refresh, calls.POLL_MS);
})();
