# 知行 0.3.1 安卓包记录

日期：2026-10-21。

- 本机文件：`.local/release/zhixing-0.3.1.apk`（忽略目录，仅供上传和验收，不提交到仓库）。
- 版本：0.3.1，versionCode 301；包名 `cn.tiredwhite.zhixing`；AppID `__UNI__435D6C0`。
- 大小：20,459,557 字节；SHA256：`132e8234c140257ba53cebfc6405f2d84a05ef94e156c64241da212d3ae6aed1`。
- ARM64、ARMv7；minSdk 21、targetSdk 28；APK v2签名通过。签名证书SHA256与0.1.0和0.2.0相同：`55f2f8b502519f23f545d0a69ef87fc0638a6f3cc3bf2c439d3986095164d9e1`。
- 权限仅包括网络访问、网络状态、读写日历及本应用的signature级广播保护权限。APK ZIP CRC有效；包中没有本机已知的模型密钥、应用连接令牌、签名密码或私钥文件，也没有嵌入签名字段。

安装包由 HBuilderX 5.26 输出，并通过 `scripts/inspect-android.py` 验证；详细机器报告保存在忽略目录 `.local/evaluation/zhixing-0.3.1-apk-inspection.json`。本记录对应的APK尚未发布到公网，0.3.1覆盖升级后的日历授权、Word/PDF选择器和小知聊天仍待安卓真机验收。
