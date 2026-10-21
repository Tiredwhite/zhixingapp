<template>
  <view class="chat-robot">
    <view v-if="opened" class="chat-panel">
      <view class="chat-heading"><view class="bot-mark"><view class="bot-antenna" /><view class="bot-eyes"><i /><i /></view><view class="bot-mouth" /></view><view class="chat-title-wrap"><text class="chat-title">小知 · AI 助手</text><text class="chat-subtitle">通知理解、校园安排，也可以聊聊</text></view><button class="icon-button close-chat" aria-label="关闭聊天" @click="opened = false"><Icon name="close" :size="17" /></button></view>
      <scroll-view class="chat-messages" scroll-y :scroll-into-view="`chat-message-${messages.length - 1}`">
        <view v-for="(message, index) in messages" :id="`chat-message-${index}`" :key="index" :class="['chat-line', message.role]">
          <view v-if="message.role === 'assistant'" class="tiny-bot">知</view><text class="chat-bubble">{{ message.content }}</text>
        </view>
        <view v-if="busy" class="chat-line assistant"><view class="tiny-bot">知</view><text class="chat-bubble typing">小知正在想…</text></view>
      </scroll-view>
      <view v-if="errorText" class="chat-error"><text>{{ errorText }}</text><button v-if="needsConfig" @click="goProfile">去连接服务</button></view>
      <view v-if="messages.length === 1" class="quick-questions"><button @click="sendSuggested('怎样把通知里的要求拆成可执行的几步？')">怎么拆解通知？</button><button @click="sendSuggested('怎样给待办添加手机日历提醒？')">怎么设置日历提醒？</button></view>
      <view class="chat-composer"><textarea v-model="draft" :maxlength="2000" :disabled="busy" auto-height class="chat-input" placeholder="问问小知…" @confirm="send" /><button class="send-chat" :disabled="busy || !draft.trim()" aria-label="发送" @click="send"><Icon name="arrow" :size="17" color="#ffffff" /></button></view>
      <text class="chat-privacy">对话会发送到你配置的 AI 服务，不会保存为待办。</text>
    </view>
    <button class="robot-launcher" :aria-label="opened ? '关闭小知 AI 助手' : '打开小知 AI 助手'" @click="opened = !opened"><view class="bot-mark launcher-bot"><view class="bot-antenna" /><view class="bot-eyes"><i /><i /></view><view class="bot-mouth" /></view><view class="launcher-text"><text>问小知</text><text>AI 助手</text></view><view class="launcher-spark">✦</view></button>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import Icon from './Icon.vue';
import { appState } from '../core/repository.js';
import { chatWithAI } from '../core/api.js';

const opened = ref(false), busy = ref(false), draft = ref(''), errorText = ref(''), needsConfig = ref(false);
const messages = ref([{ role: 'assistant', content: '嗨，我是小知。你可以问我怎么理解一条通知、安排办理步骤，也可以聊聊。涉及具体校规时，我会提醒你以学校原文为准。' }]);
function goProfile() { opened.value = false; uni.navigateTo({ url: '/pages/profile/index' }); }
function sendSuggested(text) { draft.value = text; send(); }
async function send() {
  const content = draft.value.trim();
  if (!content || busy.value) return;
  errorText.value = ''; needsConfig.value = false;
  const userMessage = { role: 'user', content };
  const conversation = messages.value.slice(1).concat(userMessage).slice(-10);
  messages.value = messages.value.concat(userMessage); draft.value = ''; busy.value = true;
  try {
    const result = await chatWithAI(appState.connection, conversation);
    messages.value.push({ role: 'assistant', content: result.reply });
  } catch (error) {
    errorText.value = error.message || '小知暂时无法回答，请稍后重试';
    needsConfig.value = ['INVALID_TOKEN', 'TOKEN_REQUIRED'].includes(error.code) || !appState.connection.apiBase;
  } finally { busy.value = false; }
}
</script>

<style scoped lang="scss">
.chat-robot { position: fixed; z-index: 60; right: 23px; bottom: 112px; }
.robot-launcher { position: relative; display: flex; align-items: center; gap: 9px; padding: 9px 13px 9px 9px; border-radius: 18px 18px 6px 18px; color: #fffefa; background: #173e35; box-shadow: 0 8px 25px #173e3530; }
.launcher-text text { display: block; text-align: left; font-size: 10px; line-height: 1.55; }
.launcher-text text:first-child { font-weight: 650; font-size: 11px; }
.launcher-spark { position: absolute; top: -7px; right: -5px; color: #c9d9b4; font-size: 16px; }
.bot-mark { position: relative; display: flex; align-items: center; justify-content: center; flex: 0 0 35px; width: 35px; height: 31px; margin-top: 4px; border: 1.5px solid #91aa7e; border-radius: 10px 10px 8px 8px; background: #e5edd6; }
.bot-antenna { position: absolute; left: 50%; top: -8px; width: 2px; height: 7px; background: #aabe94; }
.bot-antenna::after { content: ''; position: absolute; top: -3px; left: -2px; width: 6px; height: 6px; border-radius: 50%; background: #c5d6ae; }
.bot-eyes { display: flex; gap: 7px; margin-top: -3px; }
.bot-eyes i { width: 4px; height: 4px; border-radius: 50%; background: #355847; }
.bot-mouth { position: absolute; bottom: 6px; width: 9px; height: 3px; border-bottom: 1px solid #668464; border-radius: 0 0 8px 8px; }
.chat-panel { position: absolute; right: 0; bottom: 59px; display: flex; flex-direction: column; width: 365px; height: 500px; overflow: hidden; border: 1px solid #e0e6d9; border-radius: 20px; background: #fffefa; box-shadow: 0 18px 60px #16352b29; }
.chat-heading { display: flex; align-items: center; gap: 10px; min-height: 70px; padding: 12px 15px; background: #f1f3e9; border-bottom: 1px solid #e4e8dc; }
.chat-heading .bot-mark { transform: scale(.9); }
.chat-title { display: block; color: #284a3d; font-size: 12px; font-weight: 650; }
.chat-subtitle { display: block; margin-top: 4px; color: #8c9782; font-size: 9px; }
.chat-title-wrap { flex: 1; }
.close-chat { width: 30px; height: 30px; }
.chat-messages { flex: 1; padding: 13px; }
.chat-line { display: flex; align-items: flex-end; gap: 7px; margin: 11px 0; }
.chat-line.user { justify-content: flex-end; }
.tiny-bot { display: flex; align-items: center; justify-content: center; flex: 0 0 22px; width: 22px; height: 22px; border-radius: 8px; background: #e7eddc; color: #526d46; font-size: 10px; }
.chat-bubble { display: block; max-width: 80%; padding: 10px 12px; border-radius: 13px 13px 13px 3px; background: #f1f3e9; color: #536354; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 11px; line-height: 1.7; }
.user .chat-bubble { border-radius: 13px 13px 3px 13px; background: #173e35; color: #fffefa; }
.typing { color: #98a38e; }
.quick-questions { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 9px; }
.quick-questions button { padding: 7px 9px; border: 1px solid #e3e8da; border-radius: 8px; color: #718167; font-size: 9px; }
.chat-error { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 0 12px 8px; padding: 8px 10px; border-radius: 8px; background: #fcf0e8; color: #a3613b; font-size: 9px; line-height: 1.6; }
.chat-error button { flex: 0 0 auto; color: #637d55; font-weight: 600; }
.chat-composer { display: flex; align-items: flex-end; gap: 8px; margin: 0 12px; padding: 9px; border: 1px solid #e2e7db; border-radius: 13px; background: #fbfcf8; }
.chat-input { flex: 1; max-height: 90px; min-height: 24px; color: #3b5949; font-size: 11px; line-height: 1.6; }
.send-chat { display: flex; align-items: center; justify-content: center; flex: 0 0 30px; width: 30px; height: 30px; border-radius: 9px; background: #173e35; }
.send-chat[disabled] { opacity: .4; }
.chat-privacy { display: block; padding: 8px 13px 11px; color: #a1aa96; font-size: 8px; }
@media (max-width: 700px) { .chat-robot { right: 13px; bottom: 91px; } .robot-launcher { padding: 8px 10px 8px 8px; border-radius: 15px 15px 5px 15px; } .chat-panel { position: fixed; right: 10px; bottom: 148px; width: min(365px, calc(100vw - 20px)); height: min(500px, calc(100vh - 190px)); } }
</style>
