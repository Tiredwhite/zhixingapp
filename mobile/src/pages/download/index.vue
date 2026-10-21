<template>
  <!-- #ifdef H5 -->
  <view class="app-shell download-shell">
    <AppHeader />
    <view class="download-back"><button class="text-button" @click="goBack"><Icon name="back" :size="16" />返回</button><text class="small-label">知行 Android App</text></view>
    <view class="download-hero">
      <view class="download-brand"><view class="brand-symbol">知</view><text>知行</text><text class="release-tag">Android {{ APP_VERSION }}</text></view>
      <text class="download-title">看懂通知，<text>安排下一步。</text></text>
      <text class="download-copy">面向校园生活的 AI 通知助手。把零散通知变成有依据的行动建议，再由你核对和保存。</text>
      <button class="primary-button download-cta" @click="downloadApk"><Icon name="download" color="#fff" :size="18" />下载 Android 安装包</button>
      <text class="download-address">下载地址：tiredwhite.cn/downloads/zhixing-{{ APP_VERSION }}.apk</text>
      <view class="hero-orbit orbit-one" /><view class="hero-orbit orbit-two" />
    </view>
    <view class="download-features">
      <view class="feature-card"><view class="feature-number">01</view><Icon name="spark" :size="22" /><text class="feature-title">AI 深读，不止摘关键句</text><text class="feature-copy">梳理办理步骤、解释理由、引用原文，并指出通知里还没说清的问题。</text></view>
      <view class="feature-card"><view class="feature-number">02</view><Icon name="paper" :size="22" /><text class="feature-title">粘贴或导入文档</text><text class="feature-copy">从 Word .doc、.docx 或 PDF 提取通知内容；扫描版 PDF 会尝试中文 OCR 识别，再交给 AI 整理。</text></view>
      <view class="feature-card"><view class="feature-number">03</view><Icon name="calendar" :size="22" /><text class="feature-title">待办可加入手机日历</text><text class="feature-copy">为截止事项生成系统日历日程和提醒；待办本地保存，断网也能管理。</text></view>
    </view>
    <view class="download-howto"><view><text class="eyebrow">GET STARTED</text><text class="section-title">三步开始使用</text></view><view class="steps"><view><text>1</text><text>下载并安装 Android APK</text></view><view><text>2</text><text>在“个人中心”配置知行服务器</text></view><view><text>3</text><text>粘贴通知或导入文件，开始整理</text></view></view></view>
    <view class="download-note"><Icon name="shield" :size="17" color="#708866" /><text>AI 整理前会将你提交的通知文本发送到配置的 AI 服务。保存的待办和昵称留在手机本地。扫描版 PDF 每次最多 OCR 识别 10 页；更多页可拆分导入，识别效果受图片清晰度影响。</text></view>
    <view class="download-footer"><text>知行 · 校园通知助手</text><text>Android {{ APP_VERSION }}</text></view>
  </view>
  <!-- #endif -->
  <!-- #ifdef APP-PLUS -->
  <view class="app-shell" />
  <!-- #endif -->
</template>

<script setup>
import AppHeader from '../../components/AppHeader.vue';
import Icon from '../../components/Icon.vue';
import { APP_VERSION, APK_URL } from '../../core/release.js';

function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) uni.navigateBack();
  else uni.reLaunch({ url: '/pages/home/index' });
}
function downloadApk() {
  // #ifdef APP-PLUS
  plus.runtime.openURL(APK_URL, (error) => { if (error) uni.showToast({ title: '无法打开下载链接，请在浏览器访问 tiredwhite.cn', icon: 'none' }); });
  // #endif
  // #ifdef H5
  window.location.href = APK_URL;
  // #endif
}
</script>

<style scoped lang="scss">
.download-back { display: flex; justify-content: space-between; align-items: center; padding: 19px 2px 15px; }
.download-back .text-button { color: #84917f; }
.download-hero { position: relative; overflow: hidden; padding: 48px 54px 42px; border-radius: 26px; background: #173e35; color: #fffefa; }
.download-brand { display: flex; align-items: center; gap: 11px; font-size: 16px; font-weight: 600; letter-spacing: 1px; }
.download-brand .brand-symbol { background: #dfe8ce; color: #35533d; }
.release-tag { margin-left: 3px; padding: 5px 9px; border-radius: 6px; background: #ffffff19; color: #d0deca; font-size: 9px; letter-spacing: 0; }
.download-title { position: relative; z-index: 1; display: block; margin-top: 34px; font-size: 43px; font-weight: 650; letter-spacing: -1.7px; line-height: 1.35; }
.download-title text { color: #c7d6b0; }
.download-copy { position: relative; z-index: 1; display: block; max-width: 540px; margin-top: 12px; color: #d0d9cf; font-size: 13px; line-height: 1.9; }
.download-cta { position: relative; z-index: 1; margin-top: 28px; width: fit-content; background: #dce7c8; color: #274a36; }
.download-cta:hover { background: #eef4df; }
.download-cta :deep(image) { filter: brightness(.4); }
.download-address { position: relative; z-index: 1; display: block; margin-top: 12px; color: #a9b9aa; font-size: 10px; }
.hero-orbit { position: absolute; border: 1px solid #ffffff17; border-radius: 50%; pointer-events: none; }
.orbit-one { right: -100px; top: -250px; width: 550px; height: 550px; }
.orbit-two { right: -45px; top: -195px; width: 440px; height: 440px; }
.download-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 13px; margin-top: 18px; }
.feature-card { position: relative; display: flex; flex-direction: column; align-items: flex-start; min-height: 190px; padding: 22px; background: #fffefa; border: 1px solid #e3e6de; border-radius: 18px; color: #738763; }
.feature-number { align-self: flex-end; color: #b0b9a3; font-size: 9px; letter-spacing: 1px; }
.feature-title { margin-top: 18px; color: #24493a; font-size: 13px; font-weight: 600; }
.feature-copy { margin-top: 9px; color: #879183; font-size: 10px; line-height: 1.8; }
.download-howto { display: flex; justify-content: space-between; align-items: center; gap: 30px; margin-top: 20px; padding: 25px 28px; border-radius: 18px; background: #edf0e2; }
.download-howto .section-title { display: block; margin-top: 9px; }
.steps { display: flex; gap: 17px; }
.steps view { display: flex; align-items: center; gap: 8px; max-width: 180px; color: #66745f; font-size: 10px; line-height: 1.7; }
.steps view text:first-child { display: flex; flex: 0 0 23px; align-items: center; justify-content: center; height: 23px; border-radius: 50%; background: #d8e2c9; color: #557047; }
.download-note { display: flex; align-items: flex-start; gap: 9px; margin-top: 16px; padding: 14px 17px; border: 1px solid #e5eadd; border-radius: 13px; color: #879183; font-size: 10px; line-height: 1.8; }
.download-footer { display: flex; justify-content: space-between; margin-top: 18px; padding: 16px 0 10px; border-top: 1px solid #e5e9dd; color: #a2ac97; font-size: 10px; }
@media (max-width: 850px) { .download-howto { align-items: flex-start; flex-direction: column; gap: 18px; } .steps { width: 100%; justify-content: space-between; } }
@media (max-width: 700px) { .download-back { padding-top: 14px; } .download-hero { padding: 31px 23px; border-radius: 21px; } .download-title { margin-top: 26px; font-size: 32px; letter-spacing: -1px; } .download-copy { font-size: 11px; } .download-cta { width: 100%; } .download-address { font-size: 9px; overflow-wrap: anywhere; } .download-features { grid-template-columns: 1fr; gap: 9px; } .feature-card { min-height: 0; padding: 19px; } .feature-title { margin-top: 10px; } .download-howto { padding: 21px; } .steps { flex-direction: column; } .steps view { max-width: none; } }
</style>
