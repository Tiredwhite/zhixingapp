# 部署与真机调试

## 当前环境

移动端可以在 HBuilderX 5.26 中编辑并编译。API 使用 DeepSeek 官方兼容接口：`https://api.deepseek.com`，模型 ID `deepseek-flash`。模型密钥只放在 `server/.env` 的 `MODEL_API_KEY` 中，不出现在移动端、截图、仓库或应用备份里。

## 云服务器

正式部署前需要服务器系统、域名与 HTTPS 条件，以及现有的 SSH 登录方式。不要将登录密码或私钥提交到仓库。

1. 将代码部署到服务器，准备 Python 3.13 或 Docker Compose。
2. 在服务器创建 `server/.env`，参考 `.env.example` 填写模型信息并设置 `APP_ENV=production`。生产接口要求用户名/密码账号会话；`DEMO_ACCESS_TOKEN`只供本机开发测试，生产模式不接受它。
3. 在仓库根运行 `docker compose -f deploy/compose.yaml up -d --build`。API只映射到服务器回环地址，外部不能直接访问8000端口。每日额度存储在独立数据卷中，重建容器不清空配额。
4. 按服务器实际环境调整 `deploy/nginx.conf.example` 的域名、证书与静态目录，执行 Nginx 配置检查后启用。已有宝塔/1Panel/其他反代时，将 HTTPS `/api/` 与 `/healthz` 转发到 `127.0.0.1:8000` 即可。
5. 可选 Web 预览：在 mobile 执行 `npm ci` 与 `npm run build`，将 `dist/build/h5` 上传到配置的静态目录。移动端的“连接设置”填写 API 所在 HTTPS 域名和临时访问令牌。
6. 对外仅开放80/443和必要的管理端口。先验证健康接口，再用一条脱敏通知验证解析，最后检查配额、错误反馈和日志轮转。

0.3.0首次加入 `/api/v1/documents/extract`。0.3.3将反向代理上限提高到22 MB、服务端单文件上限提高到20 MB；支持PDF、`.docx`和由`antiword`解析的旧版`.doc`，PDF最多80页、提取文本最多12000字。0.3.4使用PyMuPDF渲染图片页、Tesseract `chi_sim+eng`识别扫描件，每份PDF最多OCR 5页，每页限时8秒；Docker镜像安装`antiword`、Tesseract和简体中文/英文语言包，systemd主机也需安装这些系统包。扫描页面的临时图像仅留在隔离临时目录。文件只在本次请求期间读取，不写入项目数据库或长期文件；只有用户点击“AI整理通知”后，提取文字才会发送给模型服务。

0.3.1修复聊天界面未读取请求对象中 Promise 的问题；安卓通过系统文档选择器导入 Word/PDF，直接创建系统日历事件和提醒。网站保留 Android 下载入口，App 内的下载按钮与介绍页内容仅对 H5 编译。

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

用户登录本人DCloud账号后，已创建uni-app类型应用“知行”，AppID为 `__UNI__435D6C0`。该ID已写入 `src/manifest.json` 并在重新编译的App资源中核对。签名文件和密码不提交仓库。

用户已确认使用安卓手机。当前预设包名为 `cn.tiredwhite.zhixing`，支持 `arm64-v8a` 和 `armeabi-v7a`。原有“知”字品牌标记已导出72/96/144/192像素安卓图标并写入manifest，App资源重新编译通过。配置不在启动时主动申请设备电话信息或外部存储权限；最终APK的实际权限仍需打包后核对。

DCloud开发者中心的安卓云证书状态已确认为“证书已生成”。用户完成本机HBuilderX登录后，官方CLI已返回实际账号信息。当前官方已下线公共测试证书，不选择该旧选项。本版普通uni-app打包调用选择云证书后仍要求自有证书信息，因此已为本项目生成独立RSA签名证书，保存在忽略目录 `.local/secrets/zhixing-release.jks`，对应凭据位于同目录 `android-signing.json`。后续更新必须保留并复用同一签名；这些文件不能提交或打入应用资源。参考：[AppID管理](https://uniapp.dcloud.net.cn/dev/app/introduction.html)、[Android云打包证书](https://ask.dcloud.net.cn/article/35985)。

已通过本机官方CLI安装 `app-safe-pack` 组件，命令返回“安装成功”，用于安卓安心打包。Vue 3编译器及依赖首次安装较慢，最终于17:21返回安装成功。HBuilderX打包检查未正确处理原图标相对路径，已建立忽略目录 `.local/android-hx`，仅在该独立源码副本中将图标改为绝对路径；原始源码配置保持可移植。私有打包配置位于 `.local/android-pack.json`。安心打包不支持证书绑定防重签，已关闭该项，仍保留AppID和包名绑定配置。

17:26打包资源检查已通过路径阶段，账号校验明确拒绝：当前账号及应用所有者尚未验证手机号。已在右侧开发者中心打开手机号验证窗口，等待用户本人接收短信并验证；未提交实际云任务或生成APK。检查另提示Android包名尚未录入，继续打包时将自动作为测试包名添加。未购买打包次数或付费服务，未据页面空白声称已核实免费额度。

用户完成手机号验证后，Sass编译组件安装成功，17:29首次实际提交安卓安心打包任务，17:53本机生成约20.45MB的正式签名APK。包名、AppID、版本、两种ARM架构及APK v2签名均核对通过，已知模型密钥、连接令牌和签名密码匹配数为0，未嵌入签名私钥文件。但实际包仍含框架默认电话状态、相册、外部存储和安装应用等多余权限，因此该初包不作为最终交付。

已按官方强制移除权限配置，在源码 `app-plus.distribute.android.excludePermissions` 显式排除12项不需要的权限。独立打包副本及标准CLI App资源构建已同步，17:56重新提交打包，尚待结果。最终包以 `scripts/inspect-android.py` 的实物检查为准。保留应用自定义的非导出广播保护权限，不把它误认为电话或媒体访问权限。参考：[移除Android权限](https://uniapp.dcloud.io/tutorial/app-nativeresource-android.html#移除android权限)。

后续可复现的打包准备：在仓库根执行 `python scripts/prepare-android.py`，脚本复制最新源码到新的忽略目录，修正本次HBuilderX图标路径问题，并使用既有项目签名生成私有配置；不会自动提交云任务或覆盖正在打包的目录。按输出路径通过 `cli.exe project open --path <准备目录>` 导入，再执行 `cli.exe pack --config <私有配置路径>`。不要将私有配置发到聊天或提交仓库。新电脑必须先单独恢复原签名证书和凭据，不能为了更新临时换证书。

安装包生成后执行 `server\.venv\Scripts\python.exe scripts/inspect-android.py <APK路径> --output .local/release/android-inspection.json`，核对实际签名、AppID、包名、架构、权限及已知秘密值。该检查不能代替手机安装或完整安全审计。

18:20权限精简版APK生成，检查全部通过，交付到 `deliverables/知行-0.1.0.apk`。最终权限仅为INTERNET、ACCESS_NETWORK_STATE及本应用signature级内部广播保护权限。详情和SHA256见 [版本交付记录](release-0.1.0.md)。用户重新连接OrcaTerm后，仅上传该APK至服务器，核对SHA256并原子发布到 `/var/www/zhixing/downloads/zhixing-0.1.0.apk`（目录755、文件644）。公网 [安卓APK下载](https://tiredwhite.cn/downloads/zhixing-0.1.0.apk) 完整下载验证HTTP 200、20,447,068字节，SHA256与本机验签文件一致。未更改现有Nginx配置；未公开源码、连接令牌、模型密钥或签名私钥。

2026-10-21的0.2.0更新继续沿用原服务与静态目录。新的无密钥归档上传为 `/home/ubuntu/zhixing-deploy_1.zip`，本机与服务器SHA256一致，66项文件经清单逐项校验后解压至 `/home/ubuntu/zhixing-20261021`。先将原后端模块备份到 `/home/ubuntu/zhixing-20261020/server/app-backup-20261021`，将网站整体备份到 `/var/www/zhixing-backup-20261021`，再替换后端模块并重启 `zhixing.service`；`server/.env`、SQLite配额数据库与虚拟环境仍在旧项目目录。网页先复制`assets/`和`static/`，最后原子替换`index.html`，保持`downloads/zhixing-0.1.0.apk`不变。Nginx配置未更改，语法检查通过。公网 `/healthz` 返回版本0.2.0，授权解析和深读的真实模型请求均返回200，首页字节摘要与本机构建相同。回归中发现原解析的格式修复提示误用深读字段，已单独将修正后的 `model.py` 按SHA256上传并同步到运行目录及暂存目录，重启成功。

0.2.0 APK通过实物验签和权限检查后，上传到服务器并核对SHA256，原子发布到 `/var/www/zhixing/downloads/zhixing-0.2.0.apk`。公网 [0.2.0安卓APK](https://tiredwhite.cn/downloads/zhixing-0.2.0.apk) 完整下载验证HTTP 200、20,447,068字节、SHA256 `8359ba402133f9cbaa9a545ef3fa2c700f65aa90cbef7007f052d2a045ff6228`，与本机验签包一致。0.1.0旧包仍可下载且字节数核对正常。0.2手机覆盖更新和实际AI深读体验仍待机主验证。

真机的 `127.0.0.1` 指向手机自身；请在“连接设置”填写 `https://tiredwhite.cn` 和应用连接令牌。本机开发后端只绑定电脑回环地址；线上后端绑定服务器的127.0.0.1:8002，通过Nginx提供HTTPS访问。

## 0.3.0 已部署记录（2026-10-21）

新版已发布到 `https://tiredwhite.cn/`。代码目录为 `/home/ubuntu/zhixing-20261021-v0.3.0`，通过 systemd drop-in `/etc/systemd/system/zhixing.service.d/20-release-0.3.0.conf` 切换工作目录和虚拟环境；`.env` 以600权限复制，AI密钥没有进入静态目录或公开包。`QUOTA_DB` 仍指向0.2.0使用的SQLite配额文件，避免重置现有额度数据。旧网站快照保留在 `/var/www/zhixing-backup-20261021-0.3.0`。

公网健康接口返回 `version=0.3.0`、`ai_configured=true`、`model_id=deepseek-flash`；systemd服务为active，Nginx语法检查通过。首页的“下载 App”可打开Android介绍页，页面展示AI深读、Word/PDF导入和日历提醒；安装包地址为 [知行0.3.0 APK](https://tiredwhite.cn/downloads/zhixing-0.3.0.apk)，公网HEAD返回HTTP 200及20,459,557字节。服务器文件与本机签名APK SHA256一致：`bd48418f2da1deebe9024ffa8a4cfcd791c73d2258d80679f47058f21785415b`。0.1.0和0.2.0下载地址保留。

首次上线时静态资源因归档权限为600而被Nginx拒绝，已把 `/var/www/zhixing/assets` 与 `/var/www/zhixing/static` 内目录修正为755、文件修正为644，并通过公网确认JS/CSS返回200、下载页正常渲染。`scripts/package-deploy.py` 已改为在部署包中写入常规644文件权限，避免后续重建产生相同问题。新APK覆盖升级尚待机主在安卓手机验证；尤其需确认首次日历授权、Word/PDF导入与小知聊天行为。

## 0.3.1 已部署（2026-10-21）

新版后端位于 `/home/ubuntu/zhixing-20261021-v0.3.1`，由 systemd drop-in `/etc/systemd/system/zhixing.service.d/30-release-0.3.1.conf` 切换。服务复用现有Python虚拟环境并监听 `127.0.0.1:8002`；配额数据库路径沿用0.3.0，未重置原有额度数据。新目录 `.env` 从现役配置复制并按授权同步轮换后的应用连接令牌，保留原模型密钥与配额配置，权限为600。旧网页备份保存在 `/var/www/zhixing-backup-20261021-0.3.1`。

新版网页资源先复制至 `/var/www/zhixing`，最后原子替换 `index.html`；已有下载目录及0.1.0、0.2.0、0.3.0安装包保留。0.3.1 APK发布为 `/var/www/zhixing/downloads/zhixing-0.3.1.apk`，SHA256为 `132e8234c140257ba53cebfc6405f2d84a05ef94e156c64241da212d3ae6aed1`。完整公网GET返回HTTP 200和20,459,557字节，哈希与本机签名包一致。Nginx语法检查通过，systemd服务为active，公网健康接口报告 `version=0.3.1`、`ai_configured=true`、`model_id=deepseek-flash`。真实聊天问答以及合成Word/PDF文档提取均经公网接口返回HTTP 200。详细包检查见 [0.3.1发布记录](release-0.3.1.md)。安卓覆盖安装后的日历、文档导入、聊天、旧数据保留和新连接令牌仍待用户在真机复核。

## 0.3.2 已部署（2026-10-21）

新版服务位于 `/home/ubuntu/zhixing-20261021-v0.3.2`，由 systemd drop-in `/etc/systemd/system/zhixing.service.d/40-release-0.3.2.conf` 切换。服务复用现有 Python 虚拟环境，继续监听 `127.0.0.1:8002`。新 `.env` 继承现役私有配置并设为600权限；额度库继续使用 `/home/ubuntu/zhixing-20261020/server/data/quota.sqlite3`，账号库写入新版本 `server/data/accounts.sqlite3`。网站静态资源已更新并原子替换首页，旧版本安装包仍保留。0.3.2 APK发布到 `/var/www/zhixing/downloads/zhixing-0.3.2.apk`，大小20,463,852字节，服务器SHA256与本机签名包一致。公网下载地址返回HTTP 200和正确的Content-Length；公网首页及入口JS的SHA256与本地发布包一致。Nginx语法检查通过，systemd服务active，公网 `/healthz` 返回 `version=0.3.2`、`ai_configured=true`、`model_id=deepseek-flash`。未携带认证信息访问 `/api/v1/auth/me` 返回401，注册路由按预期拒绝GET方法（405）。安卓覆盖安装后的真机日历、文档选择器、账号注册登录和聊天交互仍需用户复核。发布记录见 [0.3.2发布记录](release-0.3.2.md)。

## 0.3.3 部署（2026-10-21）

0.3.3 后端位于 `/home/ubuntu/zhixing-20261021-v0.3.3`，由 `/etc/systemd/system/zhixing.service.d/50-release-0.3.3.conf` 切换，复用既有虚拟环境并监听 `127.0.0.1:8002`。生产 `.env` 从0.3.2复制，权限600；`AUTH_DB` 明确沿用 `/home/ubuntu/zhixing-20261021-v0.3.2/server/data/accounts.sqlite3`，`QUOTA_DB` 沿用 `/home/ubuntu/zhixing-20261020/server/data/quota.sqlite3`。部署前账号库为600权限、24,576字节，额度库为12,288字节；部署后两文件仍存在，新版本目录未生成空账号库。服务器安装 `antiword` 0.37-16，供旧版 `.doc` 提取文本。

线上 Nginx 原上传限制只有16 KB，已先备份至 `/etc/nginx/sites-available/zhixing.backup-20261021-v0.3.3`，再调至22 MB并通过 `nginx -t`、reload。公网匿名发送17,408字节到文档提取路由到达认证层并返回401，不再被代理以413拒绝。新网站已切换到 `/var/www/zhixing`，旧站完整快照为 `/var/www/zhixing-backup-20261021-0.3.3`。

systemd 为active，公网 `/healthz` 返回 `version=0.3.3`、`ai_configured=true`、`model_id=deepseek-flash`；未登录访问 `/api/v1/auth/me` 返回401。首页返回HTTP 200，线上首页SHA-256与发布文件一致。0.3.3 APK 位于 `/var/www/zhixing/downloads/zhixing-0.3.3.apk`；公网下载返回HTTP 200、`Content-Length: 20467948`，完整公网下载计算出的SHA-256与本机签名包一致：`b0dd75ffaa0357ba5ae384e97882390ccbde400ecdaefef40cca750fe161d86b`。地址：[知行0.3.3 APK](https://tiredwhite.cn/downloads/zhixing-0.3.3.apk)。既有安装包链接仍保留。检查详情见 [0.3.3发布记录](release-0.3.3.md)。手机覆盖安装和真实账号的PDF/DOC/DOCX导入、日历写入及登录流程仍待机主复核。

## 0.3.4 部署（2026-10-21）

后端发布到独立目录 `/home/ubuntu/zhixing-20261021-v0.3.4`，由 `/etc/systemd/system/zhixing.service.d/60-release-0.3.4.conf` 切换。创建独立 Python 3.13.16 虚拟环境并安装锁定依赖，包括 PyMuPDF 1.28.2；Tesseract 已配置 `chi_sim`、`eng`。`.env` 从0.3.3继承、权限600，账号库和配额库仍使用原路径 `/home/ubuntu/zhixing-20261021-v0.3.2/server/data/accounts.sqlite3` 与 `/home/ubuntu/zhixing-20261020/server/data/quota.sqlite3`，部署后文件仍分别为24,576和12,288字节。没有在新目录创建账号库。

服务重启后状态为active；本地与公网 `/healthz` 返回 `version=0.3.4`、`ai_configured=true`、`model_id=deepseek-flash`。服务器端直接调用生产 `extract_document` 函数处理合成扫描 PDF，OCR识别到预期英文文本并返回1页识别计数。Nginx配置及既有22 MB上传限制未改动。网站更新前备份到 `/var/www/zhixing-backup-20261021-0.3.4`，新静态资源复制到 `/var/www/zhixing`；公网首页摘要与本机发布一致。0.3.4 APK上传到 `/var/www/zhixing/downloads/zhixing-0.3.4.apk`，完整公网下载返回HTTP 200、24,432,932字节，SHA-256 与本机包相同。地址：[知行0.3.4 APK](https://tiredwhite.cn/downloads/zhixing-0.3.4.apk)。详见 [0.3.4发布记录](release-0.3.4.md)。真机覆盖安装、扫描 PDF 和 iQOO 9 系统日历写入仍待用户复核。

## SPA 首页缓存策略修复（2026-10-21）

针对手机浏览器继续使用旧下载页入口的情况，备份线上站点配置到 `/etc/nginx/sites-available/zhixing.backup-20261021-cache-policy`。`/` 与 `/index.html` 设置 `Cache-Control: no-cache, no-store, must-revalidate`、`Pragma: no-cache`，`/assets/` 哈希资源设置一年期 `immutable` 缓存。`nginx -t` 通过并重载成功；公网对 `/`、`/index.html` 的 HEAD 请求均返回HTTP 200及不缓存响应头，版本化 JS 返回HTTP 200、`public, max-age=31536000, immutable`，脚本仍报告0.3.4。

## 运行验证

- 健康检查：不触发模型调用，不返回密钥。
- API错误只返回错误码、说明、是否可重试和请求ID，不暴露上游原文或异常堆栈。
- 修改服务端 `.env` 后重启API进程；不需要把密钥重新写入前端。
- 调用额度是全局每日100次上游尝试，每次重试也计数；默认每令牌/来源IP每分钟5次。

## 0.3.8 Android 日历修复发布（2026-10-21）

更新网站静态资源和安卓安装包；未修改后端。发布前网站备份：`/var/www/zhixing-backup-20261021-0.3.8`。新 APK 位于 `/var/www/zhixing/downloads/zhixing-0.3.8.apk`，公网完整下载与本机 SHA-256 一致。网站下载页显示 Android 0.3.8，`nginx -t` 通过且 Nginx active。H5入口通过原子替换 `index.html` 生效，缓存校验时使用 `?release=038`。

## 0.3.8 AI 深读引用容错热修复（2026-10-21）

后端热修复部署到独立目录 `/home/ubuntu/zhixing-20261021-v0.3.8/server`，通过 `/etc/systemd/system/zhixing.service.d/80-release-0.3.8.conf` 切换 systemd 工作目录。复用已有 Python 虚拟环境和 `127.0.0.1:8002` 监听；生产 `.env` 从现役配置复制并设为600权限，账号库与额度库路径保持不变。仅更新 `app/main.py` 和 `app/model.py`；网站静态资源、APK未改动，原0.3.7目录与systemd配置保留作回退。

重启后 systemd 为active，本机及公网 `/healthz` 均返回 `version=0.3.8`、`ai_configured=true`、`model_id=deepseek-flash`。用户 iQOO 9 上对同一条2,984字通知连续完成3次实时 AI 深读，均通过字段及原文引用核验。模型密钥未输出、未写入仓库。

