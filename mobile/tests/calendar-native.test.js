import test from 'node:test';
import assert from 'node:assert/strict';
import { addTaskToCalendar } from '../src/core/calendar.js';

function androidBridge({ failReminder = false } = {}) {
  const inserted = [];
  const deleted = [];
  const calendar = { id: 7, access: 700, visible: 1 };
  const cursor = {
    moveToNext() { if (this.used) return false; this.used = true; return true; },
    getColumnIndex(name) { return ({ _id: 0, calendar_access_level: 1, visible: 2 })[name] ?? -1; },
    getInt(index) { return index === 1 ? calendar.access : calendar.visible; },
    getLong() { return calendar.id; },
    close() { this.closed = true; },
  };
  const resolver = {
    query() { return cursor; },
    insert(uri, values) {
      inserted.push({ uri, values: new Map(values) });
      return uri === 'events' ? { getLastPathSegment() { return '42'; } } : (failReminder ? null : { id: 1 });
    },
    delete(uri) { deleted.push(uri); },
  };
  const main = { getContentResolver() { return resolver; } };
  const classes = {
    'android.provider.CalendarContract$Calendars': { CONTENT_URI: 'calendars', _ID: '_id', CALENDAR_ACCESS_LEVEL: 'calendar_access_level', VISIBLE: 'visible' },
    'android.provider.CalendarContract$Events': { CONTENT_URI: 'events' },
    'android.provider.CalendarContract$Reminders': { CONTENT_URI: 'reminders' },
    'java.util.TimeZone': { getDefault() { return { getID() { return 'Asia/Shanghai'; } }; } },
  };
  globalThis.plus = {
    os: { name: 'Android' },
    android: {
      requestPermissions(_permissions, callback) { callback({ granted: ['android.permission.READ_CALENDAR', 'android.permission.WRITE_CALENDAR'] }); },
      runtimeMainActivity() { return main; },
      importClass(name) { return classes[name] || name; },
      newObject(name, value) {
        if (name === 'android.content.ContentValues') return new Map();
        return Number(value);
      },
      invoke(target, method, ...args) {
        if (method === 'put' && target instanceof Map) return target.set(args[0], args[1]);
        return target[method](...args);
      },
    },
  };
  return { inserted, deleted, cursor };
}

test('Android calendar insertion chooses a writable calendar and creates its reminder', () => {
  const bridge = androidBridge();
  let added = false, failure;
  addTaskToCalendar({ title: '提交项目书', due_at: '2026-10-23T18:00:00+08:00', location: '教学平台' }, {
    success() { added = true; }, fail(error) { failure = error; },
  });
  assert.equal(added, true);
  assert.equal(failure, undefined);
  assert.equal(bridge.inserted.length, 2);
  assert.equal(bridge.inserted[0].uri, 'events');
  assert.equal(bridge.inserted[0].values.get('title'), '提交项目书');
  assert.equal(bridge.inserted[1].values.get('event_id'), 42);
  assert.equal(bridge.inserted[1].values.get('minutes'), 30);
  assert.equal(bridge.cursor.closed, true);
});

test('Android calendar insertion rolls back the event if its reminder cannot be saved', () => {
  const bridge = androidBridge({ failReminder: true });
  let added = false, failure;
  addTaskToCalendar({ title: '提交项目书', due_date: '2026-10-23' }, {
    success() { added = true; }, fail(error) { failure = error; },
  });
  assert.equal(added, false);
  assert.match(failure.message, /提醒未能保存/);
  assert.equal(bridge.deleted.length, 1);
  assert.equal(bridge.deleted[0].getLastPathSegment(), '42');
});
