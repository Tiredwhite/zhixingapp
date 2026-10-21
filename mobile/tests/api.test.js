import test from 'node:test';
import assert from 'node:assert/strict';
import { chatWithAI } from '../src/core/api.js';

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
