<template>
  <view class="app-shell">
    <AppHeader @settings="settingsOpen = true" />
    <view class="tasks-intro"><view><text class="eyebrow">ONE THING AT A TIME</text><text class="page-title">我的待办</text><text class="tasks-subtitle">{{ pendingCount ? `还有 ${pendingCount} 件事待完成，按自己的节奏来。` : '把需要记住的事，留在这里。' }}</text></view><button class="primary-button new-task-button" @click="goHome"><Icon name="plus" color="#fff" :size="17" />整理新通知</button></view>
    <view v-if="repository.warning" class="inline-message">{{ repository.warning }}</view>
    <view class="tasks-summary"><view class="summary-item"><view class="summary-icon"><Icon name="tasks" :size="19" /></view><view><text class="summary-number">{{ pendingCount }}</text><text class="summary-label">待完成</text></view></view><view class="summary-item"><view class="summary-icon amber"><Icon name="clock" :size="19" color="#bc8c53" /></view><view><text class="summary-number">{{ soonCount }}</text><text class="summary-label">24 小时内</text></view></view><view class="summary-item"><view class="summary-icon light"><Icon name="check" :size="19" color="#92a17e" /></view><view><text class="summary-number">{{ doneCount }}</text><text class="summary-label">已完成</text></view></view><view class="summary-local"><Icon name="shield" :size="16" color="#9fa992" /><text>本机保存<br />离线可用</text></view></view>
    <view class="list-toolbar"><view class="filter-group"><button v-for="tab in filters" :key="tab.id" :class="['filter-button', { active: filter === tab.id }]" @click="filter = tab.id">{{ tab.label }}<text v-if="tab.id === 'all'" class="filter-total">{{ appState.tasks.length }}</text></button></view><view class="backup-actions"><button class="text-button" @click="openExport"><Icon name="download" :size="15" />备份</button><button class="text-button" @click="openImport"><Icon name="upload" :size="15" />恢复</button></view></view>
    <view v-if="!filteredTasks.length" class="card empty-state"><view class="empty-symbol"><Icon name="tasks" :size="31" /></view><text class="empty-title">{{ filter === 'done' ? '完成的事，会出现在这里' : filter === 'soon' ? '暂时没有24小时内的任务' : filter === 'pending' ? '当前没有待完成的事项' : '清单还是空的' }}</text><text class="empty-description">{{ filter === 'all' ? '从一条课程、竞赛或办事通知开始，核对后就能保存到这里。' : '可以切换筛选，查看其他待办。' }}</text><button v-if="filter === 'all'" class="primary-button" @click="goHome">整理第一条通知<Icon name="arrow" :size="17" color="#fff" /></button></view>
    <view v-else class="task-list">
      <view v-for="task in filteredTasks" :key="task.id" class="card task-card" :class="{ completed: task.status === 'done' }">
        <button class="task-check" :class="{ checked: task.status === 'done' }" :aria-label="`${task.status === 'done' ? '撤销完成' : '完成'} ${task.title}`" @click="toggle(task)"><Icon v-if="task.status === 'done'" name="check" :size="16" color="#fff" /></button>
        <view class="task-content"><view class="task-topline"><text class="task-title">{{ task.title }}</text><text :class="['state-tag', taskStatus(task).className]">{{ taskStatus(task).label }}</text></view><view class="task-meta"><view class="meta-item"><Icon name="calendar" :size="13" color="#9da88f" /><text>{{ formatDue(task) }}</text></view><view v-if="task.location" class="meta-item"><Icon name="location" :size="13" color="#9da88f" /><text>{{ task.location }}</text></view></view><view v-if="task.materials?.length" class="task-materials"><text v-for="(material, index) in task.materials" :key="index">{{ material }}</text></view><view class="task-bottom"><text class="source-label">{{ originLabel(task) }} · 本机已保存</text><view class="task-actions"><button class="text-button" @click="viewSource(task)"><Icon name="link" :size="13" />来源</button><button class="text-button" @click="edit(task)"><Icon name="edit" :size="13" />编辑</button><button class="icon-button delete-button" :aria-label="`删除 ${task.title}`" @click="remove(task)"><Icon name="trash" :size="14" color="#b1b8a5" /></button></view></view></view>
      </view>
    </view>
    <text class="list-note">临期状态在打开应用时更新，不提供后台推送。卸载或清理应用数据前，请先导出备份。</text>
    <AppNav active="tasks" :count="pendingCount" />
    <ConnectionPanel :visible="settingsOpen" @close="settingsOpen = false" />
    <view v-if="editing" class="modal-overlay" @click.self="editing = null"><view class="modal-card"><view class="section-heading"><text class="modal-title">编辑待办</text><button class="icon-button" aria-label="关闭编辑" @click="editing = null"><Icon name="close" /></button></view><text class="field-label">事项名称</text><input v-model="editing.title" class="field-input" :maxlength="60" placeholder="填写事项名称" /><view class="edit-date-row"><view><text class="field-label">截止日期</text><input v-model="editing.date" class="field-input" placeholder="YYYY-MM-DD" :maxlength="10" /></view><view><text class="field-label">具体时刻</text><input v-model="editing.time" class="field-input" placeholder="HH:mm" :maxlength="5" /></view></view><text class="field-hint">日期与时刻均可留空。只有日期时，会标记为时刻待确认。</text><text class="field-label">地点或渠道</text><input v-model="editing.location" class="field-input" :maxlength="100" placeholder="可留空" /><text class="field-label">准备材料</text><input v-model="editing.materialText" class="field-input" :maxlength="500" placeholder="用顿号分隔" /><view v-if="editError" class="inline-message">{{ editError }}</view><button class="primary-button full" @click="saveEdit">保存修改</button></view></view>
    <view v-if="sourceNotice" class="modal-overlay" @click.self="sourceNotice = null"><view class="modal-card"><view class="section-heading"><text class="modal-title">通知来源</text><button class="icon-button" aria-label="关闭通知来源" @click="sourceNotice = null"><Icon name="close" /></button></view><text class="tag source-mode" :class="{ example: sourceNotice.mode === 'example' }">{{ { example: '预置示例', manual: '手动整理', ai: 'AI 解析后核对' }[sourceNotice.mode] }}</text><text class="notice-original">{{ sourceNotice.text }}</text><view v-if="sourceNotice.deep_read" class="saved-deep"><text class="section-title">AI 深读建议</text><text class="saved-summary">{{ sourceNotice.deep_read.summary }}</text><view v-for="(step, i) in sourceNotice.deep_read.steps" :key="i" class="saved-step"><text>{{ i + 1 }}. {{ step.instruction }}</text><text class="saved-quote">依据：“{{ step.source_quote }}”</text></view><text class="saved-boundary">以上为 AI 建议，请以原文为准。</text></view></view></view>
    <view v-if="backupMode" class="modal-overlay" @click.self="backupMode = ''"><view class="modal-card backup-modal"><view class="section-heading"><text class="modal-title">{{ backupMode === 'export' ? '导出本地备份' : '从备份恢复' }}</text><button class="icon-button" aria-label="关闭备份窗口" @click="backupMode = ''"><Icon name="close" /></button></view><text class="description muted">{{ backupMode === 'export' ? (repository.locked ? '当前为原始恢复数据，可能包含连接配置。请妥善保管，不要公开分享。' : '备份包含通知和待办，不包含连接令牌。请妥善保管这些内容。') : '粘贴此前导出的知行备份。恢复会替换当前任务，建议先备份当前数据。' }}</text><textarea v-model="backupText" class="backup-textarea" :disabled="backupMode === 'export'" :maxlength="2000000" placeholder="在此粘贴完整 JSON 备份" /><view v-if="backupError" class="inline-message">{{ backupError }}</view><button class="primary-button full" @click="backupMode === 'export' ? copyBackup() : restore()"><Icon :name="backupMode === 'export' ? 'download' : 'upload'" :size="17" color="#fff" />{{ backupMode === 'export' ? '复制备份内容' : '校验并恢复' }}</button></view></view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShow, onHide } from '@dcloudio/uni-app';
import AppHeader from '../../components/AppHeader.vue';
import AppNav from '../../components/AppNav.vue';
import ConnectionPanel from '../../components/ConnectionPanel.vue';
import Icon from '../../components/Icon.vue';
import { appState, repository, reportError } from '../../core/repository.js';
import { combineDue, dueParts, dueState, formatDue } from '../../core/dates.js';

const filter = ref('all'), settingsOpen = ref(false), now = ref(Date.now());
const editing = ref(null), editError = ref(''), sourceNotice = ref(null), backupMode = ref(''), backupText = ref(''), backupError = ref('');
const filters = [{ id: 'all', label: '全部' }, { id: 'pending', label: '待完成' }, { id: 'soon', label: '临期' }, { id: 'done', label: '已完成' }];
const pendingCount = computed(() => appState.tasks.filter((t) => t.status !== 'done').length);
const doneCount = computed(() => appState.tasks.filter((t) => t.status === 'done').length);
const soonCount = computed(() => appState.tasks.filter((t) => taskStatus(t).className === 'soon').length);
function taskStatus(task) { return dueState(task, now.value); }
const filteredTasks = computed(() => appState.tasks.filter((task) => filter.value === 'all' || (filter.value === 'pending' && task.status === 'pending') || (filter.value === 'done' && task.status === 'done') || (filter.value === 'soon' && taskStatus(task).className === 'soon')).sort((a, b) => {
  if (a.status !== b.status) return a.status === 'done' ? 1 : -1;
  return (a.due_at || a.due_date || '9999').localeCompare(b.due_at || b.due_date || '9999');
}));
let timer;
onShow(() => { now.value = Date.now(); clearInterval(timer); timer = setInterval(() => { now.value = Date.now(); }, 60000); });
onHide(() => clearInterval(timer));
function originLabel(task) { return { ai: 'AI 解析后核对', example: '预置示例', manual: '手动整理' }[task.origin_mode] || '本地事项'; }
function goHome() { uni.reLaunch({ url: '/pages/home/index' }); }
function toggle(task) { try { repository.updateTask(task.id, { status: task.status === 'done' ? 'pending' : 'done' }); } catch (e) { reportError(e); } }
function viewSource(task) { sourceNotice.value = appState.notices.find((n) => n.id === task.notice_id); }
function edit(task) { editing.value = { ...task, ...dueParts(task), location: task.location || '', materialText: (task.materials || []).join('、') }; editError.value = ''; }
function saveEdit() {
  try {
    const data = editing.value;
    if (!data.title.trim()) throw new Error('请填写事项名称');
    const materials = data.materialText.split(/[、，,]/).map((s) => s.trim()).filter(Boolean);
    if (materials.length > 10) throw new Error('准备材料最多10项');
    repository.updateTask(data.id, { title: data.title.trim(), ...combineDue(data.date.trim(), data.time.trim()), location: data.location.trim() || null, materials });
    editing.value = null; uni.showToast({ title: '已保存修改', icon: 'success' });
  } catch (error) { editError.value = error.message; }
}
function remove(task) { uni.showModal({ title: '删除这条待办？', content: task.title, confirmText: '删除', confirmColor: '#a16646', success: (result) => { if (result.confirm) { try { repository.deleteTask(task.id); } catch (e) { reportError(e); } } } }); }
function openExport() { try { backupText.value = repository.locked ? repository.exportRaw() : repository.exportBackup(); backupMode.value = 'export'; backupError.value = ''; } catch (e) { reportError(e); } }
function openImport() { backupMode.value = 'import'; backupText.value = ''; backupError.value = ''; }
function copyBackup() { uni.setClipboardData({ data: backupText.value, success: () => uni.showToast({ title: '备份已复制', icon: 'success' }), fail: () => { backupError.value = '复制失败，请选中备份文本手动复制'; } }); }
function restore() {
  uni.showModal({ title: '替换当前本地数据？', content: '备份将先校验，通过后替换当前通知与待办。连接配置会保留。', confirmText: '校验并恢复', success(result) {
    if (!result.confirm) return;
    try { repository.restoreBackup(backupText.value); backupMode.value = ''; uni.showToast({ title: '已恢复备份', icon: 'success' }); }
    catch (error) { backupError.value = error.message || '备份格式不正确'; }
  } });
}
</script>

<style scoped lang="scss">
.tasks-intro { display: flex; justify-content: space-between; align-items: center; padding: 38px 0 29px; gap: 20px; }
.tasks-subtitle { display: block; color: #8e9a82; font-size: 12px; margin-top: 12px; }
.new-task-button { min-height: 43px; font-size: 12px; padding: 11px 18px; }
.tasks-summary { display: flex; align-items: center; gap: 55px; padding: 26px 32px; background: #edf0e3; border: 1px solid #e2e8d7; border-radius: 19px; }
.summary-item { display: flex; align-items: center; gap: 14px; }
.summary-icon { display: flex; padding: 11px; border-radius: 12px; background: #dfe8cd; }
.summary-icon.amber { background: #f3e8d4; }
.summary-icon.light { background: #e4e9da; }
.summary-number { display: block; font-size: 25px; font-weight: 600; line-height: 1.2; }
.summary-label { display: block; color: #8b9a7b; font-size: 10px; margin-top: 4px; }
.summary-local { margin-left: auto; display: flex; gap: 9px; color: #9aa68c; font-size: 10px; line-height: 1.9; align-items: center; }
.list-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin: 28px 0 19px; }
.filter-group { display: flex; gap: 6px; }
.filter-button { padding: 9px 17px; color: #93a186; font-size: 12px; border-radius: 9px; display: flex; align-items: center; gap: 6px; }
.filter-button.active { background: #e4ebd9; color: #47643b; font-weight: 600; }
.filter-total { background: #d6e1c4; color: #6e8956; font-size: 9px; border-radius: 4px; padding: 0 5px; }
.backup-actions { display: flex; gap: 20px; }
.backup-actions .text-button { color: #94a285; font-size: 11px; }
.task-list { display: grid; grid-template-columns: 1fr 1fr; gap: 17px; }
.task-card { display: flex; align-items: flex-start; padding: 24px; gap: 14px; }
.task-check { display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1.5px solid #cbd6bf; width: 23px; height: 23px; border-radius: 7px; margin-top: 2px; }
.task-check.checked { background: #8eaa79; border-color: #8eaa79; }
.task-content { flex: 1; min-width: 0; }
.task-topline { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.task-title { font-size: 15px; font-weight: 550; line-height: 1.6; overflow-wrap: anywhere; }
.completed .task-title { text-decoration: line-through; color: #96a38b; }
.completed { background: #fafbf5; }
.state-tag { flex-shrink: 0; font-size: 9px; color: #8a9e75; background: #edf2e3; padding: 4px 7px; border-radius: 5px; margin-top: 3px; }
.state-tag.soon { background: #f8eedb; color: #b98e4d; }
.state-tag.overdue { background: #fbebe1; color: #b58464; }
.state-tag.undated { background: #f0f0e6; color: #a0a083; }
.state-tag.done { background: #edf3e7; color: #8eac78; }
.task-meta { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-top: 13px; }
.meta-item { display: flex; align-items: center; gap: 5px; font-size: 10px; color: #92a081; }
.task-materials { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 12px; }
.task-materials text { background: #f4f6ef; color: #9ba78d; padding: 4px 7px; border-radius: 4px; font-size: 9px; }
.task-bottom { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #edf0e5; margin-top: 17px; padding-top: 10px; gap: 6px; }
.task-actions { display: flex; align-items: center; gap: 12px; }
.task-actions .text-button { font-size: 10px; color: #9ca98e; gap: 4px; }
.delete-button { width: 23px; height: 23px; }
.list-note { display: block; text-align: center; color: #a6b097; font-size: 10px; line-height: 1.9; padding: 25px 0; }
.edit-date-row { display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px; }
.source-mode { margin: 20px 0 16px; }
.saved-deep { border-top: 1px solid #e8ecdf; margin-top: 21px; padding-top: 18px; }
.saved-deep .section-title { font-size: 15px; }
.saved-summary { display: block; margin: 11px 0; color: #506752; font-size: 12px; line-height: 1.7; }
.saved-step { display: block; padding: 8px 0; font-size: 11px; color: #45654b; line-height: 1.7; }
.saved-quote, .saved-boundary { display: block; color: #91a084; font-size: 10px; line-height: 1.7; margin-top: 3px; }
.backup-textarea { padding: 14px; border: 1px solid #e1e7d7; border-radius: 11px; width: 100%; height: 200px; font-family: monospace; font-size: 10px; line-height: 1.7; background: #f8faf3; color: #6d805d; }
@media (max-width: 900px) { .task-list { grid-template-columns: 1fr; } .tasks-summary { gap: 35px; } }
@media (max-width: 700px) { .tasks-intro { padding-top: 28px; } .new-task-button { padding: 10px 12px; font-size: 11px; min-height: 40px; border-radius: 10px; } .tasks-subtitle { font-size: 10px; line-height: 1.8; max-width: 185px; } .tasks-summary { padding: 21px 18px; gap: 0; justify-content: space-between; } .summary-item { gap: 8px; } .summary-icon { padding: 8px; border-radius: 10px; } .summary-number { font-size: 22px; } .summary-label { font-size: 9px; } .summary-local { display: none; } .list-toolbar { flex-wrap: wrap; gap: 15px; } .filter-button { padding: 8px 12px; font-size: 11px; } .backup-actions { gap: 14px; margin-left: auto; } .backup-actions .text-button { font-size: 10px; } .task-card { padding: 21px 17px; gap: 11px; border-radius: 17px; } .task-title { font-size: 14px; } .task-bottom .source-label { font-size: 9px; } .task-actions { gap: 9px; } }
</style>
