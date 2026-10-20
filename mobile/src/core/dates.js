export function validDate(value) {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(value || '')) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function combineDue(date, time) {
  if (!date && !time) return { due_date: null, due_at: null };
  if (!validDate(date)) throw new Error('请填写有效日期，格式为 YYYY-MM-DD');
  if (!time) return { due_date: date, due_at: null };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('请填写有效时间，格式为 HH:mm');
  return { due_date: date, due_at: `${date}T${time}:00+08:00` };
}

export function sourceTime(value) {
  if (!value?.trim()) return null;
  const match = value.trim().match(/^(20\d{2}-\d{2}-\d{2})[ T](\d{2}:\d{2})$/);
  if (!match) throw new Error('通知发布时间请按 YYYY-MM-DD HH:mm 填写，或留空');
  return combineDue(match[1], match[2]).due_at;
}

export function dueParts(item) {
  return { date: item.due_date || item.due_at?.slice(0, 10) || '', time: item.due_at?.slice(11, 16) || '' };
}

export function dueState(task, now = Date.now()) {
  if (task.status === 'done') return { label: '已完成', className: 'done' };
  if (!task.due_at) return { label: task.due_date ? '时刻待确认' : '时间未定', className: 'undated' };
  const delta = new Date(task.due_at).getTime() - now;
  if (delta < 0) return { label: '已逾期', className: 'overdue' };
  if (delta <= 86400000) return { label: '24 小时内', className: 'soon' };
  return { label: '待完成', className: 'pending' };
}

export function formatDue(task) {
  const { date, time } = dueParts(task);
  if (!date) return '时间未定';
  return `${Number(date.slice(5, 7))} 月 ${Number(date.slice(8, 10))} 日${time ? ` ${time}` : ' · 时刻待确认'}`;
}

export function uid() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const n = Math.floor(Math.random() * 16);
    return (c === 'x' ? n : (n & 3) | 8).toString(16);
  });
}

