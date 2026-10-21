<template>
  <view class="app-shell profile-shell">
    <AppHeader @settings="settingsOpen = true" />
    <view class="profile-intro">
      <view><text class="eyebrow">YOUR SPACE</text><text class="page-title">个人中心</text><text class="profile-subtitle">把知行用成适合自己的校园助手。</text></view>
    </view>
    <view class="profile-hero">
      <view class="avatar">{{ firstCharacter }}</view>
      <view class="identity"><text class="nickname">{{ nickname }}</text><text class="identity-note">{{ account?.username ? `已登录账号 · ${account.username}` : '本机使用 · 无需手机号或身份信息' }}</text></view>
      <button class="edit-profile" @click="editProfile"><Icon name="edit" :size="15" />编辑昵称</button>
      <view class="profile-mark"><Icon name="spark" :size="22" color="#c5d2ad" /></view>
    </view>
    <view class="profile-stats">
      <view class="profile-stat"><text class="stat-value">{{ pendingCount }}</text><text class="stat-name">待完成</text></view>
      <view class="profile-stat"><text class="stat-value">{{ completedCount }}</text><text class="stat-name">已完成</text></view>
      <view class="profile-stat"><text class="stat-value">{{ appState.notices.length }}</text><text class="stat-name">整理过的通知</text></view>
      <view class="profile-stat"><text class="stat-value">{{ calendarCount }}</text><text class="stat-name">加入手机日历</text></view>
    </view>
    <view class="profile-grid">
      <view class="card profile-card">
        <view class="section-heading"><view><text class="eyebrow">QUICK ACCESS</text><text class="section-title">我的工作区</text></view><Icon name="tasks" :size="20" /></view>
        <button class="profile-row" @click="goTasks"><view class="row-icon"><Icon name="tasks" :size="18" /></view><view class="row-copy"><text class="row-title">管理我的待办</text><text class="row-subtitle">编辑、完成、备份和恢复本地任务</text></view><Icon name="arrow" :size="17" color="#9ba58f" /></button>
        <button class="profile-row" @click="goHome"><view class="row-icon amber"><Icon name="paper" :size="18" color="#a88149" /></view><view class="row-copy"><text class="row-title">整理新通知</text><text class="row-subtitle">粘贴内容，或导入 Word / PDF</text></view><Icon name="arrow" :size="17" color="#9ba58f" /></button>
        <button class="profile-row" @click="settingsOpen = true"><view class="row-icon blue"><Icon name="settings" :size="18" color="#73869a" /></view><view class="row-copy"><text class="row-title">AI 服务连接</text><text class="row-subtitle">{{ appState.connection.apiBase || '尚未配置服务地址' }}</text></view><Icon name="arrow" :size="17" color="#9ba58f" /></button>
        <button class="profile-row" @click="account ? logout() : openLogin()"><view class="row-icon green"><Icon name="user" :size="18" color="#66805c" /></view><view class="row-copy"><text class="row-title">{{ account ? '退出账号' : '账号与登录' }}</text><text class="row-subtitle">{{ account ? account.username : '用户名和密码登录，不收集个人身份信息' }}</text></view><Icon name="arrow" :size="17" color="#9ba58f" /></button>
      </view>
      <view class="profile-side">
        <view class="profile-about"><text class="eyebrow">DESIGNED FOR CAMPUS LIFE</text><text class="about-title">从看懂，到行动。</text><text class="about-copy">知行用 AI 帮你理解通知、梳理办理步骤，再由你核对原文并保存。待办默认只存在当前手机，断网也能查看和编辑。</text><view class="about-tags"><text>AI 深读</text><text>来源可核</text><text>离线待办</text></view></view>
        <view class="local-privacy"><view class="privacy-icon"><Icon name="shield" :size="19" color="#66805c" /></view><view><text class="privacy-title">你的数据由你掌握</text><text class="privacy-copy">待办与昵称保存在本机。导入文档会发送到配置的服务器临时提取文字；只有点击 AI 整理或发送小知对话后，相关文本才会发送到模型服务。添加日历时申请的权限仅用于创建日程，不读取已有日程内容。</text></view></view>
      </view>
    </view>
    <view class="profile-footer"><text>知行 · 校园通知助手</text><text>Android {{ APP_VERSION }}</text></view>
    <AppNav active="profile" :count="pendingCount" />
    <ChatRobot v-if="pageActive" />
    <ConnectionPanel :visible="settingsOpen" @close="settingsOpen = false" />
    <view v-if="nicknameEditor" class="modal-overlay" @click.self="nicknameEditor = false"><view class="modal-card"><view class="section-heading"><text class="modal-title">设置昵称</text><button class="icon-button" aria-label="关闭编辑" @click="nicknameEditor = false"><Icon name="close" /></button></view><text class="field-hint nickname-hint">昵称只保存在这台设备，不会用于登录。</text><input v-model="nicknameDraft" class="field-input nickname-input" maxlength="16" placeholder="例如：知行同学" /><button class="primary-button full" @click="saveProfile">保存昵称</button></view></view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShow, onHide } from '@dcloudio/uni-app';
import AppHeader from '../../components/AppHeader.vue';
import AppNav from '../../components/AppNav.vue';
import ConnectionPanel from '../../components/ConnectionPanel.vue';
import Icon from '../../components/Icon.vue';
import ChatRobot from '../../components/ChatRobot.vue';
import { appState } from '../../core/repository.js';
import { logoutAccount } from '../../core/api.js';
import { requireAccountLogin } from '../../core/account.js';
import { APP_VERSION } from '../../core/release.js';

const settingsOpen = ref(false), nicknameEditor = ref(false), nickname = ref('知行同学'), nicknameDraft = ref(''), account = ref(null), pageActive = ref(false);
const pendingCount = computed(() => appState.tasks.filter((task) => task.status === 'pending').length);
const completedCount = computed(() => appState.tasks.filter((task) => task.status === 'done').length);
const calendarCount = computed(() => appState.tasks.filter((task) => task.calendar_added_at).length);
const firstCharacter = computed(() => nickname.value.trim().charAt(0) || '知');
onShow(() => { if (!requireAccountLogin()) return; pageActive.value = true; nickname.value = uni.getStorageSync('zhixing.profile.nickname') || '知行同学'; account.value = uni.getStorageSync('zhixing.account.session') || null; });
onHide(() => { pageActive.value = false; });
function editProfile() { nicknameDraft.value = nickname.value; nicknameEditor.value = true; }
function saveProfile() {
  const next = nicknameDraft.value.trim();
  if (!next) { uni.showToast({ title: '昵称不能为空', icon: 'none' }); return; }
  nickname.value = next.slice(0, 16); uni.setStorageSync('zhixing.profile.nickname', nickname.value);
  nicknameEditor.value = false; uni.showToast({ title: '昵称已保存', icon: 'success' });
}
function goTasks() { uni.reLaunch({ url: '/pages/tasks/index' }); }
function goHome() { uni.reLaunch({ url: '/pages/home/index' }); }
function openLogin() { uni.navigateTo({ url: '/pages/login/index' }); }
function logout() {
  uni.showModal({ title: '退出知行账号？', content: '本机待办与昵称会保留；退出后重新使用账号服务时需要再次登录。', confirmText: '退出登录', success: async (result) => {
    if (!result.confirm) return;
    try { await logoutAccount(appState.connection); } catch { /* Local logout still completes if the server is unavailable. */ }
    uni.removeStorageSync('zhixing.account.session'); account.value = null;
    uni.showToast({ title: '已退出登录', icon: 'success' });
    uni.reLaunch({ url: '/pages/login/index' });
  } });
}
</script>

<style scoped lang="scss">
.profile-intro { padding: 34px 0 23px; }
.profile-subtitle { display: block; color: #8e9a82; font-size: 12px; margin-top: 10px; }
.profile-hero { display: flex; align-items: center; position: relative; overflow: hidden; gap: 17px; padding: 25px 30px; border-radius: 22px; background: #173e35; color: #fffefa; }
.avatar { display: flex; align-items: center; justify-content: center; width: 58px; height: 58px; border-radius: 20px; background: #dfe8ce; color: #35533d; font-size: 26px; font-weight: 650; }
.identity { min-width: 0; }
.nickname { display: block; font-size: 19px; font-weight: 600; }
.identity-note { display: block; margin-top: 7px; color: #bfccba; font-size: 11px; }
.edit-profile { display: flex; align-items: center; gap: 6px; margin-left: auto; padding: 9px 12px; color: #e2ead8; border: 1px solid #60786d; border-radius: 9px; font-size: 10px; z-index: 1; }
.profile-mark { position: absolute; right: -3px; bottom: -24px; opacity: .35; transform: scale(5); }
.profile-stats { display: grid; grid-template-columns: repeat(4, 1fr); background: #edf0e2; border: 1px solid #e1e7d3; border-radius: 18px; margin-top: 15px; padding: 21px 12px; }
.profile-stat { text-align: center; border-right: 1px solid #dfe5d2; }
.profile-stat:last-child { border: 0; }
.stat-value { display: block; font-size: 25px; line-height: 1; font-weight: 600; }
.stat-name { display: block; margin-top: 8px; color: #87947b; font-size: 10px; }
.profile-grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 17px; margin-top: 18px; align-items: start; }
.profile-card { padding: 25px; }
.profile-card .section-title { margin-top: 9px; }
.profile-row { display: flex; width: 100%; align-items: center; gap: 12px; text-align: left; padding: 17px 0; border-bottom: 1px solid #edf0e5; }
.profile-row:last-child { padding-bottom: 2px; border: 0; }
.row-icon { display: flex; padding: 10px; border-radius: 11px; background: #edf2e4; }
.row-icon.amber { background: #f5ebd9; }
.row-icon.blue { background: #eaf0f3; }
.row-icon.green { background: #e9f0e2; }
.row-copy { flex: 1; min-width: 0; }
.row-title { display: block; color: #355144; font-size: 12px; font-weight: 600; }
.row-subtitle { display: block; overflow: hidden; margin-top: 5px; color: #98a18e; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.profile-side { display: grid; gap: 14px; }
.profile-about { padding: 25px; border-radius: 19px; background: #f0eee2; border: 1px solid #e8e6d7; }
.about-title { display: block; margin-top: 13px; font-size: 20px; font-weight: 620; }
.about-copy { display: block; margin-top: 10px; font-size: 11px; line-height: 1.9; color: #828a77; }
.about-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 17px; }
.about-tags text { padding: 6px 9px; background: #e3e6d8; color: #718066; border-radius: 6px; font-size: 9px; }
.local-privacy { display: flex; align-items: flex-start; gap: 12px; padding: 19px; background: #f8faf4; border: 1px solid #e5eadd; border-radius: 16px; }
.privacy-icon { padding: 9px; border-radius: 10px; background: #e8eee0; }
.privacy-title { display: block; font-size: 11px; font-weight: 600; }
.privacy-copy { display: block; margin-top: 6px; color: #8c9783; font-size: 10px; line-height: 1.8; }
.profile-footer { display: flex; justify-content: space-between; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e9dd; color: #a2ac97; font-size: 10px; }
.nickname-hint { margin: 12px 0 3px; }
.nickname-input { margin-top: 9px; }
@media (max-width: 800px) { .profile-grid { grid-template-columns: 1fr; } }
@media (max-width: 700px) { .profile-intro { padding-top: 26px; } .profile-hero { padding: 20px 18px; gap: 12px; border-radius: 18px; } .avatar { width: 48px; height: 48px; border-radius: 16px; font-size: 22px; } .nickname { font-size: 16px; } .identity-note { font-size: 9px; } .edit-profile { gap: 4px; padding: 8px; font-size: 9px; } .profile-stats { padding: 18px 3px; } .stat-value { font-size: 21px; } .stat-name { font-size: 9px; } .profile-card, .profile-about { padding: 20px; } .profile-row { gap: 9px; } }
</style>
