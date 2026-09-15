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

  function noticeSortOrder(notice) {
    const raw = String(notice?.sortOrder ?? '').trim();
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }

  function compareManagerOrder(a, b) {
    const aOrder = noticeSortOrder(a);
    const bOrder = noticeSortOrder(b);
    if (aOrder !== null && bOrder !== null && aOrder !== bOrder) return aOrder - bOrder;
    if (aOrder !== null && bOrder === null) return -1;
    if (aOrder === null && bOrder !== null) return 1;
    return 0;
  }

  /* 안내일(notice_date) 최신순. 값이 비면 종료일로 대신한다. */
  function noticeDate(notice) {
    return String(notice?.date || '').trim() || noticeEndDate(notice);
  }

  /* urgent는 true/false/빈값이 섞여 온다. Number(undefined)=NaN이면 비교가
     통째로 무력화되므로 불리언으로 눌러서 쓴다. */
  function urgentRank(notice) {
    return notice && notice.urgent ? 1 : 0;
  }

  function compareNewestFirst(a, b) {
    return noticeDate(b).localeCompare(noticeDate(a));
  }

  function splitNotices(notices, today) {
    const current = [];
    const past = [];
    (Array.isArray(notices) ? notices : []).forEach((notice) => {
      (isPastNotice(notice, today) ? past : current).push(notice);
    });
    /* 긴급 공지만 맨 위로 묶고, 그 안에서도 바깥에서도 안내일 최신순.
       관리자 지정 sort_order는 같은 날짜끼리의 순서를 정할 때만 쓴다. */
    current.sort((a, b) => (urgentRank(b) - urgentRank(a))
      || compareNewestFirst(a, b)
      || compareManagerOrder(a, b)
      || noticeEndDate(a).localeCompare(noticeEndDate(b)));
    past.sort((a, b) => compareNewestFirst(a, b)
      || compareManagerOrder(a, b)
      || noticeEndDate(b).localeCompare(noticeEndDate(a)));
    return { current, past };
  }

  return { noticeEndDate, noticeDate, noticeSortOrder, isPastNotice, splitNotices };
}));
