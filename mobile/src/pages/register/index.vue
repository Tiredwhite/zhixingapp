<template>
  <view class="account-page">
    <view class="account-brand"><view class="brand-mark">知</view><text class="brand-name">知行</text><text class="brand-caption">校园通知助手</text></view>
    <view class="account-card">
      <text class="account-eyebrow">CREATE YOUR ACCOUNT</text>
      <text class="account-title">创建知行账号</text>
      <text class="account-subtitle">只需一个账号名和密码，不收集手机号或身份信息。</text>
      <view v-if="registered" class="register-success"><text class="success-title">账号创建成功</text><text class="success-copy">请返回知行 App，在个人中心打开“账号与登录”并使用 {{ createdUsername }} 登录。</text><button class="primary-button account-submit" @click="registered = false">再注册一个账号</button></view>
      <template v-else>
        <text class="field-label">账号名</text>
        <input v-model="username" class="field-input" maxlength="24" autocomplete="username" placeholder="3—24位字母、数字或下划线" />
        <text class="field-hint">账号名不支持修改，请勿填写手机号、姓名等个人信息。</text>
        <text class="field-label">密码</text>
        <input v-model="password" class="field-input" maxlength="128" password autocomplete="new-password" placeholder="至少8位" />
        <text class="field-label">再次输入密码</text>
        <input v-model="confirmPassword" class="field-input" maxlength="128" password autocomplete="new-password" placeholder="确认密码" @confirm="register" />
        <view v-if="error" class="account-error">{{ error }}</view>
        <button class="primary-button account-submit" :disabled="busy" @click="register">{{ busy ? '正在创建…' : '创建账号' }}</button>
      </template>
      <text class="account-privacy">密码以加盐哈希形式保存在服务端；忘记密码暂不支持找回，请自行保管。账号仅用于知行登录。</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { registerAccount } from '../../core/api.js';
import { repository } from '../../core/repository.js';

const username = ref(''), password = ref(''), confirmPassword = ref(''), error = ref(''), busy = ref(false), registered = ref(false), createdUsername = ref('');
function connection() {
  const saved = repository.state.connection;
  return { ...saved, apiBase: saved.apiBase || 'https://tiredwhite.cn' };
}
async function register() {
  if (busy.value) return;
  error.value = '';
  if (password.value !== confirmPassword.value) { error.value = '两次输入的密码不一致'; return; }
  busy.value = true;
  try {
    const result = await registerAccount(connection(), username.value.trim(), password.value);
    createdUsername.value = result.username;
    registered.value = true;
    password.value = ''; confirmPassword.value = '';
  } catch (reason) {
    error.value = reason.message || '注册失败，请稍后重试';
  } finally { busy.value = false; }
}
</script>

<style scoped lang="scss">
.account-page { box-sizing: border-box; display: flex; min-height: 100vh; flex-direction: column; align-items: center; padding: 54px 20px 32px; background: #f6f6ef; color: #294b3e; }
.account-brand { display: flex; align-items: center; gap: 8px; align-self: flex-start; max-width: 440px; width: 100%; margin: 0 auto 34px; }.brand-mark { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 11px 11px 3px 11px; background: #173e35; color: #fffefa; font-size: 17px; font-weight: 650; }.brand-name { font-size: 15px; font-weight: 650; }.brand-caption { margin-left: -3px; color: #9aa38e; font-size: 10px; }
.account-card { box-sizing: border-box; width: min(100%, 440px); padding: 34px; border: 1px solid #e5e9dc; border-radius: 22px; background: #fffefa; box-shadow: 0 14px 40px #233e2d0d; }.account-eyebrow { display: block; color: #8b9a7d; font-size: 9px; letter-spacing: 2px; }.account-title { display: block; margin-top: 11px; font-size: 25px; font-weight: 650; }.account-subtitle { display: block; margin: 8px 0 22px; color: #929b88; font-size: 11px; line-height: 1.7; }
.field-label { display: block; margin: 15px 0 8px; color: #586c57; font-size: 11px; }.field-input { box-sizing: border-box; width: 100%; height: 46px; padding: 0 13px; border: 1px solid #e2e7da; border-radius: 10px; background: #fcfcf8; color: #294b3e; font-size: 12px; }.field-hint { display: block; margin-top: 7px; color: #9ba38f; font-size: 9px; line-height: 1.6; }.account-error { margin-top: 14px; color: #a46445; font-size: 11px; line-height: 1.7; }.account-submit { width: 100%; margin-top: 23px; }.account-privacy { display: block; margin-top: 25px; color: #a0a795; font-size: 9px; line-height: 1.8; }.register-success { padding: 20px; border-radius: 13px; background: #eff4e8; }.success-title { display: block; color: #55764c; font-size: 15px; font-weight: 650; }.success-copy { display: block; margin-top: 10px; color: #70806c; font-size: 11px; line-height: 1.8; }
@media (max-width: 430px) { .account-page { padding: 32px 16px; }.account-card { padding: 26px 22px; } }
</style>
