# 知行

校园通知解析与行动规划助手。将用户粘贴或从 Word/PDF 导入的通知转换为带原文依据的候选行动，核对后保存为本地待办，并可加入安卓系统日历。

## 范围

1. 通知解析：真实调用 DeepSeek API，服务端验证输出结构与原文依据；支持 PDF 与 `.docx` 文本提取。
2. 核对与保存：编辑事项和时间，确认歧义后生成待办；可为事项写入手机系统日历并提醒。
3. 本地管理：个人中心、待办统计、编辑、完成、删除、备份恢复，离线使用和重启恢复。
4. 网站下载页：介绍应用功能并提供最新 Android APK。

AI 服务不可用时保留原文并提供手动入口。预置示例明确标识，不作为真实 AI 调用结果。

## 技术与目录

- `mobile/`：uni-app Vue 3；支持 Web 调试与 Android App 资源编译。
- `server/`：Python FastAPI；DeepSeek 兼容接口、校验、限流、配额与请求去重。
- `docs/`：需求、开发记录、测试说明与部署文档。
- `deploy/`：容器与反向代理配置。
- `deliverables/`：开发项目书。

HBuilderX 安装目录：`D:\code-app\HBuilderX.5.26.2026091802\HBuilderX`。在 HBuilderX 中导入 `mobile` 目录；Python 服务单独运行。APK 打包需要在本机配置 DCloud AppID、签名及对应打包环境，不能用 Web 构建代替。

## 开发状态

0.1.0已完成真实AI解析、核对与本地待办闭环；0.2.0增加 [AI深读](docs/ai-deep-read.md)，机主已反馈覆盖升级与深读正常。0.3.0增加个人中心、系统日历提醒、Word/PDF文本导入、AI聊天助手和网站下载介绍页。0.3.1修正AI回复显示、安卓文件选择器和系统日历写入；下载入口仅显示在网站，安卓App内不再出现下载App按钮。新版安卓真机的日历权限、文件导入和聊天仍待机主验收。历史版本见 [0.2.0交付记录](docs/release-0.2.0.md)。

手机或新浏览器的“连接设置”需要填写服务器网址及应用连接令牌。部署者的连接信息单独保存在本机忽略目录 `.local/secrets/知行连接信息.txt`，不提交到仓库；不要将模型API密钥填写到前端。

本地验签安装包：[知行0.3.1 APK](../deliverables/知行-0.3.1.apk)。服务器更新完成后，下载入口为 [知行0.3.1 APK](https://tiredwhite.cn/downloads/zhixing-0.3.1.apk)；旧版仍保留在原下载地址。

## 本机启动

当前环境已安装依赖并配置服务端密钥。运行：

```powershell
.\scripts\start-dev.ps1 -ImportHBuilder
```

打开 <http://127.0.0.1:5173>。健康检查为 <http://127.0.0.1:8000/healthz>。启动脚本在后台运行，日志位于 `.local`；若端口已有服务，它不会替换已有进程。

修改 `server/.env` 后需要重启后端。不要在聊天、截图或仓库中粘贴模型密钥。

## 新环境安装

要求 Node 20+、Python 3.13，以及 Android 调试用 HBuilderX。

```powershell
python -m venv server/.venv
server\.venv\Scripts\python.exe -m pip install -r server/requirements-dev.txt
if (-not (Test-Path server/.env)) { Copy-Item server/.env.example server/.env }
cd mobile
npm ci
```

在本机服务端 `.env` 填写 `MODEL_API_KEY`。不要在移动端填写模型密钥；移动端连接远程后端时仅使用可撤销的应用访问令牌。

## 验证与构建

```powershell
# 仓库根目录
server\.venv\Scripts\python.exe -m pytest -c server/pytest.ini server/tests

# mobile 目录
npm test
npm run build
npm run build:app
npm run test:e2e
```

浏览器测试需要5173前端与8000后端已启动，默认使用本机Edge。Linux环境可安装Playwright Chromium并设置 `PLAYWRIGHT_CHANNEL=chromium`。

真实AI端到端测试默认跳过，避免无意消耗配额。如需显式运行：

```powershell
$env:LIVE_AI_E2E='1'
npm run test:e2e
```

`dist/build/app` 是App资源，不是APK。HBuilderX配置、云服务器反代和打包边界见 `docs/deployment.md`。

## 项目资料

- `docs/requirements.md`：需求与验收边界。
- `docs/testing.md`：真实测试结果与未完成项。
- `docs/deployment.md`：部署、HBuilderX与真机调试。
- `docs/ai-usage.md`：AI辅助范围和实际修订记录。
- `docs/development-log.md`：开发过程。


