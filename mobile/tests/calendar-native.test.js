import test from 'node:test';
import assert from 'node:assert/strict';
import { addTaskToCalendar } from '../src/core/calendar.js';

function androidBridge({ failReminder = false, hasCalendar = true } = {}) {
  const inserted = [];
  const deleted = [];
  const calendar = { id: 7, access: 700, visible: 1 };
  const cursor = {
    moveToNext() { if (!hasCalendar || this.used) return false; this.used = true; return true; },
    getColumnIndex(name) { return ({ _id: 0, calendar_access_level: 1, visible: 2 })[name] ?? -1; },
    getInt(index) { return index === 1 ? calendar.access : calendar.visible; },
    getLong() { return calendar.id; },
    close() { this.closed = true; },
  };
  const resolver = {
    query() { return cursor; },
    insert(uri, values) {
      inserted.push({ uri, values: new Map(values) });
      if (uri === 'events') return { getLastPathSegment() { return '42'; } };
      if (String(uri).startsWith('calendars?')) return { getLastPathSegment() { return '8'; } };
      return failReminder ? null : { id: 1 };
    },
    delete(uri) { deleted.push(uri); },
  };
  const main = { getContentResolver() { return resolver; } };
  const calendarsUri = { buildUpon() { return { params: [], appendQueryParameter(key, value) { this.params.push(`${key}=${value}`); }, build() { return `calendars?${this.params.join('&')}`; } }; } };
  const classes = {
    'android.provider.CalendarContract$Calendars': {
      CONTENT_URI: calendarsUri, _ID: '_id', ACCOUNT_NAME: 'account_name', ACCOUNT_TYPE: 'account_type',
      NAME: 'name', CALENDAR_DISPLAY_NAME: 'calendar_display_name', OWNER_ACCOUNT: 'ownerAccount',
      CALENDAR_TIME_ZONE: 'calendar_timezone', ALLOWED_REMINDERS: 'allowed_reminders', MAX_REMINDERS: 'maxReminders', CALENDAR_COLOR: 'calendar_color',
      CALENDAR_ACCESS_LEVEL: 'calendar_access_level', VISIBLE: 'visible', SYNC_EVENTS: 'sync_events',
    },
    'android.provider.CalendarContract': { ACCOUNT_TYPE_LOCAL: 'LOCAL', CALLER_IS_SYNCADAPTER: 'caller_is_syncadapter' },
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

test('Android calendar insertion creates a local 知行 calendar when the phone has none', () => {
  const bridge = androidBridge({ hasCalendar: false });
  let added = false, failure;
  addTaskToCalendar({ title: '提交项目书', due_date: '2026-10-23' }, {
    success() { added = true; }, fail(error) { failure = error; },
  });
  assert.equal(added, true);
  assert.equal(failure, undefined);
  assert.equal(bridge.inserted.length, 3);
  assert.match(String(bridge.inserted[0].uri), /caller_is_syncadapter=true/);
  assert.match(String(bridge.inserted[0].uri), /account_type=LOCAL/);
  assert.equal(bridge.inserted[0].values.get('calendar_display_name'), '知行');
  assert.equal(bridge.inserted[1].values.get('calendar_id'), 8);
  assert.equal(bridge.inserted[2].values.get('event_id'), 42);
});
