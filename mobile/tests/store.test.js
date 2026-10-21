import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, checksum } from '../src/core/store.js';

function memory() {
  const values = new Map();
  return { values, get: (key) => values.get(key), set: (key, value) => values.set(key, value) };
}
const workflow = { notice_id: 'notice-1', text: '请提交项目书', mode: 'ai', items: [], warnings: [] };
const action = { id: 'action-1', action: '提交项目书', due_date: null, due_at: null, materials: [], location: null };

test('saved tasks survive restart, editing and completion without network', () => {
  const adapter = memory(); let store = createStore(adapter);
  store.saveTasks(workflow, [action]);
  const id = store.state.tasks[0].id;
  store.updateTask(id, { status: 'done', title: '提交修改后的项目书' });
  store = createStore(adapter);
  assert.equal(store.state.tasks[0].status, 'done');
  assert.equal(store.state.tasks[0].title, '提交修改后的项目书');
  assert.equal(store.state.notices[0].text, workflow.text);
});

test('saving the same candidate twice does not add tasks or reset completed status', () => {
  const store = createStore(memory());
  store.saveTasks(workflow, [action]);
  store.updateTask(store.state.tasks[0].id, { status: 'done' });
  store.saveTasks(workflow, [{ ...action, action: '修订事项' }]);
  assert.equal(store.state.tasks.length, 1);
  assert.equal(store.state.tasks[0].status, 'done');
  assert.equal(store.state.tasks[0].title, '修订事项');
});

test('failed write reports failure and leaves the visible state unchanged', () => {
  const adapter = memory(); const store = createStore(adapter);
  store.saveTasks(workflow, [action]);
  adapter.set = () => { throw new Error('disk full'); };
  assert.throws(() => store.updateTask(store.state.tasks[0].id, { title: '新标题' }), /本地保存失败/);
  assert.equal(store.state.tasks[0].title, '提交项目书');
});

test('corrupt latest snapshot restores the older verified data', () => {
  const adapter = memory(); const store = createStore(adapter);
  store.saveTasks(workflow, [action]);
  store.updateTask(store.state.tasks[0].id, { title: '新标题' });
  adapter.values.set('zhixing.snapshot.b', '{broken');
  const restored = createStore(adapter);
  assert.equal(restored.state.tasks[0].title, '提交项目书');
  assert.match(restored.warning, /恢复有效版本/);
});

test('unreadable snapshots are not silently replaced by an empty state', () => {
  const adapter = memory(); adapter.values.set('zhixing.snapshot.a', 'corrupt');
  const store = createStore(adapter);
  assert.equal(store.locked, true);
  assert.throws(() => store.saveDraft('新的原文'), /停止写入/);
  assert.equal(adapter.values.get('zhixing.snapshot.a'), 'corrupt');
});

test('backup excludes access token and can restore into a fresh store', () => {
  const store = createStore(memory());
  store.setConnection({ apiBase: 'https://example.com', token: 'private-token' });
  store.saveTasks(workflow, [action]);
  const backup = store.exportBackup();
  assert.equal(backup.includes('private-token'), false);
  const restored = createStore(memory()); restored.restoreBackup(backup);
  assert.equal(restored.state.tasks.length, 1);
});

test('tampered backup fails without overwriting current tasks', () => {
  const store = createStore(memory()); store.saveTasks(workflow, [action]);
  const bad = JSON.parse(store.exportBackup()); bad.data.tasks[0].title = '伪造数据';
  assert.throws(() => store.restoreBackup(JSON.stringify(bad)), /校验失败/);
  assert.equal(store.state.tasks[0].title, '提交项目书');
});

test('unsupported backup version fails before any write', () => {
  const store = createStore(memory());
  const backup = JSON.parse(store.exportBackup()); backup.data.schema_version = 99;
  backup.checksum = checksum(JSON.stringify(backup.data));
  assert.throws(() => store.restoreBackup(JSON.stringify(backup)), /不支持/);
});

test('draft keeps notice identity across unchanged retries', () => {
  const store = createStore(memory());
  const a = store.saveDraft('请提交项目书');
  const b = store.saveDraft('请提交项目书');
  assert.equal(a.id, b.id);
  assert.notEqual(store.saveDraft('请提交新材料').id, a.id);
});

test('grounded deep reading persists with its notice and survives backup restore', () => {
  const deep_read = {
    mode: 'ai_deep_read', summary: '需要提交项目书', summary_quote: '提交项目书',
    steps: [{ instruction: '核对文件', why: '避免遗漏', source_quote: '项目书' }], questions: [],
  };
  const adapter = memory(); let store = createStore(adapter);
  store.saveTasks({ ...workflow, deep_read }, [action]);
  store = createStore(adapter);
  assert.equal(store.state.notices[0].deep_read.steps[0].instruction, '核对文件');
  const restored = createStore(memory()); restored.restoreBackup(store.exportBackup());
  assert.equal(restored.state.notices[0].deep_read.summary, deep_read.summary);
  const bad = { ...deep_read, summary_quote: '不存在的原文' };
  assert.throws(() => restored.setWorkflow({ ...workflow, deep_read: bad }), /AI深读数据格式/);
});

test('capacity limit never discards existing tasks', () => {
  const store = createStore(memory());
  const many = Array.from({ length: 200 }, (_, i) => ({ ...action, id: `a-${i}` }));
  store.saveTasks(workflow, many);
  assert.throws(() => store.saveTasks(workflow, [{ ...action, id: 'overflow' }]), /200条/);
  assert.equal(store.state.tasks.length, 200);
});

test('malformed imported fields are rejected even when checksum was recomputed', () => {
  const store = createStore(memory()); store.saveTasks(workflow, [action]);
  const backup = JSON.parse(store.exportBackup());
  backup.data.tasks[0].materials = 'not an array'; backup.checksum = checksum(JSON.stringify(backup.data));
  assert.throws(() => store.restoreBackup(JSON.stringify(backup)), /材料格式/);
  assert.deepEqual(store.state.tasks[0].materials, []);
});

