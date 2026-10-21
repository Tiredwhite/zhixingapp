import { reactive } from 'vue';
import { CHAT_HISTORY_KEY, createChatHistory } from './chat-history.js';

const storage = {
  get(key) {
    try { return typeof uni !== 'undefined' ? uni.getStorageSync(key) : null; } catch { return null; }
  },
  set(key, value) {
    if (typeof uni !== 'undefined') uni.setStorageSync(key, value);
  },
};

export const chatHistory = reactive(createChatHistory(storage));
export { CHAT_HISTORY_KEY };
