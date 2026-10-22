# 知行 0.3.8 发布记录

日期：2026-10-21。

## 变更

修复 Android 上“添加为日程”时，系统日历编辑页忽略通知截止时间并默认填入当前时间的问题。Android 现在打开系统日历的新增事件表单，并通过 `Bundle.putLong` 写入截止时间的毫秒时间戳；开始时间默认取通知截止时间，结束时间为其后 30 分钟。仅有日期而没有具体时刻时，默认使用当地时间 09:00。用户仍需在系统日历中确认并保存事件。

其他平台继续使用 `uni.addPhoneCalendar`。

## 验证

- `npm test`：34 项通过。
- `npm run build` 与 `npm run build:app`：通过。
- 在 Android 15、iQOO 9 真机上以已过期任务验证日历编辑页仍显示通知中的准确日期与时间，结束时间自动为 30 分钟后；事件只打开为草稿，没有保存。
- APK：`zhixing-0.3.8.apk`，versionCode 308，包名 `cn.tiredwhite.zhixing`，AppID `__UNI__435D6C0`。
- APK SHA-256：`8e8789c2a179a31c3fe2f2e1a78d507d657dde3620ef2cd18087182bdc8ae6dc`。
- APK 签名、ABI、权限、ZIP CRC 与本机已知秘密值扫描均通过，完整检查见 `.local/release/android-inspection-0.3.8.json`。
- 已在原安装上覆盖升级并核验 `versionName=0.3.8`、`versionCode=308`；现有本机数据保留。

## 联调备注

使用手机通知整理页当前的 2,984 字示例原文做了 3 次真实 AI 整理。主解析均成功返回；第一次 AI 深读显示建议步骤，之后两次深读接口返回格式/原文引用校验错误（HTTP 502，7,314 ms 和 7,758 ms）。最近两次主解析为 HTTP 200。该观察说明深读子流程仍有模型输出波动，不属于本次日历改动，也没有保存生成的待办。

## 公网发布

网站静态资源与 APK 于2026-10-21发布。更新前的完整网站副本保存在服务器 `/var/www/zhixing-backup-20261021-0.3.8`。`nginx -t` 通过，Nginx 为 active；未修改后端代码或配置，因此没有重启 API 服务。公网首页返回HTTP 200，下载页显示 Android 0.3.8 并链接到 `/downloads/zhixing-0.3.8.apk`。APK完整公网下载为24,432,932字节，SHA-256与本机签名包一致：`8e8789c2a179a31c3fe2f2e1a78d507d657dde3620ef2cd18087182bdc8ae6dc`。
