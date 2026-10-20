<template>
  <view class="app-shell">
    <AppHeader :online="aiReady" @settings="settingsOpen = true" />
    <view class="home-intro">
      <view><text class="eyebrow">LESS NOISE, MORE CLARITY</text><text class="hero-title">通知里的事，<text class="hero-accent">清楚安排。</text></text><text class="hero-description">粘贴一段校园通知，核对关键信息，把下一步留在清单里。</text></view>
      <view class="intro-date"><text>{{ today }}</text><text class="date-caption">每一件小事，都有着落</text></view>
    </view>
    <view v-if="repository.warning" class="inline-message"><Icon name="info" :size="17" color="#a3613b" /><text>{{ repository.warning }}</text></view>
    <view class="workspace-grid">
      <view class="input-column">
        <view class="card composer">
          <view class="section-heading"><view class="composer-heading"><view class="small-icon"><Icon name="paper" :size="20" /></view><text class="section-title">粘贴一段通知</text></view><text class="small-label">01 / 输入</text></view>
          <view class="input-area">
            <textarea v-model="text" class="notice-input" :maxlength="2000" :disabled="busy" placeholder="把课程、竞赛或办事通知粘贴到这里…&#10;&#10;例如：请于10月23日前提交项目书，答辩时间另行通知。" placeholder-style="color: #a6aea0; line-height: 1.9;" :auto-height="false" />
            <view class="input-footer"><text>内容仅由你主动提供</text><text>{{ text.length }} / 2000</text></view>
          </view>
          <view class="sample-row"><text class="sample-prefix">试一试</text><button v-for="sample in SAMPLES" :key="sample.id" class="sample-button" :disabled="busy" @click="fillSample(sample)">{{ sample.label }}<text class="sample-arrow">↗</text></button></view>
          <view class="source-time-row"><Icon name="clock" :size="15" color="#8b9585" /><input v-model="published" :disabled="busy" class="source-time-input" placeholder="通知发布时间（选填，如 2026-10-20 09:00）" :maxlength="16" /></view>
          <text class="field-hint">相对日期需要通知的发布时间；留空时会标记为待确认。</text>
          <view v-if="errorMessage" class="inline-message"><Icon name="info" :size="17" color="#a3613b" /><view><text>{{ errorMessage }}</text><text v-if="failedId" class="request-reference">请求编号 {{ failedId.slice(0, 8) }}</text></view></view>
          <view class="composer-actions"><button class="primary-button parse-button" :disabled="busy || text.trim().length < 2" @click="startAI"><Icon name="spark" color="#fffefa" :size="19" />{{ busy ? '正在理解通知…' : 'AI 整理通知' }}<Icon v-if="!busy" name="arrow" color="#fffefa" :size="18" /></button><button v-if="busy" class="secondary-button" @click="cancelParsing">取消</button><button v-else class="manual-button" @click="startManual">手动整理<Icon name="arrow" :size="15" color="#7a8977" /></button></view>
          <view class="composer-bottom"><Icon name="shield" :size="13" color="#9ba68f" /><text>AI 结果先核对，再保存；解析时文本将发送至 AI 服务。</text></view>
        </view>
        <view class="connection-strip"><view class="connection-caption"><view class="status-dot" :class="{ online: aiReady }" /><view><text class="connection-title">{{ aiReady ? 'DeepSeek 已就绪' : 'AI 连接待检查' }}</text><text class="connection-subtitle">{{ aiReady ? '保留原文依据 · 支持字段核对' : '先体验示例，或配置你的服务连接' }}</text></view></view><button class="text-button" @click="settingsOpen = true">连接设置<Icon name="arrow" :size="15" /></button></view>
      </view>
      <view class="aside-column">
        <view class="overview-card"><text class="eyebrow">YOUR LITTLE OVERVIEW</text><view class="section-heading overview-title"><text class="section-title">我的待办概览</text><Icon name="tasks" :size="20" color="#658261" /></view><view class="overview-numbers"><view><text class="stat-number">{{ pendingCount }}</text><text class="stat-label">待完成</text></view><view class="stat-divider" /><view><text class="stat-number stat-soon">{{ soonCount }}</text><text class="stat-label">24 小时内</text></view><view class="stat-divider" /><view><text class="stat-number stat-muted">{{ doneCount }}</text><text class="stat-label">已完成</text></view></view><button class="overview-link" @click="goTasks">查看我的清单<Icon name="arrow" :size="17" /></button></view>
        <view class="card example-card"><view class="section-heading"><text class="section-title">先看看它如何工作</text><text class="tag example">预置示例</text></view><text class="example-description">一段通知，整理成清楚的行动。示例无需联网，随时可以体验。</text><view class="example-note"><text class="example-note-label">一条课程通知</text><text class="example-note-text">“请于10月23日18:00前提交项目书PDF，答辩时间另行通知。”</text></view><view class="example-transform"><view class="transform-line" /><Icon name="arrow" :size="16" color="#9ba58f" /><view class="transform-line" /></view><view class="example-result"><view class="example-check"><Icon name="check" :size="15" color="#fff" /></view><view><text class="example-task-title">提交项目书 PDF</text><text class="example-task-time">截止时间与原文依据，逐项核对</text></view></view><button class="example-link" @click="previewExample">体验完整示例<Icon name="arrow" :size="16" /></button></view>
        <view class="local-note"><Icon name="shield" :size="16" color="#87957a" /><text>待办保存在本机。断网时，也能继续查看和修改。</text></view>
      </view>
    </view>
    <view class="home-footnote"><text>从一条通知开始，让清单慢慢变清楚。</text><text>知行 · v0.1</text></view>
    <AppNav active="home" :count="pendingCount" />
    <ConnectionPanel :visible="settingsOpen" @close="settingsOpen = false" @changed="setHealth" />
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { onShow, onHide, onUnload } from '@dcloudio/uni-app';
import AppHeader from '../../components/AppHeader.vue';
import AppNav from '../../components/AppNav.vue';
import ConnectionPanel from '../../components/ConnectionPanel.vue';
import Icon from '../../components/Icon.vue';
import { appState, repository, reportError } from '../../core/repository.js';
import { health, parseNotice } from '../../core/api.js';
import { sourceTime, dueState } from '../../core/dates.js';
import { SAMPLES, manualCandidate } from '../../core/samples.js';

const text = ref(appState.draft.text), published = ref(appState.draft.source_time || '');
const busy = ref(false), errorMessage = ref(''), failedId = ref(''), aiReady = ref(false), settingsOpen = ref(false);
const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Shanghai' });
const pendingCount = computed(() => appState.tasks.filter((t) => t.status !== 'done').length);
const doneCount = computed(() => appState.tasks.filter((t) => t.status === 'done').length);
const soonCount = computed(() => appState.tasks.filter((t) => dueState(t).className === 'soon').length);
let debounce, activeRequest, requestVersion = 0;
watch([text, published], () => { clearTimeout(debounce); debounce = setTimeout(() => { try { repository.saveDraft(text.value, published.value); } catch (e) { errorMessage.value = e.message; } }, 500); });
onShow(async () => { try { setHealth(await health(repository.state.connection)); } catch { aiReady.value = false; } });
onHide(() => { clearTimeout(debounce); if (text.value !== repository.state.draft.text || published.value !== repository.state.draft.source_time) { try { persistDraft(); } catch (error) { errorMessage.value = error.message; } } });
onUnload(() => { clearTimeout(debounce); requestVersion++; activeRequest?.cancel(); });
function setHealth(value) { aiReady.value = Boolean(value?.ai_configured); }
function fillSample(sample) { text.value = sample.text; published.value = ''; errorMessage.value = ''; }
function persistDraft() { clearTimeout(debounce); return repository.saveDraft(text.value.trim(), published.value.trim()); }
function review(workflow) { repository.setWorkflow(workflow); uni.navigateTo({ url: '/pages/review/index' }); }
function startManual() {
  try {
    if (text.value.trim().length < 2) throw new Error('请先粘贴需要整理的通知，至少2个字');
    const draft = persistDraft();
    review({ notice_id: draft.id, text: draft.text, mode: 'manual', items: [manualCandidate()], warnings: [] });
  } catch (error) { reportError(error); }
}
function previewExample() {
  try {
    const sample = SAMPLES[0]; fillSample(sample); const draft = persistDraft();
    review({ notice_id: draft.id, text: sample.text, mode: 'example', items: sample.items, warnings: ['这是预置示例，没有调用 AI 服务', ...sample.warnings] });
  } catch (error) { reportError(error); }
}
async function startAI() {
  if (busy.value) return;
  let version;
  try {
    errorMessage.value = ''; failedId.value = '';
    const timestamp = sourceTime(published.value); const draft = persistDraft();
    busy.value = true; version = ++requestVersion;
    activeRequest = parseNotice(repository.state.connection, draft.text, timestamp);
    const result = await activeRequest.promise;
    if (version !== requestVersion) return;
    if (result.mode !== 'ai' || !Array.isArray(result.items)) throw new Error('服务返回格式不正确，请检查后端版本');
    aiReady.value = true;
    review({ notice_id: draft.id, text: draft.text, mode: 'ai', model_id: result.model_id, parse_id: result.parse_id, request_id: result.request_id, items: result.items, warnings: result.warnings || [] });
  } catch (error) {
    if (version && version !== requestVersion) return;
    errorMessage.value = error.message; failedId.value = error.requestId || '';
    if (error.code === 'MODEL_NOT_CONFIGURED') aiReady.value = false;
  } finally { if (!version || version === requestVersion) { busy.value = false; activeRequest = null; } }
}
function cancelParsing() { requestVersion++; activeRequest?.cancel(); activeRequest = null; busy.value = false; errorMessage.value = '已取消等待，原文已保留。模型端可能仍在处理该次请求。'; }
function goTasks() { uni.reLaunch({ url: '/pages/tasks/index' }); }
</script>

<style scoped lang="scss">
.home-intro { display: flex; justify-content: space-between; align-items: center; padding: 47px 0 36px; gap: 24px; }
.hero-title { font-size: 37px; line-height: 1.6; font-weight: 650; letter-spacing: -1.5px; display: block; margin-top: 9px; }
.hero-accent { color: #7b9263; }
.hero-description { display: block; color: #85907e; font-size: 12px; line-height: 1.8; margin-top: 4px; }
.intro-date { text-align: right; color: #64765f; font-size: 12px; align-self: flex-end; padding-bottom: 5px; }
.date-caption { display: block; color: #a0a994; font-size: 10px; margin-top: 9px; }
.workspace-grid { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr); gap: 26px; align-items: start; }
.composer { padding: 27px; }
.composer-heading { display: flex; align-items: center; gap: 11px; }
.small-icon { background: #eef1e6; padding: 9px; border-radius: 10px; display: flex; }
.input-area { background: #f8f9f3; border: 1px solid #e8ebdf; border-radius: 13px; margin-top: 23px; padding: 20px 18px 13px; }
.notice-input { width: 100%; height: 206px; font-size: 13px; line-height: 1.9; color: #425846; }
.input-footer { display: flex; justify-content: space-between; font-size: 10px; color: #a5ad9b; padding-top: 12px; }
.sample-row { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; margin-top: 15px; }
.sample-prefix { font-size: 10px; color: #939d87; margin-right: 2px; }
.sample-button { font-size: 10px; border: 1px solid #e4e8dc; padding: 6px 10px; border-radius: 7px; color: #6f7e66; background: #fffefa; }
.sample-button:hover { background: #eef1e7; }
.sample-arrow { color: #a6af9b; padding-left: 7px; }
.source-time-row { display: flex; align-items: center; gap: 9px; margin-top: 24px; border-top: 1px solid #edf0e5; padding-top: 18px; }
.source-time-input { flex: 1; min-height: 25px; font-size: 11px; color: #63755e; }
.composer-actions { display: flex; align-items: center; gap: 20px; margin-top: 25px; }
.parse-button { flex: 1; }
.manual-button { display: flex; gap: 7px; align-items: center; color: #7a8977; font-size: 12px; padding: 12px 0; }
.composer-bottom { margin-top: 18px; display: flex; align-items: center; justify-content: center; gap: 6px; color: #a0aa96; font-size: 10px; line-height: 1.6; }
.request-reference { display: block; font-size: 10px; margin-top: 3px; opacity: .7; }
.connection-strip { display: flex; align-items: center; justify-content: space-between; padding: 21px 6px; gap: 10px; }
.connection-caption { display: flex; align-items: center; gap: 9px; }
.connection-title { display: block; font-size: 11px; color: #73866b; }
.connection-subtitle { display: block; font-size: 10px; color: #9ba68f; margin-top: 4px; }
.overview-card { background: #edf0e2; border: 1px solid #e1e7d3; border-radius: 22px; padding: 27px; }
.overview-title { margin-top: 14px; }
.overview-numbers { display: flex; justify-content: space-between; align-items: center; margin-top: 29px; }
.stat-number { display: block; font-size: 36px; line-height: 1; font-weight: 550; letter-spacing: -1px; }
.stat-soon { color: #ba854e; }
.stat-muted { color: #84947c; }
.stat-label { display: block; font-size: 10px; color: #819070; margin-top: 10px; }
.stat-divider { background: #d9e0ca; width: 1px; height: 32px; }
.overview-link { display: flex; align-items: center; justify-content: space-between; font-size: 11px; margin-top: 27px; border-top: 1px solid #dfe5d1; padding-top: 16px; color: #607553; }
.example-card { padding: 25px; margin-top: 20px; }
.example-card .section-title { font-size: 15px; }
.example-description { display: block; font-size: 11px; line-height: 1.9; color: #94a08b; margin-top: 14px; }
.example-note { padding: 15px; border-radius: 11px; background: #f5f5ef; margin-top: 18px; border-left: 2px solid #c8d1b7; }
.example-note-label { display: block; font-size: 9px; color: #a4ad98; margin-bottom: 8px; }
.example-note-text { display: block; font-size: 11px; color: #7b8972; line-height: 1.8; }
.example-transform { display: flex; justify-content: center; align-items: center; gap: 8px; padding: 12px 0; }
.transform-line { height: 1px; width: 25px; background: #e5e9dc; }
.example-result { display: flex; gap: 10px; align-items: center; }
.example-check { padding: 5px; background: #8a9f70; border-radius: 7px; display: flex; }
.example-task-title { display: block; font-size: 12px; font-weight: 550; }
.example-task-time { display: block; font-size: 9px; color: #9da88f; margin-top: 5px; }
.example-link { display: flex; align-items: center; justify-content: space-between; font-size: 11px; margin-top: 21px; padding-top: 16px; border-top: 1px solid #ecefe4; color: #7a8c6c; }
.local-note { display: flex; align-items: flex-start; gap: 8px; padding: 19px 7px; font-size: 10px; line-height: 1.9; color: #97a18c; }
.home-footnote { display: flex; justify-content: space-between; color: #abb39e; font-size: 10px; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e6e9de; }
@media (max-width: 900px) and (min-width: 701px) { .hero-title { font-size: 29px; } .intro-date { display: none; } .workspace-grid { grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 16px; } .composer, .overview-card, .example-card { padding: 20px; } }
@media (max-width: 700px) { .home-intro { padding: 30px 0 25px; } .hero-title { font-size: 28px; letter-spacing: -.9px; } .hero-description { font-size: 11px; margin-top: 8px; } .intro-date { display: none; } .workspace-grid { display: flex; flex-direction: column; gap: 10px; } .input-column, .aside-column { width: 100%; } .composer { padding: 20px 18px; border-radius: 18px; } .notice-input { height: 145px; font-size: 12px; } .input-area { margin-top: 18px; padding: 16px 14px 12px; } .composer-actions { gap: 14px; margin-top: 22px; } .composer-bottom { font-size: 9px; } .source-time-input { font-size: 10px; } .aside-column { display: flex; flex-direction: column; gap: 0; } .overview-card { padding: 22px; } .overview-numbers { justify-content: space-around; margin-top: 20px; } .overview-title { margin-top: 9px; } .stat-number { font-size: 32px; } .example-card { padding: 22px; } .home-footnote { margin-top: 10px; } }
</style>
