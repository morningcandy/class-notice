/* 학급 알림장 헤더의 호출 칸.
   교실 컴퓨터처럼 교실 화면 코드가 저장된 기기에서만 나타난다.
   학생 개인 기기에는 코드가 없어 아무것도 그리지 않고 서버도 부르지 않는다.

   호출이 없을 때는 헤더 오른쪽 구석의 작은 줄로 물러나 있고, 호출이 오면
   헤더 전체 폭을 쓰는 큰 띠로 커진다. 교실 뒤에서도 번호가 읽혀야 한다. */
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
    .call-dock { margin-top: 12px; border-radius: 16px; }
    /* 평소: 오른쪽 구석의 작은 줄. 자리를 거의 차지하지 않는다. */
    .call-dock.quiet { margin-top: 6px; text-align: right; color: #b8c0cc;
      font-size: 12px; font-weight: 700; }
    .call-dock.quiet .call-dock-list, .call-dock.quiet .call-dock-head b { display: none; }
    .call-dock.quiet .call-dock-empty { display: inline; }
    /* 호출이 왔을 때: 헤더 전체를 쓰는 큰 띠 */
    .call-dock.alert { padding: 16px 20px; border: 3px solid #f97316;
      background: linear-gradient(135deg, #fff7ed, #ffedd5); box-shadow: 0 10px 30px rgba(249,115,22,.18); }
    .call-dock-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
      font-size: 12px; font-weight: 800; letter-spacing: .08em; color: #9a3412; }
    .call-dock.alert .call-dock-head b { font-size: clamp(15px, 2vw, 20px); letter-spacing: 0; }
    .call-dock-state { color: #c2a894; font-size: 11px; font-weight: 700; }
    .call-dock.quiet .call-dock-state { color: #c3cad4; }
    .call-dock-list { display: grid; gap: 12px; margin-top: 12px; }
    .call-dock-item { display: flex; align-items: center; gap: clamp(14px, 3vw, 32px); }
    .call-dock-num { min-width: 1.4em; text-align: center; color: #c2410c;
      font-size: clamp(52px, 9vw, 104px); font-weight: 900; line-height: .95; letter-spacing: -.04em; }
    .call-dock-body { flex: 1; min-width: 0; }
    .call-dock-caller { color: #7c2d12; font-size: clamp(18px, 2.4vw, 30px); font-weight: 800; }
    .call-dock-reason { margin-top: 4px; color: #9a3412; font-size: clamp(16px, 2vw, 26px);
      font-weight: 700; word-break: keep-all; }
    .call-dock-since { margin-top: 6px; color: #a8a29e; font-size: clamp(12px, 1.2vw, 16px); font-weight: 700; }
    .call-dock button { border: 0; border-radius: 12px; padding: clamp(12px, 1.6vw, 20px) clamp(16px, 2vw, 28px);
      background: #f97316; color: #fff; font-size: clamp(14px, 1.5vw, 20px); font-weight: 800; cursor: pointer; }
    .call-dock button:disabled { opacity: .6; cursor: wait; }
    .call-dock-empty { display: none; }
    .call-dock.alert { animation: callDockPulse 1.6s ease-in-out 6; }
    @keyframes callDockPulse {
      0%, 100% { border-color: #f97316; }
      50% { border-color: #fdba74; box-shadow: 0 10px 34px rgba(249,115,22,.34); }
    }
    @media (max-width: 620px) {
      .call-dock.alert { padding: 14px; }
      .call-dock-item { gap: 12px; }
    }
    @media (prefers-reduced-motion: reduce) { .call-dock.alert { animation: none; } }
  `;
  document.head.appendChild(style);

  const header = document.querySelector('header');
  if (!header) return;
  const dock = document.createElement('div');
  dock.className = 'call-dock quiet';
  dock.innerHTML = '<div class="call-dock-head"><b>호출</b>'
    + '<span class="call-dock-state" id="callDockState">확인 중</span></div>'
    + '<div class="call-dock-list" id="callDockList"></div>'
    + '<span class="call-dock-empty" id="callDockEmpty"></span>';
  header.appendChild(dock);

  const list = dock.querySelector('#callDockList');
  const empty = dock.querySelector('#callDockEmpty');
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
    dock.classList.toggle('alert', !!waiting.length);

    list.innerHTML = waiting.map((call) => `
      <div class="call-dock-item">
        <span class="call-dock-num">${calls.esc(call.number)}</span>
        <div class="call-dock-body">
          <div class="call-dock-caller">${calls.esc(call.caller)}</div>
          ${call.reason ? `<div class="call-dock-reason">${calls.esc(call.reason)}</div>` : ''}
          <div class="call-dock-since">${calls.esc(calls.sinceLabel(call.createdAt))}</div>
        </div>
        <button type="button" data-call="${calls.esc(call.id)}">전달 완료</button>
      </div>
    `).join('');

    empty.textContent = done.length ? `호출 없음 · 오늘 전달 완료 ${done.length}건` : '호출 없음';

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
        /* 애니메이션을 다시 돌려 새 호출임을 눈에 띄게 한다. */
        dock.classList.remove('alert');
        void dock.offsetWidth;
        dock.classList.add('alert');
      }
      fetched.forEach((call) => state.seen.add(call.id));
      stateLabel.textContent = state.audioReady ? '' : '화면을 한 번 클릭하면 알림음이 켜집니다';
    } catch (error) {
      stateLabel.textContent = error.message;
    }
  }

  refresh();
  setInterval(refresh, calls.POLL_MS);
})();
