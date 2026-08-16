(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ClassNoticeContent = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }

  // 표 칸 안에서는 줄바꿈용 <br>만 허용한다(그 외 태그는 여전히 이스케이프).
  function cellHtml(value) {
    return escapeHtml(value)
      .replaceAll('&lt;br&gt;', '<br>')
      .replaceAll('&lt;br/&gt;', '<br>')
      .replaceAll('&lt;br /&gt;', '<br>');
  }

  function cells(line) {
    let value = String(line || '').trim();
    if (value.startsWith('|')) value = value.slice(1);
    if (value.endsWith('|')) value = value.slice(0, -1);
    return value.split('|').map((cell) => cell.trim());
  }

  function isSeparator(line) {
    const values = cells(line);
    return values.length > 1 && values.every((value) => /^:?-{3,}:?$/.test(value));
  }

  function tableHtml(lines, start) {
    if (start + 1 >= lines.length || !lines[start].includes('|') || !isSeparator(lines[start + 1])) return null;
    const header = cells(lines[start]);
    if (header.length < 2) return null;
    const rows = [];
    let cursor = start + 2;
    while (cursor < lines.length && lines[cursor].includes('|') && String(lines[cursor]).trim()) {
      const row = cells(lines[cursor]);
      while (row.length < header.length) row.push('');
      rows.push(row.slice(0, header.length));
      cursor += 1;
    }
    const head = header.map((cell) => `<th scope="col">${cellHtml(cell)}</th>`).join('');
    const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${cellHtml(cell)}</td>`).join('')}</tr>`).join('');
    return {
      html: `<div class="notice-table-wrap"><table class="notice-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`,
      next: cursor,
    };
  }

  function textHtml(lines) {
    return lines.map((line) => escapeHtml(line)).join('<br>');
  }

  function render(value) {
    const lines = String(value ?? '').replace(/\r\n?/g, '\n').split('\n');
    const output = [];
    let text = [];
    const flushText = () => {
      if (!text.length) return;
      output.push(`<div class="notice-text">${textHtml(text)}</div>`);
      text = [];
    };
    let index = 0;
    while (index < lines.length) {
      const table = tableHtml(lines, index);
      if (table) {
        flushText();
        output.push(table.html);
        index = table.next;
      } else {
        text.push(lines[index]);
        index += 1;
      }
    }
    flushText();
    return output.join('');
  }

  return { render, escapeHtml, isSeparator };
}));
