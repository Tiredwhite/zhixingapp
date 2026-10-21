# 知行 0.3.3 发布记录

日期：2026-10-21  
状态：本机验收通过；服务器部署待 OrcaTerm SSH 重新连接。

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

## 安装包

- 本地文件：`.local/release/zhixing-0.3.3.apk`（20,467,948字节）。
- 计划公开地址：<https://tiredwhite.cn/downloads/zhixing-0.3.3.apk>；服务器发布前此地址尚未确认可下载。
- SHA-256：`b0dd75ffaa0357ba5ae384e97882390ccbde400ecdaefef40cca750fe161d86b`。
- 证书 SHA-256：`55f2f8b502519f23f545d0a69ef87fc0638a6f3cc3bf2c439d3986095164d9e1`，与先前安装包签名一致。

## 构建说明

HBuilderX 5.26 编译本版 uni-app App 资源；随后使用其随附的 apktool、zipalign 和 apksigner 工具，将资源更新到原有0.3.2 DCloud原生壳并沿用项目签名证书。最终实物 APK 已通过 `scripts/inspect-android.py` 检查。此构建记录不表示 DCloud 云打包任务已完成。

发布后应补记服务器版本、systemd 与 Nginx 验收、账号/配额数据库沿用情况、安装包公网哈希和下载状态。
