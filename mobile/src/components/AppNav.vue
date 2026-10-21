<template>
  <view class="app-nav-wrap"><view class="app-nav">
    <button :class="['nav-item', { active: active === 'home' }]" @click="navigate('home')"><Icon name="spark" :size="19" /><view class="nav-label"><text>通知整理</text></view></button>
    <view class="nav-separator" />
    <button :class="['nav-item', 'tasks-nav-item', { active: active === 'tasks' }]" @click="navigate('tasks')"><Icon name="tasks" :size="19" /><view class="nav-label"><text>我的</text><text>待办</text></view><text v-if="count" class="nav-count">{{ count }}</text></button>
    <view class="nav-separator" />
    <button :class="['nav-item', { active: active === 'profile' }]" @click="navigate('profile')"><Icon name="user" :size="19" /><view class="nav-label"><text>我的</text></view></button>
  </view></view>
</template>
<script setup>
import Icon from './Icon.vue';
import { requireAccountLogin } from '../core/account.js';
const props = defineProps({ active: String, count: Number });
function navigate(page) { if (page !== props.active && requireAccountLogin()) uni.reLaunch({ url: `/pages/${page}/index` }); }
</script>
