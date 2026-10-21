import test from 'node:test';
import assert from 'node:assert/strict';
import { activeAccountSession, requireAccountLogin } from '../src/core/account.js';

test('account gate accepts a live session and clears an expired one', () => {
  const previous = globalThis.uni;
  let session = { username: 'campus_user', access_token: 'active-token', expires_at: Math.floor(Date.now() / 1000) + 60 };
  let removed = false;
  globalThis.uni = {
    getStorageSync() { return session; },
    removeStorageSync() { removed = true; session = null; },
    reLaunch() {},
  };
  try {
    assert.equal(activeAccountSession().username, 'campus_user');
    session = { username: 'campus_user', access_token: 'expired-token', expires_at: 1 };
    assert.equal(activeAccountSession(), null);
    assert.equal(removed, true);
  } finally {
    if (previous === undefined) delete globalThis.uni;
    else globalThis.uni = previous;
  }
});

test('app route guard sends an unauthenticated user to login', () => {
  const previousUni = globalThis.uni, previousPages = globalThis.getCurrentPages;
  let destination;
  globalThis.uni = {
    getStorageSync() { return null; },
    removeStorageSync() {},
    reLaunch(options) { destination = options.url; },
  };
  globalThis.getCurrentPages = () => [{ route: 'pages/home/index' }];
  try {
    assert.equal(requireAccountLogin(), false);
    assert.equal(destination, '/pages/login/index');
  } finally {
    if (previousUni === undefined) delete globalThis.uni;
    else globalThis.uni = previousUni;
    if (previousPages === undefined) delete globalThis.getCurrentPages;
    else globalThis.getCurrentPages = previousPages;
  }
});
