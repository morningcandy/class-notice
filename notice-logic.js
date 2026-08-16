(function attachNoticeLogic(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ClassNoticeLogic = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createNoticeLogic() {
  'use strict';

  function noticeEndDate(notice) {
    return String(notice?.endsAt || notice?.dueDate || notice?.date || '').trim();
  }

  function isPastNotice(notice, today) {
    const endDate = noticeEndDate(notice);
    return !!endDate && endDate < today;
  }

  function splitNotices(notices, today) {
    const current = [];
    const past = [];
    (Array.isArray(notices) ? notices : []).forEach((notice) => {
      (isPastNotice(notice, today) ? past : current).push(notice);
    });
    current.sort((a, b) => (Number(b.urgent) - Number(a.urgent))
      || noticeEndDate(a).localeCompare(noticeEndDate(b))
      || String(b.date || '').localeCompare(String(a.date || '')));
    past.sort((a, b) => noticeEndDate(b).localeCompare(noticeEndDate(a))
      || String(b.date || '').localeCompare(String(a.date || '')));
    return { current, past };
  }

  return { noticeEndDate, isPastNotice, splitNotices };
}));
