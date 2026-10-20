import { reactive } from 'vue';
import { createStore } from './store.js';

export const repository = createStore({
  get: (key) => uni.getStorageSync(key),
  set: (key, value) => uni.setStorageSync(key, value),
});

export const appState = reactive(repository.state);
repository.subscribe((next) => Object.assign(appState, next));

export function reportError(error) {
  uni.showToast({ title: error.message || '操作未成功，请重试', icon: 'none', duration: 3000 });
}

