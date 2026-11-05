/* 상담 일정 달력 (학급 시간표 위)
   학생 상담 앱(student-counsel)의 예약 피드를 읽어 남은 예약을 주 단위 달력으로 보여준다.
   가로는 요일, 세로는 상담 시간이고 칸에는 학생 번호만 들어간다.
   공지를 따로 올리지 않아도 상담 앱에 예약이 생기면 그대로 뜬다.
   피드는 취소 건을 빼고 날짜·시간·학생 번호·상태만 내려준다(이름·상담 내용·연락처 없음).
   남은 예약이 없거나 피드를 못 읽으면 섹션을 숨긴다. 교실 화면은 계속 켜 두므로 5분마다 다시 읽는다. */
(function () {
  'use strict';

  const FEED = 'https://student-counsel.vercel.app/api/availability?view=planner';
  const REFRESH_MS = 5 * 60 * 1000;
  const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  function parseYmd(text) {
    const [y, m, d] = String(text).split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function mondayOf(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  }

  // 오늘 이후 예약을 주별로 묶는다. 주말 예약이 있는 주만 토·일 칸을 더한다.
  function buildWeeks(items, today) {
    const byMonday = new Map();
    items.filter((b) => b.date >= today).forEach((b) => {
      const key = ymd(mondayOf(parseYmd(b.date)));
      if (!byMonday.has(key)) byMonday.set(key, []);
      byMonday.get(key).push(b);
    });

    return [...byMonday.keys()].sort().map((key) => {
      const bookings = byMonday.get(key);
      const monday = parseYmd(key);
      const hasWeekend = bookings.some((b) => [0, 6].includes(parseYmd(b.date).getDay()));
      const days = Array.from({ length: hasWeekend ? 7 : 5 }, (_, i) => {
        const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
        return { date: ymd(d), weekday: WEEKDAYS[i], label: `${d.getMonth() + 1}/${d.getDate()}` };
      });
      const slots = [...new Set(bookings.map((b) => String(b.slot || '')))].sort();
      const rows = slots.map((slot) => ({
        slot,
        tag: (bookings.find((b) => String(b.slot || '') === slot && b.tag) || {}).tag || '',
        cells: days.map((day) => bookings
          .filter((b) => String(b.slot || '') === slot && b.date === day.date)
          .sort((a, b) => (a.number || 0) - (b.number || 0))),
      }));
      return { key, days, rows };
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildWeeks };
    return;
  }

  const section = document.getElementById('counselTodaySection');
  const calendar = document.getElementById('counselCalendar');
  if (!section || !calendar) return;

  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  }

  function bookingHtml(b, today, nowHm) {
    const [start, end] = String(b.slot || '').split('-');
    const isToday = b.date === today;
    const done = b.status === 'completed';
    const past = !done && isToday && end && end <= nowHm;
    const now = !done && isToday && start && end && start <= nowHm && nowHm < end;
    const cls = done ? ' done' : past ? ' past' : now ? ' now' : '';
    return `<span class="cc-num${cls}">${b.number ? `${b.number}번` : '번호 미확인'}</span>`;
  }

  function weekHtml(week, today, nowHm) {
    const first = week.days[0];
    const last = week.days[week.days.length - 1];
    const head = week.days.map((day) => `<th scope="col"${day.date === today ? ' class="today"' : ''}>`
      + `${day.weekday}<small>${day.label}</small></th>`).join('');
    const body = week.rows.map((row) => {
      const [start, end] = row.slot.split('-');
      const cells = row.cells.map((bookings, i) => `<td${week.days[i].date === today ? ' class="today"' : ''}>`
        + `${bookings.map((b) => bookingHtml(b, today, nowHm)).join('')}</td>`).join('');
      return `<tr><th scope="row">${escapeHtml(row.tag || '상담')}`
        + `<small>${escapeHtml(start || '')}${end ? `~${escapeHtml(end)}` : ''}</small></th>${cells}</tr>`;
    }).join('');
    return `<div class="cc-week"><div class="cc-range">${first.label} ~ ${last.label}</div>`
      + '<div class="cc-table-wrap"><table class="cc-table">'
      + `<thead><tr><th scope="col" class="cc-corner">시간</th>${head}</tr></thead>`
      + `<tbody>${body}</tbody></table></div></div>`;
  }

  async function refresh() {
    const d = new Date();
    const today = ymd(d);
    const nowHm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    try {
      const res = await fetch(FEED, { cache: 'no-store' });
      if (!res.ok) throw new Error(`상담 피드 응답 오류(${res.status})`);
      const weeks = buildWeeks((await res.json()).items || [], today);
      if (!weeks.length) { section.style.display = 'none'; return; }
      calendar.innerHTML = weeks.map((week) => weekHtml(week, today, nowHm)).join('');
      section.style.display = '';
    } catch (err) {
      // 상담 앱이 잠시 안 열려도 알림장 나머지는 그대로 쓰도록 조용히 숨긴다.
      section.style.display = 'none';
    }
  }

  refresh();
  setInterval(refresh, REFRESH_MS);
})();
