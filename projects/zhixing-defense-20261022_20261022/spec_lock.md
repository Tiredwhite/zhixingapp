<!-- ppt-master-schema: spec-lock/v1 -->
# Execution Lock

## canvas
- viewBox: 0 0 1280 720
- format: PPT 16:9

## communication
- primary_language: zh-CN
- audience: 课程教师与项目答辩评审，重点关注产品价值、AI实现、工程验证和项目边界。
- objective: 说明知行如何把校园通知转为可核对的AI建议与本机待办，使评审理解项目闭环、AI价值、工程取舍及尚待验证的事项。
- core_message: 知行让AI解释通知并提出有原文依据的行动建议，学生核对后再保存或带入系统日历；关键决定仍由学生掌握。
- consumption_mode: balanced

## mode
- mode: custom
- mode_behavior: 先呈现学生面对长通知时需要完成的判断，再解释AI深读、原文核对、待办与日历入口，最后用工程验证和真实边界回应评审。每页标题先给出本页判断，截图和测试数据跟随对应主张，结尾回到学生保留最终确认权。

## visual_style
- visual_style: custom
- visual_style_behavior: 使用明亮的暖白底、深蓝文字和克制的青绿色强调色。以清晰栅格、宽边距、细分隔线和少量带标签的证据区域组织内容；真实截图保持原色与完整比例，正文不铺满卡片，留白把产品画面和论点分开。标题使用稳重无衬线，注释弱化但保持投影可读。

## colors
- background: #F7FAFC
- secondary_background: #EAF1F5
- primary: #12344D
- accent: #13A89E
- secondary_accent: #F2B451
- body_text: #18232C
- secondary_text: #607789
- divider: #D5E1E8

## typography
- font_family: Microsoft YaHei, Arial, sans-serif
- title_family: Microsoft YaHei, Arial, sans-serif
- body_family: Microsoft YaHei, Arial, sans-serif
- body: 24
- title: 42
- subtitle: 32
- annotation: 18

## icons
- library: tabler-outline
- stroke_width: 2
- inventory: tabler-outline/file-text, tabler-outline/sparkles, tabler-outline/quote, tabler-outline/user-check, tabler-outline/checklist, tabler-outline/calendar-plus, tabler-outline/server, tabler-outline/shield-check, tabler-outline/alert-triangle, tabler-outline/device-mobile, tabler-outline/message-question

## images
- home-current: images/home-current.png | source=user | crop=no-crop
- deep-read-mobile: images/deep-read-mobile.png | source=user | crop=no-crop
- review-live-ai: images/review-live-ai.png | source=user | crop=no-crop
- tasks-mobile: images/tasks-mobile.png | source=user | crop=no-crop

## page_rhythm
- P01: breathing
- P02: anchor
- P03: anchor
- P04: breathing
- P05: anchor
- P06: anchor
- P07: dense
- P08: dense
- P09: anchor
- P10: anchor
- P11: breathing

## pptx_structure
- mode: flat

## forbidden
- `mask`, `<style>`, `class`, external CSS, `<foreignObject>`, `textPath`, `@font-face`, `<animate*>`, `<set>`, `<script>` / event attributes, `<iframe>`
- HTML named entities in text; write typography as raw Unicode and escape XML reserved characters
