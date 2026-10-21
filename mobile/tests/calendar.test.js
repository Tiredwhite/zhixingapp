import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarSignature, calendarTiming } from '../src/core/calendar.js';

test('calendar event uses the exact parsed deadline and reminds thirty minutes before', () => {
  const timing = calendarTiming({ due_at: '2026-10-23T18:00:00+08:00' });
  assert.equal(timing.startTime, Date.parse('2026-10-23T18:00:00+08:00'));
  assert.equal(timing.endTime - timing.startTime, 30 * 60 * 1000);
  assert.equal(timing.reminderMinutes, 30);
});

test('date-only tasks are scheduled at 09:00 with an immediate reminder', () => {
  const timing = calendarTiming({ due_date: '2026-10-23' });
  const localStart = new Date(timing.startTime);
  assert.equal(localStart.getHours(), 9);
  assert.equal(localStart.getMinutes(), 0);
  assert.equal(timing.reminderMinutes, 0);
});

test('calendar signature changes when the event details change', () => {
  const task = { title: '提交项目书', due_date: '2026-10-23', location: '教学楼A201' };
  assert.equal(calendarSignature(task), calendarSignature({ ...task }));
  assert.notEqual(calendarSignature(task), calendarSignature({ ...task, location: '线上提交' }));
});
