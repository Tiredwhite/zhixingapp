import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const project = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(project, "svg_output");
const C = {
  bg: "#F7FAFC",
  panel: "#EAF1F5",
  navy: "#12344D",
  teal: "#13A89E",
  amber: "#F2B451",
  ink: "#18232C",
  muted: "#607789",
  rule: "#D5E1E8",
  white: "#FFFFFF",
};
const FONT = "Microsoft YaHei, Arial, sans-serif";

function esc(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function txt(x, y, value, size = 24, fill = C.ink, weight = "normal", anchor = "start", leading = Math.round(size * 1.38)) {
  const rows = Array.isArray(value) ? value : [value];
  const spans = rows.map((row, i) =>
    '<tspan x="' + x + '"' + (i ? ' dy="' + leading + '"' : "") + ">" + esc(row) + "</tspan>"
  ).join("");
  return '<text x="' + x + '" y="' + y + '" fill="' + fill + '" font-size="' + size +
    '" font-weight="' + weight + '" text-anchor="' + anchor + '">' + spans + "</text>";
}
function rect(x, y, w, h, fill = "none", stroke = "none", sw = 0, rx = 0, id = "") {
  return '<rect' + (id ? ' id="' + id + '"' : "") + ' x="' + x + '" y="' + y +
    '" width="' + w + '" height="' + h + '" rx="' + rx + '" fill="' + fill +
    '" stroke="' + stroke + '"' + (sw ? ' stroke-width="' + sw + '"' : "") + "/>";
}
function rule(x1, y1, x2, y2, color = C.rule, width = 1) {
  return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
    '" stroke="' + color + '" stroke-width="' + width + '"/>';
}
function circle(cx, cy, r, fill, stroke = "none", sw = 0) {
  return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill +
    '" stroke="' + stroke + '"' + (sw ? ' stroke-width="' + sw + '"' : "") + "/>";
}
function ico(name, x, y, size = 32, color = C.teal) {
  return '<use data-icon="tabler-outline/' + name + '" x="' + x + '" y="' + y +
    '" width="' + size + '" height="' + size + '" fill="' + color + '" stroke-width="2"/>';
}
function img(name, x, y, w, h) {
  return '<image href="../images/' + name + '" x="' + x + '" y="' + y + '" width="' + w +
    '" height="' + h + '" preserveAspectRatio="xMidYMid meet"/>';
}
function base(role, content, pageNo, cover = false) {
  const bg = '<rect id="background" data-pptx-role="background" x="0" y="0" width="1280" height="720" fill="' + C.bg + '"/>';
  const footer = cover ? "" :
    rule(72, 667, 1208, 667) +
    txt(72, 697, "知行 · 智能移动应用开发项目实践", 18, C.muted) +
    txt(1208, 697, String(pageNo).padStart(2, "0") + " / 11", 18, C.muted, "normal", "end");
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" data-pptx-page-role="' +
    role + '" font-family="' + FONT + '">' + bg + content + footer + "</svg>\n";
}
function head(section, title, pageNo, twoLines = false) {
  return txt(72, 44, section.toUpperCase(), 18, C.teal, "bold") +
    txt(1208, 44, String(pageNo).padStart(2, "0"), 18, C.muted, "normal", "end") +
    txt(72, 112, title, 42, C.navy, "bold", "start", 54) +
    rule(72, twoLines ? 172 : 148, 1208, twoLines ? 172 : 148);
}

const slides = [];

// P01 · Cover
{
  let s = "";
  s += txt(80, 62, "智能移动应用开发项目实践 · 课程答辩", 18, C.muted, "bold");
  s += txt(1200, 62, "ANDROID 0.3.8", 18, C.teal, "bold", "end");
  s += rule(80, 92, 1200, 92);
  s += txt(80, 226, "知行", 68, C.navy, "bold");
  s += txt(80, 282, "校园通知 AI 助手", 32, C.teal, "bold");
  s += txt(80, 396, ["让通知里的下一步", "有据可查"], 48, C.navy, "bold", "start", 62);
  s += txt(80, 528, ["AI提出候选行动与办理建议，", "学生核对后再保存。"], 24, C.ink, "normal", "start", 36);
  s += rule(80, 600, 580, 600, C.teal, 3);
  s += txt(80, 637, "真实界面 · 真实模型调用 · 明确验证边界", 18, C.muted);
  s += rule(830, 220, 830, 542, C.rule, 2);
  const steps = [
    { y: 244, n: "01", i: "file-text", title: "校园通知", note: "粘贴或导入" },
    { y: 372, n: "02", i: "sparkles", title: "AI建议", note: "深读并给出出处" },
    { y: 500, n: "03", i: "user-check", title: "学生确认", note: "核对后保存" },
  ];
  for (const st of steps) {
    s += circle(830, st.y, 22, C.bg, C.teal, 2);
    s += txt(830, st.y + 6, st.n, 18, C.teal, "bold", "middle");
    s += ico(st.i, 880, st.y - 22, 32, C.teal);
    s += txt(928, st.y - 3, st.title, 24, C.navy, "bold");
    s += txt(928, st.y + 28, st.note, 18, C.muted);
  }
  s += txt(80, 690, "版本 0.3.8 · 2026", 18, C.muted);
  slides.push(["slide_01_cover.svg", base("cover", s, 1, true)]);
}

// P02 · Problem and scenario
{
  let s = head("01 / 问题定义", "一条通知里，行动信息常常分散", 2);
  s += txt(88, 190, "课程演示用合成通知", 18, C.amber, "bold");
  s += rect(88, 215, 1104, 106, C.white, C.rule, 1, 8);
  s += rect(88, 215, 5, 106, C.teal);
  s += txt(120, 257, ["请于2026年10月23日18:00前提交课程项目书PDF至教学平台。", "另请参加项目答疑，具体时间另行通知。"], 24, C.ink, "normal", "start", 36);
  s += rule(88, 365, 1192, 365);
  s += ico("file-text", 94, 395, 34, C.teal);
  s += txt(148, 414, "要做什么", 18, C.muted, "bold");
  s += txt(148, 454, "提交项目书 PDF", 24, C.navy, "bold");
  s += ico("calendar-plus", 662, 395, 34, C.teal);
  s += txt(714, 414, "何时完成", 18, C.muted, "bold");
  s += txt(714, 454, "10月23日 18:00", 24, C.navy, "bold");
  s += rule(88, 495, 1192, 495);
  s += ico("checklist", 94, 522, 34, C.teal);
  s += txt(148, 542, "交到哪里", 18, C.muted, "bold");
  s += txt(148, 582, "教学平台", 24, C.navy, "bold");
  s += ico("alert-triangle", 662, 522, 34, C.amber);
  s += txt(714, 542, "尚未说明", 18, C.muted, "bold");
  s += txt(714, 582, "答疑时间待确认", 24, C.ink, "bold");
  s += txt(88, 631, "H5首页展示粘贴和文档入口；示例内容仍由用户核对。", 18, C.muted);
  s += rect(1048, 158, 124, 500, C.white, C.rule, 1, 5);
  s += img("home-current.png", 1050, 160, 120, 496);
  slides.push(["slide_02_problem.svg", base("content", s, 2)]);
}

// P03 · Product loop
{
  let s = head("02 / 产品闭环", "知行把模型建议交给学生核验", 3);
  s += txt(88, 196, "AI提出候选行动；用户确认后才进入本机待办。", 24, C.ink);
  const nodes = [
    { x: 98, i: "file-text", title: "输入通知", note: ["粘贴文本", "或导入文档"] },
    { x: 320, i: "sparkles", title: "AI解析", note: ["提取行动", "生成深读建议"] },
    { x: 542, i: "quote", title: "原文核验", note: ["查看摘句", "修改候选字段"] },
    { x: 764, i: "user-check", title: "人工确认", note: ["勾选并保存", "用户作最终决定"] },
    { x: 986, i: "checklist", title: "本机待办", note: ["离线查看编辑", "可带入日历"] },
  ];
  s += rule(148, 292, 1076, 292, C.rule, 3);
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const center = n.x + 82;
    s += circle(center, 292, 28, i === 3 ? C.teal : C.white, C.teal, 2);
    s += txt(center, 299, String(i + 1).padStart(2, "0"), 18, i === 3 ? C.white : C.teal, "bold", "middle");
    s += ico(n.i, n.x + 62, 351, 40, i === 3 ? C.teal : C.navy);
    s += txt(center, 423, n.title, 24, C.navy, "bold", "middle");
    s += txt(center, 466, n.note, 18, C.muted, "normal", "middle", 28);
  }
  s += rect(764, 518, 164, 54, C.panel, "none", 0, 8);
  s += txt(846, 552, "人工确认关口", 18, C.teal, "bold", "middle");
  s += txt(88, 621, "系统日历只接收预填信息，最终保存仍在手机日历中完成。", 18, C.muted);
  slides.push(["slide_03_workflow.svg", base("content", s, 3)]);
}

// P04 · Deep read evidence
{
  let s = head("03 / AI能力", "AI深读补足办理顺序与理由", 4);
  s += txt(88, 192, "可见输出", 18, C.teal, "bold");
  const rows = [
    { y: 245, i: "sparkles", title: "一句话概括", body: "把通知主题压缩成可读结论。" },
    { y: 337, i: "checklist", title: "有序办理建议", body: "把可执行步骤按先后关系排开。" },
    { y: 429, i: "quote", title: "理由与原文摘句", body: "每项建议都能回到通知核对。" },
    { y: 521, i: "message-question", title: "待追问问题", body: "暴露原文没有说明的关键信息。" },
  ];
  for (const r of rows) {
    s += ico(r.i, 90, r.y - 26, 32, C.teal);
    s += txt(142, r.y, r.title, 24, C.navy, "bold");
    s += txt(142, r.y + 34, r.body, 18, C.muted);
  }
  s += rule(88, 594, 930, 594);
  s += txt(88, 626, "这是可审阅的建议，不是学校的正式解释。", 18, C.amber, "bold");
  s += rect(1060, 155, 116, 496, C.white, C.rule, 1, 5);
  s += img("deep-read-mobile.png", 1062, 157, 112, 492);
  slides.push(["slide_04_ai_deep_read.svg", base("content", s, 4)]);
}

// P05 · Live review evidence
{
  let s = head("04 / 原文依据", "原文依据让结果可以审阅", 5);
  s += rect(78, 168, 574, 476, C.white, C.rule, 1, 8);
  s += img("review-live-ai.png", 85, 175, 560, 462);
  s += txt(700, 198, "实时AI核对页", 32, C.navy, "bold");
  s += txt(700, 233, "演示通知为合成内容", 18, C.muted);
  s += rule(700, 263, 1192, 263);
  const entries = [
    ["行动 01", "提交项目书 PDF 至教学平台"],
    ["截止", "2026-10-23 · 18:00"],
    ["行动 02", "准备3分钟演示视频"],
    ["未明确", "答辩时间保留待确认"],
  ];
  let y = 305;
  for (const [label, value] of entries) {
    s += txt(700, y, label, 18, label === "未明确" ? C.amber : C.muted, "bold");
    s += txt(700, y + 34, value, 24, C.ink, "bold");
    y += 86;
  }
  s += rule(700, 648, 1192, 648, C.teal, 2);
  slides.push(["slide_05_evidence_review.svg", base("content", s, 5)]);
}

// P06 · Local task and calendar
{
  let s = head("05 / 执行入口", "待办离线可用，日历由用户保存", 6);
  s += rect(78, 158, 229, 492, C.white, C.rule, 1, 8);
  s += img("tasks-mobile.png", 84, 164, 217, 480);
  s += txt(370, 198, "保存到本机", 32, C.navy, "bold");
  s += txt(370, 238, ["已保存任务可离线查看、", "编辑和标记完成。"], 24, C.ink, "normal", "start", 36);
  s += rule(370, 315, 1190, 315);
  s += ico("calendar-plus", 372, 349, 36, C.teal);
  s += txt(430, 376, "带入系统日历", 24, C.navy, "bold");
  s += txt(430, 416, ["开始时间取通知截止时间；", "结束时间默认延后30分钟。"], 24, C.ink, "normal", "start", 36);
  s += rule(370, 498, 1190, 498);
  s += ico("user-check", 372, 528, 36, C.amber);
  s += txt(430, 555, "打开预填编辑页", 24, C.navy, "bold");
  s += txt(430, 593, ["学生检查后自行保存。", "已验证预填时间，未验证提醒送达。"], 18, C.muted, "normal", "start", 28);
  slides.push(["slide_06_todo_calendar.svg", base("content", s, 6)]);
}

// P07 · Architecture
{
  let s = head("06 / 工程实现", "AI链路包含服务端校验", 7);
  s += txt(88, 190, "客户端提交请求，服务端负责权限、调用和结果检查。", 24, C.ink);
  const y = 242, h = 250;
  s += rect(88, y, 310, h, C.white, C.rule, 1, 8);
  s += rect(468, y, 360, h, C.panel, C.rule, 1, 8);
  s += rect(898, y, 294, h, C.white, C.rule, 1, 8);
  s += ico("device-mobile", 116, 272, 38, C.teal);
  s += txt(174, 300, "移动端", 24, C.navy, "bold");
  s += txt(116, 355, ["uni-app / Vue 3", "账号会话与文件输入", "字段编辑和人工确认"], 18, C.ink, "normal", "start", 34);
  s += txt(430, 355, "HTTPS →", 18, C.teal, "bold", "middle");
  s += ico("server", 496, 272, 38, C.teal);
  s += txt(554, 300, "FastAPI 服务端", 24, C.navy, "bold");
  s += txt(496, 355, ["鉴权、配额与文档提取", "调用模型并校验JSON结构", "核对原文连续引用"], 18, C.ink, "normal", "start", 34);
  s += txt(863, 355, "模型 →", 18, C.teal, "bold", "middle");
  s += ico("sparkles", 924, 272, 38, C.teal);
  s += txt(982, 300, "DeepSeek", 24, C.navy, "bold");
  s += txt(924, 355, ["deepseek-flash", "生成候选行动与深读建议"], 18, C.ink, "normal", "start", 34);
  s += rule(88, 532, 1192, 532);
  s += ico("shield-check", 94, 565, 30, C.teal);
  s += txt(142, 588, "模型密钥保存在服务端；校验通过后才把结果交回用户核对。", 24, C.navy, "bold");
  s += txt(142, 625, "通知只在用户发起解析、深读或对话时发送到服务端与模型。", 18, C.muted);
  slides.push(["slide_07_architecture.svg", base("content", s, 7)]);
}

// P08 · Failure behavior
{
  let s = head("07 / 容错设计", "失败时保留人工与本机路径", 8);
  const blocks = [
    { x: 88, y: 198, i: "shield-check", title: "模型输出校验", lines: ["结构与原文引用逐项检查。", "深读不合格最多重试两次，", "仍失败就明确报错。"] },
    { x: 666, y: 198, i: "alert-triangle", title: "信息缺失", lines: ["原文没有时间就保留空缺。", "用户可查看原文、手动修改，", "再决定是否保存。"] },
    { x: 88, y: 410, i: "checklist", title: "离线任务", lines: ["已保存任务留在本机。", "无网络时仍可查看和编辑，", "AI服务不可用会单独提示。"] },
    { x: 666, y: 410, i: "file-text", title: "文档边界", lines: ["单文件不超过20 MB。", "PDF最多80页；扫描OCR", "单次最多10页，效果受清晰度影响。"] },
  ];
  for (const b of blocks) {
    s += ico(b.i, b.x, b.y + 3, 34, b.i === "alert-triangle" ? C.amber : C.teal);
    s += txt(b.x + 52, b.y + 30, b.title, 24, C.navy, "bold");
    s += txt(b.x + 52, b.y + 76, b.lines, 18, C.ink, "normal", "start", 30);
    s += rule(b.x, b.y + 176, b.x + 500, b.y + 176);
  }
  s += txt(88, 638, "优先保留原文、错误提示和人工核对入口，不伪造完整答案。", 18, C.muted);
  slides.push(["slide_08_resilience.svg", base("content", s, 8)]);
}

// P09 · Verification evidence
{
  let s = head("08 / 测试与验收", "测试记录覆盖核心交付路径", 9);
  s += txt(90, 360, "82", 76, C.teal, "bold");
  s += txt(92, 414, "项自动化测试通过", 24, C.navy, "bold");
  s += txt(92, 462, "服务端 pytest 48 项", 18, C.muted);
  s += txt(92, 494, "移动端 Node 34 项", 18, C.muted);
  s += rule(370, 198, 370, 570, C.rule, 2);
  s += txt(430, 220, "构建与真机", 32, C.navy, "bold");
  s += ico("checklist", 432, 265, 30, C.teal);
  s += txt(480, 289, "H5 与 App 资源构建通过", 24, C.ink);
  s += ico("device-mobile", 432, 328, 30, C.teal);
  s += txt(480, 352, ["Android 15 · iQOO 9", "覆盖升级后原有本机数据保留"], 24, C.ink, "normal", "start", 34);
  s += ico("sparkles", 432, 421, 30, C.teal);
  s += txt(480, 446, ["同一条 2,984 字通知", "AI深读连续3次成功"], 24, C.ink, "normal", "start", 34);
  s += rule(430, 530, 1190, 530, C.amber, 2);
  s += txt(430, 570, ["这是单条样例抽查，不代表整体准确率。", "日历只验证预填编辑页，未保存真实事件。"], 18, C.muted, "normal", "start", 30);
  slides.push(["slide_09_verification.svg", base("content", s, 9)]);
}

// P10 · Release and boundaries
{
  let s = head("09 / 发布与边界", "线上发布已完成，部分行为仍待验证", 10);
  s += txt(88, 195, "已发布 / 已验收", 24, C.teal, "bold");
  s += rule(88, 220, 590, 220, C.teal, 2);
  s += txt(88, 270, "HTTPS 网站", 18, C.muted, "bold");
  s += txt(88, 308, "tiredwhite.cn", 32, C.navy, "bold");
  s += txt(88, 364, "Android APK", 18, C.muted, "bold");
  s += txt(88, 402, "0.3.8 · versionCode 308", 24, C.navy, "bold");
  s += txt(88, 458, ["公网下载包与本机签名包", "SHA-256一致。"], 18, C.ink, "normal", "start", 30);
  s += rule(638, 186, 638, 608, C.rule, 2);
  s += txt(694, 195, "仍需继续验证", 24, C.amber, "bold");
  s += rule(694, 220, 1192, 220, C.amber, 2);
  const pending = [
    "系统日历事件的真实保存与提醒送达",
    "多类型真实扫描件上的OCR识别质量",
    "冻结通知集上的正式AI效果评估",
  ];
  let py = 285;
  for (const item of pending) {
    s += circle(705, py - 8, 5, C.amber);
    s += txt(728, py, item, 24, C.ink);
    py += 88;
  }
  s += rule(694, 542, 1192, 542);
  s += txt(694, 582, ["本次不含校园知识库、账号云同步", "或AI自动提交事务。"], 18, C.muted, "normal", "start", 30);
  slides.push(["slide_10_release_boundaries.svg", base("content", s, 10)]);
}

// P11 · Closing
{
  let s = "";
  s += txt(80, 62, "知行 · 项目结论", 18, C.teal, "bold");
  s += txt(1200, 62, "11 / 11", 18, C.muted, "normal", "end");
  s += rule(80, 92, 1200, 92);
  s += txt(80, 246, "建议可追溯", 58, C.navy, "bold");
  s += txt(80, 322, "行动由学生确认", 58, C.teal, "bold");
  s += txt(80, 414, ["AI解释通知并提出候选步骤，", "原文引用支持核对，人工确认连接建议与行动。"], 24, C.ink, "normal", "start", 38);
  s += rule(80, 536, 1200, 536, C.rule, 2);
  s += ico("sparkles", 88, 572, 30, C.teal);
  s += txt(138, 596, "现场演示：AI深读 → 查看原文 → 保存待办 → 断网修改", 24, C.navy, "bold");
  s += txt(80, 681, "知行 · 智能移动应用开发项目实践", 18, C.muted);
  slides.push(["slide_11_conclusion.svg", base("ending", s, 11, true)]);
}

const start = Number(process.argv[2] || 1);
const end = Number(process.argv[3] || slides.length);
if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > slides.length || start > end) {
  throw new Error("Usage: node build_svgs.mjs [start-page end-page]");
}
await fs.mkdir(outDir, { recursive: true });
for (let n = start; n <= end; n++) {
  const [name, svg] = slides[n - 1];
  await fs.writeFile(path.join(outDir, name), svg, "utf8");
  console.log("wrote " + name);
}
