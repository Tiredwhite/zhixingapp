# 知行

校园通知解析与行动规划助手。将用户主动粘贴的通知转换为带原文依据的候选行动，核对后保存为本地待办。

## 范围

1. 通知解析：真实调用 DeepSeek API，服务端验证输出结构与原文依据。
2. 核对与保存：编辑事项和时间，确认歧义后生成待办。
3. 本地管理：查看、编辑、完成、删除，离线使用和重启恢复。

AI 服务不可用时保留原文并提供手动入口。预置示例明确标识，不作为真实 AI 调用结果。

## 技术与目录

- `mobile/`：uni-app Vue 3；支持 Web 调试与 Android App 资源编译。
- `server/`：Python FastAPI；DeepSeek 兼容接口、校验、限流、配额与请求去重。
- `docs/`：需求、开发记录、测试说明与部署文档。
- `deploy/`：容器与反向代理配置。
- `deliverables/`：开发项目书。

HBuilderX 安装目录：`D:\code-app\HBuilderX.5.26.2026091802\HBuilderX`。在 HBuilderX 中导入 `mobile` 目录；Python 服务单独运行。APK 打包需要在本机配置 DCloud AppID、签名及对应打包环境，不能用 Web 构建代替。

## 开发状态

项目已立项规划，正在建立可运行版本。以 `docs/development-log.md` 记录的实际实现与测试为准。

