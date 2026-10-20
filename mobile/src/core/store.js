import { uid, validDate } from './dates.js';

const KEYS = ['zhixing.snapshot.a', 'zhixing.snapshot.b'];
const clone = (value) => JSON.parse(JSON.stringify(value));

export function checksum(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}

function emptyState() {
  return {
    schema_version: 1, revision: 0, notices: [], tasks: [],
    draft: { id: uid(), text: '', source_time: '' }, workflow: null,
    connection: { apiBase: '', token: '' },
  };
}

function validateState(data) {
  if (!data || data.schema_version !== 1 || !Number.isSafeInteger(data.revision) || data.revision < 0) throw new Error('不支持的数据版本');
  if (!Array.isArray(data.notices) || !Array.isArray(data.tasks) || data.notices.length > 100 || data.tasks.length > 200) throw new Error('数据格式或容量不正确');
  if (!data.draft || typeof data.draft.text !== 'string' || typeof data.draft.id !== 'string' || data.draft.text.length > 2000) throw new Error('草稿格式不正确');
  if (!data.connection || typeof data.connection.apiBase !== 'string' || typeof data.connection.token !== 'string') throw new Error('连接配置不正确');
  if (data.connection.apiBase.length > 200 || data.connection.token.length > 300) throw new Error('连接配置过长');
  if (typeof data.draft.source_time !== 'string' || data.draft.source_time.length > 40) throw new Error('发布时间格式不正确');
  if (data.workflow !== null) {
    const flow = data.workflow;
    if (!flow || typeof flow.notice_id !== 'string' || typeof flow.text !== 'string' || flow.text.length > 2000 || !['ai', 'manual', 'example'].includes(flow.mode) || !Array.isArray(flow.items) || flow.items.length > 5) throw new Error('核对页数据格式不正确');
    for (const item of flow.items) {
      if (typeof item.id !== 'string' || typeof item.action !== 'string' || !Array.isArray(item.materials) || !Array.isArray(item.review_reasons)) throw new Error('候选事项格式不正确');
      if (item.due_at && typeof item.due_at !== 'string') throw new Error('候选时间格式不正确');
    }
  }
  const ids = new Set();
  for (const notice of data.notices) {
    if (typeof notice.id !== 'string' || typeof notice.text !== 'string' || notice.text.length > 2000 || ids.has(notice.id)) throw new Error('通知格式不正确');
    ids.add(notice.id);
  }
  const taskIds = new Set();
  for (const task of data.tasks) {
    if (typeof task.id !== 'string' || !task.title || typeof task.title !== 'string' || task.title.length > 60 || !['pending', 'done'].includes(task.status) || !ids.has(task.notice_id) || taskIds.has(task.id)) throw new Error('待办格式不正确');
    if (task.due_at && !Number.isFinite(Date.parse(task.due_at))) throw new Error('待办时间不正确');
    if (task.due_date && !validDate(task.due_date)) throw new Error('待办日期不正确');
    if (!Array.isArray(task.materials) || task.materials.length > 10 || task.materials.some((m) => typeof m !== 'string' || m.length > 200)) throw new Error('材料格式不正确');
    if (task.location != null && (typeof task.location !== 'string' || task.location.length > 100)) throw new Error('地点格式不正确');
    taskIds.add(task.id);
  }
  return data;
}

function decode(value) {
  const envelope = typeof value === 'string' ? JSON.parse(value) : value;
  if (!envelope?.data || envelope.checksum !== checksum(JSON.stringify(envelope.data))) throw new Error('数据校验失败');
  return validateState(envelope.data);
}

export function createStore(adapter) {
  let state = emptyState();
  let slot = 1;
  let locked = false;
  let warning = '';
  const listeners = new Set();
  const candidates = [];
  let invalid = 0;
  for (let i = 0; i < KEYS.length; i++) {
    try {
      const raw = adapter.get(KEYS[i]);
      if (raw) candidates.push({ data: decode(raw), slot: i });
    } catch { invalid++; }
  }
  if (candidates.length) {
    candidates.sort((a, b) => b.data.revision - a.data.revision);
    state = clone(candidates[0].data); slot = candidates[0].slot;
    if (invalid) warning = '一个本地快照异常，已恢复有效版本。建议导出备份。';
  } else if (invalid) {
    locked = true;
    warning = '本地数据无法安全读取，已停止写入以保留现场。请先导出原始数据，再恢复备份。';
  }
  const notify = () => listeners.forEach((fn) => fn(clone(state)));

  function commit(next, recover = false) {
    if (locked && !recover) throw new Error(warning);
    next = clone(next); next.revision = state.revision + 1;
    validateState(next);
    const envelope = JSON.stringify({ data: next, checksum: checksum(JSON.stringify(next)) });
    const target = (slot + 1) % 2;
    try {
      adapter.set(KEYS[target], envelope);
      const saved = decode(adapter.get(KEYS[target]));
      if (saved.revision !== next.revision || checksum(JSON.stringify(saved)) !== checksum(JSON.stringify(next))) throw new Error('读回不一致');
    } catch { throw new Error('本地保存失败，内容仍在当前页面。请检查存储空间后重试。'); }
    state = next; slot = target; locked = false; warning = ''; notify();
    return clone(state);
  }

  return {
    get state() { return clone(state); },
    get warning() { return warning; },
    get locked() { return locked; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    saveDraft(text, source_time = '') {
      const next = clone(state);
      if (next.draft.text !== text || next.draft.source_time !== source_time) next.draft.id = uid();
      next.draft.text = text; next.draft.source_time = source_time;
      return commit(next).draft;
    },
    clearDraft() { const next = clone(state); next.draft = { id: uid(), text: '', source_time: '' }; next.workflow = null; return commit(next); },
    setWorkflow(workflow) { const next = clone(state); next.workflow = clone(workflow); return commit(next); },
    setConnection(connection) {
      const next = clone(state); next.connection = { apiBase: connection.apiBase.trim().replace(/\/+$/, ''), token: connection.token.trim() };
      return commit(next);
    },
    saveTasks(workflow, candidates) {
      if (!candidates.length) throw new Error('请至少选择一个待办');
      const next = clone(state);
      let notice = next.notices.find((n) => n.id === workflow.notice_id);
      if (!notice) {
        if (next.notices.length >= 100) throw new Error('已保存100条通知，请先在待办页整理旧数据');
        notice = { id: workflow.notice_id, text: workflow.text, created_at: new Date().toISOString(), mode: workflow.mode };
        next.notices.unshift(notice);
      }
      for (const candidate of candidates) {
        const id = `${notice.id}:${candidate.id}`;
        const previous = next.tasks.find((task) => task.id === id);
        const task = {
          ...clone(candidate), id, candidate_id: candidate.id, notice_id: notice.id,
          title: candidate.action.trim(), origin_mode: candidate.origin_mode || workflow.mode,
          status: previous?.status || 'pending', created_at: previous?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (previous) next.tasks[next.tasks.indexOf(previous)] = task;
        else next.tasks.unshift(task);
      }
      if (next.tasks.length > 200) throw new Error('已达到200条待办上限，请先整理旧任务');
      // Keep the workflow so repeated save operations remain idempotent.
      next.workflow = clone(workflow);
      return commit(next);
    },
    updateTask(id, changes) {
      const next = clone(state); const task = next.tasks.find((t) => t.id === id);
      if (!task) throw new Error('待办不存在，可能已被删除');
      const allowed = ['title', 'due_date', 'due_at', 'status', 'location', 'materials'];
      for (const key of allowed) if (key in changes) task[key] = clone(changes[key]);
      task.updated_at = new Date().toISOString(); return commit(next);
    },
    deleteTask(id) {
      const next = clone(state); next.tasks = next.tasks.filter((t) => t.id !== id);
      next.notices = next.notices.filter((n) => next.tasks.some((t) => t.notice_id === n.id));
      return commit(next);
    },
    exportBackup() {
      // Never export a connection token with task data.
      const data = clone(state); data.connection = { apiBase: '', token: '' }; data.workflow = null;
      return JSON.stringify({ app: 'zhixing', version: 1, exported_at: new Date().toISOString(), data, checksum: checksum(JSON.stringify(data)) }, null, 2);
    },
    exportRaw() { return JSON.stringify(KEYS.map((key) => ({ key, value: adapter.get(key) })), null, 2); },
    restoreBackup(text) {
      const envelope = JSON.parse(text);
      if (envelope.app !== 'zhixing' || envelope.version !== 1) throw new Error('这不是有效的知行备份文件');
      const next = clone(decode(envelope)); next.connection = state.connection;
      return commit(next, true);
    },
  };
}

