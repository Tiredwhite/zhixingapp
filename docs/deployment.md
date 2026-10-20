# 部署与真机调试

## 当前环境

移动端可以在 HBuilderX 5.26 中编辑并编译。API 使用 DeepSeek 官方兼容接口：`https://api.deepseek.com`，模型 ID `deepseek-flash`。模型密钥只放在 `server/.env` 的 `MODEL_API_KEY` 中，不出现在移动端、截图、仓库或应用备份里。

## 云服务器

正式部署前需要服务器系统、域名与 HTTPS 条件，以及现有的 SSH 登录方式。不要将登录密码或私钥提交到仓库。

1. 将代码部署到服务器，准备 Python 3.13 或 Docker Compose。
2. 在服务器创建 `server/.env`，参考 `.env.example` 填写模型信息。设置 `APP_ENV=production`，并生成至少24字符的随机 `DEMO_ACCESS_TOKEN`。这个令牌只控制本项目访问，不是模型密钥。
3. 在仓库根运行 `docker compose -f deploy/compose.yaml up -d --build`。API只映射到服务器回环地址，外部不能直接访问8000端口。每日额度存储在独立数据卷中，重建容器不清空配额。
4. 按服务器实际环境调整 `deploy/nginx.conf.example` 的域名、证书与静态目录，执行 Nginx 配置检查后启用。已有宝塔/1Panel/其他反代时，将 HTTPS `/api/` 与 `/healthz` 转发到 `127.0.0.1:8000` 即可。
5. 可选 Web 预览：在 mobile 执行 `npm ci` 与 `npm run build`，将 `dist/build/h5` 上传到配置的静态目录。移动端的“连接设置”填写 API 所在 HTTPS 域名和临时访问令牌。
6. 对外仅开放80/443和必要的管理端口。先验证健康接口，再用一条脱敏通知验证解析，最后检查配额、错误反馈和日志轮转。

容器为非root用户运行。课程版本只运行一个API worker，请求缓存、并发计数和分钟限流在单进程内；不能直接增加worker冒充多实例高可用。SQLite每日总额度持久化，但本项目没有独立用户登录和商业级权限体系。

本机尚未安装 Docker，因此容器构建和云服务器部署需要在目标环境验证；不能将本地 Web 测试称为云部署完成。

## HBuilderX

项目源码已通过以下命令导入本机 HBuilderX：

```powershell
& 'D:\code-app\HBuilderX.5.26.2026091802\HBuilderX\cli.exe' project open --path 'D:\all-code\smartAPP\mobile'
```

本项目使用官方 uni-app CLI 结构，源码位于 `mobile/src`，App 编译命令为：

```powershell
cd mobile
npm run build:app
```

`mobile/dist/build/app` 是编译后的 App 资源，**不是 APK**。源码可在 HBuilderX 中编辑；按照编译器输出提示，可将该资源目录导入 HBuilderX 运行。真机调试前确认 HBuilderX 的 Node 路径为本机 Node 20+，并启用安卓手机开发者选项与USB调试。

最终打包需使用本人的 DCloud AppID、Android包名和签名配置。`src/manifest.json` 的 appid 当前留空，不伪造他人的应用ID。申请或填写AppID后，再执行真机运行和发行打包；签名文件和密码不提交仓库。

真机的 `127.0.0.1` 指向手机自身；请在“连接设置”填写云服务器 HTTPS 地址。当前后端只绑定电脑回环地址，默认不向局域网开放。

## 运行验证

- 健康检查：不触发模型调用，不返回密钥。
- API错误只返回错误码、说明、是否可重试和请求ID，不暴露上游原文或异常堆栈。
- 修改服务端 `.env` 后重启API进程；不需要把密钥重新写入前端。
- 调用额度是全局每日100次上游尝试，每次重试也计数；默认每令牌/来源IP每分钟5次。

