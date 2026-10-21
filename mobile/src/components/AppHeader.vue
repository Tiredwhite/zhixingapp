<template>
  <view class="app-header">
    <view class="brand" @click="goHome"><view class="brand-symbol">知</view><view><text class="brand-name">知行</text><text class="brand-caption">校园通知助手</text></view></view>
    <view class="header-actions">
      <view v-if="back" class="desktop-nav"><button class="text-button" @click="$emit('back')"><Icon name="back" :size="17" />返回输入</button></view>
      <view class="header-status"><view class="status-dot" :class="{ online: online }" /><text>{{ online ? 'AI 已连接' : '本地数据可用' }}</text></view>
      <!-- #ifdef H5 -->
      <button v-if="showDownload" class="text-button download-link" @click="$emit('download')">下载 App<Icon name="arrow" :size="15" /></button>
      <!-- #endif -->
      <button class="icon-button settings-button" aria-label="连接设置" @click="$emit('settings')"><Icon name="settings" :size="21" /></button>
    </view>
  </view>
</template>
<script setup>
import Icon from './Icon.vue';
defineProps({ online: Boolean, back: Boolean, showDownload: Boolean });
defineEmits(['settings', 'back', 'download']);
function goHome() { uni.reLaunch({ url: '/pages/home/index' }); }
</script>
