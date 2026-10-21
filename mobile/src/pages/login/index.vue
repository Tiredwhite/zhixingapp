<template>
  <view class="account-page">
    <view class="account-brand"><view class="brand-mark">知</view><text class="brand-name">知行</text><text class="brand-caption">校园通知助手</text></view>
    <view class="account-card">
      <text class="account-eyebrow">WELCOME BACK</text>
      <text class="account-title">登录知行</text>
      <text class="account-subtitle">登录后即可用账号连接 AI 服务。</text>
      <text class="field-label">账号</text>
      <input v-model="username" class="field-input" maxlength="24" autocomplete="username" placeholder="3—24位字母、数字或下划线" />
      <text class="field-label">密码</text>
      <input v-model="password" class="field-input" maxlength="128" password autocomplete="current-password" placeholder="至少8位" @confirm="login" />
      <view v-if="error" class="account-error">{{ error }}</view>
      <button class="primary-button account-submit" :disabled="busy" @click="login">{{ busy ? '正在登录…' : '登录' }}</button>
      <view class="account-register"><text>还没有账号？</text><button class="inline-link" @click="openRegister">前往网页注册</button></view>
      <text class="account-privacy">只使用账号名和密码，不收集手机号或身份信息。忘记密码时目前无法找回，请妥善保管。</text>
    </view>
    <button class="offline-link" @click="continueOffline">先以本机模式继续</button>
    <ConnectionPanel :visible="settingsOpen" @close="settingsOpen = false" />
  </view>
</template>

<script setup>
import { ref } from 'vue';
import ConnectionPanel from '../../components/ConnectionPanel.vue';
import { loginAccount } from '../../core/api.js';
import { repository } from '../../core/repository.js';

const username = ref(''), password = ref(''), error = ref(''), busy = ref(false), settingsOpen = ref(false);
function connection() {
  const saved = repository.state.connection;
  return { ...saved, apiBase: saved.apiBase || 'https://tiredwhite.cn' };
}
async function login() {
  if (busy.value) return;
  error.value = '';
  busy.value = true;
  try {
    const result = await loginAccount(connection(), username.value.trim(), password.value);
    uni.setStorageSync('zhixing.account.session', {
      username: result.username, access_token: result.access_token, expires_at: result.expires_at,
    });
    password.value = '';
    uni.showToast({ title: '登录成功', icon: 'success' });
    uni.reLaunch({ url: '/pages/home/index' });
  } catch (reason) {
    error.value = reason.message || '登录失败，请检查账号和密码';
  } finally { busy.value = false; }
}
function openRegister() {
  // #ifdef APP-PLUS
  const url = `${connection().apiBase}/#/pages/register/index`;
  plus.runtime.openURL(url);
  // #endif
  // #ifdef H5
  uni.navigateTo({ url: '/pages/register/index' });
  // #endif
}
function continueOffline() { uni.reLaunch({ url: '/pages/home/index' }); }
</script>

<style scoped lang="scss">
.account-page { box-sizing: border-box; display: flex; min-height: 100vh; flex-direction: column; align-items: center; padding: 54px 20px 32px; background: #f6f6ef; color: #294b3e; }
.account-brand { display: flex; align-items: center; gap: 8px; align-self: flex-start; max-width: 440px; width: 100%; margin: 0 auto 34px; }
.brand-mark { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 11px 11px 3px 11px; background: #173e35; color: #fffefa; font-size: 17px; font-weight: 650; }
.brand-name { font-size: 15px; font-weight: 650; }.brand-caption { margin-left: -3px; color: #9aa38e; font-size: 10px; }
.account-card { box-sizing: border-box; width: min(100%, 440px); padding: 34px; border: 1px solid #e5e9dc; border-radius: 22px; background: #fffefa; box-shadow: 0 14px 40px #233e2d0d; }
.account-eyebrow { display: block; color: #8b9a7d; font-size: 9px; letter-spacing: 2px; }.account-title { display: block; margin-top: 11px; font-size: 25px; font-weight: 650; }.account-subtitle { display: block; margin: 8px 0 27px; color: #929b88; font-size: 11px; }
.field-label { display: block; margin: 15px 0 8px; color: #586c57; font-size: 11px; }.field-input { box-sizing: border-box; width: 100%; height: 46px; padding: 0 13px; border: 1px solid #e2e7da; border-radius: 10px; background: #fcfcf8; color: #294b3e; font-size: 12px; }
.account-error { margin-top: 14px; color: #a46445; font-size: 11px; line-height: 1.7; }.account-submit { width: 100%; margin-top: 23px; }.account-register { display: flex; justify-content: center; gap: 5px; margin-top: 18px; color: #929b88; font-size: 11px; }.inline-link { display: inline; padding: 0; color: #557a4c; font-size: 11px; font-weight: 600; }
.account-privacy { display: block; margin-top: 25px; color: #a0a795; font-size: 9px; line-height: 1.8; }.offline-link { margin-top: 19px; color: #788873; font-size: 11px; }
@media (max-width: 430px) { .account-page { padding: 32px 16px; }.account-card { padding: 26px 22px; } }
</style>
