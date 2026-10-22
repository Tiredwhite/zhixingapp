<!-- ppt-master-schema: design-spec/v1 -->
# 知行项目答辩 - Design Spec

## I. Project Information

| Item | Value |
| --- | --- |
| Project Name | 知行：校园通知 AI 助手 |
| Canvas Format | PPT 16:9，1280 × 720 px |
| Page Count | 11 |
| Primary Language | zh-CN |
| Target Audience | 课程教师与项目答辩评审，重点关注产品价值、AI实现、工程验证和项目边界。 |
| Communication Intent | 通过清晰的现场讲述，说明知行如何把校园通知转为可核对的AI建议与本机待办，并展示真实实现和验收证据。 |
| Desired Audience Outcome | 评审能理解项目闭环、AI相较于关键词提取的价值、关键技术取舍与当前未完成的验证，并据此评价项目。 |
| Core Message / Ask / Action | 知行让AI解释通知并提出有原文依据的行动建议，学生核对后再保存或带入系统日历；关键决定仍由学生掌握。 |
| Delivery Context | 课程项目现场答辩，由主讲人讲解并配合安卓应用演示；演示稿也供会后审阅。 |
| Artifact Afterlife | 作为《智能移动应用开发项目实践》的项目答辩材料，与需求说明书和实践报告配套归档。 |
| Reading Mode | balanced |
| Content Strategy | 以知行0.3.8实际交付和测试记录为准；明确区分已实现、已验证和仍待验证事项，不把样例测试表述成通用准确率。 |
| Design Style | 产品证据·清晰叙事：以一条通知的理解、证据核对、待办保存为主线，用真实产品界面和测试记录支撑每项主张。 |
| AI Image Acquisition Path | 不适用；仅使用已有产品截图，不使用生成图片。 |
| Generation Mode | continuous |
| Spec Refinement | disabled |
| Speaker Notes | enabled — final Stage-2 proactive policy |
| Custom Animations | disabled — final Stage-2 proactive policy |
| Narration Audio | disabled — final Stage-2 proactive policy |
| Created Date | 2026-10-22 |

## II. Canvas Specification

| Property | Value |
| --- | --- |
| Format | PPT 16:9 |
| Dimensions | 1280 × 720 px |
| viewBox | 0 0 1280 720 |
| Margins | 64 px safe margin |
| Content Area | x=64..1216，y=48..672 |

## III. Visual Theme

### Theme Style

- **Mode**: custom
- **Visual style**: custom
- **Theme**: 产品证据·清晰叙事。先呈现学生面对长通知时需要完成的判断，再解释AI深读、原文核对、待办与日历入口，最后用工程验证和真实边界回应评审。每页标题先给出本页判断，截图和测试数据跟随对应主张，结尾回到学生保留最终确认权。
- **Tone**: 清楚、可信、克制，像一份可复核的产品验收记录。
- **Mode Behavior**: 先呈现学生面对长通知时需要完成的判断，再依次解释AI深读、原文核对、待办与日历入口，最后用工程验证和真实边界回应评审。每页标题先给出本页判断，截图和测试数据紧跟对应主张，结尾回到学生保留最终确认权。
- **Visual Style Behavior**: 使用明亮的暖白底、深蓝文字和克制的青绿色强调色。以清晰栅格、宽边距、细分隔线和少量带标签的证据区域组织内容；真实截图保持原色与完整比例，正文不铺满卡片，留白把产品画面和论点分开。标题使用稳重无衬线，注释弱化但保持投影可读。
- **Image Strategy**: 原样产品证据；真实手机页面截图按完整画幅呈现，旁边配简短的证据说明和指向性标注；图形化流程和架构使用可编辑矢量图形。
- **Image Behavior**: 屏幕截图保持源色、源比例和可读文字，不仿制或重绘界面。图形化流程与手机画面分层摆放，使用轻量边框区分证据和解释。

### Color Scheme

| Role | HEX | Purpose |
| --- | --- | --- |
| Background | #F7FAFC | 全页底色，营造明亮阅读环境 |
| Secondary background | #EAF1F5 | 少量证据区和流程区的底色 |
| Primary | #12344D | 标题、主流程与核心文字 |
| Accent | #13A89E | AI过程、原文证据和关键动作的强调色 |
| Secondary accent | #F2B451 | 待确认、边界与风险提示 |
| Body text | #18232C | 正文 |
| Secondary text | #607789 | 来源、说明和次级标注 |
| Divider | #D5E1E8 | 细分隔线、截图边界 |

## IV. Typography System

### Font Plan

| Role | Character (Reference) | Primary | English if non-English | Fallback tail |
| --- | --- | --- | --- | --- |
| Title | 稳重无衬线，中文为主 | Microsoft YaHei | Arial | sans-serif |
| Body | 清晰无衬线，中文为主 | Microsoft YaHei | Arial | sans-serif |

- **Title stack**: Microsoft YaHei, Arial, sans-serif
- **Body stack**: Microsoft YaHei, Arial, sans-serif

### Font Size Hierarchy

| Purpose | Anchor Size (px) |
| --- | ---: |
| Body | 24 |
| Title | 42 |
| Subtitle | 32 |
| Annotation | 18 |

## V. Layout Principles

### Deck-wide Direction

- **Hierarchy direction**: 先用标题给出本页判断，再用一个主要证据、流程或差异解释它，最后补充来源与限制。
- **Composition tendency**: 以大标题和单一视觉焦点为主；产品截图与解释分区排布，流程和架构按阅读顺序展开。
- **Cross-page continuity**: 暖白底、深蓝标题、青绿色证据强调和细分隔线保持一致；截图只出现一次，页面主视觉随叙事变化。
- **Spacing posture**: 随内容疏密变化，证据页保持留白，工程页允许较紧凑但不铺满。
- **Spacing anchors**: page margin 64 px; block gap 28 px; column gutter 40 px; corner radius 8 px; body leading 34 px.

## VI. Icon Usage Specification

- **Primary bundled library**: tabler-outline
- **Stroke Width**: 2

| Icon Path | Suitable Scenarios |
| --- | --- |
| tabler-outline/file-text | 通知和文档输入 |
| tabler-outline/sparkles | AI解析与深读 |
| tabler-outline/quote | 原文引用 |
| tabler-outline/user-check | 人工确认 |
| tabler-outline/checklist | 待办和测试记录 |
| tabler-outline/calendar-plus | 日历草稿 |
| tabler-outline/server | 服务端架构 |
| tabler-outline/shield-check | 权限和校验 |
| tabler-outline/alert-triangle | 失败提示与待验证边界 |
| tabler-outline/device-mobile | 移动端与真机验收 |
| tabler-outline/message-question | 待追问问题 |

## VIII. Image Resource List

| Filename | Dimensions | Ratio | Purpose | Type | Image pattern | Crop Policy | Acquire Via | Status | Reference | text_policy | page_role |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| home-current.png | 430x1778 | 0.24 | 0.3.8 H5首页的通知输入入口与待办概览 | Screenshot | 完整截图置于一侧，旁列输入渠道和范围说明 | no-crop | user | Existing | 从当前0.3.8源码构建后截取的首页；该画面属于H5浏览器首页 | none | local |
| deep-read-mobile.png | 390x1953 | 0.20 | AI深读的概括、步骤、理由和待追问问题 | Screenshot | 完整纵向截图置于一侧，旁列输出结构和引用规则 | no-crop | user | Existing | 项目真实AI深读页面截图，完整保留界面文字和颜色 | none | hero_page |
| review-live-ai.png | 1440x1421 | 1.01 | 真实AI解析后的候选事项、原文和可编辑字段 | Screenshot | 完整截图展示核对页面，旁列字段与来源说明 | no-crop | user | Existing | 线上真实AI解析后生成的核对页面截图 | none | hero_page |
| tasks-mobile.png | 390x1043 | 0.37 | 本机待办列表和离线管理入口 | Screenshot | 完整截图置于一侧，旁列本地保存与日历能力说明 | no-crop | user | Existing | 项目待办页面截图，作为本机任务界面证据 | none | local |

## IX. Content Outline

### Part 1: 问题与产品闭环

#### Slide 01 - 知行项目答辩

- **Audience move**: 从“校园通知很长”转向理解知行要解决的具体问题。
- **Relationships**: 通知里的行动、时间和条件共同构成执行任务；知行辅助理解，学生保留最终判断权。
- **Composition**: Reference — 以产品名和一句具体问题形成封面焦点，留出副标题说明课程与版本。
- **Title**: 知行：让校园通知变成可核对的行动
- **Core message**: 知行用AI提出带原文依据的候选行动，交由学生核对后进入本机待办。
- **Content**: 项目名与课程名 / 0.3.8交付版本 / 长通知中容易遗漏的是下一步行动
- **Cover impact (binding)**: 以“通知里的行动、截止时间和条件，如何变成学生能核对的下一步？”建立主问题；构图可调整。
- **Fact IDs**: F01

#### Slide 02 - 通知里的行动常分散在多处

- **Audience move**: 从关注通知篇幅转向识别行动、截止时间、材料和未明确条件。
- **Relationships**: 同一通知可以同时包含有明确期限的提交事项和没有明确时间的答疑事项；后者必须保留待确认状态。
- **Composition**: Reference — 展示一条短通知，并把行动、时间、材料与未明确项分开解释。
- **Title**: 通知里的行动常分散在多处
- **Core message**: 学生需要同时判断做什么、何时完成、准备什么，以及哪些内容仍未说明。
- **Content**: 示例通知包含项目书PDF、日期和时刻、提交地点；答疑事项没有明确时间，应保持待确认。
- **Data class: scenario**: 示例通知及所有标出的事项均为课程演示用合成内容。
- **Fact IDs**: F01, F02

#### Slide 03 - 知行把候选行动交给学生核对

- **Audience move**: 理解产品完整闭环和用户保留的控制点。
- **Relationships**: 用户输入先进入AI解析；候选行动附带原文依据后进入人工核对；用户保存后才写入本机待办；日历只接收预填草稿。
- **Composition**: Reference — 采用横向流程，学生确认作为主流程中的显性关口。
- **Title**: 知行把候选行动交给学生核对
- **Core message**: AI给出可编辑候选结果，只有学生确认后才保存或带入系统日历。
- **Content**: 粘贴或导入通知 / AI提取候选行动与深读建议 / 原文核对和手动修改 / 人工确认 / 本机待办及日历预填
- **Fact IDs**: F01, F02

### Part 2: AI能力与产品证据

#### Slide 04 - AI深读补足办理顺序与理由

- **Audience move**: 看到AI输出超越关键词提取的可见能力，也理解建议需要核对。
- **Relationships**: 一句话概括帮助理解通知主题；有序步骤解释可执行路径；理由说明步骤关系；原文摘句提供核验入口；待追问问题暴露缺失信息。
- **Composition**: Reference — 以完整AI深读页面为一侧证据，另一侧突出概括、步骤、理由、引用和追问。
- **Title**: AI深读补足办理顺序与理由
- **Core message**: AI深读把通知组织为有序建议，并让每项建议带有可核对的原文摘句。
- **Content**: 一句话概括 / 1—5项顺序建议及理由 / 每项的原文连续摘句 / 最多3个待追问问题 / 建议与正式校规要求分开标注
- **Images**: 使用 deep-read-mobile.png，保持完整比例和源色。
- **Fact IDs**: F02

#### Slide 05 - 原文依据让结果可以审阅

- **Audience move**: 从“AI给出结论”转向理解用户如何发现错误、补充信息并确认保存。
- **Relationships**: 候选行动字段与原文摘句相互对应；明确时间被保留；原文未给出的第二项时间保持空缺和待确认；保存动作由用户触发。
- **Composition**: Reference — 完整展示真实核对页截图，旁列原文与结构化字段的对应关系。
- **Title**: 原文依据让结果可以审阅
- **Core message**: 每个候选字段都能回到原文检查，缺少的信息不会被静默补全。
- **Content**: 提交项目书PDF / 截止日期与时刻 / 准备3分钟演示视频 / 答辩时间未说明并保留待确认 / 用户确认后保存
- **Images**: 使用 review-live-ai.png，保持完整比例和源色。
- **Fact IDs**: F01, F02

#### Slide 06 - 待办离线可用，日历由用户保存

- **Audience move**: 了解确认后的待办如何留在手机，以及系统日历流程的实际边界。
- **Relationships**: 本机任务支持离线查看和编辑；点击添加日程后系统打开预填编辑页；学生在系统日历中检查并保存事件。
- **Composition**: Reference — 以待办页面为主证据，配一条从本机任务到日历草稿的短流程。
- **Title**: 待办离线可用，日历由用户保存
- **Core message**: 任务保存在本机，日历信息可预填，但最终事件保存仍由用户完成。
- **Content**: 本机待办和本地聊天记录 / 离线查看与修改 / 截止时间作为日历开始时间 / 结束时间默认加30分钟 / 系统日历编辑页仍需用户保存
- **Images**: 使用 tasks-mobile.png，保持完整比例和源色。
- **Fact IDs**: F01, F04

### Part 3: 工程实现与验证

#### Slide 07 - AI链路包含服务端校验

- **Audience move**: 理解移动端、服务端和模型各自承担的责任。
- **Relationships**: uni-app客户端经HTTPS访问FastAPI；服务端完成账号鉴权、限额和输入检查后调用DeepSeek；服务端校验结构和原文引用后返回候选；模型密钥留在服务端。
- **Composition**: Reference — 按请求方向绘制横向分层架构，突出服务端校验边界。
- **Title**: AI链路包含服务端校验
- **Core message**: 模型只负责生成候选建议，服务端校验结果后才交给客户端核对。
- **Content**: uni-app / Vue 3移动端 / HTTPS + FastAPI / DeepSeek deepseek-flash / JSON结构与逐字原文引用校验 / 客户端展示候选结果
- **Fact IDs**: F02, F03, F06

#### Slide 08 - 失败时保留人工与本机路径

- **Audience move**: 看到项目如何在模型不稳定、输入不全或离线时避免制造虚假确定性。
- **Relationships**: 模型格式或引用校验失败时先有限重试，仍失败则明确报错；用户仍可进入人工核对；已保存待办离线可用；扫描PDF受OCR页数和清晰度限制。
- **Composition**: Reference — 用主路径与失败分支对照展示，拒绝猜测和人工继续是两个明确出口。
- **Title**: 失败时保留人工与本机路径
- **Core message**: 项目优先保留可核对和可恢复的操作，不把模型失败伪装成成功结果。
- **Content**: 模型输出校验和有限重试 / 明确错误与原文保留 / 手动继续 / 本机任务离线管理 / PDF最多80页、单次扫描OCR最多10页
- **Fact IDs**: F01, F02, F03

#### Slide 09 - 测试记录覆盖核心交付路径

- **Audience move**: 区分已完成的工程验证和仍不足以支撑的效果结论。
- **Relationships**: 自动化测试覆盖服务端与移动端逻辑；构建通过说明交付工件可生成；真机升级证明本机数据保留；单条通知重复成功仅说明该样例，不代表通用准确率。
- **Composition**: Reference — 以82项自动化检查作为视觉锚点，拆分后端与移动端，并在下方列出真机与模型抽查的限制。
- **Title**: 测试记录覆盖核心交付路径
- **Core message**: 0.3.8有清楚的测试和真机证据，但模型泛化效果仍需正式评估。
- **Content**: 服务端pytest 48项 / 移动端Node 34项 / H5和App构建通过 / Android 15 iQOO 9覆盖升级后本机数据保留 / 同一条2,984字通知的AI深读连续3次成功 / 该样例不构成整体准确率
- **Fact IDs**: F04, F05

#### Slide 10 - 发布完成仍有明确验证边界

- **Audience move**: 形成对当前交付状态和待继续验证工作的准确判断。
- **Relationships**: HTTPS网站和0.3.8 APK已经发布；日历只验证到预填编辑页；尚未验证真实事件保存和提醒送达；知识库、账号云同步和自动办理不在本次范围。
- **Composition**: Reference — 左侧列已上线与已验收事实，右侧列仍待验证或不在范围的事项。
- **Title**: 发布完成仍有明确验证边界
- **Core message**: 项目完成真实线上发布和关键场景验收，同时保留未验证项目的明确说明。
- **Content**: tiredwhite.cn HTTPS站点 / Android APK 0.3.8，versionCode 308 / 日历事件实际保存与提醒送达待验证 / OCR清晰度影响识别 / 暂无校园知识库、账号云同步和AI自动代办
- **Fact IDs**: F01, F04, F06

### Part 4: 结论

#### Slide 11 - AI提出建议，学生完成确认

- **Audience move**: 带走项目的产品价值、人工责任边界和现场演示重点。
- **Relationships**: 可追溯的AI建议支持学生判断；原文核对和人工确认连接建议与本机行动；用户始终掌握保存和日历提交。
- **Composition**: Reference — 回到开场问题，以产品闭环的核心判断收束，并提示可现场演示深读与引用核对。
- **Title**: AI提出建议，学生完成确认
- **Core message**: 知行让AI建议更可理解、更可核对，但行动的最终确认权留在学生手中。
- **Content**: AI深读的可见价值 / 原文引用的可核验价值 / 学生确认后保存的责任边界 / 现场演示建议：深读、原文核对、离线待办
- **Closing impact (binding)**: 回答开场主问题；用“建议可追溯、行动由学生确认”作为结论，构图可调整。
- **Fact IDs**: F01, F02, F04

## X. Speaker Notes Requirements

- **Generation**: enabled
- **Filename**: notes/total.md，按每页标题拆分到对应备注文件。
- **Content**: 每页提供自然、口语化的讲解提示和过渡；事实依据注明项目内来源文档，合成示例标明为演示场景；不把样例结果写成准确率，不把日历预填写成已保存事件。
- **Total duration**: 约5分钟；如现场配合手机演示可延长。
- **Notes style**: conversational，面向课程教师和答辩评审。
- **Presentation purpose**: 通过清晰的现场讲述，说明知行如何把校园通知转为可核对的AI建议与本机待办，并展示真实实现和验收证据。
