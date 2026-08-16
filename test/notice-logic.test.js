'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { noticeEndDate, isPastNotice, splitNotices } = require('../notice-logic');

test('keeps a notice current through its end date and archives it the next day', () => {
  const notice = { date: '2026-08-16', endsAt: '2026-08-18' };
  assert.equal(isPastNotice(notice, '2026-08-18'), false);
  assert.equal(isPastNotice(notice, '2026-08-19'), true);
});

test('uses due date and then notice date when no explicit end date exists', () => {
  assert.equal(noticeEndDate({ date: '2026-08-16', dueDate: '2026-08-20' }), '2026-08-20');
  assert.equal(noticeEndDate({ date: '2026-08-16' }), '2026-08-16');
});

test('returns one current list and a separate past list', () => {
  const result = splitNotices([
    { id: 'past', date: '2026-08-14' },
    { id: 'current', date: '2026-08-15', endsAt: '2026-08-18' },
    { id: 'urgent', date: '2026-08-16', endsAt: '2026-08-17', urgent: true },
  ], '2026-08-16');
  assert.deepEqual(result.current.map((notice) => notice.id), ['urgent', 'current']);
  assert.deepEqual(result.past.map((notice) => notice.id), ['past']);
});

test('uses the manager order before urgency and dates', () => {
  const result = splitNotices([
    { id: 'normal-class', date: '2026-08-18', endsAt: '2026-08-18', sortOrder: 30 },
    { id: 'arrival', date: '2026-08-18', endsAt: '2026-08-18', sortOrder: 10 },
    { id: 'opening-cleanup', date: '2026-08-18', endsAt: '2026-08-18', sortOrder: 20, urgent: true },
  ], '2026-08-16');
  assert.deepEqual(result.current.map((notice) => notice.id), ['arrival', 'opening-cleanup', 'normal-class']);
});
