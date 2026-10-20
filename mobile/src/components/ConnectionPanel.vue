<template>
  <view v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <view class="modal-card" role="dialog" aria-label="连接设置">
      <view class="section-heading"><view><text class="eyebrow">CONNECTION</text><text class="modal-title">连接 AI 服务</text></view><button class="icon-button" aria-label="关闭连接设置" @click="$emit('close')"><Icon name="close" /></button></view>
      <text class="muted description">连接服务后即可解析真实通知。已有待办始终保存在这台设备上。</text>
      <text class="field-label">服务器地址</text>
      <input v-model="apiBase" class="field-input" placeholder="https://your-server.example.com" :maxlength="200" />
      <text class="field-hint">本机 Web 调试可留空；手机上请填写可访问的 HTTPS 地址。</text>
      <text class="field-label">临时访问令牌</text>
      <input v-model="token" class="field-input" password placeholder="由服务部署者提供，本机调试可留空" :maxlength="300" />
      <text class="field-hint">这里填写应用的连接令牌，无需填写大模型 API 密钥。</text>
      <view v-if="message" :class="['inline-message', { 'message-success': success }]">{{ message }}</view>
      <button class="primary-button full" :disabled="busy" @click="saveAndTest"><Icon name="link" :size="18" color="#ffffff" />{{ busy ? '正在检查连接…' : '保存并检查连接' }}</button>
      <text class="privacy-note">可随时更换连接。示例与手动整理无需 AI 服务。</text>
    </view>
  </view>
</template>
<script setup>
import { ref, watch } from 'vue';
import { health } from '../core/api.js';
import { repository } from '../core/repository.js';
import Icon from './Icon.vue';
const props = defineProps({ visible: Boolean });
const emit = defineEmits(['close', 'changed']);
const apiBase = ref(''), token = ref(''), message = ref(''), success = ref(false), busy = ref(false);
watch(() => props.visible, (value) => { if (value) { apiBase.value = repository.state.connection.apiBase; token.value = repository.state.connection.token; message.value = ''; } });
async function saveAndTest() {
  busy.value = true; success.value = false; message.value = '';
  try {
    const trimmed = apiBase.value.trim();
    if (trimmed && !/^https?:\/\/[^\s]+$/.test(trimmed)) throw new Error('服务器地址格式不正确');
    repository.setConnection({ apiBase: trimmed, token: token.value });
    const result = await health(repository.state.connection);
    success.value = true;
    message.value = result.ai_configured ? `服务已连接 · ${result.model_id}` : '服务已连接，AI 凭证尚未配置；可以先使用示例或手动整理。';
    emit('changed', result);
  } catch (error) { message.value = error.message; } finally { busy.value = false; }
}
</script>
