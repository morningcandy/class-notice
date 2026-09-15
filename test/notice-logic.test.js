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

test('puts urgent notices first, then sorts by end date soonest first', () => {
  const result = splitNotices([
    { id: 'latest-end', date: '2026-08-16', endsAt: '2026-08-25' },
    { id: 'soonest-end', date: '2026-08-18', endsAt: '2026-08-18' },
    { id: 'urgent-late-end', date: '2026-08-15', endsAt: '2026-08-30', urgent: true },
    { id: 'middle-end', date: '2026-08-17', endsAt: '2026-08-20' },
  ], '2026-08-16');
  assert.deepEqual(
    result.current.map((notice) => notice.id),
    ['urgent-late-end', 'soonest-end', 'middle-end', 'latest-end'],
  );
});

test('sends a notice with no date at all to the bottom of the current list', () => {
  const result = splitNotices([
    { id: 'no-date-at-all' },
    { id: 'dated', date: '2026-08-17', endsAt: '2026-08-25' },
  ], '2026-08-16');
  assert.deepEqual(result.current.map((notice) => notice.id), ['dated', 'no-date-at-all']);
});

test('uses the manager order only to break a tie on the same end date', () => {
  const result = splitNotices([
    { id: 'same-day-last', date: '2026-08-18', endsAt: '2026-08-18', sortOrder: 30 },
    { id: 'same-day-first', date: '2026-08-18', endsAt: '2026-08-18', sortOrder: 10 },
    { id: 'earlier-end', date: '2026-08-16', endsAt: '2026-08-17', sortOrder: 99 },
  ], '2026-08-16');
  assert.deepEqual(
    result.current.map((notice) => notice.id),
    ['earlier-end', 'same-day-first', 'same-day-last'],
  );
});

test('sorts the archive newest first too', () => {
  const result = splitNotices([
    { id: 'old', date: '2026-08-10', endsAt: '2026-08-11' },
    { id: 'recent', date: '2026-08-14', endsAt: '2026-08-15' },
    { id: 'middle', date: '2026-08-12', endsAt: '2026-08-13' },
  ], '2026-08-16');
  assert.deepEqual(result.past.map((notice) => notice.id), ['recent', 'middle', 'old']);
});

test('falls back to the end date when a notice has no notice date', () => {
  const result = splitNotices([
    { id: 'no-date', endsAt: '2026-08-20' },
    { id: 'dated', date: '2026-08-17', endsAt: '2026-08-17' },
  ], '2026-08-16');
  assert.deepEqual(result.current.map((notice) => notice.id), ['dated', 'no-date']);
});
