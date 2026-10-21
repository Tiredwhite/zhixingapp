import test from 'node:test';
import assert from 'node:assert/strict';
import { addTaskToCalendar } from '../src/core/calendar.js';

class BundleMock {
  constructor() { this.extras = {}; this.types = {}; }
  putString(key, value) { this.extras[key] = value; this.types[key] = 'string'; }
  putLong(key, value) { this.extras[key] = value; this.types[key] = 'long'; }
  putBoolean(key, value) { this.extras[key] = value; this.types[key] = 'boolean'; }
  putInt(key, value) { this.extras[key] = value; this.types[key] = 'int'; }
}

class IntentMock {
  constructor(action) { this.action = action; }
  setData(uri) { this.uri = uri; return this; }
  putExtras(extras) { this.bundle = extras; return this; }
}

function installAndroidMock() {
  let opened;
  globalThis.plus = {
    os: { name: 'Android' },
    android: {
      importClass(name) {
        if (name === 'android.content.Intent') return IntentMock;
        if (name === 'android.net.Uri') return { parse: (value) => value };
        if (name === 'android.os.Bundle') return BundleMock;
        return null;
      },
      runtimeMainActivity() { return { startActivity(intent) { opened = intent; } }; },
    },
  };
  return () => opened;
}

test('Android always opens the calendar editor with typed long deadline extras', () => {
  const getOpened = installAndroidMock();
  let nativeCalled = false, result, failure;
  globalThis.uni = {
    addPhoneCalendar() { nativeCalled = true; },
  };
  const task = { title: '提交项目书', due_at: '2026-10-23T18:00:00+08:00', location: '教学平台' };
  addTaskToCalendar(task, {
    success(value) { result = value; },
    fail(error) { failure = error; },
  });

  const opened = getOpened();
  assert.equal(failure, undefined);
  assert.equal(result.method, 'system_calendar_insert');
  assert.equal(result.requiresSave, true);
  assert.equal(nativeCalled, false);
  assert.equal(opened.action, 'android.intent.action.INSERT');
  assert.equal(opened.uri, 'content://com.android.calendar/events');
  assert.equal(opened.bundle.extras.title, task.title);
  assert.equal(opened.bundle.extras.beginTime, Date.parse(task.due_at));
  assert.equal(opened.bundle.extras.endTime, Date.parse(task.due_at) + 30 * 60 * 1000);
  assert.equal(opened.bundle.types.beginTime, 'long');
  assert.equal(opened.bundle.types.endTime, 'long');
  assert.equal(opened.bundle.extras.eventLocation, '教学平台');
  assert.equal(opened.bundle.extras.minutes, 30);
});

test('non-Android platforms keep the native calendar API and seconds timestamps', () => {
  let options, result, failure;
  globalThis.plus = { os: { name: 'iOS' } };
  globalThis.uni = {
    addPhoneCalendar(value) {
      options = value;
      value.success({ errMsg: 'addPhoneCalendar:ok' });
    },
  };
  const task = { title: '提交项目书', due_at: '2026-10-23T18:00:00+08:00' };
  addTaskToCalendar(task, {
    success(value) { result = value; },
    fail(error) { failure = error; },
  });
  assert.equal(failure, undefined);
  assert.deepEqual(result, { errMsg: 'addPhoneCalendar:ok' });
  assert.equal(options.startTime, Date.parse(task.due_at) / 1000);
  assert.equal(options.endTime - options.startTime, 1800);
  assert.equal(options.alarm, true);
  assert.equal(options.alarmOffset, 1800);
});

test('Android date-only deadlines are inserted at local 09:00', () => {
  const getOpened = installAndroidMock();
  globalThis.uni = {};
  addTaskToCalendar({ title: '报名截止', due_date: '2026-10-23' }, {
    success() {}, fail(error) { throw error; },
  });
  const timing = getOpened().bundle.extras;
  const localStart = new Date(timing.beginTime);
  assert.equal(localStart.getHours(), 9);
  assert.equal(localStart.getMinutes(), 0);
  assert.equal(timing.endTime - timing.beginTime, 30 * 60 * 1000);
  assert.equal(timing.minutes, 0);
});

test('Android calendar errors explain when the system editor cannot open', () => {
  let failure;
  globalThis.uni = {};
  globalThis.plus = {
    os: { name: 'Android' },
    android: { importClass() { return null; } },
  };
  addTaskToCalendar({ title: '提交项目书', due_date: '2026-10-23' }, {
    success() {},
    fail(error) { failure = error; },
  });
  assert.match(failure.message, /无法调用 Android 系统日历/);
});

test('date-less tasks are rejected before opening any calendar API', () => {
  let failure;
  globalThis.uni = { addPhoneCalendar() { throw new Error('must not be called'); } };
  globalThis.plus = { os: { name: 'Android' } };
  addTaskToCalendar({ title: '无日期任务' }, {
    success() {},
    fail(error) { failure = error; },
  });
  assert.match(failure.message, /待办日期无效/);
});
