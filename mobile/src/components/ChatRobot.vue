<template>
  <view v-if="visible" class="chat-robot">
    <view v-if="opened" class="chat-panel" :style="panelStyle">
      <view class="chat-heading"><view class="bot-mark"><view class="bot-antenna" /><view class="bot-eyes"><i /><i /></view><view class="bot-mouth" /></view><view class="chat-title-wrap"><text class="chat-title">小知 · AI 助手</text><text class="chat-subtitle">通知理解、校园安排，也可以聊聊</text></view><button class="icon-button close-chat" aria-label="关闭聊天" @click="opened = false"><Icon name="close" :size="17" /></button></view>
      <scroll-view class="chat-messages" scroll-y :scroll-into-view="scrollTarget" :show-scrollbar="true" @touchmove.stop>
        <view v-for="(message, index) in messages" :id="`chat-message-${index}`" :key="index" :class="['chat-line', message.role]">
          <view v-if="message.role === 'assistant'" class="tiny-bot">知</view><text class="chat-bubble">{{ message.content }}</text>
        </view>
        <view v-if="busy" id="chat-typing" class="chat-line assistant"><view class="tiny-bot">知</view><text class="chat-bubble typing">小知正在想…</text></view>
      </scroll-view>
      <view v-if="errorText" class="chat-error"><text>{{ errorText }}</text><button v-if="needsConfig" @click="goProfile">去连接服务</button></view>
      <view v-if="isEmpty" class="quick-questions"><button @click="sendSuggested('怎样把通知里的要求拆成可执行的几步？')">怎么拆解通知？</button><button @click="sendSuggested('怎样给待办添加手机日历提醒？')">怎么设置日历提醒？</button></view>
      <view class="chat-composer"><textarea v-model="draft" :maxlength="2000" :disabled="busy" auto-height class="chat-input" placeholder="问问小知…" @confirm="send" /><button class="send-chat" :disabled="busy || !draft.trim()" aria-label="发送" @click="send"><Icon name="arrow" :size="17" color="#ffffff" /></button></view>
      <text class="chat-privacy">对话历史保存在本机；发送内容会交给 AI 服务，不会自动保存为待办。</text>
    </view>
    <button class="robot-launcher" :style="launcherStyle" :aria-label="opened ? '关闭小知 AI 助手' : '打开小知 AI 助手'" @touchstart.stop="startDrag" @touchmove.stop.prevent="moveDrag" @touchend.stop="endDrag" @touchcancel.stop="endDrag" @mousedown.stop="startDrag" @mousemove.stop.prevent="moveDrag" @mouseup.stop="endDrag" @mouseleave.stop="endDrag" @click="toggle">
      <view class="bot-mark launcher-bot"><view class="bot-antenna" /><view class="bot-eyes"><i /><i /></view><view class="bot-mouth" /></view><view class="launcher-text"><text>问小知</text><text>AI 助手</text></view><view class="launcher-spark">✦</view>
    </button>
  </view>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import Icon from './Icon.vue';
import { appState } from '../core/repository.js';
import { chatWithAI } from '../core/api.js';
import { chatHistory } from '../core/chat-session.js';

const WELCOME = { role: 'assistant', content: '嗨，我是小知。你可以问我怎么理解一条通知、安排办理步骤，也可以聊聊。涉及具体校规时，我会提醒你以学校原文为准。' };
const history = reactive(chatHistory);
const opened = ref(false), busy = ref(false), draft = ref(''), errorText = ref(''), needsConfig = ref(false), scrollTarget = ref('chat-message-0');
const viewport = ref(readViewport());
const launcherPosition = ref(readPosition());
const messages = computed(() => history.state.messages.length ? history.state.messages : [WELCOME]);
const isEmpty = computed(() => history.state.messages.length === 0);
const visible = ref(true);
let dragStart = null, dragged = false;

function readViewport() {
  try {
    const info = typeof uni !== 'undefined' ? uni.getSystemInfoSync() : {};
    return { width: info.windowWidth || 390, height: info.windowHeight || 844 };
  } catch { return { width: 390, height: 844 }; }
}
function readPosition() {
  let saved;
  try { saved = typeof uni !== 'undefined' ? uni.getStorageSync('zhixing.ai.chat.position') : null; } catch { saved = null; }
  const size = readViewport();
  return clampPosition(saved && Number.isFinite(saved.right) && Number.isFinite(saved.bottom)
    ? saved : { right: size.width <= 700 ? 14 : 23, bottom: size.width <= 700 ? 98 : 112 }, size);
}
function clampPosition(position, size = viewport.value) {
  return {
    right: Math.min(Math.max(8, position.right), Math.max(8, size.width - 116)),
    bottom: Math.min(Math.max(82, position.bottom), Math.max(82, size.height - 65)),
  };
}
const launcherStyle = computed(() => ({ right: `${launcherPosition.value.right}px`, bottom: `${launcherPosition.value.bottom}px` }));
const panelStyle = computed(() => {
  const width = Math.min(365, viewport.value.width - 20);
  const height = Math.min(500, viewport.value.height - 180);
  const right = Math.min(launcherPosition.value.right, Math.max(10, viewport.value.width - width - 10));
  const bottom = launcherPosition.value.bottom + height + 62 <= viewport.value.height - 10
    ? launcherPosition.value.bottom + 62 : 10;
  return { right: `${right}px`, bottom: `${bottom}px` };
});

watch([() => history.state.messages.length, busy], async () => {
  await nextTick();
  scrollTarget.value = busy.value ? 'chat-typing' : `chat-message-${messages.value.length - 1}`;
});

function touchPoint(event) {
  const point = event.touches?.[0] || event.changedTouches?.[0] || event;
  return { x: point.clientX ?? point.pageX ?? 0, y: point.clientY ?? point.pageY ?? 0 };
}
function startDrag(event) {
  const point = touchPoint(event);
  viewport.value = readViewport();
  dragged = false;
  dragStart = { ...point, ...launcherPosition.value };
}
function moveDrag(event) {
  if (!dragStart) return;
  const point = touchPoint(event);
  const dx = point.x - dragStart.x, dy = point.y - dragStart.y;
  if (Math.abs(dx) + Math.abs(dy) > 5) dragged = true;
  if (!dragged) return;
  launcherPosition.value = clampPosition({ right: dragStart.right - dx, bottom: dragStart.bottom - dy });
}
function endDrag() {
  if (!dragStart) return;
  dragStart = null;
  if (dragged) {
    try { uni.setStorageSync('zhixing.ai.chat.position', launcherPosition.value); } catch { /* Dragging still works if position persistence is unavailable. */ }
    setTimeout(() => { dragged = false; }, 350);
  }
}
function toggle() {
  if (dragged) { dragged = false; return; }
  opened.value = !opened.value;
}
function goProfile() { opened.value = false; uni.navigateTo({ url: '/pages/profile/index' }); }
function sendSuggested(text) { draft.value = text; send(); }
async function send() {
  const content = draft.value.trim();
  if (!content || busy.value) return;
  errorText.value = ''; needsConfig.value = false;
  const conversation = history.conversationWith(content, 10);
  history.append('user', content);
  draft.value = ''; busy.value = true;
  try {
    const result = await chatWithAI(appState.connection, conversation);
    history.append('assistant', result.reply);
  } catch (error) {
    errorText.value = error.message || '小知暂时无法回答，请稍后重试';
    needsConfig.value = ['INVALID_TOKEN', 'TOKEN_REQUIRED'].includes(error.code) || !appState.connection.apiBase;
  } finally { busy.value = false; }
}
</script>

<style scoped lang="scss">
.chat-robot { position: fixed; z-index: 60; inset: 0; pointer-events: none; }
.robot-launcher { position: fixed; z-index: 2; display: flex; align-items: center; gap: 8px; padding: 8px 11px 8px 8px; border-radius: 16px 16px 6px 16px; color: #fffefa; background: #173e35; box-shadow: 0 8px 25px #173e3530; pointer-events: auto; touch-action: none; user-select: none; cursor: grab; }
.launcher-text text { display: block; text-align: left; font-size: 9px; line-height: 1.5; }.launcher-text text:first-child { font-weight: 650; font-size: 10px; }
.launcher-spark { position: absolute; top: -7px; right: -5px; color: #c9d9b4; font-size: 16px; }
.bot-mark { position: relative; display: flex; align-items: center; justify-content: center; flex: 0 0 32px; width: 32px; height: 29px; margin-top: 4px; border: 1.5px solid #91aa7e; border-radius: 10px 10px 8px 8px; background: #e5edd6; }
.bot-antenna { position: absolute; left: 50%; top: -8px; width: 2px; height: 7px; background: #aabe94; }.bot-antenna::after { content: ''; position: absolute; top: -3px; left: -2px; width: 6px; height: 6px; border-radius: 50%; background: #c5d6ae; }
.bot-eyes { display: flex; gap: 7px; margin-top: -3px; }.bot-eyes i { width: 4px; height: 4px; border-radius: 50%; background: #355847; }.bot-mouth { position: absolute; bottom: 6px; width: 9px; height: 3px; border-bottom: 1px solid #668464; border-radius: 0 0 8px 8px; }
.chat-panel { position: fixed; z-index: 1; box-sizing: border-box; display: flex; flex-direction: column; width: min(365px, calc(100vw - 20px)); height: min(500px, calc(100vh - 180px)); min-height: 260px; max-height: calc(100dvh - 180px); overflow: hidden; border: 1px solid #e0e6d9; border-radius: 20px; background: #fffefa; box-shadow: 0 18px 60px #16352b29; pointer-events: auto; overscroll-behavior: contain; }
.chat-heading { display: flex; align-items: center; gap: 10px; flex: 0 0 auto; min-height: 65px; padding: 10px 14px; background: #f1f3e9; border-bottom: 1px solid #e4e8dc; }.chat-heading .bot-mark { transform: scale(.88); }.chat-title { display: block; color: #284a3d; font-size: 12px; font-weight: 650; }.chat-subtitle { display: block; margin-top: 4px; color: #8c9782; font-size: 9px; }.chat-title-wrap { flex: 1; }.close-chat { width: 30px; height: 30px; }
.chat-messages { box-sizing: border-box; flex: 1 1 0; width: 100%; height: 0; min-height: 0; padding: 10px 13px; overscroll-behavior-y: contain; touch-action: pan-y; }
.chat-line { display: flex; align-items: flex-end; gap: 7px; margin: 10px 0; }.chat-line.user { justify-content: flex-end; }.tiny-bot { display: flex; align-items: center; justify-content: center; flex: 0 0 22px; width: 22px; height: 22px; border-radius: 8px; background: #e7eddc; color: #526d46; font-size: 10px; }.chat-bubble { box-sizing: border-box; display: block; max-width: 84%; padding: 10px 12px; border-radius: 13px 13px 13px 3px; background: #f1f3e9; color: #536354; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 11px; line-height: 1.7; }.user .chat-bubble { border-radius: 13px 13px 3px 13px; background: #173e35; color: #fffefa; }.typing { color: #98a38e; }
.quick-questions { display: flex; flex: 0 0 auto; flex-wrap: wrap; gap: 6px; padding: 0 12px 9px; }.quick-questions button { padding: 7px 9px; border: 1px solid #e3e8da; border-radius: 8px; color: #718167; font-size: 9px; }
.chat-error { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 8px; margin: 0 12px 8px; padding: 8px 10px; border-radius: 8px; background: #fcf0e8; color: #a3613b; font-size: 9px; line-height: 1.6; }.chat-error button { flex: 0 0 auto; color: #637d55; font-weight: 600; }
.chat-composer { display: flex; flex: 0 0 auto; align-items: flex-end; gap: 8px; margin: 0 12px; padding: 9px; border: 1px solid #e2e7db; border-radius: 13px; background: #fbfcf8; }.chat-input { flex: 1; max-height: 70px; min-height: 24px; color: #3b5949; font-size: 11px; line-height: 1.6; }.send-chat { display: flex; align-items: center; justify-content: center; flex: 0 0 30px; width: 30px; height: 30px; border-radius: 9px; background: #173e35; }.send-chat[disabled] { opacity: .4; }.chat-privacy { display: block; flex: 0 0 auto; padding: 7px 13px 9px; color: #a1aa96; font-size: 8px; line-height: 1.4; }
@media (max-width: 700px) { .chat-panel { width: min(365px, calc(100vw - 20px)); height: min(500px, calc(100vh - 180px)); min-height: 250px; } }
</style>
