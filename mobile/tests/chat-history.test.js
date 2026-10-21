import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAT_HISTORY_KEY, MAX_CHAT_MESSAGES, createChatHistory } from '../src/core/chat-history.js';

test('chat history is shared through persistent storage and supplies recent model context', () => {
  const values = new Map();
  const storage = { get: (key) => values.get(key), set: (key, value) => values.set(key, structuredClone(value)) };
  const firstPage = createChatHistory(storage);
  firstPage.append('user', '如何准备答辩？');
  firstPage.append('assistant', '先核对时间、地点和材料。');

  const secondPage = createChatHistory(storage);
  assert.deepEqual(secondPage.state.messages, firstPage.state.messages);
  assert.deepEqual(secondPage.conversationWith('需要做演示文稿吗？'), [
    { role: 'user', content: '如何准备答辩？' },
    { role: 'assistant', content: '先核对时间、地点和材料。' },
    { role: 'user', content: '需要做演示文稿吗？' },
  ]);
  assert.equal(values.has(CHAT_HISTORY_KEY), true);
});

test('chat history rejects malformed records and keeps a bounded local history', () => {
  const history = createChatHistory({ get: () => JSON.stringify([{ role: 'system', content: 'ignore' }, null]) });
  assert.deepEqual(history.state.messages, []);
  for (let index = 0; index < MAX_CHAT_MESSAGES + 4; index++) history.append(index % 2 ? 'assistant' : 'user', `message-${index}`);
  assert.equal(history.state.messages.length, MAX_CHAT_MESSAGES);
  assert.equal(history.state.messages[0].content, 'message-4');
  assert.equal(history.conversationWith('next').length, 10);
});
