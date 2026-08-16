'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../notice-content');

test('renders a timetable markdown table as an accessible HTML table', () => {
  const html = render('학급 시간표\n\n| 교시 | 월 | 화 |\n| --- | --- | --- |\n| 1 | 국어 | 수학 |\n| 2 | 영어 | 과학 |');
  assert.match(html, /<table class="notice-table">/);
  assert.match(html, /<th scope="col">교시<\/th>/);
  assert.match(html, /<td>국어<\/td>/);
  assert.match(html, /<td>과학<\/td>/);
});

test('escapes arbitrary HTML in both text and table cells', () => {
  const html = render('<script>alert(1)</script>\n| 항목 | 값 |\n| --- | --- |\n| 링크 | <img src=x onerror=alert(1)> |');
  assert.equal(html.includes('<script>'), false);
  assert.equal(html.includes('<img'), false);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img/);
});

test('keeps ordinary multiline notices readable', () => {
  assert.match(render('첫째 줄\n둘째 줄'), /첫째 줄<br>둘째 줄/);
});
