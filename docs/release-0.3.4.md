# 知行 0.3.4 发布记录

日期：2026-10-21  
状态：后端、网站和 APK 已发布；iQOO 9 真机验收待机主完成。

## 修复内容

- 扫描版 PDF 支持 OCR。服务端用 PyMuPDF 将含图片、可提取文字少于40字的 PDF 页面渲染为灰度图，再调用 Tesseract `chi_sim+eng`；每份文档最多识别5页，每页8秒超时，单文件限制20 MiB。可搜索 PDF、`.docx` 和 `.doc` 保持原有路径。扫描图像仅在请求临时目录中存在，不写入数据库或长期文件。
- Android 新建日程改用 HBuilderX 5.26 原生 `uni.addPhoneCalendar`，由运行时处理系统日历权限与设备实现差异；保留原日期和提前提醒设置。
- 新增 `scripts/repack-android.py`，在 HBuilderX 云打包不可用时，将已构建的 App 资源更新到项目现有 DCloud 壳并沿用原签名证书。签名口令只通过子进程环境变量传给 apksigner。

## 本机验收

- 服务端 pytest 43项通过；移动端 Node 测试32项通过；H5 与 App 资源构建通过。
- HBuilderX 打包 CLI 未返回结果；使用仓库发布脚本更新现有 DCloud 壳后，实物包检查通过。
- 服务器 OCR 函数解析图像 PDF 的英文样本成功，报告 `ocr_pages=1`；中文合成页也能识别出日期和大部分正文，但 Tesseract 在个别汉字上有误识别。OCR结果应作为文本初稿，截止时间等关键信息仍需在 App 核对页确认。
- APK：包名 `cn.tiredwhite.zhixing`，AppID `__UNI__435D6C0`，版本0.3.4/304，ARM64/ARMv7，APK v2 签名有效；证书 SHA-256 `55f2f8b502519f23f545d0a69ef87fc0638a6f3cc3bf2c439d3986095164d9e1` 与旧包一致。权限清单无意外权限，ZIP CRC有效，已知密钥和私密文件扫描均为0。
- 安卓真机覆盖安装与 iQOO 9 日历系统写入尚未实测；用户需检查旧数据保留、扫描 PDF 导入和添加日程。

## 部署与线上验收

- 后端目录：`/home/ubuntu/zhixing-20261021-v0.3.4`；systemd drop-in：`/etc/systemd/system/zhixing.service.d/60-release-0.3.4.conf`；服务使用独立 Python 3.13.16 虚拟环境并监听 `127.0.0.1:8002`。服务状态为 active，公网 `/healthz` 返回 `version=0.3.4`、`ai_configured=true`、`model_id=deepseek-flash`。
- `.env` 从0.3.3继承并设为600权限。`AUTH_DB` 仍指向 `/home/ubuntu/zhixing-20261021-v0.3.2/server/data/accounts.sqlite3`，`QUOTA_DB` 仍指向 `/home/ubuntu/zhixing-20261020/server/data/quota.sqlite3`；发布后账号库仍为24,576字节、配额库仍为12,288字节，没有在新版本目录初始化空数据库。
- 服务器 Tesseract 已安装 `chi_sim` 与 `eng` 语言包。通过服务器真实 OCR 函数解析了仅含文字图片的合成 PDF，结果识别到 `SUBMIT FORM BY OCTOBER 23 2026` 且 `ocr_pages=1`。
- 网站更新到 `/var/www/zhixing`，更新前完整备份位于 `/var/www/zhixing-backup-20261021-0.3.4`。公网首页 SHA-256 与本地构建一致。
- APK 地址：[知行 0.3.4 安卓安装包](https://tiredwhite.cn/downloads/zhixing-0.3.4.apk)。公网 HTTP 200、24,432,932字节；本地包、服务器文件和完整公网下载的 SHA-256 一致：`f13e42e1eaf9756c438d4df601521c8ac5cbd7c7e604e4c90cef794fcceafd42`。

## 本地产物

- `.local/release/zhixing-0.3.4.apk`
- `.local/release/zhixing-deploy-0.3.4.zip`（不包含密钥、数据库或签名文件）
- `.local/release/android-inspection-0.3.4.json`
- APK检查脚本：`scripts/inspect-android.py`；重打包脚本：`scripts/repack-android.py`。
