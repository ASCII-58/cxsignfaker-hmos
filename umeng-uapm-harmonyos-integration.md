# 友盟 U-APM HarmonyOS NEXT (ArkTS) 接入指南

> **状态：未采用**（2026-09-09 决定接自有 Sentry，由 Cloudflare Worker 转发 Envelope，见 `cloudflare-worker/crash-mailer.js` 与 `20260909.md`）。本文仅作第三方鸿蒙崩溃平台调研存档。

> 依据友盟官方文档 developer.umeng.com（U-APM「HarmonyOS Next接入说明」）、ohpm 包 README、info.umeng.com 产品公告整理，全部信息附来源链接（2026-09 查证）。

## 1. 获取 AppKey
1. 注册友盟+账号（建议企业邮箱），登录友盟+控制台 U-APM 产品。
2. 创建应用环节选择「**App端 - HarmonyOS Next - 应用性能监控SDK**」，即可获得该应用的 AppKey（公告原文：需开发者创建应用环节选择「App端-HarmonyOS Next-应用性能监控SDK」获取相关SDK，在线集成）。
3. AppKey 格式官方文档未公开说明，以控制台展示的字符串为准（文档示例仅写"你的appkey"）。

来源: https://info.umeng.com/detail?cateId=1&id=842 (2024-09-02 产品动态)
来源: https://info.umeng.com/detail?id=833&cateId=1 (免费版可用|U-APM一键接入鸿蒙)

## 2. 依赖引入（ohpm）
```shell
# 项目根目录执行（官方文档命令，registry 为华为官方 ohpm 仓库）
ohpm install @umeng/common --registry=https://ohpm.openharmony.cn/ohpm
ohpm install @umeng/analytics --registry=https://ohpm.openharmony.cn/ohpm
ohpm install @umeng/apm --registry=https://ohpm.openharmony.cn/ohpm
```
- 包名确认：`@umeng/common`（基础库）、`@umeng/analytics`（统计插件，preInit/init 所在）、`@umeng/apm`（APM 插件）。三者都需要（preInit/InternalPlugin/setLogEnabled/init 均从 @umeng/analytics 导入）。
- 等价的 oh-package.json5 写法（标准 ohpm 格式，官方文档用 CLI 安装）：
  ```json5
  "dependencies": { "@umeng/common": "^1.1.1", "@umeng/analytics": "^1.1.0", "@umeng/apm": "^1.4.0" }
  ```
- 版本要求：官方文档要求 **@umeng/common ≥ 1.1.1**（旧版 README 为 ≥1.0.31）。
- 遇到 ohpm 安装 Common 包报错：升级 ohpm / DevEco Studio 至当前 API 对应最高版本。

来源: https://developer.umeng.com/docs/193624/detail/2835970（接入与基础功能，主文档）
来源: ohpm registry API: https://ohpm.openharmony.cn/ohpmweb/registry/oh-package/openapi/v1/detail/@umeng%2Fapm 与 /@umeng%2Fcommon
来源: https://developer.umeng.com/docs/119267/detail/2932357（ohpm 报错）

## 3. 初始化代码（AbilityStage，不是 EntryAbility/UIAbility）
umconfig.json（必须存在，放 `AppScope/resources/rawfile/umconfig.json`）：
```json
{ "appKey": "你的appkey", "channel": "你的渠道" }
```
`entry/src/main/ets/abilityStage/MyAbilityStage.ets`：
```typescript
import AbilityStage from '@ohos.app.ability.AbilityStage';
import { preInit, InternalPlugin, setLogEnabled, init } from '@umeng/analytics';
import { ApmPlugin } from '@umeng/apm';

setLogEnabled(true); // 开发时打开调试日志，观察 SDK 是否集成成功（默认关闭）
export default class MyAbilityStage extends AbilityStage {
  onCreate() {
    preInit({
      context: this.context.getApplicationContext(),
      plugins: [new InternalPlugin(), new ApmPlugin()]
    });
    init(); // 必须在用户同意隐私政策后再调用，调用后才开始采集与传输
  }
}
```
module.json5（module 级）加 `"srcEntry": "./ets/abilityStage/MyAbilityStage.ets"`。
- API 签名：`preInit({context: common.ApplicationContext, plugins: [InternalPlugin, ApmPlugin], appKey?, channel?, disableScreen?...})`；`init()`；`setLogEnabled(enable: boolean)`；`ApmPlugin(config?: ApmConfig)`。
- preInit 也支持直接传 appKey/channel 覆盖 umconfig.json（代码优先级更高，但 umconfig.json 仍必须存在）；可结合 BuildProfile 按 debug/release 用不同 appkey。

来源: 同上主文档; https://developer.umeng.com/docs/119267/detail/2997487（动态 appkey/channel）
来源: https://developer.umeng.com/docs/119267/detail/2936957（必须在 AbilityStage 中 preInit）

## 4. 权限 / 配置
module.json5 的 `requestPermissions`：
```json
[
  { "name": "ohos.permission.APP_TRACKING_CONSENT",
    "reason": "$string:reason", "usedScene": {} },
  { "name": "ohos.permission.INTERNET" },
  { "name": "ohos.permission.GET_NETWORK_INFO" }
]
```
- `APP_TRACKING_CONSENT`（采集 OAID）非必须；若 IDE 报错需在 `entry/src/main/resources/base/element/string.json` 添加 reason 文案（如"采集oaid信息用于崩溃、性能分析"）。用户拒绝授权一般不影响功能，仅重装场景下去重指标可能偏差。
- 无混淆要求；HarmonyOS NEXT 无 ProGuard。合规配置另见《应用性能监控SDK（鸿蒙版）合规配置指引》。

来源: 主文档 2835970; https://developer.umeng.com/docs/119267/detail/2932316; https://developer.umeng.com/docs/147377/detail/2847371

## 5. U-APM 功能开关
- ApmPlugin(config) 可选项：`enableJSCatch`（JS 异常捕获，默认 true；false 时 JS 异常会崩溃退出但仍上报）、`runInWorker`（默认 true，worker 线程运行 APM 监控，不建议改）、`disableDiskFreeSize`（默认 false，true 时不采集剩余存储）。
- 崩溃/ANR 捕获随 ApmPlugin 集成即生效（公告：支持崩溃、ANR 异常捕获，后台"崩溃分析""ANR分析"菜单查看）；预初始化合规开关：disableScreen/disableOsVersion/disableDeviceModel/disableMarketName/disableDeviceType。
- 自定义异常上报：`UMCrash.generateCustomLog({type: ErrorType.JS_EXCEPTION|NATIVE_EXCEPTION, name, message, stack?, withHiLog?, timestamp?})`；受远程开关与采样率控制，队列上限 20 条，超出丢弃。

来源: 主文档 2835970; ohpm README（https://ohpm.openharmony.cn/ohpmweb/registry/oh-package/openapi/v1/detail/@umeng%2Fapm 中 readmeUrl）

## 6. 版本兼容
- 系统：**HarmonyOS NEXT API 12 及以上**、stage 模式普通应用；**不支持元服务**；仅在 HarmonyOS NEXT 手机端开发测试，未适配开源 OpenHarmony。
- SDK 版本（ohpm registry，2026-09 查证）：@umeng/apm 最新 1.4.0（2026-08-25 发布；1.3.0 2026-07-22）；@umeng/common 最新 1.2.0（2026-08-19）。

来源: 主文档 2835970; https://developer.umeng.com/docs/119267/detail/2936958、2936959; ohpm registry API

## 7. 验证方式
- `setLogEnabled(true)` 后看 hilog/控制台日志；复现错误后日志中 "Application Information" 的版本号即 SDK 上报版本号。
- 后台入口：友盟+ U-APM 首页与「崩溃分析」「ANR分析」菜单（鸿蒙数据与其他平台同在首页展示异常次数/影响用户数）。
- 若触发了 js crash 但后台无数据：确认 SDK ≥ 1.0.11，过低需升级。

来源: 主文档 2835970; https://info.umeng.com/detail?cateId=1&id=842; https://developer.umeng.com/docs/193624/detail/2990227、2990674

## 8. 已知坑（官方 FAQ / 文档）
1. JS Crash 后进程未关闭是正常现象：鸿蒙 JS 引擎异常通常局限于脚本线程，不终止主进程，APM 仍按有效 Crash 上报。（193624/detail/2990631）
2. js crash 后台无数据 → @umeng/apm 必须 ≥ 1.0.11。（193624/detail/2990674）
3. enableJSCatch=false 时 JS 异常会崩溃退出（true 时进程不退出但正常上报）。（主文档）
4. preInit 必须放在 AbilityStage.onCreate，不支持在 UIAbility 中执行。（119267/detail/2936957）
5. umconfig.json 必须存在，即使 preInit 已传 appKey/channel；代码配置优先。（119267/detail/2936954）
6. APP_TRACKING_CONSENT 拒绝授权一般不影响，但重装后新增/活跃指标可能偏差。（119267/detail/2932316）
7. ohpm 安装 common 报错 → 升级 ohpm 与 DevEco Studio（API 对应最高版本）。（119267/detail/2932357）
8. 关闭采集开关后数据"仍在更新"：可能为缓存，建议 8 小时后再确认；仍上报可用 errorFilter 黑名单过滤。（193624/detail/3000680）
9. 自定义异常队列上限 20 条，超出丢弃；建议在用户同意隐私政策后调用。（ohpm README）

> 未公开获取的内容：友盟未提供鸿蒙版 SDK 的 GitHub 仓库/issue 区（社区仅有第三方 Flutter 桥接如 HarmonyCandies/umeng_common_sdk_ohos）；控制台内"在线集成"步骤需登录可见。以上所有代码/参数均来自公开文档与 ohpm 包元数据。
