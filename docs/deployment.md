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

本机尚未安装 Docker，容器部署路径未构建验证。当前云服务器采用下述已验证的原生systemd方案。

## 当前部署准备包

先在 `mobile` 完成 Web 与 App 资源构建，再在仓库根运行 `python scripts/package-deploy.py`，生成 `.local/release/zhixing-deploy.zip`。包内包含静态网页、App资源、后端源码和部署示例，不包含本机 `.env`、访问令牌、数据库或签名文件；`SHA256.json` 可核对包内文件。App资源不等于可安装APK。

目标域名为用户提供的 `tiredwhite.cn`，目标Ubuntu服务器地址为 `123.207.238.92`。用户重启Codex后，浏览器操作恢复，已通过右侧OrcaTerm连接并读取环境：Ubuntu 22.04.5、Python 3.10.12、约42GB可用磁盘、Nginx运行中，未发现Docker。80与8081由Nginx监听，8000由已有Python服务占用，因此本项目应另选回环端口。默认80站点根目录为 `/var/www/html`，8081站点为 `/var/www/h5-demo`。

无密钥部署包已上传到 `/home/ubuntu/zhixing-deploy.zip`，53项清单文件SHA256全部校验通过，并解压到新目录 `/home/ubuntu/zhixing-20261020`。当前锁定依赖中Starlette和pydantic-settings要求Python至少3.11，不能直接使用系统Python 3.10；已安装独立Python 3.13.16并在项目虚拟环境中安装锁定依赖。

目标服务器先通过无密钥临时运行检查，随后结束临时进程。用户明确授权密钥上传及Let's Encrypt协议后，将生产配置放入私有项目目录 `server/.env`，权限600，父项目目录权限700。正式 `zhixing.service` 已启用，仍只绑定 `127.0.0.1:8002`。

`deploy/inspect-server.sh` 为只读环境检查，可在连接恢复后使用。必须先核对目标端口、Python/Docker、现有Nginx站点及证书，再选择部署方式。另见 [依赖审查状态](dependency-review.md)，当前包尚未完成依赖安全验收。

当前服务器使用原生systemd方式：独立Python3.13虚拟环境安装锁定依赖，创建可写的 `server/data`，采用 `deploy/zhixing.service.example` 的服务配置。绑定回环地址避免已占用的8000端口，没有替换系统Python或原有服务。Nginx静态文件单独位于 `/var/www/zhixing`；站点文件为 `/etc/nginx/sites-available/zhixing`，通过同名符号链接启用。

站点 `https://tiredwhite.cn/` 已上线，普通HTTP自动301跳转HTTPS。Certbot1.21.0签发证书，当前证书到期日2027-01-18。HTTP挑战目录保留在 `/var/www/html/.well-known/acme-challenge/`，不被重定向覆盖；证书模拟续期通过。`deploy/renew-nginx.sh` 安装到续期deploy钩子中，续期后检查并重载Nginx。

生产验证通过：未带令牌请求返回401，授权真实AI请求返回200并正确识别2026-10-23 18:00截止时间，`/docs` 返回404。公网浏览器使用HTTPS成功完成真实AI解析，显示原文依据。截图保存在 `.local/screenshots`。

本机生产环境配置保存在忽略目录 `.local/secrets/server.production.env`。单独的 `.local/secrets/知行连接信息.txt` 只给出应用网址和连接令牌，方便在手机填写，不包含模型密钥。这些文件不进入仓库或部署归档。更换模型密钥或访问令牌后重启 `zhixing.service`；更换连接令牌后，需要更新各设备的连接设置。

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

用户已确认使用安卓手机。当前预设包名为 `cn.tiredwhite.zhixing`，支持 `arm64-v8a` 和 `armeabi-v7a`。原有“知”字品牌标记已导出72/96/144/192像素安卓图标并写入manifest，App资源重新编译通过。配置不在启动时主动申请设备电话信息或外部存储权限；最终APK的实际权限仍需打包后核对。

DCloud开发者中心已在右侧浏览器打开，等待用户登录后创建或选用本人AppID。HBuilderX也须使用有该AppID打包权限的账号。当前官方已下线公共测试证书，不选择该旧选项；后续采用账号云证书或自有证书。参考：[AppID管理](https://uniapp.dcloud.net.cn/dev/app/introduction.html)、[Android云打包证书](https://ask.dcloud.net.cn/article/35985)。

真机的 `127.0.0.1` 指向手机自身；请在“连接设置”填写云服务器 HTTPS 地址。当前后端只绑定电脑回环地址，默认不向局域网开放。

## 运行验证

- 健康检查：不触发模型调用，不返回密钥。
- API错误只返回错误码、说明、是否可重试和请求ID，不暴露上游原文或异常堆栈。
- 修改服务端 `.env` 后重启API进程；不需要把密钥重新写入前端。
- 调用额度是全局每日100次上游尝试，每次重试也计数；默认每令牌/来源IP每分钟5次。

