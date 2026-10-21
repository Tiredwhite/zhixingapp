import test from 'node:test';
import assert from 'node:assert/strict';
import { chatWithAI, extractDocument } from '../src/core/api.js';

test('chatWithAI resolves the API response instead of returning its request wrapper', async () => {
  const originalUni = globalThis.uni;
  let requestOptions;
  globalThis.uni = {
    request(options) {
      requestOptions = options;
      options.success({ statusCode: 200, data: { reply: '可以，我来帮你梳理。', model_id: 'deepseek-flash' } });
      return { abort() {} };
    },
  };

  try {
    const result = await chatWithAI(
      { apiBase: 'https://example.test', token: 'test-token' },
      [{ role: 'user', content: '帮我理解这条通知' }],
    );
    assert.equal(result.reply, '可以，我来帮你梳理。');
    assert.equal(requestOptions.url, 'https://example.test/api/v1/chat');
    assert.equal(requestOptions.data.messages[0].content, '帮我理解这条通知');
  } finally {
    if (originalUni === undefined) delete globalThis.uni;
    else globalThis.uni = originalUni;
  }
});

test('account session is used for both JSON requests and document uploads', async () => {
  const originalUni = globalThis.uni;
  let requestOptions, uploadOptions;
  globalThis.uni = {
    getStorageSync(key) { return key === 'zhixing.account.session' ? { access_token: 'account-session', expires_at: Math.floor(Date.now() / 1000) + 3600 } : null; },
    request(options) {
      requestOptions = options;
      options.success({ statusCode: 200, data: { reply: '答复' } });
      return { abort() {} };
    },
    uploadFile(options) {
      uploadOptions = options;
      options.success({ statusCode: 200, data: JSON.stringify({ text: '已读取的通知', kind: 'docx', characters: 6 }) });
    },
  };
  try {
    await chatWithAI({ apiBase: 'https://example.test', token: 'old-connection-token' }, [{ role: 'user', content: '问题' }]);
    assert.equal(requestOptions.header.Authorization, 'Bearer account-session');
    await extractDocument({ apiBase: 'https://example.test', token: 'old-connection-token' }, '/tmp/notice.docx', 'notice.docx');
    assert.equal(uploadOptions.header.Authorization, 'Bearer account-session');
  } finally {
    if (originalUni === undefined) delete globalThis.uni;
    else globalThis.uni = originalUni;
  }
});

test('expired account sessions are cleared and never fall back to a shared token', async () => {
  const originalUni = globalThis.uni;
  let requestOptions, removed = false;
  globalThis.uni = {
    getStorageSync(key) { return key === 'zhixing.account.session' ? { access_token: 'expired-session', expires_at: 1 } : null; },
    removeStorageSync(key) { removed = key === 'zhixing.account.session'; },
    request(options) { requestOptions = options; options.success({ statusCode: 200, data: { reply: 'ok' } }); return { abort() {} }; },
  };
  try {
    await chatWithAI({ apiBase: 'https://example.test', token: 'legacy-shared-token' }, [{ role: 'user', content: '你好' }]);
    assert.equal(removed, true);
    assert.equal(requestOptions.header.Authorization, undefined);
  } finally {
    if (originalUni === undefined) delete globalThis.uni;
    else globalThis.uni = originalUni;
  }
});

test('raw content URI uploads reject empty files and explain 413 responses', async () => {
  const previous = globalThis.uni;
  let sentRequest = false;
  const bytes = new Uint8Array([37, 80, 68, 70]).buffer;
  globalThis.uni = {
    getStorageSync(key) { return key === 'zhixing.account.session' ? { access_token: 'active', expires_at: Math.floor(Date.now() / 1000) + 60 } : null; },
    getFileSystemManager() { return { readFile({ success }) { success({ data: bytes }); } }; },
    request(options) {
      sentRequest = true;
      assert.equal(options.header['Content-Type'], 'application/octet-stream');
      assert.equal(options.data, bytes);
      options.success({ statusCode: 413, data: '<html>request too large</html>' });
      return { abort() {} };
    },
  };
  try {
    await assert.rejects(
      extractDocument({ apiBase: 'https://example.test' }, 'content://document/1', 'notice.pdf'),
      /20 MB/,
    );
    assert.equal(sentRequest, true);
    globalThis.uni.getFileSystemManager = () => ({ readFile({ success }) { success({ data: new ArrayBuffer(0) }); } });
    sentRequest = false;
    await assert.rejects(
      extractDocument({ apiBase: 'https://example.test' }, 'content://document/1', 'notice.pdf'),
      /没有读取到文档内容/,
    );
    assert.equal(sentRequest, false);
  } finally {
    if (previous === undefined) delete globalThis.uni;
    else globalThis.uni = previous;
  }
});

test('legacy Word uploads reach the server and show a useful 400 message', async () => {
  const previous = globalThis.uni;
  let uploadOptions;
  globalThis.uni = {
    getStorageSync(key) { return key === 'zhixing.account.session' ? { access_token: 'active', expires_at: Math.floor(Date.now() / 1000) + 60 } : null; },
    uploadFile(options) {
      uploadOptions = options;
      options.success({ statusCode: 400, data: JSON.stringify({ code: 'INVALID_INPUT', message: '文件上传请求不完整，请重新选择文档后重试' }) });
    },
  };
  try {
    await assert.rejects(
      extractDocument({ apiBase: 'https://example.test' }, '/tmp/notice.doc', 'notice.doc'),
      /重新选择文档/,
    );
    assert.equal(uploadOptions.filePath, '/tmp/notice.doc');
    assert.equal(uploadOptions.name, 'file');
  } finally {
    if (previous === undefined) delete globalThis.uni;
    else globalThis.uni = previous;
  }
});
