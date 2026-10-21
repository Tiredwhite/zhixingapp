# 知行 0.1.0 交付记录

日期：2026-10-20。课程演示版本。机主于2026-10-21完成初步手机验收，见文末补充。

## 安卓安装包

- 文件：`deliverables/知行-0.1.0.apk`
- 生成时间：2026-10-20 18:20，HBuilderX 5.26 安卓安心打包，自有项目签名。
- 版本：0.1.0，versionCode 100。
- 包名：`cn.tiredwhite.zhixing`；AppID：`__UNI__435D6C0`。
- 大小：20,447,068字节，约19.50MiB。
- 架构：arm64-v8a、armeabi-v7a；minSdk 21，targetSdk 28。
- SHA256：`3a1c4efecf348dba24cef1807fabf7c7615dacf98a3859953a80d9f5790bf351`。
- 公开签名证书SHA256：`55f2f8b502519f23f545d0a69ef87fc0638a6f3cc3bf2c439d3986095164d9e1`。

APK v2签名、ZIP CRC、身份及两种ARM架构检查通过。签名工具另输出43条v1 META-INF元数据提示，不将本次校验称为完整安全审计。

最终声明权限仅为：

1. `android.permission.INTERNET`
2. `android.permission.ACCESS_NETWORK_STATE`
3. `cn.tiredwhite.zhixing.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`，自定义signature级内部广播保护。

初包中的12项额外权限已从最终包移除。用部署者本机已知模型密钥、应用连接令牌和签名密码扫描APK全部ZIP条目，匹配数为0；未发现私钥文件或应用资源中残留的签名凭据字段。公开报告为 `deliverables/知行-0.1.0-安装包检查.json`，检查命令与限制见部署文档。

## 首次使用

把APK传到本人安卓手机并安装。服务器地址填写 `https://tiredwhite.cn`，连接令牌从本机忽略文件 `.local/secrets/知行连接信息.txt` 获取，不使用DeepSeek模型密钥。真机步骤和记录表见 [安卓验收清单](android-acceptance.md)。

HTTPS网页及后端已经在线。用户重新连接OrcaTerm后，已将同一安装包发布到 [安卓APK下载](https://tiredwhite.cn/downloads/zhixing-0.1.0.apk)。公网完整下载返回HTTP 200，实际下载20,447,068字节，SHA256与上述本机验签文件一致。仅公开APK，连接令牌、模型密钥和签名私钥未随安装包上传。未做应用商店上架验收。

## 课程资料状态

| 资料 | 当前状态 |
| --- | --- |
| 开发项目书 | Word版已生成并逐页核验 |
| 源码与Git记录 | 本地仓库及真实提交，未配置远端仓库 |
| 安卓APK | 已生成并完成文件检查，手机待测 |
| 实践报告 | 可编辑Word草稿，本人信息和实际参与待补 |
| AI工具使用声明 | 可编辑Word版，待本人复核签署 |
| 答辩PPT | 10页，含真实截图及结果边界，手机结果待补 |
| 三分钟演示 | 脚本已准备，实际手机录制待完成 |
| 20条效果评估 | AI拟定参考的公网预验收已完成，人工标准待复核 |

机主后续反馈：0.1.0在安卓手机安装、启动、真实AI解析、日期与原文依据核对、首次保存、飞行模式下本地修改，以及从最近任务移除后重开保留数据均正常。该反馈不覆盖重复保存、备份恢复和新版0.2.0升级测试。实际演示录像和本人签署不能由文件校验代替。依赖风险状态仍见 `dependency-review.md`。
