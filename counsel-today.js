/* 오늘의 상담 일정 (학급 시간표 위)
   학생 상담 앱(student-counsel)의 예약 피드를 읽어 오늘 날짜 예약만 시간순으로 보여준다.
   피드는 취소 건을 빼고 날짜·시간·학생 번호·상태만 내려준다(이름·상담 내용·연락처 없음).
   오늘 예약이 없거나 피드를 못 읽으면 섹션을 숨긴다. 교실 화면은 계속 켜 두므로 5분마다 다시 읽는다. */
(function () {
  'use strict';

  const FEED = 'https://student-counsel.vercel.app/api/availability?view=planner';
  const REFRESH_MS = 5 * 60 * 1000;

  const section = document.getElementById('counselTodaySection');
  const list = document.getElementById('counselToday');
  const dateEl = document.getElementById('counselTodayDate');
  if (!section || !list) return;

  const pad = (n) => String(n).padStart(2, '0');
  const WD = ['일', '월', '화', '수', '목', '금', '토'];

  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  }

  function rowHtml(b, nowHm) {
    const [start, end] = String(b.slot || '').split('-');
    const done = b.status === 'completed';
    const past = !done && end && end <= nowHm;
    const now = !done && start && end && start <= nowHm && nowHm < end;
    const cls = done ? ' done' : past ? ' past' : now ? ' now' : '';
    return `<li class="ct-row${cls}">`
      + `<span class="ct-time">${escapeHtml(start || '')}<small>${escapeHtml(b.tag || '')}</small></span>`
      + `<span class="ct-who">${b.number ? `${b.number}번` : '번호 미확인'}</span>`
      + (done ? '<span class="ct-state">완료</span>' : now ? '<span class="ct-state now">지금</span>' : '')
      + '</li>';
  }

  async function refresh() {
    const d = new Date();
    const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const nowHm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    try {
      const res = await fetch(FEED, { cache: 'no-store' });
      if (!res.ok) throw new Error(`상담 피드 응답 오류(${res.status})`);
      const items = ((await res.json()).items || [])
        .filter((b) => b.date === today)
        .sort((a, b) => String(a.slot).localeCompare(String(b.slot)));
      if (!items.length) { section.style.display = 'none'; return; }
      if (dateEl) dateEl.textContent = `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]}) · ${items.length}명`;
      list.innerHTML = `<ul>${items.map((b) => rowHtml(b, nowHm)).join('')}</ul>`;
      section.style.display = '';
    } catch (err) {
      // 상담 앱이 잠시 안 열려도 알림장 나머지는 그대로 쓰도록 조용히 숨긴다.
      section.style.display = 'none';
    }
  }

  refresh();
  setInterval(refresh, REFRESH_MS);
})();
