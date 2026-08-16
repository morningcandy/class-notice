(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ClassNoticeStudentCode = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function normalize(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return /^\d{6}$/.test(digits) ? digits : '';
  }

  function fromNumberAndPhone(number, phone) {
    const parsedNumber = Number(String(number || '').replace(/\D/g, ''));
    const phoneDigits = String(phone || '').replace(/\D/g, '');
    if (!Number.isInteger(parsedNumber) || parsedNumber < 1 || parsedNumber > 99 || phoneDigits.length < 4) return '';
    return String(parsedNumber).padStart(2, '0') + phoneDigits.slice(-4);
  }

  return { normalize, fromNumberAndPhone };
}));
