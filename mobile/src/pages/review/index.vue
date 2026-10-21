<template>
  <view class="app-shell">
    <AppHeader back :online="workflow?.mode === 'ai'" @settings="settingsOpen = true" @back="goBack" />
    <view class="review-intro"><button class="text-button mobile-back" @click="goBack"><Icon name="back" :size="16" />返回通知</button><view class="section-heading"><view><text class="eyebrow">CHECK BEFORE YOU ACT</text><text class="page-title">核对一下，再放进清单。</text></view><text :class="['tag', { example: workflow?.mode === 'example' }]">{{ modeLabel }}</text></view><text class="review-subtitle">这里的内容都可以修改。时间未明确的事项，可以先保留“时间未定”。</text></view>
    <view v-if="!workflow" class="card empty-state"><text class="empty-title">没有待核对的通知</text><text class="empty-description">回到输入页，粘贴通知或体验预置示例。</text><button class="primary-button" @click="goBack">返回输入</button></view>
    <template v-else>
      <view v-if="workflow.mode === 'example'" class="inline-message"><Icon name="info" :size="17" color="#a3613b" /><text>当前为预置示例，未调用 AI。保存后也会保留“示例”标记。</text></view>
      <view v-if="workflow.mode === 'ai'" class="deep-read card">
        <view class="section-heading"><view><text class="eyebrow">LIVE AI · 第二层理解</text><text class="deep-title">AI 深读这条通知</text></view><text class="tag">{{ deepBusy ? '正在生成' : deepRead ? '真实 AI 建议' : '等待分析' }}</text></view>
        <text class="deep-intro">提取只是第一步。这里把通知变成执行路径，并指出还需要问清的事。</text>
        <view v-if="deepBusy" class="deep-status"><Icon name="spark" :size="19" /><text>正在结合原文推演执行步骤，通常需要几秒…</text></view>
        <view v-else-if="deepRead" class="deep-content">
          <view class="deep-summary"><text class="deep-label">AI 概括</text><text class="deep-summary-text">{{ deepRead.summary }}</text><text class="deep-quote">依据：“{{ deepRead.summary_quote }}”</text></view>
          <text class="deep-label deep-steps-label">建议这样推进</text>
          <view v-for="(step, index) in deepRead.steps" :key="index" class="deep-step"><text class="deep-number">{{ String(index + 1).padStart(2, '0') }}</text><view><text class="deep-step-title">{{ step.instruction }}</text><text class="deep-step-why">{{ step.why }}</text><text class="deep-quote">关联原文：“{{ step.source_quote }}”</text></view></view>
          <view v-if="deepRead.questions.length" class="deep-questions"><text class="deep-label">办理前值得问清</text><view v-for="(item, index) in deepRead.questions" :key="index" class="deep-question"><text>{{ item.question }}</text><text class="deep-step-why">{{ item.reason }}</text></view></view>
          <text class="deep-boundary">以上是 AI 建议，不是学校新增要求；以原文和实际通知为准。</text>
        </view>
        <view v-else class="deep-fallback"><text>{{ deepError || '正在准备深读。' }}</text><button class="text-button" @click="runDeepRead">重试 AI 深读</button></view>
      </view>
      <view class="review-layout">
        <view class="candidate-list">
          <view v-for="(item, index) in items" :key="item.id" class="card candidate-card" :class="{ 'not-selected': !item.selected }">
            <view class="section-heading"><view class="candidate-title-row"><button class="select-square" :class="{ selected: item.selected }" :aria-label="`${item.selected ? '取消选择' : '选择'}第${index + 1}项`" @click="item.selected = !item.selected"><Icon v-if="item.selected" name="check" :size="15" color="#ffffff" /></button><text class="candidate-number">行动 {{ String(index + 1).padStart(2, '0') }}</text></view><button class="evidence-button" @click="showSource(item)"><Icon name="link" :size="13" color="#8b9b7a" />查看原文</button></view>
            <text class="field-label">需要做什么</text><input v-model="item.action" class="field-input action-input" :maxlength="60" placeholder="填写清楚的行动，如提交项目书 PDF" />
            <view class="date-fields"><view><text class="field-label">截止日期</text><input v-model="item.date" class="field-input" :maxlength="10" placeholder="YYYY-MM-DD 或留空" /></view><view><text class="field-label">具体时刻</text><input v-model="item.time" class="field-input" :maxlength="5" placeholder="HH:mm 或留空" /></view></view>
            <view class="extra-fields"><view><text class="field-label">地点或提交渠道</text><input v-model="item.location" class="field-input" placeholder="原文未明确可留空" :maxlength="100" /></view><view><text class="field-label">需要准备的材料</text><input v-model="item.materialText" class="field-input" placeholder="多个材料用顿号分隔" :maxlength="500" /></view></view>
            <view v-if="item.review_reasons?.length" class="review-reasons"><view class="reason-heading"><Icon name="info" :size="14" color="#b28c55" /><text>需要你确认</text></view><text v-for="(reason, idx) in item.review_reasons" :key="idx" class="reason-text">{{ reason }}</text></view>
            <view v-if="item.evidence?.action" class="evidence-quote"><text class="evidence-label">原文依据</text><text class="evidence-text">“{{ item.evidence.action }}”</text><text v-if="item.evidence.due" class="evidence-time">时间：“{{ item.evidence.due }}”</text></view>
          </view>
          <view v-if="!items.length" class="card empty-state"><view class="empty-symbol"><Icon name="paper" :size="30" /></view><text class="empty-title">没有发现明确行动</text><text class="empty-description">这可能是一条介绍性通知。可以查看原文，也可以自行添加待办。</text></view>
          <button v-if="items.length < 5" class="add-candidate-button" @click="addCandidate"><Icon name="plus" :size="17" />手动补充一项</button>
        </view>
        <view class="review-aside">
          <view class="card original-card"><view class="section-heading"><text class="section-title">通知原文</text><Icon name="paper" :size="18" color="#9ba68d" /></view><text class="notice-original original-preview">{{ workflow.text }}</text><view v-if="workflow.model_id" class="model-note">{{ workflow.model_id }}<text v-if="workflow.request_id"> · {{ workflow.request_id.slice(0, 8) }}</text></view></view>
          <view v-if="workflow.warnings?.length" class="warnings-list"><view v-for="(warning, i) in workflow.warnings" :key="i" class="warning-row"><Icon name="info" :size="14" color="#9b9976" /><text>{{ warning }}</text></view></view>
          <view class="save-panel"><button class="confirmation-row" @click="confirmed = !confirmed"><view class="select-square" :class="{ selected: confirmed }"><Icon v-if="confirmed" name="check" :size="14" color="#fff" /></view><text>我已核对选中事项，愿意按当前信息保存。</text></button><view v-if="saveError" class="inline-message">{{ saveError }}</view><button class="primary-button full" :disabled="saving || !selectedCount || !confirmed" @click="save"><Icon name="check" :size="18" color="#fff" />{{ saving ? '正在保存…' : `保存 ${selectedCount} 项待办` }}</button><text class="privacy-note">保存在本机 · 不自动提交材料或代办事项</text></view>
        </view>
      </view>
    </template>
    <view v-if="sourceItem" class="modal-overlay" @click.self="sourceItem = null"><view class="modal-card"><view class="section-heading"><text class="modal-title">查看原文依据</text><button class="icon-button" aria-label="关闭原文" @click="sourceItem = null"><Icon name="close" /></button></view><text class="field-hint">高亮内容来自当前候选项的原文摘句，仍请核对其含义。</text><view class="source-highlight"><text v-for="(segment, i) in sourceSegments" :key="i" :class="{ highlighted: segment.hit }">{{ segment.text }}</text></view><text v-if="!sourceItem.evidence?.action" class="muted">这项内容由你手动添加，请自行核对。</text></view></view>
    <ConnectionPanel :visible="settingsOpen" @close="settingsOpen = false" />
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { onShow, onUnload } from '@dcloudio/uni-app';
import AppHeader from '../../components/AppHeader.vue';
import ConnectionPanel from '../../components/ConnectionPanel.vue';
import Icon from '../../components/Icon.vue';
import { repository, reportError } from '../../core/repository.js';
import { combineDue, dueParts, uid } from '../../core/dates.js';
import { manualCandidate } from '../../core/samples.js';
import { deepReadNotice } from '../../core/api.js';
import { requireAccountLogin } from '../../core/account.js';

const workflow = repository.state.workflow;
const items = ref((workflow?.items || []).map((item) => ({ ...item, ...dueParts(item), selected: true, location: item.location || '', materialText: (item.materials || []).join('、') })));
const confirmed = ref(false), saving = ref(false), saveError = ref(''), settingsOpen = ref(false), sourceItem = ref(null);
const deepRead = ref(workflow?.deep_read || null), deepBusy = ref(false), deepError = ref('');
let activeDeepRead, deepVersion = 0;
onMounted(() => { if (requireAccountLogin() && workflow?.mode === 'ai' && !deepRead.value) runDeepRead(); });
onShow(() => { requireAccountLogin(); });
onUnload(() => { deepVersion++; activeDeepRead?.cancel(); });
const selectedCount = computed(() => items.value.filter((item) => item.selected).length);
const modeLabel = computed(() => ({ ai: '真实 AI 解析', example: '预置示例', manual: '手动整理' }[workflow?.mode] || '待核对'));
function goBack() { uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/home/index' }) }); }
function addCandidate() { const item = manualCandidate(); item.id = `manual-${uid()}`; items.value.push({ ...item, ...dueParts(item), selected: true, location: '', materialText: '', origin_mode: 'manual' }); confirmed.value = false; }
function showSource(item) { sourceItem.value = item; }
async function runDeepRead() {
  if (deepBusy.value || !workflow?.text) return;
  const version = ++deepVersion;
  deepBusy.value = true; deepError.value = '';
  try {
    activeDeepRead = deepReadNotice(repository.state.connection, workflow.text, items.value.filter((item) => item.selected).map((item) => item.action.trim()).filter(Boolean));
    const result = await activeDeepRead.promise;
    if (version !== deepVersion) return;
    if (result.mode !== 'ai_deep_read' || !Array.isArray(result.steps) || !Array.isArray(result.questions) || !workflow.text.includes(result.summary_quote) || result.steps.some((step) => !workflow.text.includes(step.source_quote))) throw new Error('AI 深读未通过原文核对，请稍后重试');
    deepRead.value = result;
    repository.setWorkflow({ ...workflow, deep_read: result });
  } catch (error) { if (version === deepVersion) deepError.value = error.message || 'AI 深读暂时不可用'; }
  finally { if (version === deepVersion) { deepBusy.value = false; activeDeepRead = null; } }
}
const sourceSegments = computed(() => {
  const original = workflow?.text || '';
  const evidence = sourceItem.value?.evidence || {};
  const quotes = [evidence.action, evidence.due, evidence.location, ...(evidence.materials || [])].filter(Boolean);
  const marked = new Array(original.length).fill(false);
  for (const quote of quotes) {
    let start = original.indexOf(quote);
    while (start >= 0) { for (let i = start; i < start + quote.length; i++) marked[i] = true; start = original.indexOf(quote, start + quote.length); }
  }
  const segments = [];
  for (let i = 0; i < original.length; i++) {
    const previous = segments[segments.length - 1];
    if (previous && previous.hit === marked[i]) previous.text += original[i];
    else segments.push({ text: original[i], hit: marked[i] });
  }
  return segments;
});
function save() {
  if (saving.value || !confirmed.value) return;
  saving.value = true; saveError.value = '';
  try {
    const selected = items.value.filter((item) => item.selected).map((item, i) => {
      if (!item.action.trim()) throw new Error(`第${i + 1}项需要填写行动名称`);
      const materials = item.materialText.split(/[、，,]/).map((s) => s.trim()).filter(Boolean);
      if (materials.length > 10) throw new Error(`第${i + 1}项材料最多10项`);
      const { selected, date, time, materialText, ...data } = item;
      return { ...data, action: item.action.trim(), ...combineDue(date.trim(), time.trim()), materials, location: item.location.trim() || null, user_confirmed: true };
    });
    repository.saveTasks({ ...workflow, deep_read: deepRead.value }, selected);
    uni.showToast({ title: '已保存到本机', icon: 'success' });
    uni.reLaunch({ url: '/pages/tasks/index' });
  } catch (error) { saveError.value = error.message; reportError(error); }
  finally { saving.value = false; }
}
</script>

<style scoped lang="scss">
.review-intro { padding: 37px 0 27px; }
.deep-read { padding: 25px; margin-bottom: 24px; background: linear-gradient(145deg, #fdfefa, #edf4e9); border-color: #d6e5d3; }
.deep-title { display: block; font-size: 22px; font-weight: 650; margin-top: 6px; }
.deep-intro { display: block; color: #7b8f7b; font-size: 11px; line-height: 1.7; margin-top: 8px; }
.deep-status, .deep-fallback { display: flex; align-items: center; gap: 9px; color: #638064; font-size: 12px; padding: 22px 0 5px; }
.deep-fallback { justify-content: space-between; }
.deep-content { margin-top: 19px; }
.deep-summary { background: #fffefa; border: 1px solid #e4ecdf; border-radius: 14px; padding: 15px 17px; }
.deep-label { display: block; color: #6c8b69; font-size: 10px; font-weight: 650; letter-spacing: .7px; }
.deep-summary-text { display: block; font-size: 14px; font-weight: 600; line-height: 1.7; margin: 7px 0; }
.deep-quote { display: block; font-size: 10px; color: #8ea087; line-height: 1.6; margin-top: 4px; }
.deep-steps-label { margin: 19px 0 9px; }
.deep-step { display: flex; gap: 14px; background: #fffefa; border: 1px solid #e4ecdf; border-radius: 13px; padding: 13px 15px; margin-top: 7px; }
.deep-number { font-size: 17px; font-weight: 650; color: #a8bca0; }
.deep-step-title { display: block; color: #315341; font-size: 12px; font-weight: 600; line-height: 1.65; }
.deep-step-why { display: block; font-size: 11px; color: #788c78; line-height: 1.7; margin-top: 3px; }
.deep-questions { margin-top: 17px; }
.deep-question { background: #fbf5e9; border-radius: 10px; padding: 11px 13px; margin-top: 7px; color: #8b6d43; font-size: 11px; }
.deep-boundary { display: block; color: #8a9b83; font-size: 10px; line-height: 1.7; margin-top: 16px; }
.review-subtitle { display: block; color: #87927e; font-size: 12px; margin-top: 13px; line-height: 1.8; }
.review-layout { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr); gap: 25px; align-items: start; }
.candidate-card { padding: 25px; margin-bottom: 17px; transition: opacity .15s; }
.not-selected { opacity: .6; }
.candidate-title-row { display: flex; align-items: center; gap: 10px; }
.select-square { width: 21px; height: 21px; border: 1px solid #ccd5c2; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: #fff; }
.select-square.selected { background: #214b40; border-color: #214b40; }
.candidate-number { color: #8b9b7a; font-size: 11px; letter-spacing: 1px; }
.evidence-button { display: flex; align-items: center; gap: 5px; color: #8b9b7a; font-size: 11px; }
.date-fields { display: grid; grid-template-columns: 1.35fr 1fr; gap: 12px; }
.extra-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.review-reasons { background: #faf4e8; border-radius: 10px; padding: 13px 15px; margin-top: 19px; }
.reason-heading { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: #a58555; margin-bottom: 6px; }
.reason-text { font-size: 11px; display: block; line-height: 1.9; color: #ab9670; }
.evidence-quote { border-top: 1px solid #edf0e5; margin-top: 20px; padding-top: 15px; }
.evidence-label { display: block; color: #a1ad92; font-size: 9px; margin-bottom: 7px; }
.evidence-text { display: block; color: #829173; font-size: 11px; line-height: 1.8; }
.evidence-time { display: block; color: #9da78d; font-size: 10px; margin-top: 5px; line-height: 1.8; }
.original-card { padding: 25px; }
.original-card .section-title { font-size: 15px; }
.original-preview { padding-top: 20px; font-size: 12px; line-height: 2; }
.model-note { font-size: 9px; color: #a5af9a; padding-top: 15px; margin-top: 17px; border-top: 1px solid #e9edde; }
.warnings-list { padding: 14px 4px; }
.warning-row { display: flex; gap: 7px; color: #9b9976; line-height: 1.85; font-size: 11px; margin-bottom: 8px; }
.save-panel { margin-top: 15px; }
.confirmation-row { display: flex; gap: 9px; align-items: flex-start; color: #87947a; font-size: 11px; text-align: left; line-height: 1.8; margin-bottom: 17px; }
.confirmation-row .select-square { width: 19px; height: 19px; }
.add-candidate-button { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 16px; color: #7d8e6d; width: 100%; border: 1px dashed #d3ddc7; border-radius: 13px; font-size: 12px; }
.source-highlight { margin: 22px 0; color: #61765f; font-size: 13px; white-space: pre-wrap; line-height: 2.2; }
.highlighted { background: #e4ebca; color: #35522f; border-radius: 3px; }
.mobile-back { display: none; }
@media (max-width: 700px) { .review-intro { padding-top: 22px; } .review-intro .page-title { font-size: 24px; } .review-intro .section-heading { align-items: flex-end; } .deep-read { padding: 18px; } .deep-title { font-size: 19px; } .review-layout { display: flex; flex-direction: column; gap: 15px; } .candidate-list, .review-aside { width: 100%; } .candidate-card { padding: 21px 18px; } .mobile-back { display: flex; margin-bottom: 19px; } .extra-fields { grid-template-columns: 1fr; gap: 0; } .original-card { padding: 21px; } .save-panel { padding-bottom: 15px; } .review-intro .tag { font-size: 9px; flex-shrink: 0; } }
</style>
