import { uid } from './dates.js';

function baseURL(connection) {
  const base = connection.apiBase || import.meta.env.VITE_API_BASE_URL || '';
  // #ifndef H5
  if (!base) throw new Error('请先在连接设置中填写服务器 HTTPS 地址');
  // #endif
  if (base && !/^https?:\/\//.test(base)) throw new Error('服务器地址应以 https:// 或本地调试 http:// 开头');
  return base.replace(/\/+$/, '');
}

export function request(connection, path, { method = 'GET', data, timeout = 25000 } = {}) {
  let task;
  let cancelled = false;
  let rejectPending;
  const promise = new Promise((resolve, reject) => {
    rejectPending = reject;
    let url;
    try { url = baseURL(connection) + path; } catch (error) { reject(error); return; }
    task = uni.request({
      url, method, data, timeout,
      header: { 'Content-Type': 'application/json', ...(connection.token ? { Authorization: `Bearer ${connection.token}` } : {}) },
      success(response) {
        if (cancelled) return;
        if (response.statusCode >= 200 && response.statusCode < 300) resolve(response.data);
        else {
          const error = new Error(response.data?.message || `请求失败（${response.statusCode}），请检查连接设置`);
          error.code = response.data?.code; error.requestId = response.data?.request_id; reject(error);
        }
      },
      fail(error) {
        const err = new Error(cancelled ? '已取消解析，原文已保留' : (error.errMsg?.includes('timeout') ? '解析等待超时，原文已保留，可重试或手动整理' : '暂时无法连接服务，原文已保留，可重试或手动整理'));
        err.cancelled = cancelled; reject(err);
      },
    });
  });
  return { promise, cancel() { cancelled = true; const error = new Error('已取消解析，原文已保留'); error.cancelled = true; rejectPending?.(error); task?.abort(); } };
}

export const health = (connection) => request(connection, '/healthz', { timeout: 4000 }).promise;
export const parseNotice = (connection, text, source_time) => request(connection, '/api/v1/parse', {
  method: 'POST', data: { request_id: uid(), text, source_time, timezone: 'Asia/Shanghai' },
});

export const deepReadNotice = (connection, text, actions) => request(connection, '/api/v1/deep-read', {
  method: 'POST', data: { request_id: uid(), text, actions },
});

