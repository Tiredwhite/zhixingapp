// These fixtures are explicitly marked as examples in every view. They never claim to be live AI.
export const SAMPLES = [
  {
    id: 'course', label: '课程提交', tag: '课程',
    text: '课程项目组请于2026年10月23日18:00前提交项目书PDF至教学平台。请准备3分钟演示视频。答辩时间另行通知。',
    items: [
      { id: 'example-1', action: '提交项目书PDF', due_text: '2026年10月23日18:00前', due_date: '2026-10-23', due_at: '2026-10-23T18:00:00+08:00', location: '教学平台', materials: ['项目书PDF'], evidence: { action: '提交项目书PDF', due: '2026年10月23日18:00前', location: '教学平台', materials: ['项目书PDF'] }, review_reasons: [] },
      { id: 'example-2', action: '准备3分钟演示视频', due_text: null, due_date: null, due_at: null, location: null, materials: ['3分钟演示视频'], evidence: { action: '请准备3分钟演示视频', due: null, location: null, materials: ['3分钟演示视频'] }, review_reasons: ['视频的具体提交时间未明确'] },
    ],
    warnings: ['答辩时间另行通知，未生成固定答辩时间'],
  },
  {
    id: 'competition', label: '竞赛报名', tag: '竞赛',
    text: '创新竞赛报名截至2026年10月30日。请有意向的同学提交报名表和作品简介，线下材料交至创新楼203室。',
    items: [{ id: 'example-1', action: '提交竞赛报名材料', due_text: '2026年10月30日', due_date: '2026-10-30', due_at: null, location: '创新楼203室', materials: ['报名表', '作品简介'], evidence: { action: '请有意向的同学提交报名表和作品简介', due: '2026年10月30日', location: '创新楼203室', materials: ['报名表', '作品简介'] }, review_reasons: ['原文只有日期，未明确截止时刻'] }],
    warnings: [],
  },
  {
    id: 'ambiguous', label: '模糊时间', tag: '办事',
    text: '请各小组明天下午到实验楼102室领取设备，携带学生证。',
    items: [{ id: 'example-1', action: '领取设备', due_text: '明天下午', due_date: null, due_at: null, location: '实验楼102室', materials: ['学生证'], evidence: { action: '领取设备', due: '明天下午', location: '实验楼102室', materials: ['学生证'] }, review_reasons: ['缺少通知发布时间，不能确定“明天”的日期', '“下午”没有明确时刻，需自行确认'] }],
    warnings: ['请向通知发布者确认具体日期与时刻'],
  },
  {
    id: 'conditional', label: '条件申请', tag: '项目',
    text: '有意报名研究生创新项目的同学须于2026年10月25日17:00前将申请表与导师签字版计划书上传学院系统；如导师不在校，请先邮件联系秘书申请电子签；评审结果11月2日在学院网站公布。',
    items: [], warnings: [],
  },
];

export function manualCandidate() {
  return { id: 'manual-1', action: '', due_date: null, due_at: null, due_text: null, location: null, materials: [], evidence: { action: '', due: null, location: null, materials: [] }, review_reasons: ['手动整理，请自行核对原通知'] };
}

