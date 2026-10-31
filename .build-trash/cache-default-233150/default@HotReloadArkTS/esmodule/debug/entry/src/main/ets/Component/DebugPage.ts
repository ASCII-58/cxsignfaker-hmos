if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface DebugPage_Params {
    context?;
    dbInfo?: string;
    onnxStatus?: string;
    onnxResult?: string;
    onnxRunning?: boolean;
    pathInfos?: NavPathStack;
    captchaDemoShow?: boolean;
    demoSession?: number;
    demoLog?: string;
    testClientId?: string;
    testLog?: string;
    testRunning?: boolean;
    faceLog?: string;
    faceImagePath?: string;
    randSrcPath?: string;
    randOutPath?: string;
    randLog?: string;
    randSrcRound?: number;
    randOutRound?: number;
    lastRandHash?: string;
    profileLog?: string;
    profileImagePath?: string;
    crashReportStatus?: string;
    crashSending?: boolean;
    crashSendLog?: string;
}
import promptAction from "@ohos:promptAction";
import type common from "@ohos:app.ability.common";
import preferences from "@ohos:data.preferences";
import image from "@ohos:multimedia.image";
import picker from "@ohos:file.picker";
import type { BusinessError } from "@ohos:base";
import hilog from "@ohos:hilog";
import fs from "@ohos:file.fs";
import { DatabaseManager } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import { MsCaptchaDetector } from "@normalized:N&&&entry/src/main/ets/utils/detector/MsCaptchaDetector&";
import { CaptchaComponent } from "@normalized:N&&&entry/src/main/ets/Component/Captcha&";
import type { CaptchaUserParam } from "@normalized:N&&&entry/src/main/ets/Component/Captcha&";
import { Sign, parseSignResult } from "@normalized:N&&&entry/src/main/ets/utils/sign&";
import { writeBufferToFile } from "@normalized:N&&&entry/src/main/ets/utils/httpClient&";
import { FaceApi, randomizeFaceImage } from "@normalized:N&&&entry/src/main/ets/utils/faceApi&";
import type { FaceResultParam } from "@normalized:N&&&entry/src/main/ets/utils/faceApi&";
import { randomizeImageInPlace } from "@normalized:N&&&entry/src/main/ets/utils/upload&";
import { sendTestCrashReport } from "@normalized:N&&&entry/src/main/ets/utils/CrashReporter&";
const ONNX_TEST_TAG = 'OnnxTest';
const SIGN_TIME = 'sign_time';
const VERSION = 'version';
const SIGN_EXPIRY_MS = 12 * 30 * 24 * 60 * 60 * 1000;
const BACKUP_REMINDER_MS = 11 * 30 * 24 * 60 * 60 * 1000;
const IMAGE_RAWFILE = 'models/test.jpg';
/** 本地解析用例：签到接口原始返回文本 → 期望解析出的 SignOutcome.kind */
interface ParseCase {
    raw: string;
    expectKind: string;
}
const PARSE_CASES: ParseCase[] = [
    { raw: 'success', expectKind: 'success' },
    { raw: '[face]检测到非本人', expectKind: 'face' },
    { raw: 'success2', expectKind: 'ended' },
    { raw: '签到失败，请重新扫描。', expectKind: 'qrcodeExpired' },
    { raw: 'errorLocation_512', expectKind: 'wrongPosition' },
    { raw: '您已签到过了', expectKind: 'already' },
    { raw: 'validate:abcdef123456', expectKind: 'captcha' },
    { raw: '<html>500 Internal Server Error</html>', expectKind: 'error' }
];
export class DebugPage extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.context = getContext(this) as common.UIAbilityContext;
        this.__dbInfo = new ObservedPropertySimplePU('', this, "dbInfo");
        this.__onnxStatus = new ObservedPropertySimplePU('', this, "onnxStatus");
        this.__onnxResult = new ObservedPropertySimplePU('', this, "onnxResult");
        this.__onnxRunning = new ObservedPropertySimplePU(false, this, "onnxRunning");
        this.__pathInfos = this.initializeConsume('pathInfos', "pathInfos");
        this.__captchaDemoShow = new ObservedPropertySimplePU(false, this, "captchaDemoShow");
        this.__demoSession = new ObservedPropertySimplePU(1, this, "demoSession");
        this.__demoLog = new ObservedPropertySimplePU('尚未触发回调', this, "demoLog");
        this.__testClientId = new ObservedPropertySimplePU('', this, "testClientId");
        this.__testLog = new ObservedPropertySimplePU('尚未运行任何测试', this, "testLog");
        this.__testRunning = new ObservedPropertySimplePU(false, this, "testRunning");
        this.__faceLog = new ObservedPropertySimplePU('尚未运行', this, "faceLog");
        this.__faceImagePath = new ObservedPropertySimplePU('', this, "faceImagePath");
        this.__randSrcPath = new ObservedPropertySimplePU('', this, "randSrcPath");
        this.__randOutPath = new ObservedPropertySimplePU('', this, "randOutPath");
        this.__randLog = new ObservedPropertySimplePU('尚未运行', this, "randLog");
        this.randSrcRound = 0;
        this.randOutRound = 0;
        this.lastRandHash = '';
        this.__profileLog = new ObservedPropertySimplePU('尚未获取', this, "profileLog");
        this.__profileImagePath = new ObservedPropertySimplePU('', this, "profileImagePath");
        this.__crashReportStatus = this.createStorageProp('crashReportStatus', '', "crashReportStatus");
        this.__crashSending = new ObservedPropertySimplePU(false, this, "crashSending");
        this.__crashSendLog = new ObservedPropertySimplePU('尚未发送', this, "crashSendLog");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: DebugPage_Params) {
        if (params.context !== undefined) {
            this.context = params.context;
        }
        if (params.dbInfo !== undefined) {
            this.dbInfo = params.dbInfo;
        }
        if (params.onnxStatus !== undefined) {
            this.onnxStatus = params.onnxStatus;
        }
        if (params.onnxResult !== undefined) {
            this.onnxResult = params.onnxResult;
        }
        if (params.onnxRunning !== undefined) {
            this.onnxRunning = params.onnxRunning;
        }
        if (params.captchaDemoShow !== undefined) {
            this.captchaDemoShow = params.captchaDemoShow;
        }
        if (params.demoSession !== undefined) {
            this.demoSession = params.demoSession;
        }
        if (params.demoLog !== undefined) {
            this.demoLog = params.demoLog;
        }
        if (params.testClientId !== undefined) {
            this.testClientId = params.testClientId;
        }
        if (params.testLog !== undefined) {
            this.testLog = params.testLog;
        }
        if (params.testRunning !== undefined) {
            this.testRunning = params.testRunning;
        }
        if (params.faceLog !== undefined) {
            this.faceLog = params.faceLog;
        }
        if (params.faceImagePath !== undefined) {
            this.faceImagePath = params.faceImagePath;
        }
        if (params.randSrcPath !== undefined) {
            this.randSrcPath = params.randSrcPath;
        }
        if (params.randOutPath !== undefined) {
            this.randOutPath = params.randOutPath;
        }
        if (params.randLog !== undefined) {
            this.randLog = params.randLog;
        }
        if (params.randSrcRound !== undefined) {
            this.randSrcRound = params.randSrcRound;
        }
        if (params.randOutRound !== undefined) {
            this.randOutRound = params.randOutRound;
        }
        if (params.lastRandHash !== undefined) {
            this.lastRandHash = params.lastRandHash;
        }
        if (params.profileLog !== undefined) {
            this.profileLog = params.profileLog;
        }
        if (params.profileImagePath !== undefined) {
            this.profileImagePath = params.profileImagePath;
        }
        if (params.crashSending !== undefined) {
            this.crashSending = params.crashSending;
        }
        if (params.crashSendLog !== undefined) {
            this.crashSendLog = params.crashSendLog;
        }
    }
    updateStateVars(params: DebugPage_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__dbInfo.purgeDependencyOnElmtId(rmElmtId);
        this.__onnxStatus.purgeDependencyOnElmtId(rmElmtId);
        this.__onnxResult.purgeDependencyOnElmtId(rmElmtId);
        this.__onnxRunning.purgeDependencyOnElmtId(rmElmtId);
        this.__pathInfos.purgeDependencyOnElmtId(rmElmtId);
        this.__captchaDemoShow.purgeDependencyOnElmtId(rmElmtId);
        this.__demoSession.purgeDependencyOnElmtId(rmElmtId);
        this.__demoLog.purgeDependencyOnElmtId(rmElmtId);
        this.__testClientId.purgeDependencyOnElmtId(rmElmtId);
        this.__testLog.purgeDependencyOnElmtId(rmElmtId);
        this.__testRunning.purgeDependencyOnElmtId(rmElmtId);
        this.__faceLog.purgeDependencyOnElmtId(rmElmtId);
        this.__faceImagePath.purgeDependencyOnElmtId(rmElmtId);
        this.__randSrcPath.purgeDependencyOnElmtId(rmElmtId);
        this.__randOutPath.purgeDependencyOnElmtId(rmElmtId);
        this.__randLog.purgeDependencyOnElmtId(rmElmtId);
        this.__profileLog.purgeDependencyOnElmtId(rmElmtId);
        this.__profileImagePath.purgeDependencyOnElmtId(rmElmtId);
        this.__crashReportStatus.purgeDependencyOnElmtId(rmElmtId);
        this.__crashSending.purgeDependencyOnElmtId(rmElmtId);
        this.__crashSendLog.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__dbInfo.aboutToBeDeleted();
        this.__onnxStatus.aboutToBeDeleted();
        this.__onnxResult.aboutToBeDeleted();
        this.__onnxRunning.aboutToBeDeleted();
        this.__pathInfos.aboutToBeDeleted();
        this.__captchaDemoShow.aboutToBeDeleted();
        this.__demoSession.aboutToBeDeleted();
        this.__demoLog.aboutToBeDeleted();
        this.__testClientId.aboutToBeDeleted();
        this.__testLog.aboutToBeDeleted();
        this.__testRunning.aboutToBeDeleted();
        this.__faceLog.aboutToBeDeleted();
        this.__faceImagePath.aboutToBeDeleted();
        this.__randSrcPath.aboutToBeDeleted();
        this.__randOutPath.aboutToBeDeleted();
        this.__randLog.aboutToBeDeleted();
        this.__profileLog.aboutToBeDeleted();
        this.__profileImagePath.aboutToBeDeleted();
        this.__crashReportStatus.aboutToBeDeleted();
        this.__crashSending.aboutToBeDeleted();
        this.__crashSendLog.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private context;
    private __dbInfo: ObservedPropertySimplePU<string>;
    get dbInfo() {
        return this.__dbInfo.get();
    }
    set dbInfo(newValue: string) {
        this.__dbInfo.set(newValue);
    }
    private __onnxStatus: ObservedPropertySimplePU<string>;
    get onnxStatus() {
        return this.__onnxStatus.get();
    }
    set onnxStatus(newValue: string) {
        this.__onnxStatus.set(newValue);
    }
    private __onnxResult: ObservedPropertySimplePU<string>;
    get onnxResult() {
        return this.__onnxResult.get();
    }
    set onnxResult(newValue: string) {
        this.__onnxResult.set(newValue);
    }
    private __onnxRunning: ObservedPropertySimplePU<boolean>;
    get onnxRunning() {
        return this.__onnxRunning.get();
    }
    set onnxRunning(newValue: boolean) {
        this.__onnxRunning.set(newValue);
    }
    private __pathInfos: ObservedPropertyAbstractPU<NavPathStack>;
    get pathInfos() {
        return this.__pathInfos.get();
    }
    set pathInfos(newValue: NavPathStack) {
        this.__pathInfos.set(newValue);
    }
    // 验证码弹窗演示（全本地模拟，不访问网络）
    private __captchaDemoShow: ObservedPropertySimplePU<boolean>;
    get captchaDemoShow() {
        return this.__captchaDemoShow.get();
    }
    set captchaDemoShow(newValue: boolean) {
        this.__captchaDemoShow.set(newValue);
    }
    private __demoSession: ObservedPropertySimplePU<number>;
    get demoSession() {
        return this.__demoSession.get();
    }
    set demoSession(newValue: number) {
        this.__demoSession.set(newValue);
    }
    private __demoLog: ObservedPropertySimplePU<string>;
    get demoLog() {
        return this.__demoLog.get();
    }
    set demoLog(newValue: string) {
        this.__demoLog.set(newValue);
    }
    // 签到验证本地校验（不访问网络）
    private __testClientId: ObservedPropertySimplePU<string>;
    get testClientId() {
        return this.__testClientId.get();
    }
    set testClientId(newValue: string) {
        this.__testClientId.set(newValue);
    }
    private __testLog: ObservedPropertySimplePU<string>;
    get testLog() {
        return this.__testLog.get();
    }
    set testLog(newValue: string) {
        this.__testLog.set(newValue);
    }
    private __testRunning: ObservedPropertySimplePU<boolean>;
    get testRunning() {
        return this.__testRunning.get();
    }
    set testRunning(newValue: boolean) {
        this.__testRunning.set(newValue);
    }
    // 人脸识别全流程本地模拟（不访问网络）
    private __faceLog: ObservedPropertySimplePU<string>;
    get faceLog() {
        return this.__faceLog.get();
    }
    set faceLog(newValue: string) {
        this.__faceLog.set(newValue);
    }
    private __faceImagePath: ObservedPropertySimplePU<string>;
    get faceImagePath() {
        return this.__faceImagePath.get();
    }
    set faceImagePath(newValue: string) {
        this.__faceImagePath.set(newValue);
    }
    // 图片随机化本地演示（issue #209，仅本地展示不上传）
    private __randSrcPath: ObservedPropertySimplePU<string>;
    get randSrcPath() {
        return this.__randSrcPath.get();
    }
    set randSrcPath(newValue: string) {
        this.__randSrcPath.set(newValue);
    }
    private __randOutPath: ObservedPropertySimplePU<string>;
    get randOutPath() {
        return this.__randOutPath.get();
    }
    set randOutPath(newValue: string) {
        this.__randOutPath.set(newValue);
    }
    private __randLog: ObservedPropertySimplePU<string>;
    get randLog() {
        return this.__randLog.get();
    }
    set randLog(newValue: string) {
        this.__randLog.set(newValue);
    }
    private randSrcRound: number;
    private randOutRound: number;
    private lastRandHash: string;
    // 默认人脸查看（联网：主用户 cookie 拉取云盘默认人脸，仅查看）
    private __profileLog: ObservedPropertySimplePU<string>;
    get profileLog() {
        return this.__profileLog.get();
    }
    set profileLog(newValue: string) {
        this.__profileLog.set(newValue);
    }
    private __profileImagePath: ObservedPropertySimplePU<string>;
    get profileImagePath() {
        return this.__profileImagePath.get();
    }
    set profileImagePath(newValue: string) {
        this.__profileImagePath.set(newValue);
    }
    // 崩溃上报链路状态（CrashReporter 写入 AppStorage，用于 Debug 面板排查）
    private __crashReportStatus: ObservedPropertyAbstractPU<string>;
    get crashReportStatus() {
        return this.__crashReportStatus.get();
    }
    set crashReportStatus(newValue: string) {
        this.__crashReportStatus.set(newValue);
    }
    // 崩溃邮件发送链路测试（不崩溃，直接 POST 测试负载到 Worker）
    private __crashSending: ObservedPropertySimplePU<boolean>;
    get crashSending() {
        return this.__crashSending.get();
    }
    set crashSending(newValue: boolean) {
        this.__crashSending.set(newValue);
    }
    private __crashSendLog: ObservedPropertySimplePU<string>;
    get crashSendLog() {
        return this.__crashSendLog.get();
    }
    set crashSendLog(newValue: string) {
        this.__crashSendLog.set(newValue);
    }
    async aboutToAppear() {
        await this.loadInfo();
    }
    aboutToDisappear() {
        // MindSpore Lite 模型进程级常驻（MsCaptchaDetector.load 缓存），不在此处关闭
    }
    async loadInfo() {
        try {
            const dbManager = DatabaseManager.getInstance();
            const hostCount = await dbManager.getTableCount('HostUser');
            const otherCount = await dbManager.getTableCount('OtherUser');
            const signInfo = await this.getSignInfo();
            this.dbInfo = `HostUser: ${hostCount} 条, OtherUser: ${otherCount} 条\n\n${signInfo}`;
        }
        catch (e) {
            this.dbInfo = '加载失败';
        }
    }
    async getSignInfo(): Promise<string> {
        let pref = await preferences.getPreferences(this.context, 'settings');
        const signTime = await pref.get(SIGN_TIME, 0) as number;
        const ver = await pref.get(VERSION, '') as string;
        if (signTime === 0) {
            return '签名时间: 未记录\n版本: 未记录';
        }
        const date = new Date(signTime);
        const elapsed = Date.now() - signTime;
        const days = Math.floor(elapsed / (24 * 60 * 60 * 1000));
        let statusLine: string;
        if (elapsed >= SIGN_EXPIRY_MS) {
            statusLine = '状态: 已过期';
        }
        else if (elapsed >= BACKUP_REMINDER_MS) {
            const remain = Math.ceil((SIGN_EXPIRY_MS - elapsed) / (24 * 60 * 60 * 1000));
            statusLine = `状态: 即将过期 (剩余约${remain}天)`;
        }
        else {
            statusLine = '状态: 有效';
        }
        return `签名时间: ${date.toISOString().substring(0, 10)}\n版本: ${ver}\n${statusLine}\n已过 ${days} 天`;
    }
    async resetSignState() {
        try {
            let pref = await preferences.getPreferences(this.context, 'settings');
            await pref.delete(SIGN_TIME);
            await pref.delete(VERSION);
            await pref.flush();
            this.dbInfo = '';
            promptAction.showToast({ message: '签名状态已重置' });
        }
        catch (e) {
            promptAction.showToast({ message: '重置失败' });
        }
    }
    async setSignTimeToTriggerReminder() {
        try {
            const target = Date.now() - BACKUP_REMINDER_MS - 60 * 1000;
            let pref = await preferences.getPreferences(this.context, 'settings');
            await pref.put(SIGN_TIME, target);
            await pref.put(VERSION, '1.0.0-debug');
            await pref.flush();
            this.dbInfo = '';
            promptAction.showToast({ message: '签名时间已设为11个月前，下次启动将触发备份提醒' });
        }
        catch (e) {
            promptAction.showToast({ message: '设置失败' });
        }
    }
    async setSignTimeExpired() {
        try {
            const target = Date.now() - SIGN_EXPIRY_MS - 60 * 1000;
            let pref = await preferences.getPreferences(this.context, 'settings');
            await pref.put(SIGN_TIME, target);
            await pref.put(VERSION, '1.0.0-debug');
            await pref.flush();
            this.dbInfo = '';
            promptAction.showToast({ message: '签名时间已设为过期' });
        }
        catch (e) {
            promptAction.showToast({ message: '设置失败' });
        }
    }
    /** 崩溃邮件发送链路测试：不制造崩溃，直接 POST 一条测试负载到 Worker（等价于崩溃后重启时上报的那次请求） */
    private async testCrashSend() {
        if (this.crashSending) {
            return;
        }
        this.crashSending = true;
        this.crashSendLog = '发送中...';
        try {
            await sendTestCrashReport();
            this.crashSendLog = '✔ 发送成功（HTTP 200），请查收邮箱';
            promptAction.showToast({ message: '测试邮件已提交，请查收邮箱' });
        }
        catch (e) {
            this.crashSendLog = `✘ 发送失败: ${(e as Error).message}`;
            promptAction.showToast({ message: '发送失败，详见日志' });
        }
        finally {
            this.crashSending = false;
        }
    }
    async setSignDaysAgo(days: number) {
        try {
            const target = Date.now() - days * 24 * 60 * 60 * 1000;
            let pref = await preferences.getPreferences(this.context, 'settings');
            await pref.put(SIGN_TIME, target);
            await pref.put(VERSION, '1.0.0-debug');
            await pref.flush();
            this.dbInfo = '';
            promptAction.showToast({ message: `签名时间已设为 ${days} 天前` });
        }
        catch (e) {
            promptAction.showToast({ message: '设置失败' });
        }
    }
    async runOnnxTest() {
        hilog.info(0x0000, ONNX_TEST_TAG, 'runOnnxTest invoked, running=%{public}s', String(this.onnxRunning));
        if (this.onnxRunning) {
            return;
        }
        this.onnxRunning = true;
        this.onnxResult = '';
        let pixelMap: image.PixelMap | undefined = undefined;
        try {
            const start = Date.now();
            const loadMs = await MsCaptchaDetector.load(this.context);
            pixelMap = await this.loadTestImage();
            // 封装后的完整调用：输入一张图片，输出一个数值（滑块 x 偏移）
            const xOffset = await MsCaptchaDetector.detect(pixelMap);
            hilog.info(0x0000, ONNX_TEST_TAG, 'detect done, %{public}d ms', Date.now() - start);
            this.onnxStatus = `MindSpore Lite（加载 ${loadMs}ms），耗时 ${Date.now() - start}ms`;
            this.onnxResult = xOffset >= 0
                ? `x_offset: ${xOffset}（test.jpg 基准 258）`
                : '未检测到滑块';
        }
        catch (e) {
            const err = e as BusinessError;
            hilog.error(0x0000, ONNX_TEST_TAG, 'test failed: %{public}s', err.message);
            this.onnxResult = `测试失败: ${err.message}`;
        }
        finally {
            if (pixelMap !== undefined) {
                pixelMap.release();
            }
            this.onnxRunning = false;
        }
    }
    private async loadTestImage(): Promise<image.PixelMap> {
        const buf = this.context.resourceManager.getRawFileContentSync(IMAGE_RAWFILE);
        const source = image.createImageSource(buf.buffer as ArrayBuffer);
        try {
            return await source.createPixelMap({ desiredPixelFormat: image.PixelMapFormat.RGBA_8888 });
        }
        finally {
            source.release();
        }
    }
    /** 演示用验证码用户上下文：无真实 cookie，配合 demoMode 全程本地模拟 */
    private demoUser(): CaptchaUserParam {
        return {
            cookies: 'demo',
            uname: `演示用户${this.demoSession}`,
            refererParams: {
                courseId: 'demo',
                classId: 'demo',
                activePrimaryId: 'demo',
                uid: 'demo'
            }
        };
    }
    CaptchaDemoSheetBuilder(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create({ space: 12 });
            Column.width('100%');
        }, Column);
        {
            this.observeComponentCreation2((elmtId, isInitialRender) => {
                if (isInitialRender) {
                    let componentCall = new CaptchaComponent(this, {
                        demoMode: true,
                        captchaUser: this.demoUser(),
                        captchaSession: this.demoSession,
                        onValidated: (validate: string) => {
                            this.demoLog = `onValidated(validate=${validate})`;
                        },
                        onSkip: () => {
                            this.demoLog = 'onSkip() 已跳过';
                        }
                    }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/Component/DebugPage.ets", line: 253, col: 7 });
                    ViewPU.create(componentCall);
                    let paramsLambda = () => {
                        return {
                            demoMode: true,
                            captchaUser: this.demoUser(),
                            captchaSession: this.demoSession,
                            onValidated: (validate: string) => {
                                this.demoLog = `onValidated(validate=${validate})`;
                            },
                            onSkip: () => {
                                this.demoLog = 'onSkip() 已跳过';
                            }
                        };
                    };
                    componentCall.paramsGenerator_ = paramsLambda;
                }
                else {
                    this.updateStateVarsOfChildByElmtId(elmtId, {
                        captchaSession: this.demoSession
                    });
                }
            }, { name: "CaptchaComponent" });
        }
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 12 });
            Row.width('100%');
            Row.padding({ left: 16, right: 16, bottom: 12 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('模拟下一位用户');
            Button.layoutWeight(1);
            Button.fontSize(14);
            Button.onClick(() => {
                this.demoSession++;
                this.demoLog = `已切换到 ${this.demoUser().uname}（会话 ${this.demoSession}）`;
            });
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('重置演示');
            Button.layoutWeight(1);
            Button.fontSize(14);
            Button.backgroundColor({ "id": 125829510, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.onClick(() => {
                this.demoSession = 1;
                this.demoLog = '已重置为演示用户1';
            });
        }, Button);
        Button.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('说明：演示模式全程本地模拟，不访问网络；奇数会话演示模型校验成功，偶数会话演示失败回退手动。');
            Text.fontSize(11);
            Text.fontColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.width('100%');
            Text.padding({ left: 16, right: 16 });
        }, Text);
        Text.pop();
        Column.pop();
    }
    private logLine(line: string) {
        this.testLog = `${line}\n${this.testLog}`;
    }
    private async runTest(name: string, fn: () => Promise<void>, sink?: (line: string) => void) {
        if (this.testRunning) {
            promptAction.showToast({ message: '测试运行中，请稍候' });
            return;
        }
        this.testRunning = true;
        const log: (line: string) => void = sink !== undefined ? sink : (line: string): void => { this.logLine(line); };
        log(`▶ [${name}] 开始`);
        try {
            await fn();
            log(`✔ [${name}] 完成`);
        }
        catch (e) {
            log(`✘ [${name}] 失败: ${(e as Error).message}`);
        }
        finally {
            this.testRunning = false;
        }
    }
    /** 1. 签到结果解析 parseSignResult 全分支（success/face/ended/二维码过期/位置/重复/验证码/错误） */
    private async testParseSignResult() {
        let pass = 0;
        for (const c of PARSE_CASES) {
            const outcome = parseSignResult(c.raw);
            const ok = outcome.kind === c.expectKind;
            if (ok) {
                pass++;
            }
            this.logLine(`${ok ? '✔' : '✘'} "${c.raw.substring(0, 16)}" → ${outcome.kind}` +
                `${ok ? '' : `（期望 ${c.expectKind}）`}`);
        }
        if (pass !== PARSE_CASES.length) {
            throw new Error(`${PARSE_CASES.length - pass} 个分支不符`);
        }
    }
    /** 2. 设备码生成（88 位 Base64，全部签到请求共用） */
    private async testDeviceCode() {
        const code = await Sign.generateDeviceCode();
        if (code.length !== 88) {
            throw new Error(`deviceCode 长度 ${code.length}，预期 88`);
        }
        this.logLine(`deviceCode 长度=88 ✔ ${code.substring(0, 16)}...`);
    }
    /** 3. clientId 解密（人脸 signToken 依赖的 cid/sc，纯本地 RSA 还原） */
    private async testDecryptClientId() {
        if (!this.testClientId.trim()) {
            throw new Error('请先在输入框粘贴 clientId');
        }
        const info = FaceApi.decryptClientId(this.testClientId.trim());
        if (!info) {
            throw new Error('clientId 解密失败（格式非法或公钥不匹配）');
        }
        this.logLine(`cid=${info.cid.substring(0, 16)}... sc=${info.sc.substring(0, 8)}...`);
    }
    /** 4. 人脸 faceResult 构造（buildFaceResult + signToken MD5，纯本地） */
    private async testBuildFaceResult() {
        const clientId = this.testClientId.trim();
        const r = JSON.parse(FaceApi.buildFaceResult('debugObjectId', clientId || undefined)) as FaceResultParam;
        if (r.currentFaceId !== 'debugObjectId' || r.LiveDetectionStatus !== 1 || r.collectStatus !== 1) {
            throw new Error('faceResult 基础字段不符');
        }
        if (r.signToken) {
            if (r.signToken.length !== 32) {
                throw new Error(`signToken 长度 ${r.signToken.length}，预期 32 位 MD5`);
            }
            this.logLine(`faceResult ✔ signToken=${r.signToken.substring(0, 12)}...（含 clientId 签名）`);
        }
        else {
            this.logLine('faceResult ✔ 基础字段正确（未填 clientId，跳过 signToken 签名）');
        }
    }
    /** 5. 人脸识别全流程本地模拟：默认人脸(模拟)→随机化裁剪(真实)→faceResult(真实)→签到解析(真实) */
    private async testFaceFlow() {
        this.faceLog = '';
        const rawPath = `${this.context.cacheDir}/debug_face_raw.jpg`;
        const processedPath = `${this.context.cacheDir}/debug_face_processed.jpg`;
        this.cleanupFile(rawPath);
        this.cleanupFile(processedPath);
        try {
            // ① 模拟 DownloadFaceImage：内置测试图充当云端默认人脸
            const buf = this.context.resourceManager.getRawFileContentSync(IMAGE_RAWFILE);
            writeBufferToFile(rawPath, buf.buffer as ArrayBuffer);
            const rawSize = await this.readImageSize(rawPath);
            this.faceLogLine(`① 模拟默认人脸 ${rawSize.width}×${rawSize.height}`);
            // ② 随机化裁剪（与 FacePicker 共用同一实现）
            await randomizeFaceImage(rawPath, processedPath);
            const stat = fs.statSync(processedPath);
            const head = new Uint8Array(2);
            const fd = fs.openSync(processedPath, fs.OpenMode.READ_ONLY);
            try {
                fs.readSync(fd.fd, head.buffer as ArrayBuffer);
            }
            finally {
                fs.closeSync(fd);
            }
            if (head[0] !== 0xFF || head[1] !== 0xD8) {
                throw new Error('输出不是有效 JPEG');
            }
            const outSize = await this.readImageSize(processedPath);
            if (outSize.width > rawSize.width || outSize.width < Math.floor(rawSize.width * 0.9) ||
                outSize.height > rawSize.height || outSize.height < Math.floor(rawSize.height * 0.9)) {
                throw new Error(`裁剪尺寸异常 ${outSize.width}×${outSize.height}`);
            }
            this.faceImagePath = processedPath;
            this.faceLogLine(`② 随机化裁剪 ✔ ${outSize.width}×${outSize.height}（${stat.size}B）`);
            // ③ 模拟上传得到 objectId，构造 faceResult（真实 buildFaceResult，clientId 选填验签名）
            const objectId = `mock${Date.now()}`;
            const clientId = this.testClientId.trim();
            const r = JSON.parse(FaceApi.buildFaceResult(objectId, clientId || undefined)) as FaceResultParam;
            if (r.currentFaceId !== objectId) {
                throw new Error('faceResult 字段不符');
            }
            if (r.signToken) {
                this.faceLogLine(`③ faceResult ✔ signToken=${r.signToken.substring(0, 8)}...（含 clientId 签名）`);
            }
            else {
                this.faceLogLine('③ faceResult ✔ 字段正确（未填 clientId，跳过签名）');
            }
            // ④ 模拟签到接口返回非本人（真实 parseSignResult）
            const outcome = parseSignResult('[face]检测到非本人');
            if (outcome.kind !== 'face') {
                throw new Error(`解析为 ${outcome.kind}，预期 face`);
            }
            this.faceLogLine('④ 签到响应解析 ✔ face 分支（检测到非本人）');
        }
        finally {
            this.cleanupFile(rawPath);
            // processedPath 保留供预览，下次运行时覆盖
        }
    }
    private faceLogLine(line: string) {
        this.faceLog = `${line}\n${this.faceLog}`;
    }
    /** 6. 默认人脸查看（联网：主用户 cookie → 云盘默认人脸 objectId → 下载显示，仅查看不上传） */
    private async fetchProfileFace() {
        this.profileLog = '';
        const path = `${this.context.cacheDir}/debug_face_profile.jpg`;
        this.cleanupFile(path);
        const user = await DatabaseManager.getInstance().getUserById(0);
        if (!user) {
            throw new Error('主用户未登录');
        }
        const objectId = await FaceApi.GetProfileFaceObjectId(user.cookies);
        this.profileLogLine(`① objectId=${objectId}`);
        await FaceApi.DownloadFaceImage(objectId, path);
        const size = await this.readImageSize(path);
        this.profileImagePath = path;
        this.profileLogLine(`② 已下载 ${size.width}×${size.height}（仅本地显示，未上传未签到）`);
    }
    private profileLogLine(line: string) {
        this.profileLog = `${line}\n${this.profileLog}`;
    }
    /** 图片随机化本地演示（issue #209）：与真实上传共用 randomizeImageInPlace，仅本地展示，不上传不联网 */
    private async testImageRandomize(pickNew: boolean) {
        this.randLog = '';
        let srcPath = this.randSrcPath;
        if (pickNew || srcPath === '') {
            const photoSelectOptions = new picker.PhotoSelectOptions();
            photoSelectOptions.MIMEType = picker.PhotoViewMIMETypes.IMAGE_TYPE;
            photoSelectOptions.maxSelectNumber = 1;
            const photoViewPicker = new picker.PhotoViewPicker();
            const res = await photoViewPicker.select(photoSelectOptions);
            if (!res.photoUris || res.photoUris.length === 0) {
                this.randLog = '已取消选择';
                return;
            }
            this.randSrcRound++;
            srcPath = `${this.context.cacheDir}/debug_rand_src_${this.randSrcRound}.jpg`;
            const srcFile = fs.openSync(res.photoUris[0], fs.OpenMode.READ_ONLY);
            try {
                fs.copyFileSync(srcFile.fd, srcPath);
            }
            finally {
                fs.closeSync(srcFile.fd);
            }
            this.randSrcPath = srcPath;
            this.lastRandHash = '';
        }
        // 每轮换新文件名，避免 Image 组件按路径缓存旧图；上一轮输出随手清理
        this.randOutRound++;
        const outPath = `${this.context.cacheDir}/debug_rand_out_${this.randOutRound}.jpg`;
        this.cleanupFile(`${this.context.cacheDir}/debug_rand_out_${this.randOutRound - 1}.jpg`);
        const srcStat = fs.statSync(srcPath);
        const srcSize = await this.readImageSize(srcPath);
        const srcHash = await this.fileFnvHash(srcPath);
        this.randLogLine(`① 源图 ${srcSize.width}×${srcSize.height} ${(srcStat.size / 1048576).toFixed(2)}MB hash=${srcHash}`);
        // 与 uploadImageForObject 相同的前置动作：复制到缓存后原地随机化
        const copyFile = fs.openSync(srcPath, fs.OpenMode.READ_ONLY);
        try {
            fs.copyFileSync(copyFile.fd, outPath);
        }
        finally {
            fs.closeSync(copyFile.fd);
        }
        await randomizeImageInPlace(outPath);
        const outStat = fs.statSync(outPath);
        const outSize = await this.readImageSize(outPath);
        const outHash = await this.fileFnvHash(outPath);
        this.randOutPath = outPath;
        this.randLogLine(`② 随机化后 ${outSize.width}×${outSize.height} ${(outStat.size / 1048576).toFixed(2)}MB hash=${outHash}`);
        if (outHash === srcHash) {
            throw new Error('输出与源图字节相同，随机化未生效');
        }
        if (this.lastRandHash !== '' && outHash === this.lastRandHash) {
            throw new Error('与上一轮输出字节相同，随机化未生效');
        }
        this.randLogLine(`✔ 字节与源图${this.lastRandHash === '' ? '' : '及上一轮'}不同，教师端/服务端将视为不同图片`);
        this.lastRandHash = outHash;
    }
    private randLogLine(line: string) {
        this.randLog = `${line}\n${this.randLog}`;
    }
    /** FNV-1a 32 位文件哈希（仅本地对比用，非加密哈希） */
    private async fileFnvHash(path: string): Promise<string> {
        const size = fs.statSync(path).size;
        const buf = new ArrayBuffer(size);
        const fd = fs.openSync(path, fs.OpenMode.READ_ONLY);
        try {
            fs.readSync(fd.fd, buf);
        }
        finally {
            fs.closeSync(fd);
        }
        const u8 = new Uint8Array(buf);
        let h = 0x811c9dc5;
        for (let i = 0; i < u8.length; i++) {
            h ^= u8[i];
            h = Math.imul(h, 0x01000193) >>> 0;
        }
        return h.toString(16).padStart(8, '0');
    }
    private async readImageSize(path: string): Promise<image.Size> {
        const source = image.createImageSource(path);
        try {
            const info = await source.getImageInfo();
            return info.size;
        }
        finally {
            source.release();
        }
    }
    private cleanupFile(path: string) {
        try {
            fs.unlinkSync(path);
        }
        catch {
            // 文件不存在等场景忽略
        }
    }
    /** 签到验证本地校验按钮见 build() 中「签到验证（本地校验）」卡片 */
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor({ "id": 125829132, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Column.borderRadius({ topLeft: 20, topRight: 20 });
            Column.bindSheet({ value: this.captchaDemoShow, changeEvent: newValue => { this.captchaDemoShow = newValue; } }, { builder: this.CaptchaDemoSheetBuilder.bind(this) }, {
                title: { title: '验证码弹窗演示' },
                backgroundColor: { "id": 125829507, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" },
                detents: [SheetSize.MEDIUM, SheetSize.LARGE]
            });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('Debug 调试面板');
            Text.fontSize(24);
            Text.fontWeight(FontWeight.Bold);
            Text.width('100%');
            Text.textAlign(TextAlign.Start);
            Text.padding({ left: 20, bottom: 20 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            List.create({ space: 12 });
            List.width('100%');
            List.layoutWeight(1);
            List.padding({ left: 16, right: 16 });
        }, List);
        {
            const itemCreation = (elmtId, isInitialRender) => {
                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                ListItem.create(deepRenderFunction, true);
                if (!isInitialRender) {
                    ListItem.pop();
                }
                ViewStackProcessor.StopGetAccessRecording();
            };
            const itemCreation2 = (elmtId, isInitialRender) => {
                ListItem.create(deepRenderFunction, true);
            };
            const deepRenderFunction = (elmtId, isInitialRender) => {
                itemCreation(elmtId, isInitialRender);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('签名状态');
                    Text.fontSize(14);
                    Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                    Text.margin({ bottom: 8, left: 4 });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.backgroundColor({ "id": 125829558, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Column.borderRadius(16);
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.width('100%');
                    Row.padding(12);
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create(this.dbInfo !== '' ? this.dbInfo : '加载中...');
                    Text.fontSize(14);
                    Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Text);
                Text.pop();
                Row.pop();
                Column.pop();
                Column.pop();
                ListItem.pop();
            };
            this.observeComponentCreation2(itemCreation2, ListItem);
            ListItem.pop();
        }
        {
            const itemCreation = (elmtId, isInitialRender) => {
                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                ListItem.create(deepRenderFunction, true);
                if (!isInitialRender) {
                    ListItem.pop();
                }
                ViewStackProcessor.StopGetAccessRecording();
            };
            const itemCreation2 = (elmtId, isInitialRender) => {
                ListItem.create(deepRenderFunction, true);
            };
            const deepRenderFunction = (elmtId, isInitialRender) => {
                itemCreation(elmtId, isInitialRender);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('调试操作');
                    Text.fontSize(14);
                    Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                    Text.margin({ bottom: 8, left: 4 });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    if (this.crashReportStatus !== '') {
                        this.ifElseBranchUpdateFunction(0, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create(`崩溃上报：${this.crashReportStatus}`);
                                Text.fontSize(12);
                                Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                Text.width('100%');
                                Text.margin({ bottom: 8, left: 4 });
                            }, Text);
                            Text.pop();
                        });
                    }
                    else {
                        this.ifElseBranchUpdateFunction(1, () => {
                        });
                    }
                }, If);
                If.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.backgroundColor({ "id": 125829558, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Column.borderRadius(16);
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.width('100%');
                    Row.padding(12);
                    Row.onClick(() => { this.resetSignState(); });
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('重置签名状态');
                    Text.fontSize(16);
                    Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Blank.create();
                }, Blank);
                Blank.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Image.create({ "id": 16777265, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Image.draggable(false);
                    Image.width(16);
                    Image.height(16);
                    Image.fillColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Image);
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Divider.create();
                    Divider.color({ "id": 125829159, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Divider.margin({ left: 12, right: 12 });
                }, Divider);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.width('100%');
                    Row.padding(12);
                    Row.onClick(() => { this.setSignTimeToTriggerReminder(); });
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('设11个月前签名（触发备份提醒）');
                    Text.fontSize(14);
                    Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Blank.create();
                }, Blank);
                Blank.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Image.create({ "id": 16777265, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Image.draggable(false);
                    Image.width(16);
                    Image.height(16);
                    Image.fillColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Image);
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Divider.create();
                    Divider.color({ "id": 125829159, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Divider.margin({ left: 12, right: 12 });
                }, Divider);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.width('100%');
                    Row.padding(12);
                    Row.onClick(() => { this.setSignTimeExpired(); });
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('设过期签名（12个月前）');
                    Text.fontSize(14);
                    Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Blank.create();
                }, Blank);
                Blank.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Image.create({ "id": 16777265, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Image.draggable(false);
                    Image.width(16);
                    Image.height(16);
                    Image.fillColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Image);
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Divider.create();
                    Divider.color({ "id": 125829159, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Divider.margin({ left: 12, right: 12 });
                }, Divider);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.width('100%');
                    Row.padding(12);
                    Row.onClick(() => { this.setSignDaysAgo(1); });
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('设1天前签名');
                    Text.fontSize(14);
                    Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Blank.create();
                }, Blank);
                Blank.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Image.create({ "id": 16777265, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Image.draggable(false);
                    Image.width(16);
                    Image.height(16);
                    Image.fillColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Image);
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Divider.create();
                    Divider.color({ "id": 125829159, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Divider.margin({ left: 12, right: 12 });
                }, Divider);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.width('100%');
                    Row.padding(12);
                    Row.onClick(() => { this.setSignDaysAgo(365); });
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('设365天前签名');
                    Text.fontSize(14);
                    Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Blank.create();
                }, Blank);
                Blank.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Image.create({ "id": 16777265, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Image.draggable(false);
                    Image.width(16);
                    Image.height(16);
                    Image.fillColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Image);
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Divider.create();
                    Divider.color({ "id": 125829159, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Divider.margin({ left: 12, right: 12 });
                }, Divider);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.width('100%');
                    Row.padding(12);
                    Row.onClick(() => {
                        // 未捕获异常 → js crash，进程退出；下次启动由 CrashReporter 上报邮件
                        throw new Error('DebugPage 模拟崩溃：验证 CrashReporter 邮件链路');
                    });
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('模拟崩溃（验证邮件上报，重启后发送）');
                    Text.fontSize(14);
                    Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Blank.create();
                }, Blank);
                Blank.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Image.create({ "id": 16777265, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Image.draggable(false);
                    Image.width(16);
                    Image.height(16);
                    Image.fillColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Image);
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Divider.create();
                    Divider.color({ "id": 125829159, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Divider.margin({ left: 12, right: 12 });
                }, Divider);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.width('100%');
                    Row.padding(12);
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('发送测试报告（不崩溃，直接验证上报链路）');
                    Text.fontSize(14);
                    Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Blank.create();
                }, Blank);
                Blank.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Button.createWithLabel(this.crashSending ? '发送中' : '发送');
                    Button.fontSize(13);
                    Button.height(32);
                    Button.enabled(!this.crashSending);
                    Button.onClick(() => { this.testCrashSend(); });
                }, Button);
                Button.pop();
                Row.pop();
                Column.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create(this.crashSendLog);
                    Text.fontSize(12);
                    Text.fontColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                    Text.margin({ top: 6, left: 4 });
                }, Text);
                Text.pop();
                Column.pop();
                ListItem.pop();
            };
            this.observeComponentCreation2(itemCreation2, ListItem);
            ListItem.pop();
        }
        {
            const itemCreation = (elmtId, isInitialRender) => {
                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                ListItem.create(deepRenderFunction, true);
                if (!isInitialRender) {
                    ListItem.pop();
                }
                ViewStackProcessor.StopGetAccessRecording();
            };
            const itemCreation2 = (elmtId, isInitialRender) => {
                ListItem.create(deepRenderFunction, true);
            };
            const deepRenderFunction = (elmtId, isInitialRender) => {
                itemCreation(elmtId, isInitialRender);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.onClick(() => { this.pathInfos.pushPath({ name: 'Debug' }); });
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('打开Debug详情页');
                }, Text);
                Text.pop();
                Column.pop();
                ListItem.pop();
            };
            this.observeComponentCreation2(itemCreation2, ListItem);
            ListItem.pop();
        }
        {
            const itemCreation = (elmtId, isInitialRender) => {
                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                ListItem.create(deepRenderFunction, true);
                if (!isInitialRender) {
                    ListItem.pop();
                }
                ViewStackProcessor.StopGetAccessRecording();
            };
            const itemCreation2 = (elmtId, isInitialRender) => {
                ListItem.create(deepRenderFunction, true);
            };
            const deepRenderFunction = (elmtId, isInitialRender) => {
                itemCreation(elmtId, isInitialRender);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('滑块检测测试（MindSpore Lite）');
                    Text.fontSize(14);
                    Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                    Text.margin({ bottom: 8, left: 4 });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.backgroundColor({ "id": 125829558, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Column.borderRadius(16);
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.width('100%');
                    Row.padding(12);
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Image.create({ "id": -1, "type": 30000, params: [IMAGE_RAWFILE], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Image.draggable(false);
                    Image.height(64);
                    Image.objectFit(ImageFit.Contain);
                }, Image);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Blank.create();
                }, Blank);
                Blank.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Button.createWithLabel(this.onnxRunning ? '运行中...' : '运行滑块检测');
                    Button.fontSize(14);
                    Button.height(36);
                    Button.enabled(!this.onnxRunning);
                    Button.onClick(() => { this.runOnnxTest(); });
                }, Button);
                Button.pop();
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    if (this.onnxStatus !== '') {
                        this.ifElseBranchUpdateFunction(0, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create(this.onnxStatus);
                                Text.fontSize(12);
                                Text.fontColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                Text.width('100%');
                                Text.padding({ left: 12, right: 12, bottom: 4 });
                            }, Text);
                            Text.pop();
                        });
                    }
                    else {
                        this.ifElseBranchUpdateFunction(1, () => {
                        });
                    }
                }, If);
                If.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    if (this.onnxResult !== '') {
                        this.ifElseBranchUpdateFunction(0, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create(this.onnxResult);
                                Text.fontSize(13);
                                Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                Text.width('100%');
                                Text.padding({ left: 12, right: 12, bottom: 12 });
                            }, Text);
                            Text.pop();
                        });
                    }
                    else {
                        this.ifElseBranchUpdateFunction(1, () => {
                        });
                    }
                }, If);
                If.pop();
                Column.pop();
                Column.pop();
                ListItem.pop();
            };
            this.observeComponentCreation2(itemCreation2, ListItem);
            ListItem.pop();
        }
        {
            const itemCreation = (elmtId, isInitialRender) => {
                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                ListItem.create(deepRenderFunction, true);
                if (!isInitialRender) {
                    ListItem.pop();
                }
                ViewStackProcessor.StopGetAccessRecording();
            };
            const itemCreation2 = (elmtId, isInitialRender) => {
                ListItem.create(deepRenderFunction, true);
            };
            const deepRenderFunction = (elmtId, isInitialRender) => {
                itemCreation(elmtId, isInitialRender);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('验证码弹窗演示');
                    Text.fontSize(14);
                    Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                    Text.margin({ bottom: 8, left: 4 });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.backgroundColor({ "id": 125829558, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Column.borderRadius(16);
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.width('100%');
                    Row.padding(12);
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('多用户弹层复用 + 模型状态文案（本地模拟）');
                    Text.fontSize(16);
                    Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Blank.create();
                }, Blank);
                Blank.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Button.createWithLabel('打开演示弹窗');
                    Button.fontSize(14);
                    Button.height(36);
                    Button.onClick(() => { this.captchaDemoShow = true; });
                }, Button);
                Button.pop();
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create(this.demoLog);
                    Text.fontSize(12);
                    Text.fontColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                    Text.padding({ left: 12, right: 12, bottom: 12 });
                }, Text);
                Text.pop();
                Column.pop();
                Column.pop();
                ListItem.pop();
            };
            this.observeComponentCreation2(itemCreation2, ListItem);
            ListItem.pop();
        }
        {
            const itemCreation = (elmtId, isInitialRender) => {
                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                ListItem.create(deepRenderFunction, true);
                if (!isInitialRender) {
                    ListItem.pop();
                }
                ViewStackProcessor.StopGetAccessRecording();
            };
            const itemCreation2 = (elmtId, isInitialRender) => {
                ListItem.create(deepRenderFunction, true);
            };
            const deepRenderFunction = (elmtId, isInitialRender) => {
                itemCreation(elmtId, isInitialRender);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('签到验证（本地校验）');
                    Text.fontSize(14);
                    Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                    Text.margin({ bottom: 8, left: 4 });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create({ space: 8 });
                    Column.backgroundColor({ "id": 125829558, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Column.borderRadius(16);
                    Column.padding(12);
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    TextInput.create({ placeholder: 'clientId（选填，用户信息接口返回值）', text: { value: this.testClientId, changeEvent: newValue => { this.testClientId = newValue; } } });
                    TextInput.width('100%');
                    TextInput.height(40);
                    TextInput.fontSize(13);
                    TextInput.backgroundColor({ "id": 125829492, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, TextInput);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create({ space: 8 });
                    Row.width('100%');
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Button.createWithLabel('签到结果解析');
                    Button.layoutWeight(1);
                    Button.fontSize(13);
                    Button.height(36);
                    Button.enabled(!this.testRunning);
                    Button.onClick(() => { this.runTest('签到结果解析', (): Promise<void> => this.testParseSignResult()); });
                }, Button);
                Button.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Button.createWithLabel('设备码生成');
                    Button.layoutWeight(1);
                    Button.fontSize(13);
                    Button.height(36);
                    Button.enabled(!this.testRunning);
                    Button.onClick(() => { this.runTest('设备码生成', (): Promise<void> => this.testDeviceCode()); });
                }, Button);
                Button.pop();
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create({ space: 8 });
                    Row.width('100%');
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Button.createWithLabel('clientId解密');
                    Button.layoutWeight(1);
                    Button.fontSize(13);
                    Button.height(36);
                    Button.enabled(!this.testRunning);
                    Button.onClick(() => { this.runTest('clientId解密', (): Promise<void> => this.testDecryptClientId()); });
                }, Button);
                Button.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Button.createWithLabel('faceResult构造');
                    Button.layoutWeight(1);
                    Button.fontSize(13);
                    Button.height(36);
                    Button.enabled(!this.testRunning);
                    Button.onClick(() => { this.runTest('faceResult构造', (): Promise<void> => this.testBuildFaceResult()); });
                }, Button);
                Button.pop();
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('说明：全部本地计算，不访问网络。clientId 选填，填入后可校验解密与 signToken 签名；滑块模型检测见上方独立卡片。');
                    Text.fontSize(11);
                    Text.fontColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create(this.testLog);
                    Text.fontSize(12);
                    Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                    Text.padding(8);
                    Text.borderRadius(8);
                    Text.backgroundColor({ "id": 125829132, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Text);
                Text.pop();
                Column.pop();
                Column.pop();
                ListItem.pop();
            };
            this.observeComponentCreation2(itemCreation2, ListItem);
            ListItem.pop();
        }
        {
            const itemCreation = (elmtId, isInitialRender) => {
                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                ListItem.create(deepRenderFunction, true);
                if (!isInitialRender) {
                    ListItem.pop();
                }
                ViewStackProcessor.StopGetAccessRecording();
            };
            const itemCreation2 = (elmtId, isInitialRender) => {
                ListItem.create(deepRenderFunction, true);
            };
            const deepRenderFunction = (elmtId, isInitialRender) => {
                itemCreation(elmtId, isInitialRender);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('人脸识别（本地模拟）');
                    Text.fontSize(14);
                    Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                    Text.margin({ bottom: 8, left: 4 });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create({ space: 8 });
                    Column.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Column.borderRadius(16);
                    Column.padding(12);
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create({ space: 12 });
                    Row.width('100%');
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    if (this.faceImagePath !== '') {
                        this.ifElseBranchUpdateFunction(0, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Image.create(`file://${this.faceImagePath}`);
                                Image.draggable(false);
                                Image.height(64);
                                Image.borderRadius(8);
                                Image.objectFit(ImageFit.Contain);
                            }, Image);
                        });
                    }
                    else {
                        this.ifElseBranchUpdateFunction(1, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create('运行后显示随机化结果');
                                Text.fontSize(12);
                                Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            }, Text);
                            Text.pop();
                        });
                    }
                }, If);
                If.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Blank.create();
                }, Blank);
                Blank.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Button.createWithLabel(this.testRunning ? '运行中...' : '运行人脸流程模拟');
                    Button.fontSize(13);
                    Button.height(36);
                    Button.enabled(!this.testRunning);
                    Button.onClick(() => {
                        this.runTest('人脸流程模拟', (): Promise<void> => this.testFaceFlow(), (line: string): void => { this.faceLogLine(line); });
                    });
                }, Button);
                Button.pop();
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create(this.faceLog);
                    Text.fontSize(12);
                    Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                    Text.padding(8);
                    Text.borderRadius(8);
                    Text.backgroundColor({ "id": 16777250, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('说明：默认人脸下载/上传/enc 校验用本地数据模拟（不访问网络）；随机裁剪、faceResult 构造、签到响应解析为真实实现。clientId 选填（上方输入框），填入后校验 signToken 签名。');
                    Text.fontSize(11);
                    Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                }, Text);
                Text.pop();
                Column.pop();
                Column.pop();
                ListItem.pop();
            };
            this.observeComponentCreation2(itemCreation2, ListItem);
            ListItem.pop();
        }
        {
            const itemCreation = (elmtId, isInitialRender) => {
                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                ListItem.create(deepRenderFunction, true);
                if (!isInitialRender) {
                    ListItem.pop();
                }
                ViewStackProcessor.StopGetAccessRecording();
            };
            const itemCreation2 = (elmtId, isInitialRender) => {
                ListItem.create(deepRenderFunction, true);
            };
            const deepRenderFunction = (elmtId, isInitialRender) => {
                itemCreation(elmtId, isInitialRender);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('默认人脸查看（联网）');
                    Text.fontSize(14);
                    Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                    Text.margin({ bottom: 8, left: 4 });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create({ space: 8 });
                    Column.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Column.borderRadius(16);
                    Column.padding(12);
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create({ space: 12 });
                    Row.width('100%');
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    if (this.profileImagePath !== '') {
                        this.ifElseBranchUpdateFunction(0, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Image.create(`file://${this.profileImagePath}`);
                                Image.draggable(false);
                                Image.height(64);
                                Image.borderRadius(8);
                                Image.objectFit(ImageFit.Contain);
                            }, Image);
                        });
                    }
                    else {
                        this.ifElseBranchUpdateFunction(1, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create('获取后显示云盘默认人脸');
                                Text.fontSize(12);
                                Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            }, Text);
                            Text.pop();
                        });
                    }
                }, If);
                If.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Blank.create();
                }, Blank);
                Blank.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Button.createWithLabel(this.testRunning ? '运行中...' : '获取默认人脸');
                    Button.fontSize(13);
                    Button.height(36);
                    Button.enabled(!this.testRunning);
                    Button.onClick(() => {
                        this.runTest('默认人脸获取', (): Promise<void> => this.fetchProfileFace(), (line: string): void => { this.profileLogLine(line); });
                    });
                }, Button);
                Button.pop();
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create(this.profileLog);
                    Text.fontSize(12);
                    Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                    Text.padding(8);
                    Text.borderRadius(8);
                    Text.backgroundColor({ "id": 16777250, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('说明：用主用户 cookie 只读拉取云盘账号默认人脸，仅本地显示，不随机化、不上传、不签到。上游提示：拿原始默认人脸去签到可能被风控识别，影响账号安全。');
                    Text.fontSize(11);
                    Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                }, Text);
                Text.pop();
                Column.pop();
                Column.pop();
                ListItem.pop();
            };
            this.observeComponentCreation2(itemCreation2, ListItem);
            ListItem.pop();
        }
        {
            const itemCreation = (elmtId, isInitialRender) => {
                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                ListItem.create(deepRenderFunction, true);
                if (!isInitialRender) {
                    ListItem.pop();
                }
                ViewStackProcessor.StopGetAccessRecording();
            };
            const itemCreation2 = (elmtId, isInitialRender) => {
                ListItem.create(deepRenderFunction, true);
            };
            const deepRenderFunction = (elmtId, isInitialRender) => {
                itemCreation(elmtId, isInitialRender);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('图片随机化（本地演示）');
                    Text.fontSize(14);
                    Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                    Text.margin({ bottom: 8, left: 4 });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create({ space: 8 });
                    Column.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Column.borderRadius(16);
                    Column.padding(12);
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create({ space: 12 });
                    Row.width('100%');
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create({ space: 4 });
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    if (this.randSrcPath !== '') {
                        this.ifElseBranchUpdateFunction(0, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Image.create(`file://${this.randSrcPath}`);
                                Image.draggable(false);
                                Image.width(64);
                                Image.height(64);
                                Image.borderRadius(8);
                                Image.objectFit(ImageFit.Cover);
                            }, Image);
                        });
                    }
                    else {
                        this.ifElseBranchUpdateFunction(1, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Column.create();
                                Column.width(64);
                                Column.height(64);
                                Column.borderRadius(8);
                                Column.backgroundColor({ "id": 16777250, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            }, Column);
                            Column.pop();
                        });
                    }
                }, If);
                If.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('源图');
                    Text.fontSize(11);
                    Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Text);
                Text.pop();
                Column.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create({ space: 4 });
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    if (this.randOutPath !== '') {
                        this.ifElseBranchUpdateFunction(0, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Image.create(`file://${this.randOutPath}`);
                                Image.draggable(false);
                                Image.width(64);
                                Image.height(64);
                                Image.borderRadius(8);
                                Image.objectFit(ImageFit.Cover);
                            }, Image);
                        });
                    }
                    else {
                        this.ifElseBranchUpdateFunction(1, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Column.create();
                                Column.width(64);
                                Column.height(64);
                                Column.borderRadius(8);
                                Column.backgroundColor({ "id": 16777250, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            }, Column);
                            Column.pop();
                        });
                    }
                }, If);
                If.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('随机化后');
                    Text.fontSize(11);
                    Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Text);
                Text.pop();
                Column.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Blank.create();
                }, Blank);
                Blank.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Button.createWithLabel(this.testRunning ? '运行中...' : '选择图片并随机化');
                    Button.fontSize(13);
                    Button.height(36);
                    Button.enabled(!this.testRunning);
                    Button.onClick(() => {
                        this.runTest('图片随机化', (): Promise<void> => this.testImageRandomize(true), (line: string): void => { this.randLogLine(line); });
                    });
                }, Button);
                Button.pop();
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Button.createWithLabel('同一张图再随机一次');
                    Button.fontSize(13);
                    Button.height(36);
                    Button.width('100%');
                    Button.enabled(!this.testRunning && this.randSrcPath !== '');
                    Button.onClick(() => {
                        this.runTest('图片随机化(同图复跑)', (): Promise<void> => this.testImageRandomize(false), (line: string): void => { this.randLogLine(line); });
                    });
                }, Button);
                Button.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create(this.randLog);
                    Text.fontSize(12);
                    Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                    Text.padding(8);
                    Text.borderRadius(8);
                    Text.backgroundColor({ "id": 16777250, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('说明：与拍照签到上传共用同一 randomizeImageInPlace（EXIF 烧录 + 随机裁剪 90%~99% + 随机质量 85~95 重编码），对比源图/输出的尺寸、大小与哈希；同一张图每轮字节都不同（issue #209 服务端重复图片检测）。全程仅本地缓存目录，不上传不联网。');
                    Text.fontSize(11);
                    Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                }, Text);
                Text.pop();
                Column.pop();
                Column.pop();
                ListItem.pop();
            };
            this.observeComponentCreation2(itemCreation2, ListItem);
            ListItem.pop();
        }
        List.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
