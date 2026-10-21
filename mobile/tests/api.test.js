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
    getStorageSync(key) { return key === 'zhixing.account.session' ? { access_token: 'account-session' } : null; },
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
