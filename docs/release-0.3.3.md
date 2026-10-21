# 知行 0.3.3 发布记录

日期：2026-10-21  
状态：服务器部署和公网验收通过；手机真机复核待机主完成。

## 本次修复

- 将 PDF、DOC、DOCX 的服务端和客户端上传限制提高到20 MiB；Nginx 示例设为22 MB，给 multipart 请求留出余量。线上现配置的16 KB限制是 PDF 413 的直接原因，需部署时一并调整。
- 新增旧版 `.doc` 文档读取：服务器通过 `antiword` 提取文本，临时文件使用隔离目录并设有超时；`.docx` 和可搜索 PDF 继续支持。服务器尚需安装 `antiword` 才能启用 `.doc`。
- Android 设备没有可写日历时，通过系统 Calendar Provider 自动创建本机“知行”日历，再写入事件和提醒；仍遵循 Android 系统日历授权。
- 增加 App 登录墙和页面守卫，退出或会话过期后必须重新登录。生产 API 不再接受共享演示令牌代替账号会话。
- 账号数据库需要沿用0.3.2现有文件，部署时不得初始化覆盖；应用账号仅使用用户名和密码。

## 验收结果

- 后端 pytest：41项通过；移动端 Node 测试：32项通过。
- H5 与 App 资源由 HBuilderX 5.26 构建通过；浏览器流程9项通过，1项需显式启用真实模型的测试跳过。
- Android 桥接测试覆盖已有可写日历与自动创建本机日历；文档测试覆盖20 MiB限制、`.doc` 提取及转换器缺失提示；生产认证测试覆盖拒绝共享令牌。
- APK包名 `cn.tiredwhite.zhixing`、AppID `__UNI__435D6C0`、版本0.3.3/303、ARM64/ARMv7、APK v2签名、签名证书连续性和ZIP CRC均通过；无意外权限，已知私密值与私密文件匹配数为0。
- APK权限包含网络访问、读取/写入系统日历和应用内部广播保护权限。
- 尚未在用户手机上安装本包；真机覆盖安装、PDF/DOC/DOCX导入、自动建日历和登录拦截仍待机主复核。

## 线上发布

- 服务目录：`/home/ubuntu/zhixing-20261021-v0.3.3`；systemd drop-in：`/etc/systemd/system/zhixing.service.d/50-release-0.3.3.conf`；服务监听 `127.0.0.1:8002` 并报告active。
- 私有 `.env` 以600权限从0.3.2复制；账号库继续指向 `/home/ubuntu/zhixing-20261021-v0.3.2/server/data/accounts.sqlite3`，配额库继续指向 `/home/ubuntu/zhixing-20261020/server/data/quota.sqlite3`。上线前后数据库文件均仍在原路径，未在新目录创建空账号库。
- Nginx 上传限制从16 KB提高为22 MB；旧配置备份到 `/etc/nginx/sites-available/zhixing.backup-20261021-v0.3.3`。`nginx -t`和reload通过。安装 `antiword` 0.37-16 后可提取旧版 `.doc`。
- 网站已切换，旧站快照保留在 `/var/www/zhixing-backup-20261021-0.3.3`。公网首页返回HTTP 200（546字节），与本地发布首页SHA-256相同。
- 公网 `/healthz` 返回 `version=0.3.3`、`ai_configured=true`、`model_id=deepseek-flash`；systemd为active；匿名访问 `/api/v1/auth/me` 返回401。
- 公网向文档提取路由发送17,408字节匿名请求，返回401而非413，证明请求越过原Nginx 16 KB限制并到达API认证层。
- APK公网下载地址为 [知行0.3.3 APK](https://tiredwhite.cn/downloads/zhixing-0.3.3.apk)，返回HTTP 200、20,467,948字节；公网完整下载SHA-256与服务器文件和本机包一致。

## 安装包

- 本地文件：`.local/release/zhixing-0.3.3.apk`（20,467,948字节）。
- 公开地址：<https://tiredwhite.cn/downloads/zhixing-0.3.3.apk>；HTTP 200，公网完整下载的哈希已核对。
- SHA-256：`b0dd75ffaa0357ba5ae384e97882390ccbde400ecdaefef40cca750fe161d86b`。
- 证书 SHA-256：`55f2f8b502519f23f545d0a69ef87fc0638a6f3cc3bf2c439d3986095164d9e1`，与先前安装包签名一致。

## 构建说明

HBuilderX 5.26 编译本版 uni-app App 资源；随后使用其随附的 apktool、zipalign 和 apksigner 工具，将资源更新到原有0.3.2 DCloud原生壳并沿用项目签名证书。最终实物 APK 已通过 `scripts/inspect-android.py` 检查。此构建记录不表示 DCloud 云打包任务已完成。
