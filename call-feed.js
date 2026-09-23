/* 학생 호출 공통 로직.
   교실 화면(board/)과 학급 알림장 헤더 패널(board-panel.js)이 같이 쓴다.
   교실 화면 코드가 이 기기에 저장돼 있을 때만 동작한다. 학생 개인 기기에는
   코드가 없으므로 호출을 부르지도, 보여주지도 않는다. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ClassNoticeCalls = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const KEY_STORE = 'classNotice.boardKey.v1';
  const POLL_MS = 20000;
  let audio = null;

  function getKey() {
    try { return localStorage.getItem(KEY_STORE) || ''; } catch (error) { return ''; }
  }

  function setKey(key) {
    try { localStorage.setItem(KEY_STORE, key); } catch (error) { /* 저장 못해도 이번 세션은 쓴다 */ }
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    })[char]);
  }

  async function fetchCalls(apiUrl, key) {
    const response = await fetch(`${apiUrl}?action=board&board=${encodeURIComponent(key)}`);
    if (!response.ok) throw new Error(`서버 연결 실패 (${response.status})`);
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || '호출을 불러오지 못했습니다.');
    return Array.isArray(result.calls) ? result.calls : [];
  }

  async function ack(apiUrl, key, callId) {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'ackCall', board: key, callId }),
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || '처리하지 못했습니다.');
    return result;
  }

  /* 소리 파일을 두지 않고 짧은 두 번의 삐 소리를 만든다.
     브라우저 정책상 사람이 한 번 클릭한 뒤에만 소리가 난다. */
  function beep() {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audio;
      if (ctx.state === 'suspended') ctx.resume();
      [0, 0.32].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.26);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.3);
      });
    } catch (error) { /* 소리가 막혀도 화면 표시는 계속한다 */ }
  }

  function notify(call) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const body = call.reason ? `${call.caller} · ${call.reason}` : String(call.caller);
      new Notification(`${call.number}번 호출`, { body, tag: call.id, renotify: true });
    } catch (error) { /* 알림이 막혀도 화면 표시는 계속한다 */ }
  }

  async function requestNotify() {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    try { await Notification.requestPermission(); } catch (error) { /* 거부해도 화면은 쓸 수 있다 */ }
  }

  function sinceLabel(createdAt) {
    const started = Date.parse(createdAt);
    if (Number.isNaN(started)) return '';
    const minutes = Math.max(0, Math.floor((Date.now() - started) / 60000));
    if (minutes < 1) return '방금';
    if (minutes < 60) return `${minutes}분 전`;
    return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분 전`;
  }

  const waiting = (calls) => calls.filter((call) => call.status === '호출중');
  const done = (calls) => calls.filter((call) => call.status === '전달완료');

  return {
    KEY_STORE, POLL_MS, getKey, setKey, esc,
    fetchCalls, ack, beep, notify, requestNotify, sinceLabel, waiting, done,
  };
}));
