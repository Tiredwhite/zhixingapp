<template>
  <view class="app-nav-wrap"><view class="app-nav">
    <button :class="['nav-item', { active: active === 'home' }]" @click="navigate('home')"><Icon name="spark" :size="21" /><text>通知整理</text></button>
    <view class="nav-separator" />
    <button :class="['nav-item', { active: active === 'tasks' }]" @click="navigate('tasks')"><Icon name="tasks" :size="21" /><text>我的待办</text><text v-if="count" class="nav-count">{{ count }}</text></button>
  </view></view>
</template>
<script setup>
import Icon from './Icon.vue';
const props = defineProps({ active: String, count: Number });
function navigate(page) { if (page !== props.active) uni.reLaunch({ url: `/pages/${page}/index` }); }
</script>
