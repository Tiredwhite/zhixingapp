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

test('calendar API failures explain that the system calendar service is unavailable', () => {
  let failure;
  globalThis.uni = {
    addPhoneCalendar(options) { options.fail({ errCode: 607, errMsg: 'calendar service unavailable' }); },
  };
  addTaskToCalendar({ title: '提交项目书', due_date: '2026-10-23' }, {
    success() {},
    fail(error) { failure = error; },
  });
  assert.equal(failure.message, '手机系统日历服务不可用，请确认系统“日历”应用已启用后重试');
});

test('an older runtime reports that it needs an updated calendar capability', () => {
  delete globalThis.uni;
  let failure;
  addTaskToCalendar({ title: '提交项目书', due_date: '2026-10-23' }, {
    success() {},
    fail(error) { failure = error; },
  });
  assert.match(failure.message, /安装最新版知行/);
});
