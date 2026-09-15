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

  /* 종료일이 빠른(마감이 임박한) 공지가 위로. 종료일이 아예 없는 공지는
     맨 아래로 보낸다(빈 문자열은 localeCompare에서 제일 앞으로 오기 때문). */
  function compareEndingSoonFirst(a, b) {
    const aEnd = noticeEndDate(a);
    const bEnd = noticeEndDate(b);
    if (!aEnd && !bEnd) return 0;
    if (!aEnd) return 1;
    if (!bEnd) return -1;
    return aEnd.localeCompare(bEnd);
  }

  function splitNotices(notices, today) {
    const current = [];
    const past = [];
    (Array.isArray(notices) ? notices : []).forEach((notice) => {
      (isPastNotice(notice, today) ? past : current).push(notice);
    });
    /* 중요 공지를 맨 위로 묶고, 그 안에서도 바깥에서도 종료일이 빠른 순.
       관리자 지정 sort_order는 종료일이 같을 때의 순서를 정할 때만 쓴다. */
    current.sort((a, b) => (urgentRank(b) - urgentRank(a))
      || compareEndingSoonFirst(a, b)
      || compareManagerOrder(a, b)
      || compareNewestFirst(a, b));
    past.sort((a, b) => compareNewestFirst(a, b)
      || compareManagerOrder(a, b)
      || noticeEndDate(b).localeCompare(noticeEndDate(a)));
    return { current, past };
  }

  return { noticeEndDate, noticeDate, noticeSortOrder, isPastNotice, splitNotices };
}));
