'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize, fromNumberAndPhone } = require('../student-code');

test('formats one-digit student numbers with a leading zero', () => {
  assert.equal(fromNumberAndPhone(1, '010-5555-1234'), '011234');
  assert.equal(fromNumberAndPhone(12, '010-5555-9876'), '129876');
});

test('accepts only an exact six-digit personal code', () => {
  assert.equal(normalize('01-1234'), '011234');
  assert.equal(normalize('11234'), '');
  assert.equal(normalize('011234'), '011234');
});
