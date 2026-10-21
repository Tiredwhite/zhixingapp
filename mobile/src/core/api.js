import { uid } from './dates.js';
import { expireAccountSession } from './account.js';

function baseURL(connection) {
  const base = connection.apiBase || import.meta.env.VITE_API_BASE_URL || '';
  // #ifndef H5
  if (!base) throw new Error('请先在连接设置中填写服务器 HTTPS 地址');
  // #endif
  if (base && !/^https?:\/\//.test(base)) throw new Error('服务器地址应以 https:// 或本地调试 http:// 开头');
  return base.replace(/\/+$/, '');
}

function accessToken(connection) {
  try {
    const session = typeof uni !== 'undefined' && uni.getStorageSync('zhixing.account.session');
    if (session) {
      const expiry = Number(session.expires_at);
      if (typeof session.access_token === 'string' && session.access_token && Number.isFinite(expiry) && expiry > Math.floor(Date.now() / 1000)) return session.access_token;
      uni.removeStorageSync('zhixing.account.session');
      return '';
    }
  } catch { /* Fall back to the configured connection token. */ }
  return connection?.token || '';
}

function authorizationHeader(connection) {
  const token = accessToken(connection);
  return token ? { Authorization: `Bearer ${token}` } : {};
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
      header: { 'Content-Type': 'application/json', ...authorizationHeader(connection) },
      success(response) {
        if (cancelled) return;
        if (response.statusCode >= 200 && response.statusCode < 300) resolve(response.data);
        else {
          expireAccountSession(response.data);
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

function decodeDocumentResponse(response) {
  let data = response.data;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { data = null; }
  }
  if (response.statusCode >= 200 && response.statusCode < 300 && data?.text) return data;
  const fallbackMessages = {
    400: '服务器没有收到完整文档，请重新选择文件；若仍失败，请先在文件管理器确认文档可以打开',
    413: '文件超过 20 MB，请压缩或拆分后再导入',
    415: '格式暂不支持，请选择 PDF、.docx 或 .doc 文件',
    422: '无法从文档中提取文字，请确认不是扫描图片或损坏文件',
    503: '文档服务暂时不可用，请稍后重试',
  };
  const error = new Error(data?.message || fallbackMessages[response.statusCode] || `文档读取失败（${response.statusCode}）`);
  if (response.statusCode === 401) expireAccountSession(data);
  error.code = data?.code; error.requestId = data?.request_id; throw error;
}

export function extractDocument(connection, filePath, filename = '') {
  return new Promise((resolve, reject) => {
    let url;
    try { url = baseURL(connection) + '/api/v1/documents/extract'; }
    catch (error) { reject(error); return; }
    if (filePath.startsWith('content://') && typeof uni.getFileSystemManager === 'function') {
      try {
        uni.getFileSystemManager().readFile({ filePath, success({ data }) {
          const byteLength = data?.byteLength ?? data?.length;
          if (!Number.isFinite(byteLength) || byteLength === 0) {
            reject(new Error('手机没有读取到文档内容，请重新选择文件，并确认文件已完整下载到本机'));
            return;
          }
          if (byteLength > 20 * 1024 * 1024) {
            reject(new Error('文件超过 20 MB，请压缩或拆分后再导入'));
            return;
          }
          uni.request({
            url: `${url}-raw?filename=${encodeURIComponent(filename)}`, method: 'POST', data, timeout: 35000,
            header: { 'Content-Type': 'application/octet-stream', ...authorizationHeader(connection) },
            success(response) { try { resolve(decodeDocumentResponse(response)); } catch (error) { reject(error); } },
            fail(error) { reject(new Error(error.errMsg?.includes('timeout') ? '文档处理超时，请尝试较小的文件' : '文档上传失败，请检查服务器连接')); },
          });
        }, fail(error) { reject(new Error(error.errMsg || '读取所选文件失败')); } });
      } catch (error) { reject(new Error(error.message || '读取所选文件失败')); }
      return;
    }
    uni.uploadFile({
      url, filePath, name: 'file', timeout: 35000,
      header: authorizationHeader(connection),
      success(response) {
        try { resolve(decodeDocumentResponse(response)); } catch (error) { reject(error); }
      },
      fail(error) {
        reject(new Error(error.errMsg?.includes('timeout') ? '文档处理超时，请尝试较小的文件' : '无法上传并读取文档，请检查服务器连接'));
      },
    });
  });
}

export const chatWithAI = (connection, messages) => request(connection, '/api/v1/chat', {
  method: 'POST', data: { messages }, timeout: 30000,
}).promise;

export const registerAccount = (connection, username, password) => request(connection, '/api/v1/auth/register', {
  method: 'POST', data: { username, password }, timeout: 15000,
}).promise;

export const loginAccount = (connection, username, password) => request(connection, '/api/v1/auth/login', {
  method: 'POST', data: { username, password }, timeout: 15000,
}).promise;

export const logoutAccount = (connection) => request(connection, '/api/v1/auth/logout', {
  method: 'POST', data: {}, timeout: 8000,
}).promise;

