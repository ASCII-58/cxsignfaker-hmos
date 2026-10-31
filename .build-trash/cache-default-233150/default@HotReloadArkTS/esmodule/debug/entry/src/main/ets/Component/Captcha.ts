if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface CaptchaComponent_Params {
    captchaUser?: CaptchaUserParam | null;
    onValidated?: (validate: string) => void;
    onSkip?: () => void;
    /** Debug 演示模式：全流程本地模拟，不访问网络、不读写偏好 */
    demoMode?: boolean;
    captchaSession?: number;
    info?: CaptchaPhotosResult;
    sliderValue?: number;
    containerWidth?: number;
    isLoading?: boolean;
    isChecking?: boolean;
    errMsg?: string;
    autoStatus?: string;
    resultHint?: string;
    resultOk?: boolean;
    contentOpacity?: number;
    modelCaptchaEnabled?: boolean;
    modelTried?: boolean;
    sliderMax?: number;
}
import { CaptchaApi } from "@normalized:N&&&entry/src/main/ets/utils/captchaApi&";
import type { CaptchaPhotosParam, CaptchaPhotosResult } from "@normalized:N&&&entry/src/main/ets/utils/captchaApi&";
import { Http } from "@normalized:N&&&entry/src/main/ets/utils/httpClient&";
import { MsCaptchaDetector } from "@normalized:N&&&entry/src/main/ets/utils/detector/MsCaptchaDetector&";
import preferences from "@ohos:data.preferences";
import type common from "@ohos:app.ability.common";
import promptAction from "@ohos:promptAction";
import image from "@ohos:multimedia.image";
import hilog from "@ohos:hilog";
const TAG = 'CaptchaComponent';
const DOMAIN = 0x000B;
const CAPTCHA_MEMORY_PREF = 'captcha_memory';
const SETTINGS_PREF = 'settings';
const MODEL_CAPTCHA_ENABLED_KEY = 'model_captcha_enabled';
// 与上游一致的滑块归一化：x = slider / sliderMax * 280 - 8
const CAPTCHA_NORMALIZED_MAX = 280;
const CAPTCHA_NORMALIZED_OFFSET = -8;
/**
 * 发起验证码的用户上下文
 */
export interface CaptchaUserParam {
    cookies: string;
    uname: string;
    /** preSign 引用参数：courseId/classId/activePrimaryId/uid(puid) */
    refererParams: CaptchaPhotosParam;
}
export class CaptchaComponent extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.captchaUser = null;
        this.onValidated = undefined;
        this.onSkip = undefined;
        this.demoMode = false;
        this.__captchaSession = new SynchedPropertySimpleOneWayPU(params.captchaSession, this, "captchaSession");
        this.__info = new ObservedPropertyObjectPU({
            token: '',
            imageVerificationVo: {
                shadeImage: '',
                cutoutImage: ''
            },
            captchaId: '',
            type: '',
            version: '',
            captchaKey: '',
            iv: ''
        }, this, "info");
        this.__sliderValue = new ObservedPropertySimplePU(0, this, "sliderValue");
        this.__containerWidth = new ObservedPropertySimplePU(0, this, "containerWidth");
        this.__isLoading = new ObservedPropertySimplePU(false, this, "isLoading");
        this.__isChecking = new ObservedPropertySimplePU(false, this, "isChecking");
        this.__errMsg = new ObservedPropertySimplePU(''
        /** 自动校验进行中的阶段文案（迷你转圈 + 文字），空串隐藏 */
        , this, "errMsg");
        this.__autoStatus = new ObservedPropertySimplePU(''
        /** 自动校验结束后的结果文案：成功绿 / 失败红，空串隐藏 */
        , this, "autoStatus");
        this.__resultHint = new ObservedPropertySimplePU('', this, "resultHint");
        this.__resultOk = new ObservedPropertySimplePU(false
        /** 换用户切换动画：内容区淡出/淡入 */
        , this, "resultOk");
        this.__contentOpacity = new ObservedPropertySimplePU(1
        /** 设置页 Beta 开关：启用后拉取验证码时直接用本地模型完成滑块验证 */
        , this, "contentOpacity");
        this.modelCaptchaEnabled = false;
        this.modelTried = false;
        this.sliderMax = 280;
        this.setInitiallyProvidedValue(params);
        this.declareWatch("captchaSession", this.onCaptchaSessionChanged);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: CaptchaComponent_Params) {
        if (params.captchaUser !== undefined) {
            this.captchaUser = params.captchaUser;
        }
        if (params.onValidated !== undefined) {
            this.onValidated = params.onValidated;
        }
        if (params.onSkip !== undefined) {
            this.onSkip = params.onSkip;
        }
        if (params.demoMode !== undefined) {
            this.demoMode = params.demoMode;
        }
        if (params.captchaSession === undefined) {
            this.__captchaSession.set(0);
        }
        if (params.info !== undefined) {
            this.info = params.info;
        }
        if (params.sliderValue !== undefined) {
            this.sliderValue = params.sliderValue;
        }
        if (params.containerWidth !== undefined) {
            this.containerWidth = params.containerWidth;
        }
        if (params.isLoading !== undefined) {
            this.isLoading = params.isLoading;
        }
        if (params.isChecking !== undefined) {
            this.isChecking = params.isChecking;
        }
        if (params.errMsg !== undefined) {
            this.errMsg = params.errMsg;
        }
        if (params.autoStatus !== undefined) {
            this.autoStatus = params.autoStatus;
        }
        if (params.resultHint !== undefined) {
            this.resultHint = params.resultHint;
        }
        if (params.resultOk !== undefined) {
            this.resultOk = params.resultOk;
        }
        if (params.contentOpacity !== undefined) {
            this.contentOpacity = params.contentOpacity;
        }
        if (params.modelCaptchaEnabled !== undefined) {
            this.modelCaptchaEnabled = params.modelCaptchaEnabled;
        }
        if (params.modelTried !== undefined) {
            this.modelTried = params.modelTried;
        }
        if (params.sliderMax !== undefined) {
            this.sliderMax = params.sliderMax;
        }
    }
    updateStateVars(params: CaptchaComponent_Params) {
        this.__captchaSession.reset(params.captchaSession);
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__captchaSession.purgeDependencyOnElmtId(rmElmtId);
        this.__info.purgeDependencyOnElmtId(rmElmtId);
        this.__sliderValue.purgeDependencyOnElmtId(rmElmtId);
        this.__containerWidth.purgeDependencyOnElmtId(rmElmtId);
        this.__isLoading.purgeDependencyOnElmtId(rmElmtId);
        this.__isChecking.purgeDependencyOnElmtId(rmElmtId);
        this.__errMsg.purgeDependencyOnElmtId(rmElmtId);
        this.__autoStatus.purgeDependencyOnElmtId(rmElmtId);
        this.__resultHint.purgeDependencyOnElmtId(rmElmtId);
        this.__resultOk.purgeDependencyOnElmtId(rmElmtId);
        this.__contentOpacity.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__captchaSession.aboutToBeDeleted();
        this.__info.aboutToBeDeleted();
        this.__sliderValue.aboutToBeDeleted();
        this.__containerWidth.aboutToBeDeleted();
        this.__isLoading.aboutToBeDeleted();
        this.__isChecking.aboutToBeDeleted();
        this.__errMsg.aboutToBeDeleted();
        this.__autoStatus.aboutToBeDeleted();
        this.__resultHint.aboutToBeDeleted();
        this.__resultOk.aboutToBeDeleted();
        this.__contentOpacity.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private captchaUser: CaptchaUserParam | null;
    private onValidated?: (validate: string) => void;
    private onSkip?: () => void;
    /** Debug 演示模式：全流程本地模拟，不访问网络、不读写偏好 */
    private demoMode: boolean;
    /** 弹层跨用户复用的会话号：父页面每次 requestCaptcha 自增，@Watch 原地换内容（首次挂载不触发） */
    private __captchaSession: SynchedPropertySimpleOneWayPU<number>;
    get captchaSession() {
        return this.__captchaSession.get();
    }
    set captchaSession(newValue: number) {
        this.__captchaSession.set(newValue);
    }
    private __info: ObservedPropertyObjectPU<CaptchaPhotosResult>;
    get info() {
        return this.__info.get();
    }
    set info(newValue: CaptchaPhotosResult) {
        this.__info.set(newValue);
    }
    private __sliderValue: ObservedPropertySimplePU<number>;
    get sliderValue() {
        return this.__sliderValue.get();
    }
    set sliderValue(newValue: number) {
        this.__sliderValue.set(newValue);
    }
    private __containerWidth: ObservedPropertySimplePU<number>;
    get containerWidth() {
        return this.__containerWidth.get();
    }
    set containerWidth(newValue: number) {
        this.__containerWidth.set(newValue);
    }
    private __isLoading: ObservedPropertySimplePU<boolean>;
    get isLoading() {
        return this.__isLoading.get();
    }
    set isLoading(newValue: boolean) {
        this.__isLoading.set(newValue);
    }
    private __isChecking: ObservedPropertySimplePU<boolean>;
    get isChecking() {
        return this.__isChecking.get();
    }
    set isChecking(newValue: boolean) {
        this.__isChecking.set(newValue);
    }
    private __errMsg: ObservedPropertySimplePU<string>;
    get errMsg() {
        return this.__errMsg.get();
    }
    set errMsg(newValue: string) {
        this.__errMsg.set(newValue);
    }
    /** 自动校验进行中的阶段文案（迷你转圈 + 文字），空串隐藏 */
    private __autoStatus: ObservedPropertySimplePU<string>;
    get autoStatus() {
        return this.__autoStatus.get();
    }
    set autoStatus(newValue: string) {
        this.__autoStatus.set(newValue);
    }
    /** 自动校验结束后的结果文案：成功绿 / 失败红，空串隐藏 */
    private __resultHint: ObservedPropertySimplePU<string>;
    get resultHint() {
        return this.__resultHint.get();
    }
    set resultHint(newValue: string) {
        this.__resultHint.set(newValue);
    }
    private __resultOk: ObservedPropertySimplePU<boolean>;
    get resultOk() {
        return this.__resultOk.get();
    }
    set resultOk(newValue: boolean) {
        this.__resultOk.set(newValue);
    }
    /** 换用户切换动画：内容区淡出/淡入 */
    private __contentOpacity: ObservedPropertySimplePU<number>;
    get contentOpacity() {
        return this.__contentOpacity.get();
    }
    set contentOpacity(newValue: number) {
        this.__contentOpacity.set(newValue);
    }
    /** 设置页 Beta 开关：启用后拉取验证码时直接用本地模型完成滑块验证 */
    private modelCaptchaEnabled: boolean;
    /** 模型每次弹出验证码只自动尝试一次，失败后回退手动，避免失败循环 */
    private modelTried: boolean;
    private readonly sliderMax: number;
    async aboutToAppear(): Promise<void> {
        await this.loadModelCaptchaPref();
        this.refresh();
    }
    private delay(ms: number): Promise<void> {
        return new Promise<void>((resolve) => setTimeout(resolve, ms));
    }
    /** 弹层复用换用户：重置一次性状态后按新用户重新拉取；首次挂载走 aboutToAppear，不会触发本回调 */
    onCaptchaSessionChanged() {
        this.modelTried = false;
        this.loadModelCaptchaPref().then(() => {
            this.refresh();
        });
    }
    private async loadModelCaptchaPref() {
        try {
            const context = getContext(this) as common.UIAbilityContext;
            const pref = await preferences.getPreferences(context, SETTINGS_PREF);
            this.modelCaptchaEnabled = await pref.get(MODEL_CAPTCHA_ENABLED_KEY, false) as boolean;
        }
        catch (e) {
            this.modelCaptchaEnabled = false;
        }
    }
    async refresh() {
        if (!this.captchaUser) {
            this.errMsg = '缺少验证码用户信息';
            return;
        }
        this.isLoading = true;
        this.errMsg = '';
        this.sliderValue = 0;
        this.autoStatus = '';
        this.resultHint = '';
        this.resultOk = false;
        this.info.token = ''; // 立即清空旧图：切换用户/刷新时不闪现上一位的验证码
        this.contentOpacity = 0; // 淡出旧内容
        await this.delay(220);
        try {
            if (this.demoMode) {
                await this.runDemoFlow();
                return;
            }
            this.info = await CaptchaApi.getCaptchaPhotos(this.captchaUser.refererParams, this.captchaUser.cookies);
            this.contentOpacity = 1; // 图片就绪即淡入，模型识别期间保持可见
            this.autoStatus = '正在自动校验…';
            const memoryFinished = await this.tryMemoryCheck();
            const useModel = !memoryFinished && this.modelCaptchaEnabled && !this.modelTried;
            if (useModel) {
                await this.tryModelCheck();
            }
            else {
                this.autoStatus = '';
            }
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Load captcha failed: ${(e as Error).message}`);
            this.errMsg = '获取验证码失败，请刷新重试';
        }
        finally {
            this.isLoading = false;
            this.contentOpacity = 1;
        }
    }
    /** 记忆 key:背景图 URL 文件名(对齐上游 imageFilename;图片池内固定,同一张图正确 x 恒定) */
    private getImageMemoryKey(): string {
        const url = this.info.imageVerificationVo.shadeImage;
        const fileName = url.substring(url.lastIndexOf('/') + 1).split('?')[0];
        const dotIndex = fileName.lastIndexOf('.');
        return dotIndex >= 0 ? fileName.substring(0, dotIndex) : fileName;
    }
    /** 本地验证码记忆：命中则自动校验一次（对齐上游 captchaMemories），返回是否已通过 */
    private async tryMemoryCheck(): Promise<boolean> {
        if (!this.captchaUser || !this.info.token) {
            return false;
        }
        const memoryKey = this.getImageMemoryKey();
        if (!memoryKey) {
            return false;
        }
        try {
            const context = getContext(this) as common.UIAbilityContext;
            const pref = await preferences.getPreferences(context, CAPTCHA_MEMORY_PREF);
            const memoryX = await pref.get(memoryKey, -1) as number;
            if (memoryX >= 0) {
                const validate = await this.checkPosition(memoryX);
                if (validate) {
                    this.finish(validate);
                    return true;
                }
                await pref.delete(memoryKey);
                await pref.flush();
            }
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Captcha memory check failed: ${(e as Error).message}`);
        }
        return false;
    }
    /**
     * Beta：用本地模型识别滑块位置并直接校验（模型输出语义即校验接口的 x，
     * 与上游 captcha.py 一致）。任一环节失败都不刷新、不重试，
     * 保留当前验证码回退为手动拖动，避免失败循环。
     */
    private async tryModelCheck() {
        this.modelTried = true;
        let pixelMap: image.PixelMap | undefined = undefined;
        try {
            const context = getContext(this) as common.UIAbilityContext;
            this.autoStatus = '正在加载本地模型…';
            await MsCaptchaDetector.load(context);
            this.autoStatus = '正在获取验证码图片…';
            const buf = await Http.getBuffer(this.info.imageVerificationVo.shadeImage);
            const source = image.createImageSource(buf);
            let created: image.PixelMap | undefined = undefined;
            try {
                created = await source.createPixelMap({ desiredPixelFormat: image.PixelMapFormat.RGBA_8888 });
            }
            finally {
                source.release();
            }
            if (created === undefined) {
                this.notifyModelFallback();
                return;
            }
            pixelMap = created;
            this.autoStatus = '模型识别中…';
            const xOffset = await MsCaptchaDetector.detect(created);
            if (xOffset < 0) {
                this.notifyModelFallback();
                return;
            }
            this.autoStatus = `识别位置 x=${xOffset}，正在提交校验…`;
            const validate = await this.checkPosition(xOffset);
            if (validate) {
                await this.saveMemory(xOffset);
                this.finish(validate);
            }
            else {
                this.notifyModelFallback();
            }
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Model captcha check failed: ${(e as Error).message}`);
            this.notifyModelFallback();
        }
        finally {
            pixelMap?.release();
        }
    }
    private notifyModelFallback() {
        // 失败提示直接展示在弹窗内（红色文案），替代原先的 toast
        this.autoStatus = '';
        this.resultHint = '模型自动验证失败，请手动完成验证';
        this.resultOk = false;
    }
    /** Debug 演示：本地模拟自动校验全流程；captchaSession 奇数轮演示成功、偶数轮演示失败回退 */
    private async runDemoFlow() {
        await this.delay(500); // 模拟拉取验证码
        this.info = {
            token: 'demo-token',
            imageVerificationVo: {
                shadeImage: '',
                cutoutImage: ''
            },
            captchaId: 'demo',
            type: 'demo',
            version: 'demo',
            captchaKey: 'demo',
            iv: 'demo'
        };
        this.contentOpacity = 1;
        this.autoStatus = '正在自动校验…';
        await this.delay(600);
        this.autoStatus = '正在加载本地模型…';
        await this.delay(700);
        this.autoStatus = '模型识别中…';
        await this.delay(900);
        if (this.captchaSession % 2 === 1) {
            this.autoStatus = `识别位置 x=${180 + (this.captchaSession * 37) % 60}，正在提交校验…`;
            await this.delay(700);
            this.finish('demo-validate');
        }
        else {
            this.notifyModelFallback();
        }
    }
    private async checkPosition(normalizedX: number): Promise<string | null> {
        if (!this.captchaUser) {
            return null;
        }
        this.isChecking = true;
        try {
            return await CaptchaApi.checkCaptchaResult(this.info, normalizedX, this.captchaUser.refererParams, this.captchaUser.cookies);
        }
        finally {
            this.isChecking = false;
        }
    }
    private async saveMemory(normalizedX: number) {
        try {
            const context = getContext(this) as common.UIAbilityContext;
            const pref = await preferences.getPreferences(context, CAPTCHA_MEMORY_PREF);
            const memoryKey = this.getImageMemoryKey();
            if (!memoryKey) {
                return;
            }
            await pref.put(memoryKey, normalizedX);
            await pref.flush();
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Save captcha memory failed: ${(e as Error).message}`);
        }
    }
    private finish(validate: string) {
        this.autoStatus = '';
        this.resultHint = '校验通过，正在继续签到…';
        this.resultOk = true;
        this.onValidated?.(validate);
    }
    private skip() {
        this.onSkip?.();
    }
    private async onSliderEnd(value: number) {
        if (this.demoMode) {
            this.autoStatus = '正在提交校验…';
            await this.delay(700);
            this.finish('demo-validate');
            return;
        }
        const normalizedX = Math.round(value / this.sliderMax * CAPTCHA_NORMALIZED_MAX + CAPTCHA_NORMALIZED_OFFSET);
        const validate = await this.checkPosition(normalizedX);
        if (validate) {
            await this.saveMemory(normalizedX);
            this.finish(validate);
        }
        else {
            promptAction.showToast({ message: '验证码校验失败，请重试', duration: 1500 });
            // 对齐上游:校验失败后换新图(token 可能已失效,同一张图重试意义有限)
            await this.refresh();
        }
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            globalThis.Context.animation({ duration: 220, curve: Curve.EaseInOut });
            Column.width('100%');
            Column.padding({ left: 16, right: 16, top: 16, bottom: 24 });
            Column.opacity(this.contentOpacity);
            globalThis.Context.animation(null);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.captchaUser ? `为 ${this.captchaUser.uname} 完成验证` : '验证码');
            Text.fontSize(16);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.margin({ bottom: 12 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.isLoading && !this.info.token) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.width('100%');
                        Column.aspectRatio(2);
                        Column.justifyContent(FlexAlign.Center);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        LoadingProgress.create();
                        LoadingProgress.width(48);
                        LoadingProgress.height(48);
                    }, LoadingProgress);
                    Column.pop();
                });
            }
            else if (this.errMsg) {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.width('100%');
                        Column.aspectRatio(2);
                        Column.justifyContent(FlexAlign.Center);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.errMsg);
                        Text.fontSize(14);
                        Text.fontColor({ "id": 125829141, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    }, Text);
                    Text.pop();
                    Column.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(2, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Stack.create({ alignContent: Alignment.Start });
                        Stack.width('100%');
                        Stack.aspectRatio(2);
                        Stack.onAreaChange((_oldValue: Area, newValue: Area) => {
                            this.containerWidth = newValue.width as number;
                        });
                    }, Stack);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Image.create(this.demoMode ? { "id": 16777269, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : this.info.imageVerificationVo.shadeImage);
                        Image.draggable(false);
                        Image.width('100%');
                        Image.height('100%');
                        Image.objectFit(ImageFit.Fill);
                    }, Image);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Image.create(this.demoMode ? { "id": 16777268, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : this.info.imageVerificationVo.cutoutImage);
                        Image.draggable(false);
                        Image.position({
                            x: this.sliderValue / this.sliderMax * (this.containerWidth - 56)
                        });
                        Image.height('100%');
                        Image.aspectRatio(0.35);
                        Image.objectFit(ImageFit.Fill);
                    }, Image);
                    Stack.pop();
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 自动校验状态行：进行中 = 迷你转圈 + 阶段文案；结束后 = 成功绿/失败红
            if (this.autoStatus !== '') {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create({ space: 8 });
                        Row.width('100%');
                        Row.justifyContent(FlexAlign.Center);
                        Row.margin({ top: 10 });
                        Row.transition(TransitionEffect.OPACITY.combine(TransitionEffect.translate({ y: 8 }))
                            .animation({ duration: 200, curve: Curve.EaseOut }));
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        LoadingProgress.create();
                        LoadingProgress.width(18);
                        LoadingProgress.height(18);
                        LoadingProgress.color({ "id": 125829135, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    }, LoadingProgress);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.autoStatus);
                        Text.fontSize(13);
                        Text.fontColor({ "id": 16777233, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    }, Text);
                    Text.pop();
                    Row.pop();
                });
            }
            else if (this.resultHint !== '') {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.resultHint);
                        Text.fontSize(13);
                        Text.fontColor(this.resultOk ? { "id": 16777256, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : { "id": 16777263, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.width('100%');
                        Text.textAlign(TextAlign.Center);
                        Text.margin({ top: 10 });
                        Text.transition(TransitionEffect.OPACITY.combine(TransitionEffect.translate({ y: 8 }))
                            .animation({ duration: 200, curve: Curve.EaseOut }));
                    }, Text);
                    Text.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(2, () => {
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Slider.create({ value: { value: this.sliderValue, changeEvent: newValue => { this.sliderValue = newValue; } }, max: this.sliderMax });
            Slider.blockColor({ "id": 125829135, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Slider.trackColor({ "id": 125831013, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Slider.selectedColor({ "id": 125829135, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Slider.enabled(!this.isLoading && !this.errMsg && !this.isChecking);
            Slider.onChange((value: number, mode: SliderChangeMode) => {
                if (mode === SliderChangeMode.End) {
                    this.onSliderEnd(value);
                }
            });
        }, Slider);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 12 });
            Row.width('100%');
            Row.margin({ top: 16 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('刷新');
            Button.layoutWeight(1);
            Button.fontSize(14);
            Button.backgroundColor({ "id": 125829510, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.enabled(!this.isLoading && !this.isChecking);
            Button.onClick(() => {
                this.refresh();
            });
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('跳过该用户');
            Button.layoutWeight(1);
            Button.fontSize(14);
            Button.backgroundColor({ "id": 125829141, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.enabled(!this.isChecking);
            Button.onClick(() => {
                this.skip();
            });
        }, Button);
        Button.pop();
        Row.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
