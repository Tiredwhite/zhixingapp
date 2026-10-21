import test from 'node:test';
import assert from 'node:assert/strict';
import { addTaskToCalendar } from '../src/core/calendar.js';

test('Android calendar add delegates creation, permissions, and reminders to the native calendar API', () => {
  let options, result, failure;
  globalThis.uni = {
    addPhoneCalendar(value) {
      options = value;
      value.success({ errMsg: 'addPhoneCalendar:ok' });
    },
  };
  globalThis.plus = { os: { name: 'Android' } };
  addTaskToCalendar({ title: '提交项目书', due_at: '2026-10-23T18:00:00+08:00', location: '教学平台' }, {
    success(value) { result = value; },
    fail(error) { failure = error; },
  });
  assert.equal(failure, undefined);
  assert.deepEqual(result, { errMsg: 'addPhoneCalendar:ok' });
  assert.equal(options.title, '提交项目书');
  assert.equal(options.startTime, Date.parse('2026-10-23T18:00:00+08:00') / 1000);
  assert.equal(options.endTime - options.startTime, 1800);
  assert.equal(options.location, '教学平台');
  assert.equal(options.alarm, true);
  assert.equal(options.alarmOffset, 1800);
});

test('failed native calendar API falls back to the Android calendar editor', () => {
  class IntentMock {
    constructor(action) { this.action = action; this.extras = {}; }
    setData(uri) { this.uri = uri; return this; }
    putExtra(key, value) { this.extras[key] = value; return this; }
  }
  let opened, result, failure;
  globalThis.uni = {
    addPhoneCalendar(options) { options.fail({ errCode: 607, errMsg: 'calendar service unavailable' }); },
  };
  globalThis.plus = {
    os: { name: 'Android' },
    android: {
      importClass(name) {
        if (name === 'android.content.Intent') return IntentMock;
        if (name === 'android.net.Uri') return { parse: (value) => value };
        return null;
      },
      runtimeMainActivity() { return { startActivity(intent) { opened = intent; } }; },
    },
  };
  addTaskToCalendar({ title: '提交项目书', due_date: '2026-10-23' }, {
    success(value) { result = value; },
    fail(error) { failure = error; },
  });
  assert.equal(failure, undefined);
  assert.equal(result.requiresSave, true);
  assert.equal(opened.action, 'android.intent.action.INSERT');
  assert.equal(opened.extras.title, '提交项目书');
});

test('calendar failure keeps a useful error if Android editor cannot open', () => {
  let failure;
  globalThis.uni = {
    addPhoneCalendar(options) { options.fail({ errCode: 607, errMsg: 'calendar service unavailable' }); },
  };
  delete globalThis.plus;
  addTaskToCalendar({ title: '提交项目书', due_date: '2026-10-23' }, {
    success() {},
    fail(error) { failure = error; },
  });
  assert.equal(failure.message, '手机系统日历服务不可用，请确认系统“日历”应用已启用后重试');
});

test('older Android runtimes open the system calendar editor with a prefilled event', () => {
  class IntentMock {
    constructor(action) { this.action = action; this.extras = {}; }
    setData(uri) { this.uri = uri; return this; }
    putExtra(key, value) { this.extras[key] = value; return this; }
  }
  let opened, result, failure;
  globalThis.uni = {};
  globalThis.plus = {
    os: { name: 'Android' },
    android: {
      importClass(name) {
        if (name === 'android.content.Intent') return IntentMock;
        if (name === 'android.net.Uri') return { parse: (value) => value };
        return null;
      },
      runtimeMainActivity() { return { startActivity(intent) { opened = intent; } }; },
    },
  };
  addTaskToCalendar({ title: '提交项目书', due_date: '2026-10-23' }, {
    success(value) { result = value; },
    fail(error) { failure = error; },
  });
  assert.equal(failure, undefined);
  assert.equal(result.requiresSave, true);
  assert.equal(opened.action, 'android.intent.action.INSERT');
  assert.equal(opened.uri, 'content://com.android.calendar/events');
  assert.equal(opened.extras.title, '提交项目书');
  assert.equal(opened.extras.beginTime, new Date(2026, 9, 23, 9).getTime());
  assert.equal(opened.extras.allDay, false);
});

test('non-Android runtimes explain that a phone calendar app is required', () => {
  globalThis.uni = {};
  delete globalThis.plus;
  let failure;
  addTaskToCalendar({ title: '提交项目书', due_date: '2026-10-23' }, {
    success() {},
    fail(error) { failure = error; },
  });
  assert.match(failure.message, /安卓知行 App/);
});
