export const CHAT_HISTORY_KEY = 'zhixing.ai.chat.history';
export const MAX_CHAT_MESSAGES = 80;
const MAX_MESSAGE_LENGTH = 2000;

function parseMessages(value) {
  let parsed = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return []; }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((message) => message && ['user', 'assistant'].includes(message.role)
      && typeof message.content === 'string' && message.content.trim())
    .map((message) => ({ role: message.role, content: message.content.slice(0, MAX_MESSAGE_LENGTH) }))
    .slice(-MAX_CHAT_MESSAGES);
}

export function createChatHistory(storage = {}) {
  const state = { messages: parseMessages(storage.get?.(CHAT_HISTORY_KEY)) };
  const persist = (messages) => {
    try { storage.set?.(CHAT_HISTORY_KEY, messages); } catch { /* Chat remains usable when local storage is unavailable. */ }
  };
  return {
    state,
    append(role, content) {
      if (!['user', 'assistant'].includes(role) || typeof content !== 'string' || !content.trim()) return;
      this.state.messages = [...this.state.messages, { role, content: content.trim().slice(0, MAX_MESSAGE_LENGTH) }].slice(-MAX_CHAT_MESSAGES);
      persist(this.state.messages);
    },
    conversationWith(content, limit = 10) {
      const userMessage = typeof content === 'string' ? content.trim().slice(0, MAX_MESSAGE_LENGTH) : '';
      if (!userMessage) return [];
      return [...this.state.messages.slice(-Math.max(0, limit - 1)), { role: 'user', content: userMessage }];
    },
  };
}
