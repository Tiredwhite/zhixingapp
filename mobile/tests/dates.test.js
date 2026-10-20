import test from 'node:test';
import assert from 'node:assert/strict';
import { combineDue, dueState, sourceTime, validDate } from '../src/core/dates.js';

test('date-only deadlines never become a fabricated 23:59', () => {
  assert.deepEqual(combineDue('2026-10-23', ''), { due_date: '2026-10-23', due_at: null });
  assert.equal(dueState({ due_date: '2026-10-23', due_at: null }).className, 'undated');
});
test('invalid calendar dates and unanchored times are rejected', () => {
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('2028-02-29'), true);
  assert.throws(() => combineDue('', '18:00'));
  assert.throws(() => combineDue('2026-10-23', '25:00'));
});
test('timestamps explicitly use Shanghai offset independently of device timezone', () => {
  assert.equal(sourceTime('2026-10-20 09:00'), '2026-10-20T09:00:00+08:00');
  assert.equal(sourceTime(''), null);
});
test('soon overdue and completed states do not depend on model confidence', () => {
  const now = Date.parse('2026-10-20T09:00:00+08:00');
  assert.equal(dueState({ due_at: '2026-10-20T18:00:00+08:00' }, now).className, 'soon');
  assert.equal(dueState({ due_at: '2026-10-19T18:00:00+08:00' }, now).className, 'overdue');
  assert.equal(dueState({ due_at: null, status: 'done' }, now).className, 'done');
});
