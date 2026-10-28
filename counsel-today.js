/* 상담 일정 (학급 시간표 위)
   학생 상담 앱(student-counsel)의 예약 피드를 읽어 오늘 예약과 다음 수업일 예약을 시간순으로 보여준다.
   다음 수업일은 주말·공휴일(data.js holidays)을 건너뛴다 — 금요일이면 다음 주 월요일.
   피드는 취소 건을 빼고 날짜·시간·학생 번호·상태만 내려준다(이름·상담 내용·연락처 없음).
   둘 다 예약이 없거나 피드를 못 읽으면 섹션을 숨긴다. 교실 화면은 계속 켜 두므로 5분마다 다시 읽는다. */
(function () {
  'use strict';

  const FEED = 'https://student-counsel.vercel.app/api/availability?view=planner';
  const REFRESH_MS = 5 * 60 * 1000;

  const section = document.getElementById('counselTodaySection');
  const todayWrap = document.getElementById('counselTodayWrap');
  const list = document.getElementById('counselToday');
  const dateEl = document.getElementById('counselTodayDate');
  const nextWrap = document.getElementById('counselNextWrap');
  const nextList = document.getElementById('counselNext');
  const nextDateEl = document.getElementById('counselNextDate');
  if (!section || !list) return;

  const pad = (n) => String(n).padStart(2, '0');
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const holidaySet = new Set((typeof holidays !== 'undefined' ? holidays : []).map((h) => h.date));

  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  }

  // 오늘 다음의 첫 평일(공휴일 제외). 금요일이면 다음 주 월요일이 된다.
  function nextSchoolDay(from) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    for (let i = 0; i < 14; i += 1) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6 && !holidaySet.has(ymd(d))) return d;
    }
    return d;
  }

  function rowHtml(b, nowHm) {
    const [start, end] = String(b.slot || '').split('-');
    const done = b.status === 'completed';
    const past = !done && nowHm && end && end <= nowHm;
    const now = !done && nowHm && start && end && start <= nowHm && nowHm < end;
    const cls = done ? ' done' : past ? ' past' : now ? ' now' : '';
    return `<li class="ct-row${cls}">`
      + `<span class="ct-time">${escapeHtml(start || '')}<small>${escapeHtml(b.tag || '')}</small></span>`
      + `<span class="ct-who">${b.number ? `${b.number}번` : '번호 미확인'}</span>`
      + (done ? '<span class="ct-state">완료</span>' : now ? '<span class="ct-state now">지금</span>' : '')
      + '</li>';
  }

  function onDate(items, date) {
    return items
      .filter((b) => b.date === date)
      .sort((a, b) => String(a.slot).localeCompare(String(b.slot)));
  }

  async function refresh() {
    const d = new Date();
    const today = ymd(d);
    const nowHm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const next = nextSchoolDay(d);
    const tomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const nextLabel = ymd(next) === ymd(tomorrow) ? '내일'
      : next.getDay() === 1 && d.getDay() >= 5 ? '다음 주 월요일' : '다음 수업일';
    try {
      const res = await fetch(FEED, { cache: 'no-store' });
      if (!res.ok) throw new Error(`상담 피드 응답 오류(${res.status})`);
      const all = (await res.json()).items || [];
      const items = onDate(all, today);
      const nextItems = onDate(all, ymd(next));
      if (!items.length && !nextItems.length) { section.style.display = 'none'; return; }

      if (dateEl) dateEl.textContent = `오늘 ${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]}) · ${items.length}명`;
      list.innerHTML = `<ul>${items.map((b) => rowHtml(b, nowHm)).join('')}</ul>`;
      if (todayWrap) todayWrap.style.display = items.length ? '' : 'none';

      if (nextWrap && nextList) {
        if (nextDateEl) nextDateEl.textContent = `${nextLabel} ${next.getMonth() + 1}/${next.getDate()}(${WD[next.getDay()]}) · ${nextItems.length}명`;
        nextList.innerHTML = `<ul>${nextItems.map((b) => rowHtml(b, '')).join('')}</ul>`;
        nextWrap.style.display = nextItems.length ? '' : 'none';
      }
      section.style.display = '';
    } catch (err) {
      // 상담 앱이 잠시 안 열려도 알림장 나머지는 그대로 쓰도록 조용히 숨긴다.
      section.style.display = 'none';
    }
  }

  refresh();
  setInterval(refresh, REFRESH_MS);
})();
