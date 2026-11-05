'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildWeeks } = require('../counsel-today');

const booking = (date, slot, number, tag = '') => ({ date, slot, number, tag, status: 'reserved' });

test('groups bookings into a Monday-to-Friday grid with one row per time', () => {
  const [week, ...rest] = buildWeeks([
    booking('2026-11-09', '07:40-08:00', 1, '아침 조회 전'),
    booking('2026-11-13', '12:50-13:10', 30, '점심시간'),
    booking('2026-11-09', '12:50-13:10', 8, '점심시간'),
  ], '2026-11-05');

  assert.equal(rest.length, 0);
  assert.deepEqual(week.days.map((d) => d.label), ['11/9', '11/10', '11/11', '11/12', '11/13']);
  assert.deepEqual(week.rows.map((r) => r.tag), ['아침 조회 전', '점심시간']);
  assert.deepEqual(week.rows[1].cells.map((c) => c.map((b) => b.number)), [[8], [], [], [], [30]]);
});

test('leaves out past days but keeps the rest of today', () => {
  const weeks = buildWeeks([
    booking('2026-11-04', '07:40-08:00', 2),
    booking('2026-11-05', '07:40-08:00', 3),
  ], '2026-11-05');

  assert.equal(weeks.length, 1);
  assert.deepEqual(weeks[0].rows[0].cells.flat().map((b) => b.number), [3]);
});

test('makes a separate calendar for each week with bookings', () => {
  const weeks = buildWeeks([
    booking('2026-11-23', '07:40-08:00', 5),
    booking('2026-11-09', '07:40-08:00', 1),
  ], '2026-11-05');

  assert.deepEqual(weeks.map((w) => w.days[0].date), ['2026-11-09', '2026-11-23']);
});

test('adds weekend columns only for a week with a weekend booking', () => {
  const [week] = buildWeeks([booking('2026-11-14', '10:00-10:20', 4)], '2026-11-05');

  assert.equal(week.days.length, 7);
  assert.equal(week.days[5].weekday, '토');
});

test('returns nothing when no bookings remain', () => {
  assert.deepEqual(buildWeeks([booking('2026-11-01', '07:40-08:00', 1)], '2026-11-05'), []);
});
