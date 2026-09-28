/* 학급 알림장 헤더의 호출 칸.
   교실 컴퓨터처럼 호출키가 저장된 기기에서만 나타난다.
   학생 개인 기기에는 키가 없어 아무것도 그리지 않고 서버도 부르지 않는다.

   호출이 없을 때는 헤더 오른쪽에 "호출 연결됨 · 대기 중" 표시로 물러나 있고
   (연결됐는지 한눈에 보이도록 초록 점을 둔다), 호출이 오면 헤더 전체 폭을 쓰는
   큰 띠로 커진다. 교실 뒤에서도 번호가 읽혀야 한다. */
(function () {
  'use strict';

  const calls = window.ClassNoticeCalls;
  const config = window.CLASS_NOTICE_CONFIG;
  if (!calls || !config || !config.apiUrl) return;

  const key = calls.getKey();
  if (!key) return;

  const API_URL = config.apiUrl;
  const state = { calls: [], seen: new Set(), audioReady: calls.soundAllowed(), error: '' };
  const justConnected = calls.takeJustConnected();

  const style = document.createElement('style');
  style.textContent = `
    header .title-row { flex-wrap: wrap; }
    .call-dock { margin-top: 12px; border-radius: 16px; }
    /* 평소: 오른쪽의 작은 상태 줄. 연결됐는지는 보이되 자리는 거의 차지하지 않는다. */
    .call-dock.quiet { margin-top: 8px; }
    .call-dock.quiet .call-dock-head, .call-dock.quiet .call-dock-list { display: none; }
    .call-dock-idle { display: flex; justify-content: flex-end; align-items: center; gap: 8px; flex-wrap: wrap; }
    .call-dock.alert .call-dock-idle { display: none; }
    .call-dock-pill { display: inline-flex; align-items: center; gap: 7px; padding: 5px 12px; border-radius: 999px;
      background: #ecfdf5; color: #047857; font-size: 13px; font-weight: 800; }
    .call-dock-pill::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #10b981;
      box-shadow: 0 0 0 3px rgba(16,185,129,.2); }
    .call-dock-pill.error { background: #fef2f2; color: #b91c1c; }
    .call-dock-pill.error::before { background: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,.2); }
    .call-dock-pill.fresh { animation: callDockHello 1.2s ease-in-out 3; }
    @keyframes callDockHello { 50% { box-shadow: 0 0 0 6px rgba(16,185,129,.25); } }
    .call-dock .call-dock-sound { padding: 5px 12px; border-radius: 999px; background: #fff7ed; color: #c2410c;
      border: 1px solid #fdba74; font-size: 13px; font-weight: 800; }
    .call-dock .call-dock-sound[hidden] { display: none; }
    /* 호출이 왔을 때: 헤더 전체를 쓰는 큰 띠 */
    .call-dock.alert { padding: 16px 20px; border: 3px solid #f97316;
      background: linear-gradient(135deg, #fff7ed, #ffedd5); box-shadow: 0 10px 30px rgba(249,115,22,.18); }
    .call-dock-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
      font-size: 12px; font-weight: 800; letter-spacing: .08em; color: #9a3412; }
    .call-dock.alert .call-dock-head b { font-size: clamp(15px, 2vw, 20px); letter-spacing: 0; }
    .call-dock-bell { display: inline-block; font-size: 1.15em; }
    .call-dock.alert .call-dock-bell { font-size: clamp(22px, 2.6vw, 34px); vertical-align: -4px;
      animation: callDockShake 1.1s ease-in-out infinite; }
    @keyframes callDockShake {
      0%, 100% { transform: rotate(0deg); }
      20% { transform: rotate(-13deg); }
      40% { transform: rotate(11deg); }
      60% { transform: rotate(-7deg); }
      80% { transform: rotate(5deg); }
    }
    .call-dock-state { color: #c2a894; font-size: 11px; font-weight: 700; }
    .call-dock-list { display: grid; gap: 12px; margin-top: 12px; }
    .call-dock-item { display: flex; align-items: center; gap: clamp(14px, 3vw, 32px); }
    .call-dock-num { min-width: 1.4em; text-align: center; color: #c2410c;
      font-size: clamp(52px, 9vw, 104px); font-weight: 900; line-height: .95; letter-spacing: -.04em; }
    .call-dock-body { flex: 1; min-width: 0; }
    .call-dock-caller { color: #7c2d12; font-size: clamp(18px, 2.4vw, 30px); font-weight: 800; }
    .call-dock-reason { margin-top: 4px; color: #9a3412; font-size: clamp(16px, 2vw, 26px);
      font-weight: 700; word-break: keep-all; }
    .call-dock-since { margin-top: 6px; color: #a8a29e; font-size: clamp(12px, 1.2vw, 16px); font-weight: 700; }
    .call-dock-item button { border: 0; border-radius: 12px; padding: clamp(12px, 1.6vw, 20px) clamp(16px, 2vw, 28px);
      background: #f97316; color: #fff; font-size: clamp(14px, 1.5vw, 20px); font-weight: 800; cursor: pointer; }
    .call-dock-item button:disabled { opacity: .6; cursor: wait; }
    .call-dock.alert { animation: callDockPulse 1.6s ease-in-out 6; }
    @keyframes callDockPulse {
      0%, 100% { border-color: #f97316; }
      50% { border-color: #fdba74; box-shadow: 0 10px 34px rgba(249,115,22,.34); }
    }
    @media (max-width: 620px) {
      .call-dock.alert { padding: 14px; }
      .call-dock-item { gap: 12px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .call-dock.alert, .call-dock.alert .call-dock-bell, .call-dock-pill.fresh { animation: none; }
    }
  `;
  document.head.appendChild(style);

  const header = document.querySelector('header');
  if (!header) return;
  const dock = document.createElement('div');
  dock.className = 'call-dock quiet';
  dock.innerHTML = '<div class="call-dock-head"><b><span class="call-dock-bell">🔔</span> 호출</b>'
    + '<span class="call-dock-state" id="callDockState"></span></div>'
    + '<div class="call-dock-list" id="callDockList"></div>'
    + '<div class="call-dock-idle"><span class="call-dock-pill" id="callDockPill">호출 연결됨 · 확인 중</span>'
    + '<button type="button" class="call-dock-sound" id="callDockSound">🔊 알림음 켜기</button></div>';
  header.appendChild(dock);

  const list = dock.querySelector('#callDockList');
  const pill = dock.querySelector('#callDockPill');
  const soundButton = dock.querySelector('#callDockSound');
  const stateLabel = dock.querySelector('#callDockState');
  if (justConnected) pill.classList.add('fresh');

  /* 알림음은 사람이 한 번 클릭한 뒤부터 난다. [알림음 켜기]든 화면 아무 데나든
     한 번 누르면 켜진다. 버튼을 누르면 확인용으로 한 번 울린다. */
  function enableSound(test) {
    if (!state.audioReady) {
      state.audioReady = true;
      calls.requestNotify();
    }
    if (test) calls.beep();
    render();
  }
  soundButton.addEventListener('click', (event) => {
    event.stopPropagation();
    enableSound(true);
  });
  document.addEventListener('click', () => enableSound(false), { once: true });

  function render() {
    const waiting = calls.waiting(state.calls);
    const done = calls.done(state.calls);
    dock.classList.toggle('quiet', !waiting.length);
    dock.classList.toggle('alert', !!waiting.length);
    /* 호출 중에는 종이 사이렌으로 바뀌고 흔들린다. */
    const bell = dock.querySelector('.call-dock-bell');
    if (bell) bell.textContent = waiting.length ? '🚨' : '🔔';

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

    pill.classList.toggle('error', !!state.error);
    pill.textContent = state.error
      ? `호출 연결 오류 · ${state.error}`
      : `호출 연결됨 · 대기 중${done.length ? ` · 오늘 전달 완료 ${done.length}건` : ''}`;
    soundButton.hidden = state.audioReady;
    stateLabel.textContent = state.error || '';

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
      state.error = '';
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
    } catch (error) {
      state.error = error.message;
      render();
    }
  }

  render();
  refresh();
  setInterval(refresh, calls.POLL_MS);
})();
