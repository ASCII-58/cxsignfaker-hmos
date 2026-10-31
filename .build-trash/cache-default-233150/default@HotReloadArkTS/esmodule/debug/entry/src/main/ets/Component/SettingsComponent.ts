if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface SettingsComponent_Params {
    version?: string;
    colorModeIndex?: number;
    thumbX?: number;
    trackWidth?: number;
    isDragging?: boolean;
    dragStartThumbX?: number;
    sliderTouchMoved?: boolean;
    pressedKey?: number;
    pressAreas?: Map<number, number[]>;
    modelCaptchaEnabled?: boolean;
    modelTestRunning?: boolean;
    modelTestState?: number;
    hdsMaterialLevel?: number;
    cloudSyncEnabled?: boolean;
    supportFloatingBar?: boolean;
    onImportDone?: () => void;
    context?;
    changelogDialog?: CustomDialogController | undefined;
}
interface ChangelogDialog_Params {
    controller?: CustomDialogController;
    latest?: ChangelogRelease;
}
import curves from "@native:ohos.curves";
import promptAction from "@ohos:promptAction";
import bundleManager from "@ohos:bundle.bundleManager";
import type common from "@ohos:app.ability.common";
import type Want from "@ohos:app.ability.Want";
import ConfigurationConstant from "@ohos:app.ability.ConfigurationConstant";
import fs from "@ohos:file.fs";
import picker from "@ohos:file.picker";
import fileUri from "@ohos:file.fileuri";
import type { BusinessError } from "@ohos:base";
import deviceInfo from "@ohos:deviceInfo";
import preferences from "@ohos:data.preferences";
import utd from "@ohos:data.uniformTypeDescriptor";
import util from "@ohos:util";
import systemShare from "@hms:collaboration.systemShare";
import { DatabaseManager } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import { MsCaptchaDetector } from "@normalized:N&&&entry/src/main/ets/utils/detector/MsCaptchaDetector&";
const PREF_COLOR_MODE_KEY = 'app_color_mode';
const PREF_MODEL_CAPTCHA_KEY = 'model_captcha_enabled';
// 模型测试结果状态：0 未测试 / 1 通过 / 2 失败
const MODEL_TEST_IDLE = 0;
const MODEL_TEST_PASSED = 1;
const MODEL_TEST_FAILED = 2;
const COLOR_MODE_LABELS = ['自动', '浅色', '深色'];
// 沉浸光感材质档位（数值与 SDK 6.1 d.ts 一致，6.0 无 hdsMaterial 模块只能以常量书写）：
// EXQUISITE=0 强 / GENTLE=1 均衡 / SMOOTH=2 弱；6.1(23) 起对首页底部页签与标题栏生效
const HDS_LEVEL_EXQUISITE = 0;
const HDS_LEVEL_GENTLE = 1;
const HDS_LEVEL_SMOOTH = 2;
const PREF_HDS_LEVEL_KEY = 'hds_material_level';
const PREF_LB_SYNC_KEY = 'lb_sync_enabled';
interface MaterialLevelOption {
    level: number;
    label: string;
}
const HDS_MATERIAL_LEVEL_OPTIONS: MaterialLevelOption[] = [
    { level: HDS_LEVEL_EXQUISITE, label: '强' },
    { level: HDS_LEVEL_GENTLE, label: '均衡' },
    { level: HDS_LEVEL_SMOOTH, label: '弱' }
];
// 通用按压 Q 弹的按键标识(外观三档标签用 0/1/2，其余按钮用以下常量)
const KEY_MODEL_TEST = 10;
const KEY_CLEAR_CACHE = 11;
const KEY_EXPORT_DB = 12;
const KEY_IMPORT_DB = 13;
const KEY_CHANGELOG = 14;
const KEY_GITHUB = 15;
const KEY_MAP_STYLE = 16;
// 应用内更新日志数据结构（来源：rawfile/changelog.json，更新日志只需编辑该文件）
interface ChangelogSection {
    title: string;
    items: string[];
}
interface ChangelogRelease {
    version: string;
    date: string;
    sections: ChangelogSection[];
}
interface ChangelogFile {
    releases: ChangelogRelease[];
}
// 华为官方图标库(HarmonyOS Symbol)：自动=半圆、浅色=太阳、深色=月亮
const COLOR_MODE_SYMBOLS: Resource[] = [
    { "id": 125831683, "type": 40000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" },
    { "id": 125831496, "type": 40000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" },
    { "id": 125831541, "type": 40000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }
];
class ChangelogDialog extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.controller = undefined;
        this.latest = undefined;
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: ChangelogDialog_Params) {
        if (params.controller !== undefined) {
            this.controller = params.controller;
        }
        if (params.latest !== undefined) {
            this.latest = params.latest;
        }
    }
    updateStateVars(params: ChangelogDialog_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
    }
    aboutToBeDeleted() {
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private controller?: CustomDialogController;
    setController(ctr: CustomDialogController) {
        this.controller = ctr;
    }
    private latest?: ChangelogRelease;
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('88%');
            Column.padding(20);
            Column.backgroundColor({ "id": 16777241, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Column.borderRadius(24);
            Column.alignItems(HorizontalAlign.Start);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 8 });
            Row.width('100%');
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('更新日志');
            Text.fontSize(20);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(`v${this.latest?.version ?? ''}`);
            Text.fontSize(12);
            Text.fontColor({ "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.backgroundColor({ "id": 16777282, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.padding({ left: 8, right: 8, top: 3, bottom: 3 });
            Text.borderRadius(10);
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.latest?.date ?? '');
            Text.fontSize(13);
            Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.width('100%');
            Text.margin({ top: 4 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Divider.create();
            Divider.color({ "id": 125831013, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Divider.margin({ top: 12, bottom: 4 });
        }, Divider);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Scroll.create();
            Scroll.width('100%');
            Scroll.constraintSize({ maxHeight: '56%' });
            Scroll.scrollBar(BarState.Off);
            Scroll.margin({ top: 8 });
        }, Scroll);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            ForEach.create();
            const forEachItemGenFunction = _item => {
                const section = _item;
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.width('100%');
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create(section.title);
                    Text.fontSize(14);
                    Text.fontWeight(FontWeight.Medium);
                    Text.fontColor({ "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                    Text.margin({ top: 10, bottom: 4 });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    ForEach.create();
                    const forEachItemGenFunction = _item => {
                        const item = _item;
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Row.create();
                            Row.alignItems(VerticalAlign.Top);
                            Row.width('100%');
                            Row.margin({ bottom: 4 });
                        }, Row);
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Text.create('•');
                            Text.fontSize(14);
                            Text.fontColor({ "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            Text.margin({ right: 6 });
                        }, Text);
                        Text.pop();
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Text.create(item);
                            Text.fontSize(14);
                            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            Text.lineHeight(20);
                            Text.layoutWeight(1);
                        }, Text);
                        Text.pop();
                        Row.pop();
                    };
                    this.forEachUpdateFunction(elmtId, section.items, forEachItemGenFunction, (item: string) => item, false, false);
                }, ForEach);
                ForEach.pop();
                Column.pop();
            };
            this.forEachUpdateFunction(elmtId, this.latest?.sections ?? [], forEachItemGenFunction, (section: ChangelogSection) => section.title, false, false);
        }, ForEach);
        ForEach.pop();
        Column.pop();
        Scroll.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('知道了');
            Button.width('100%');
            Button.height(46);
            Button.borderRadius(23);
            Button.fontSize(16);
            Button.backgroundColor({ "id": 16777235, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.fontColor({ "id": 16777259, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.margin({ top: 16 });
            Button.onClick(() => { this.controller?.close(); });
        }, Button);
        Button.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
export class SettingsComponent extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__version = new ObservedPropertySimplePU('', this, "version");
        this.__colorModeIndex = new ObservedPropertySimplePU(0, this, "colorModeIndex");
        this.__thumbX = new ObservedPropertySimplePU(0, this, "thumbX");
        this.__trackWidth = new ObservedPropertySimplePU(0, this, "trackWidth");
        this.__isDragging = new ObservedPropertySimplePU(false, this, "isDragging");
        this.dragStartThumbX = 0;
        this.sliderTouchMoved = false;
        this.__pressedKey = new ObservedPropertySimplePU(-1, this, "pressedKey");
        this.pressAreas = new Map();
        this.__modelCaptchaEnabled = new ObservedPropertySimplePU(false, this, "modelCaptchaEnabled");
        this.__modelTestRunning = new ObservedPropertySimplePU(false, this, "modelTestRunning");
        this.__modelTestState = new ObservedPropertySimplePU(MODEL_TEST_IDLE, this, "modelTestState");
        this.__hdsMaterialLevel = new ObservedPropertySimplePU(HDS_LEVEL_GENTLE, this, "hdsMaterialLevel");
        this.__cloudSyncEnabled = new ObservedPropertySimplePU(true, this, "cloudSyncEnabled");
        this.supportFloatingBar = deviceInfo.sdkApiVersion >= 23;
        this.onImportDone = () => { };
        this.context = getContext(this) as common.UIAbilityContext;
        this.changelogDialog = undefined;
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: SettingsComponent_Params) {
        if (params.version !== undefined) {
            this.version = params.version;
        }
        if (params.colorModeIndex !== undefined) {
            this.colorModeIndex = params.colorModeIndex;
        }
        if (params.thumbX !== undefined) {
            this.thumbX = params.thumbX;
        }
        if (params.trackWidth !== undefined) {
            this.trackWidth = params.trackWidth;
        }
        if (params.isDragging !== undefined) {
            this.isDragging = params.isDragging;
        }
        if (params.dragStartThumbX !== undefined) {
            this.dragStartThumbX = params.dragStartThumbX;
        }
        if (params.sliderTouchMoved !== undefined) {
            this.sliderTouchMoved = params.sliderTouchMoved;
        }
        if (params.pressedKey !== undefined) {
            this.pressedKey = params.pressedKey;
        }
        if (params.pressAreas !== undefined) {
            this.pressAreas = params.pressAreas;
        }
        if (params.modelCaptchaEnabled !== undefined) {
            this.modelCaptchaEnabled = params.modelCaptchaEnabled;
        }
        if (params.modelTestRunning !== undefined) {
            this.modelTestRunning = params.modelTestRunning;
        }
        if (params.modelTestState !== undefined) {
            this.modelTestState = params.modelTestState;
        }
        if (params.hdsMaterialLevel !== undefined) {
            this.hdsMaterialLevel = params.hdsMaterialLevel;
        }
        if (params.cloudSyncEnabled !== undefined) {
            this.cloudSyncEnabled = params.cloudSyncEnabled;
        }
        if (params.supportFloatingBar !== undefined) {
            this.supportFloatingBar = params.supportFloatingBar;
        }
        if (params.onImportDone !== undefined) {
            this.onImportDone = params.onImportDone;
        }
        if (params.context !== undefined) {
            this.context = params.context;
        }
        if (params.changelogDialog !== undefined) {
            this.changelogDialog = params.changelogDialog;
        }
    }
    updateStateVars(params: SettingsComponent_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__version.purgeDependencyOnElmtId(rmElmtId);
        this.__colorModeIndex.purgeDependencyOnElmtId(rmElmtId);
        this.__thumbX.purgeDependencyOnElmtId(rmElmtId);
        this.__trackWidth.purgeDependencyOnElmtId(rmElmtId);
        this.__isDragging.purgeDependencyOnElmtId(rmElmtId);
        this.__pressedKey.purgeDependencyOnElmtId(rmElmtId);
        this.__modelCaptchaEnabled.purgeDependencyOnElmtId(rmElmtId);
        this.__modelTestRunning.purgeDependencyOnElmtId(rmElmtId);
        this.__modelTestState.purgeDependencyOnElmtId(rmElmtId);
        this.__hdsMaterialLevel.purgeDependencyOnElmtId(rmElmtId);
        this.__cloudSyncEnabled.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__version.aboutToBeDeleted();
        this.__colorModeIndex.aboutToBeDeleted();
        this.__thumbX.aboutToBeDeleted();
        this.__trackWidth.aboutToBeDeleted();
        this.__isDragging.aboutToBeDeleted();
        this.__pressedKey.aboutToBeDeleted();
        this.__modelCaptchaEnabled.aboutToBeDeleted();
        this.__modelTestRunning.aboutToBeDeleted();
        this.__modelTestState.aboutToBeDeleted();
        this.__hdsMaterialLevel.aboutToBeDeleted();
        this.__cloudSyncEnabled.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __version: ObservedPropertySimplePU<string>;
    get version() {
        return this.__version.get();
    }
    set version(newValue: string) {
        this.__version.set(newValue);
    }
    private __colorModeIndex: ObservedPropertySimplePU<number>;
    get colorModeIndex() {
        return this.__colorModeIndex.get();
    }
    set colorModeIndex(newValue: number) {
        this.__colorModeIndex.set(newValue);
    }
    private __thumbX: ObservedPropertySimplePU<number>;
    get thumbX() {
        return this.__thumbX.get();
    }
    set thumbX(newValue: number) {
        this.__thumbX.set(newValue);
    }
    private __trackWidth: ObservedPropertySimplePU<number>;
    get trackWidth() {
        return this.__trackWidth.get();
    }
    set trackWidth(newValue: number) {
        this.__trackWidth.set(newValue);
    }
    private __isDragging: ObservedPropertySimplePU<boolean>; // 横向拖动进行中：滑块关闭跟手动画，1:1 跟随手指
    get isDragging() {
        return this.__isDragging.get();
    }
    set isDragging(newValue: boolean) {
        this.__isDragging.set(newValue);
    }
    private dragStartThumbX: number; // Pan 起手时的滑块位置，onActionUpdate 以此累加偏移
    private sliderTouchMoved: boolean; // 按下后是否出现过移动：区分原地点击与转成滚动
    // 通用按压 Q 弹：当前按下的按钮标识，-1 表示无；按压态保持至抬手或移出按钮区域
    private __pressedKey: ObservedPropertySimplePU<number>;
    get pressedKey() {
        return this.__pressedKey.get();
    }
    set pressedKey(newValue: number) {
        this.__pressedKey.set(newValue);
    }
    // 各按压目标的尺寸缓存 key->[宽,高]：触控按下后 Move/Up 持续派发给该组件，
    // 移出判定需要组件自身尺寸(onAreaChange 采集)
    private pressAreas: Map<number, number[]>;
    private __modelCaptchaEnabled: ObservedPropertySimplePU<boolean>;
    get modelCaptchaEnabled() {
        return this.__modelCaptchaEnabled.get();
    }
    set modelCaptchaEnabled(newValue: boolean) {
        this.__modelCaptchaEnabled.set(newValue);
    }
    private __modelTestRunning: ObservedPropertySimplePU<boolean>;
    get modelTestRunning() {
        return this.__modelTestRunning.get();
    }
    set modelTestRunning(newValue: boolean) {
        this.__modelTestRunning.set(newValue);
    }
    private __modelTestState: ObservedPropertySimplePU<number>;
    get modelTestState() {
        return this.__modelTestState.get();
    }
    set modelTestState(newValue: number) {
        this.__modelTestState.set(newValue);
    }
    private __hdsMaterialLevel: ObservedPropertySimplePU<number>;
    get hdsMaterialLevel() {
        return this.__hdsMaterialLevel.get();
    }
    set hdsMaterialLevel(newValue: number) {
        this.__hdsMaterialLevel.set(newValue);
    }
    private __cloudSyncEnabled: ObservedPropertySimplePU<boolean>;
    get cloudSyncEnabled() {
        return this.__cloudSyncEnabled.get();
    }
    set cloudSyncEnabled(newValue: boolean) {
        this.__cloudSyncEnabled.set(newValue);
    }
    // 沉浸光感为 6.1(23) 特性：低版本系统无该材质，设置项随之隐藏
    private readonly supportFloatingBar: boolean;
    private onImportDone: () => void;
    private context;
    // 更新日志弹窗控制器：showChangelog 里按需重建（builder 参数在创建时捕获）
    private changelogDialog: CustomDialogController | undefined;
    async aboutToAppear() {
        this.getVersion();
        await this.loadColorMode();
        this.syncThumb();
        await this.loadModelCaptcha();
        await this.loadHdsMaterialLevel();
        await this.loadCloudSync();
    }
    async getVersion() {
        try {
            let bundleInfo = await bundleManager.getBundleInfoForSelf(bundleManager.BundleFlag.GET_BUNDLE_INFO_WITH_APPLICATION);
            this.version = bundleInfo.versionName;
        }
        catch (error) {
            console.error('Failed to get bundle info', error);
            this.version = 'Unknown';
        }
    }
    async loadColorMode() {
        try {
            let pref = await preferences.getPreferences(this.context, 'settings');
            this.colorModeIndex = await pref.get(PREF_COLOR_MODE_KEY, 0) as number;
        }
        catch (e) {
            this.colorModeIndex = 0;
        }
    }
    /** 滑块位置与当前档位同步：偏好是异步读回的，首帧可能已用默认值 0 布局 */
    private syncThumb() {
        if (this.trackWidth > 0) {
            this.thumbX = this.colorModeIndex * this.getSegWidth();
        }
    }
    async loadModelCaptcha() {
        try {
            let pref = await preferences.getPreferences(this.context, 'settings');
            this.modelCaptchaEnabled = await pref.get(PREF_MODEL_CAPTCHA_KEY, false) as boolean;
        }
        catch (e) {
            this.modelCaptchaEnabled = false;
        }
    }
    async loadHdsMaterialLevel() {
        try {
            let pref = await preferences.getPreferences(this.context, 'settings');
            this.hdsMaterialLevel = await pref.get(PREF_HDS_LEVEL_KEY, HDS_LEVEL_GENTLE) as number;
        }
        catch (e) {
            this.hdsMaterialLevel = HDS_LEVEL_GENTLE;
        }
        // 同步到全局：首页页签/标题栏材质实时跟随（@StorageLink 消费同名 key）
        AppStorage.setOrCreate('hdsMaterialLevel', this.hdsMaterialLevel);
    }
    async setHdsMaterialLevel(level: number) {
        if (level === this.hdsMaterialLevel) {
            return;
        }
        this.hdsMaterialLevel = level;
        AppStorage.setOrCreate('hdsMaterialLevel', level);
        try {
            let pref = await preferences.getPreferences(this.context, 'settings');
            await pref.put(PREF_HDS_LEVEL_KEY, level);
            await pref.flush();
        }
        catch (e) {
            console.error('Failed to save hds material level', e);
        }
    }
    /** 云端排行榜同步开关：偏好持久化 + 经 AppStorage 下发给 LeaderboardReporter（默认开启） */
    async loadCloudSync() {
        try {
            let pref = await preferences.getPreferences(this.context, 'settings');
            this.cloudSyncEnabled = await pref.get(PREF_LB_SYNC_KEY, true) as boolean;
        }
        catch (e) {
            this.cloudSyncEnabled = true;
        }
        AppStorage.setOrCreate('lbSyncEnabled', this.cloudSyncEnabled);
    }
    async saveCloudSync(enabled: boolean) {
        this.cloudSyncEnabled = enabled;
        AppStorage.setOrCreate('lbSyncEnabled', enabled);
        try {
            let pref = await preferences.getPreferences(this.context, 'settings');
            await pref.put(PREF_LB_SYNC_KEY, enabled);
            await pref.flush();
        }
        catch (e) {
            console.error('Failed to save cloud sync switch', e);
        }
    }
    async saveModelCaptcha(enabled: boolean) {
        this.modelCaptchaEnabled = enabled;
        if (!enabled) {
            this.modelTestState = MODEL_TEST_IDLE;
        }
        try {
            let pref = await preferences.getPreferences(this.context, 'settings');
            await pref.put(PREF_MODEL_CAPTCHA_KEY, enabled);
            await pref.flush();
        }
        catch (e) {
            console.error('Failed to save model captcha switch', e);
        }
    }
    /** Beta 开关：开启前警告；取消则回弹开关，关闭直接生效 */
    onModelCaptchaToggle(value: boolean) {
        if (!value) {
            this.saveModelCaptcha(false);
            return;
        }
        AlertDialog.show({
            title: '开启模型自动验证？',
            message: '该功能处于 Beta 阶段：遇到验证码时将调用本地模型自动完成滑块验证，可能失败或存在误判风险；' +
                '失败时会退回手动拖动验证。确定开启吗？',
            primaryButton: {
                value: '取消',
                action: () => {
                    this.modelCaptchaEnabled = false;
                }
            },
            secondaryButton: {
                value: '开启',
                fontColor: { "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" },
                action: () => {
                    this.saveModelCaptcha(true);
                }
            }
        });
    }
    /** 模型可用性测试：仅展示通过/失败，不展示检测细节 */
    async runModelTest() {
        if (this.modelTestRunning) {
            return;
        }
        this.modelTestRunning = true;
        this.modelTestState = MODEL_TEST_IDLE;
        try {
            const passed = await MsCaptchaDetector.selfTest(this.context);
            this.modelTestState = passed ? MODEL_TEST_PASSED : MODEL_TEST_FAILED;
        }
        finally {
            this.modelTestRunning = false;
        }
    }
    async setColorMode(index: number) {
        this.colorModeIndex = index;
        try {
            let pref = await preferences.getPreferences(this.context, 'settings');
            await pref.put(PREF_COLOR_MODE_KEY, index);
            await pref.flush();
        }
        catch (e) {
            console.error('Failed to save color mode', e);
        }
        const appContext = this.context.getApplicationContext();
        setTimeout(() => {
            let mode: ConfigurationConstant.ColorMode;
            if (index === 0) {
                mode = ConfigurationConstant.ColorMode.COLOR_MODE_NOT_SET;
            }
            else if (index === 1) {
                mode = ConfigurationConstant.ColorMode.COLOR_MODE_LIGHT;
            }
            else {
                mode = ConfigurationConstant.ColorMode.COLOR_MODE_DARK;
            }
            appContext.setColorMode(mode);
        }, 80);
    }
    async clearCache() {
        try {
            let cacheDir = this.context.cacheDir;
            let filenames = await fs.listFile(cacheDir);
            for (let filename of filenames) {
                let path = cacheDir + '/' + filename;
                try {
                    let stat = await fs.stat(path);
                    if (stat.isDirectory()) {
                        await fs.rmdir(path);
                    }
                    else {
                        await fs.unlink(path);
                    }
                }
                catch (e) {
                    // Ignore individual file errors
                }
            }
            promptAction.showToast({ message: '缓存已清除' });
        }
        catch (error) {
            console.error('Failed to clear cache', error);
            promptAction.showToast({ message: '清除缓存失败' });
        }
    }
    confirmClearCache() {
        AlertDialog.show({
            message: '确定清除缓存吗？临时文件与图片缓存将被删除。',
            primaryButton: {
                value: '取消',
                action: () => { }
            },
            secondaryButton: {
                value: '清除',
                fontColor: { "id": 16777263, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" },
                action: () => {
                    this.clearCache();
                }
            }
        });
    }
    /**
     * 清理地图相关缓存资源：
     * - filesDir/map-style：旧版内置底图样式（约 100MB；现已改用瓦片底图，仅清理历史残留）
     * - cacheDir/maptiles：瓦片磁盘缓存（上限 4MB，LRU 自动淘汰）
     * 删除后不影响功能：下次使用地图选点时按需重新下载。
     */
    async clearMapResources() {
        const mapStyleDir = this.context.filesDir + '/map-style';
        const tileCacheDir = this.context.cacheDir + '/maptiles';
        const mapSdkCache = this.context.cacheDir + '/rdb';
        try {
            let cleaned = 0;
            if (await fs.access(mapStyleDir)) {
                await fs.rmdir(mapStyleDir);
                cleaned++;
            }
            if (await fs.access(tileCacheDir)) {
                await fs.rmdir(tileCacheDir);
                cleaned++;
            }
            if (await fs.access(mapSdkCache)) {
                // 华为 MapKit 底图瓦片缓存（SateLlite.db）；现已弃用 MapKit，仅清理历史残留
                await fs.rmdir(mapSdkCache);
                cleaned++;
            }
            if (cleaned === 0) {
                promptAction.showToast({ message: '地图缓存为空，无需清理' });
            }
            else {
                promptAction.showToast({ message: '已清理，下次使用地图选点时会按需重新下载' });
            }
        }
        catch (error) {
            console.error('Failed to clear map resources', error);
            promptAction.showToast({ message: '清理地图资源失败' });
        }
    }
    confirmClearMapResources() {
        AlertDialog.show({
            message: '确定清理地图缓存资源吗？包括旧版底图样式（约 100MB）与瓦片缓存（上限 4MB）。清理后不影响功能，使用地图选点时会按需重新下载。',
            primaryButton: {
                value: '取消',
                action: () => { }
            },
            secondaryButton: {
                value: '清理',
                fontColor: { "id": 16777263, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" },
                action: () => {
                    this.clearMapResources();
                }
            }
        });
    }
    async exportDatabase() {
        try {
            const dbManager = DatabaseManager.getInstance();
            const jsonData = await dbManager.exportToJSON();
            const tempPath = this.context.cacheDir + '/chaoxing_backup.json';
            const encoder = new util.TextEncoder();
            const uint8 = encoder.encode(jsonData);
            const ff = await fs.open(tempPath, fs.OpenMode.CREATE | fs.OpenMode.WRITE_ONLY);
            await fs.write(ff.fd, uint8.buffer);
            await fs.close(ff);
            const uriObj = new fileUri.FileUri(tempPath);
            let shareData = new systemShare.SharedData({
                utd: utd.UniformDataType.PLAIN_TEXT,
                uri: uriObj.toString(),
                title: '导出数据库',
                description: '超星签到助手数据库备份',
                label: '数据库备份'
            });
            const ctx = this.getUIContext().getHostContext() as common.UIAbilityContext;
            let controller = new systemShare.ShareController(shareData);
            controller.show(ctx, {
                selectionMode: systemShare.SelectionMode.SINGLE,
                previewMode: systemShare.SharePreviewMode.DETAIL
            }).catch((error: BusinessError) => {
                console.error('Share error', JSON.stringify(error));
                promptAction.showToast({ message: '分享失败' });
            });
            promptAction.showToast({ message: '数据库已导出，请选择保存位置' });
        }
        catch (error) {
            const err = error as BusinessError;
            promptAction.showToast({ message: `导出失败: ${err.code} ${err.message}` });
        }
    }
    async importDatabase() {
        try {
            const selectOptions = new picker.DocumentSelectOptions();
            selectOptions.maxSelectNumber = 1;
            const documentPicker = new picker.DocumentViewPicker();
            const uris = await documentPicker.select(selectOptions);
            if (!uris || uris.length === 0) {
                return;
            }
            const uri = uris[0];
            const statInfo = await fs.stat(uri);
            const file = await fs.open(uri, fs.OpenMode.READ_ONLY);
            const arrayBuffer = new ArrayBuffer(statInfo.size);
            await fs.read(file.fd, arrayBuffer);
            await fs.close(file);
            const decoder = util.TextDecoder.create('utf-8', { ignoreBOM: true });
            const jsonData = decoder.decodeWithStream(new Uint8Array(arrayBuffer), { stream: false });
            const dbManager = DatabaseManager.getInstance();
            const result = await dbManager.importFromJSON(jsonData);
            if (result.success) {
                promptAction.showToast({ message: result.message });
                this.onImportDone();
            }
            else {
                promptAction.showToast({ message: result.message });
            }
        }
        catch (error) {
            console.error('Import failed', JSON.stringify(error));
            promptAction.showToast({ message: '导入失败：文件读取错误' });
        }
    }
    openUrl(url: string) {
        let want: Want = {
            action: 'ohos.want.action.viewData',
            entities: ['entity.system.browsable'],
            uri: url
        };
        this.context.startAbility(want).catch((err: BusinessError) => {
            console.error('Failed to open URL', err);
            promptAction.showToast({ message: '无法打开链接' });
        });
    }
    /**
     * 从 rawfile/changelog.json 加载更新日志并以卡片弹窗展示最新版本
     * 新增版本时只需在 changelog.json 的 releases 数组头部追加一条，无需改代码
     */
    async showChangelog() {
        try {
            const raw = await this.context.resourceManager.getRawFileContent('changelog.json');
            const text = util.TextDecoder.create('utf-8', { ignoreBOM: true })
                .decodeWithStream(raw, { stream: false });
            const file = JSON.parse(text) as ChangelogFile;
            if (!file.releases || file.releases.length === 0) {
                throw new Error('changelog.json has no releases');
            }
            const latest = file.releases[0];
            this.changelogDialog = new CustomDialogController({
                builder: () => {
                    let jsDialog = new ChangelogDialog(this, { latest: latest }, undefined, -1, () => { }, { page: "entry/src/main/ets/Component/SettingsComponent.ets", line: 546, col: 18 });
                    jsDialog.setController(this.changelogDialog);
                    ViewPU.create(jsDialog);
                    let paramsLambda = () => {
                        return {
                            latest: latest
                        };
                    };
                    jsDialog.paramsGenerator_ = paramsLambda;
                },
                autoCancel: true,
                customStyle: true
            }, this);
            this.changelogDialog.open();
        }
        catch (error) {
            console.error('Failed to load changelog', JSON.stringify(error));
            AlertDialog.show({
                title: '更新日志',
                message: '更新日志加载失败',
                confirm: { value: '知道了', action: () => { } }
            });
        }
    }
    SectionHeader(title: string, parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(title);
            Text.fontSize(14);
            Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.width('100%');
            Text.margin({ bottom: 8, left: 4 });
        }, Text);
        Text.pop();
    }
    SettingsDivider(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Divider.create();
            Divider.color({ "id": 125831013, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Divider.margin({ left: 16, right: 16 });
        }, Divider);
    }
    /** 通用栏行文案:标题 + 可选副标题 */
    SettingTexts(title: string, subtitle: string, parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.alignItems(HorizontalAlign.Start);
            Column.layoutWeight(1);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(title);
            Text.fontSize(16);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (subtitle !== '') {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(subtitle);
                        Text.fontSize(12);
                        Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.margin({ top: 2 });
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
    }
    Chevron(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777265, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Image.draggable(false);
            Image.width(14);
            Image.height(14);
            Image.fillColor({ "id": 16777248, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
        }, Image);
    }
    private getSegWidth(): number {
        return this.trackWidth / 3;
    }
    /** 拖动中滑块的横向范围：0 ~ 末档起点 */
    private clampThumbX(x: number): number {
        return Math.min(Math.max(x, 0), this.getSegWidth() * 2);
    }
    /** 由滑块当前位置换算档位（四舍五入到最近档） */
    private indexFromThumb(): number {
        return Math.min(2, Math.max(0, Math.round(this.thumbX / this.getSegWidth())));
    }
    /** 悬浮页签式交互：按下滑块即弹至手指处（滑块中心对准手指），后续拖动从该位置继续；
     *  原地点击交给文字 onClick 提交；起手后转成列表滚动等未构成点击的，滑块弹回生效档位 */
    private onSliderTouch(event: TouchEvent) {
        const segW = this.getSegWidth();
        if (segW <= 0) {
            return;
        }
        if (event.type === TouchType.Down) {
            this.sliderTouchMoved = false;
            this.thumbX = this.clampThumbX(event.touches[0].x - segW / 2);
        }
        else if (event.type === TouchType.Move) {
            this.sliderTouchMoved = true;
        }
        else if ((event.type === TouchType.Up || event.type === TouchType.Cancel) && !this.isDragging) {
            if (this.sliderTouchMoved) {
                this.syncThumb();
            }
        }
    }
    /** 点选提交：滑块直接落位，必要时应用颜色模式 */
    private commitIndex(index: number) {
        if (index === this.colorModeIndex) {
            this.syncThumb();
            return;
        }
        this.setColorMode(index);
        this.syncThumb();
    }
    /** 采集按压目标自身尺寸，供"移出按钮区域"命中检测 */
    private pressAreaHandler(key: number): (_old: Area, area: Area) => void {
        return (_old: Area, area: Area) => {
            this.pressAreas.set(key, [area.width as number, area.height as number]);
        };
    }
    /** 通用按压触控(与用户中心图钉按钮同机制)：按下进入按压态并保持到抬手/移出
     *  按钮边界。不能用"非 Down 即定时复位"的写法：按住时手指微抖会持续产生
     *  Move 事件被误判成抬手，按压动画刚播完就被复位，看起来"一按完就弹回" */
    private pressTouchHandler(key: number): (event: TouchEvent) => void {
        return (event: TouchEvent) => {
            if (event.type === TouchType.Down) {
                this.pressedKey = key;
            }
            else if (event.type === TouchType.Up || event.type === TouchType.Cancel) {
                this.pressedKey = -1;
            }
            else if (event.type === TouchType.Move && this.pressedKey === key) {
                const size = this.pressAreas.get(key);
                if (!size) {
                    return;
                }
                const t = event.touches[0];
                if (t.x < 0 || t.y < 0 || t.x > size[0] || t.y > size[1]) {
                    this.pressedKey = -1;
                }
            }
        };
    }
    /** 模式图标(官方 Symbol)：切换时非选中图标旋转±90°并缩放淡出，选中图标从对应方向旋入 */
    ThemeModeIcon(idx: number, parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            SymbolGlyph.create(COLOR_MODE_SYMBOLS[idx]);
            globalThis.Context.animation({ curve: curves.springMotion(0.3, 0.75) });
            SymbolGlyph.fontSize(24);
            SymbolGlyph.fontColor([{ "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }]);
            SymbolGlyph.opacity(this.colorModeIndex === idx ? 1 : 0);
            SymbolGlyph.scale({
                x: this.colorModeIndex === idx ? 1 : 0.4,
                y: this.colorModeIndex === idx ? 1 : 0.4
            });
            SymbolGlyph.rotate({
                z: 1,
                angle: this.colorModeIndex === idx ? 0 : (idx < this.colorModeIndex ? -90 : 90)
            });
            globalThis.Context.animation(null);
        }, SymbolGlyph);
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor(Color.Transparent);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 半屏弹层拖拽指示条
            Column.create();
            // 半屏弹层拖拽指示条
            Column.width(36);
            // 半屏弹层拖拽指示条
            Column.height(4);
            // 半屏弹层拖拽指示条
            Column.borderRadius(2);
            // 半屏弹层拖拽指示条
            Column.margin({ top: 10 });
        }, Column);
        // 半屏弹层拖拽指示条
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('设置');
            Text.fontSize(24);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.width('100%');
            Text.textAlign(TextAlign.Start);
            Text.padding({ left: 20, top: 12, bottom: 16 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            List.create({ space: 16 });
            List.width('100%');
            List.layoutWeight(1);
            List.padding({ left: 16, right: 16 });
            List.scrollBar(BarState.Off);
            List.edgeEffect(EdgeEffect.Spring);
        }, List);
        {
            const itemCreation = (elmtId, isInitialRender) => {
                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                ListItem.create(deepRenderFunction, true);
                if (!isInitialRender) {
                    // 外观：模式图标 + 三段滑块(点选切换 自动/浅色/深色)
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
                this.SectionHeader.bind(this)('外观');
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.width('100%');
                    Row.alignItems(VerticalAlign.Center);
                    Row.padding({ left: 12, right: 12, top: 10, bottom: 10 });
                    Row.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Row.borderRadius(16);
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Stack.create();
                }, Stack);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.width(46);
                    Row.height(46);
                    Row.borderRadius(23);
                    Row.backgroundColor({ "id": 16777246, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Row.border({ width: 0.8, color: { "id": 16777242, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } });
                    Row.shadow({ radius: 8, color: { "id": 16777243, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }, offsetY: 2 });
                }, Row);
                Row.pop();
                this.ThemeModeIcon.bind(this)(0);
                this.ThemeModeIcon.bind(this)(1);
                this.ThemeModeIcon.bind(this)(2);
                Stack.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Stack.create({ alignContent: Alignment.Start });
                    Stack.layoutWeight(1);
                    Stack.margin({ left: 12 });
                    Stack.onAreaChange((_oldArea: Area, newArea: Area) => {
                        this.trackWidth = newArea.width as number;
                        this.syncThumb();
                    });
                    Stack.onTouch((event: TouchEvent) => this.onSliderTouch(event));
                    globalThis.Gesture.create(GesturePriority.Low);
                    // 横向 Pan 与 List 纵向滚动按轴向竞争：横向拖动独占触控，纵向漂移由列表滚动；
                    // 起手位移 < distance 的点按不会触发 Pan，文字 onClick 点选不受影响
                    PanGesture.create({ fingers: 1, direction: PanDirection.Horizontal, distance: 5 });
                    // 横向 Pan 与 List 纵向滚动按轴向竞争：横向拖动独占触控，纵向漂移由列表滚动；
                    // 起手位移 < distance 的点按不会触发 Pan，文字 onClick 点选不受影响
                    PanGesture.onActionStart(() => {
                        this.isDragging = true;
                        this.dragStartThumbX = this.thumbX;
                    });
                    // 横向 Pan 与 List 纵向滚动按轴向竞争：横向拖动独占触控，纵向漂移由列表滚动；
                    // 起手位移 < distance 的点按不会触发 Pan，文字 onClick 点选不受影响
                    PanGesture.onActionUpdate((event: GestureEvent) => {
                        this.thumbX = this.clampThumbX(this.dragStartThumbX + event.offsetX);
                    });
                    // 横向 Pan 与 List 纵向滚动按轴向竞争：横向拖动独占触控，纵向漂移由列表滚动；
                    // 起手位移 < distance 的点按不会触发 Pan，文字 onClick 点选不受影响
                    PanGesture.onActionEnd(() => {
                        this.isDragging = false;
                        this.commitIndex(this.indexFromThumb());
                    });
                    // 横向 Pan 与 List 纵向滚动按轴向竞争：横向拖动独占触控，纵向漂移由列表滚动；
                    // 起手位移 < distance 的点按不会触发 Pan，文字 onClick 点选不受影响
                    PanGesture.onActionCancel(() => {
                        this.isDragging = false;
                        this.commitIndex(this.indexFromThumb());
                    });
                    // 横向 Pan 与 List 纵向滚动按轴向竞争：横向拖动独占触控，纵向漂移由列表滚动；
                    // 起手位移 < distance 的点按不会触发 Pan，文字 onClick 点选不受影响
                    PanGesture.pop();
                    globalThis.Gesture.pop();
                }, Stack);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    // 滑轨：胶囊形底
                    Row.create();
                    // 滑轨：胶囊形底
                    Row.width('100%');
                    // 滑轨：胶囊形底
                    Row.height(40);
                    // 滑轨：胶囊形底
                    Row.borderRadius(20);
                    // 滑轨：胶囊形底
                    Row.backgroundColor({ "id": 16777246, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    // 滑轨：胶囊形底
                    Row.border({ width: 0.8, color: { "id": 16777242, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } });
                }, Row);
                // 滑轨：胶囊形底
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    // 滑块：选中档位的底色胶囊，落位带 200ms 缓动
                    Row.create();
                    globalThis.Context.animation({ duration: this.isDragging ? 0 : 200, curve: Curve.EaseOut });
                    // 滑块：选中档位的底色胶囊，落位带 200ms 缓动
                    Row.width(this.trackWidth > 0 ? this.getSegWidth() - 6 : 0);
                    // 滑块：选中档位的底色胶囊，落位带 200ms 缓动
                    Row.height(34);
                    // 滑块：选中档位的底色胶囊，落位带 200ms 缓动
                    Row.borderRadius(17);
                    // 滑块：选中档位的底色胶囊，落位带 200ms 缓动
                    Row.backgroundColor({ "id": 16777244, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    // 滑块：选中档位的底色胶囊，落位带 200ms 缓动
                    Row.border({ width: 0.8, color: { "id": 16777242, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } });
                    // 滑块：选中档位的底色胶囊，落位带 200ms 缓动
                    Row.margin({ left: 3 });
                    // 滑块：选中档位的底色胶囊，落位带 200ms 缓动
                    Row.translate({ x: this.thumbX });
                    globalThis.Context.animation(null);
                }, Row);
                // 滑块：选中档位的底色胶囊，落位带 200ms 缓动
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.width('100%');
                    Row.height(40);
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    ForEach.create();
                    const forEachItemGenFunction = _item => {
                        const idx = _item;
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Text.create(COLOR_MODE_LABELS[idx]);
                            Text.fontSize(14);
                            Text.fontWeight(this.colorModeIndex === idx ? FontWeight.Medium : FontWeight.Normal);
                            Text.fontColor(this.colorModeIndex === idx
                                ? { "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : { "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            Text.textAlign(TextAlign.Center);
                            Text.layoutWeight(1);
                            Text.height('100%');
                            Text.onClick(() => {
                                this.commitIndex(idx);
                            });
                        }, Text);
                        Text.pop();
                    };
                    this.forEachUpdateFunction(elmtId, [0, 1, 2], forEachItemGenFunction, (idx: number) => idx.toString(), false, false);
                }, ForEach);
                ForEach.pop();
                Row.pop();
                Stack.pop();
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    if (this.supportFloatingBar) {
                        this.ifElseBranchUpdateFunction(0, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                // 沉浸光感（官方 Spatialization 示例同款）：档位经 AppStorage 实时下发到首页页签与标题栏
                                Column.create();
                                // 沉浸光感（官方 Spatialization 示例同款）：档位经 AppStorage 实时下发到首页页签与标题栏
                                Column.width('100%');
                                // 沉浸光感（官方 Spatialization 示例同款）：档位经 AppStorage 实时下发到首页页签与标题栏
                                Column.margin({ top: 12 });
                                // 沉浸光感（官方 Spatialization 示例同款）：档位经 AppStorage 实时下发到首页页签与标题栏
                                Column.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                // 沉浸光感（官方 Spatialization 示例同款）：档位经 AppStorage 实时下发到首页页签与标题栏
                                Column.borderRadius(16);
                            }, Column);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Row.create();
                                Row.width('100%');
                                Row.padding({ left: 16, right: 16, top: 13, bottom: 13 });
                            }, Row);
                            this.SettingTexts.bind(this)('沉浸光感', '页签与标题栏的光感材质强弱');
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Row.create({ space: 6 });
                            }, Row);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                ForEach.create();
                                const forEachItemGenFunction = _item => {
                                    const item = _item;
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(item.label);
                                        globalThis.Context.animation({ duration: 150, curve: Curve.EaseOut });
                                        Text.fontSize(13);
                                        Text.fontColor(this.hdsMaterialLevel === item.level
                                            ? { "id": 16777259, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : { "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                        Text.backgroundColor(this.hdsMaterialLevel === item.level
                                            ? { "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : { "id": 16777258, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                        Text.padding({ left: 12, right: 12, top: 6, bottom: 6 });
                                        Text.borderRadius(15);
                                        globalThis.Context.animation(null);
                                        Text.onClick(() => {
                                            this.setHdsMaterialLevel(item.level);
                                        });
                                    }, Text);
                                    Text.pop();
                                };
                                this.forEachUpdateFunction(elmtId, HDS_MATERIAL_LEVEL_OPTIONS, forEachItemGenFunction, (item: MaterialLevelOption) => item.level.toString(), false, false);
                            }, ForEach);
                            ForEach.pop();
                            Row.pop();
                            Row.pop();
                            // 沉浸光感（官方 Spatialization 示例同款）：档位经 AppStorage 实时下发到首页页签与标题栏
                            Column.pop();
                        });
                    }
                    else {
                        this.ifElseBranchUpdateFunction(1, () => {
                        });
                    }
                }, If);
                If.pop();
                Column.pop();
                // 外观：模式图标 + 三段滑块(点选切换 自动/浅色/深色)
                ListItem.pop();
            };
            this.observeComponentCreation2(itemCreation2, ListItem);
            // 外观：模式图标 + 三段滑块(点选切换 自动/浅色/深色)
            ListItem.pop();
        }
        {
            const itemCreation = (elmtId, isInitialRender) => {
                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                ListItem.create(deepRenderFunction, true);
                if (!isInitialRender) {
                    // 验证码：模型自动验证（Beta）
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
                this.SectionHeader.bind(this)('验证码');
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Column.borderRadius(16);
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.width('100%');
                    Row.padding({ left: 16, right: 16, top: 13, bottom: 13 });
                }, Row);
                this.SettingTexts.bind(this)('模型自动验证', '使用本地模型自动完成滑块验证码');
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('Beta');
                    Text.fontSize(10);
                    Text.fontColor(Color.White);
                    Text.padding({ left: 6, right: 6, top: 2, bottom: 2 });
                    Text.borderRadius(6);
                    Text.backgroundColor({ "id": 16777232, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.margin({ right: 10 });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Toggle.create({ type: ToggleType.Switch, isOn: this.modelCaptchaEnabled });
                    Toggle.selectedColor({ "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Toggle.onChange((value: boolean) => {
                        // sheet 每次打开都会重建本组件，异步读偏好会把 isOn 由 false 回填为 true，
                        // 程序化回填同样触发 onChange；回填值必然与当前状态一致，用户真实拨动才会相异
                        if (value === this.modelCaptchaEnabled) {
                            return;
                        }
                        this.onModelCaptchaToggle(value);
                    });
                }, Toggle);
                Toggle.pop();
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    if (this.modelCaptchaEnabled) {
                        this.ifElseBranchUpdateFunction(0, () => {
                            this.SettingsDivider.bind(this)();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Row.create();
                                Row.width('100%');
                                Row.padding({ left: 16, right: 16, top: 13, bottom: 13 });
                            }, Row);
                            this.SettingTexts.bind(this)('模型测试', '验证模型可用性与准确度');
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Button.createWithLabel(this.modelTestRunning ? '测试中...' : '测试');
                                globalThis.Context.animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) });
                                Button.fontSize(14);
                                Button.height(32);
                                Button.padding({ left: 16, right: 16 });
                                Button.enabled(!this.modelTestRunning);
                                Button.scale({
                                    x: this.pressedKey === KEY_MODEL_TEST ? 0.95 : 1,
                                    y: this.pressedKey === KEY_MODEL_TEST ? 0.95 : 1
                                });
                                globalThis.Context.animation(null);
                                Button.onAreaChange(this.pressAreaHandler(KEY_MODEL_TEST));
                                Button.onTouch(this.pressTouchHandler(KEY_MODEL_TEST));
                                Button.onClick(() => {
                                    this.runModelTest();
                                });
                            }, Button);
                            Button.pop();
                            Row.pop();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                If.create();
                                if (this.modelTestState !== MODEL_TEST_IDLE && !this.modelTestRunning) {
                                    this.ifElseBranchUpdateFunction(0, () => {
                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                            Text.create(this.modelTestState === MODEL_TEST_PASSED ? '模型可用，准确度正常' : '模型不可用或准确度异常');
                                            Text.fontSize(12);
                                            Text.fontColor(this.modelTestState === MODEL_TEST_PASSED
                                                ? { "id": 16777256, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : { "id": 16777263, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                            Text.width('100%');
                                            Text.padding({ left: 16, right: 16, bottom: 12 });
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
                // 验证码：模型自动验证（Beta）
                ListItem.pop();
            };
            this.observeComponentCreation2(itemCreation2, ListItem);
            // 验证码：模型自动验证（Beta）
            ListItem.pop();
        }
        {
            const itemCreation = (elmtId, isInitialRender) => {
                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                ListItem.create(deepRenderFunction, true);
                if (!isInitialRender) {
                    // 排行榜：签到记录云端同步开关（实时上报 + 启动自动补录）
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
                this.SectionHeader.bind(this)('排行榜');
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Column.borderRadius(16);
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.width('100%');
                    Row.padding({ left: 16, right: 16, top: 13, bottom: 13 });
                }, Row);
                this.SettingTexts.bind(this)('云端同步', '签到记录自动同步到排行榜，历史记录启动时自动补录');
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Toggle.create({ type: ToggleType.Switch, isOn: this.cloudSyncEnabled });
                    Toggle.selectedColor({ "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Toggle.onChange((value: boolean) => {
                        // sheet 每次打开都会重建本组件，程序化回填同样触发 onChange；
                        // 回填值必然与当前状态一致，用户真实拨动才会相异
                        if (value === this.cloudSyncEnabled) {
                            return;
                        }
                        this.saveCloudSync(value);
                    });
                }, Toggle);
                Toggle.pop();
                Row.pop();
                Column.pop();
                Column.pop();
                // 排行榜：签到记录云端同步开关（实时上报 + 启动自动补录）
                ListItem.pop();
            };
            this.observeComponentCreation2(itemCreation2, ListItem);
            // 排行榜：签到记录云端同步开关（实时上报 + 启动自动补录）
            ListItem.pop();
        }
        {
            const itemCreation = (elmtId, isInitialRender) => {
                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                ListItem.create(deepRenderFunction, true);
                if (!isInitialRender) {
                    // 通用：两行式设置行(标题 + 说明)
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
                this.SectionHeader.bind(this)('通用');
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Column.borderRadius(16);
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.width('100%');
                    Row.padding({ left: 16, right: 16, top: 13, bottom: 13 });
                }, Row);
                this.SettingTexts.bind(this)('版本', '当前应用版本');
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create(this.version);
                    Text.fontSize(14);
                    Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Text);
                Text.pop();
                Row.pop();
                this.SettingsDivider.bind(this)();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    globalThis.Context.animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) });
                    Row.width('100%');
                    Row.padding({ left: 16, right: 16, top: 13, bottom: 13 });
                    Row.scale({
                        x: this.pressedKey === KEY_CLEAR_CACHE ? 0.97 : 1,
                        y: this.pressedKey === KEY_CLEAR_CACHE ? 0.97 : 1
                    });
                    globalThis.Context.animation(null);
                    Row.onAreaChange(this.pressAreaHandler(KEY_CLEAR_CACHE));
                    Row.onTouch(this.pressTouchHandler(KEY_CLEAR_CACHE));
                    Row.onClick(() => {
                        this.confirmClearCache();
                    });
                }, Row);
                this.SettingTexts.bind(this)('清除缓存', '清理临时文件与图片缓存');
                this.Chevron.bind(this)();
                Row.pop();
                this.SettingsDivider.bind(this)();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    globalThis.Context.animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) });
                    Row.width('100%');
                    Row.padding({ left: 16, right: 16, top: 13, bottom: 13 });
                    Row.scale({
                        x: this.pressedKey === KEY_MAP_STYLE ? 0.97 : 1,
                        y: this.pressedKey === KEY_MAP_STYLE ? 0.97 : 1
                    });
                    globalThis.Context.animation(null);
                    Row.onAreaChange(this.pressAreaHandler(KEY_MAP_STYLE));
                    Row.onTouch(this.pressTouchHandler(KEY_MAP_STYLE));
                    Row.onClick(() => {
                        this.confirmClearMapResources();
                    });
                }, Row);
                this.SettingTexts.bind(this)('清理地图资源', '清理旧版底图样式与瓦片缓存（地图选点按需重新下载）');
                this.Chevron.bind(this)();
                Row.pop();
                this.SettingsDivider.bind(this)();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    globalThis.Context.animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) });
                    Row.width('100%');
                    Row.padding({ left: 16, right: 16, top: 13, bottom: 13 });
                    Row.scale({
                        x: this.pressedKey === KEY_EXPORT_DB ? 0.97 : 1,
                        y: this.pressedKey === KEY_EXPORT_DB ? 0.97 : 1
                    });
                    globalThis.Context.animation(null);
                    Row.onAreaChange(this.pressAreaHandler(KEY_EXPORT_DB));
                    Row.onTouch(this.pressTouchHandler(KEY_EXPORT_DB));
                    Row.onClick(() => {
                        this.exportDatabase();
                    });
                }, Row);
                this.SettingTexts.bind(this)('导出数据库', '备份用户数据为 JSON 文件');
                this.Chevron.bind(this)();
                Row.pop();
                this.SettingsDivider.bind(this)();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    globalThis.Context.animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) });
                    Row.width('100%');
                    Row.padding({ left: 16, right: 16, top: 13, bottom: 13 });
                    Row.scale({
                        x: this.pressedKey === KEY_IMPORT_DB ? 0.97 : 1,
                        y: this.pressedKey === KEY_IMPORT_DB ? 0.97 : 1
                    });
                    globalThis.Context.animation(null);
                    Row.onAreaChange(this.pressAreaHandler(KEY_IMPORT_DB));
                    Row.onTouch(this.pressTouchHandler(KEY_IMPORT_DB));
                    Row.onClick(() => {
                        this.importDatabase();
                    });
                }, Row);
                this.SettingTexts.bind(this)('导入数据库', '从 JSON 备份文件恢复数据');
                this.Chevron.bind(this)();
                Row.pop();
                this.SettingsDivider.bind(this)();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    globalThis.Context.animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) });
                    Row.width('100%');
                    Row.padding({ left: 16, right: 16, top: 13, bottom: 13 });
                    Row.scale({
                        x: this.pressedKey === KEY_CHANGELOG ? 0.97 : 1,
                        y: this.pressedKey === KEY_CHANGELOG ? 0.97 : 1
                    });
                    globalThis.Context.animation(null);
                    Row.onAreaChange(this.pressAreaHandler(KEY_CHANGELOG));
                    Row.onTouch(this.pressTouchHandler(KEY_CHANGELOG));
                    Row.onClick(() => {
                        this.showChangelog();
                    });
                }, Row);
                this.SettingTexts.bind(this)('更新日志', '查看最近的更新内容');
                this.Chevron.bind(this)();
                Row.pop();
                this.SettingsDivider.bind(this)();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    globalThis.Context.animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) });
                    Row.width('100%');
                    Row.padding({ left: 16, right: 16, top: 13, bottom: 13 });
                    Row.scale({
                        x: this.pressedKey === KEY_GITHUB ? 0.97 : 1,
                        y: this.pressedKey === KEY_GITHUB ? 0.97 : 1
                    });
                    globalThis.Context.animation(null);
                    Row.onAreaChange(this.pressAreaHandler(KEY_GITHUB));
                    Row.onTouch(this.pressTouchHandler(KEY_GITHUB));
                    Row.onClick(() => {
                        this.openUrl('https://github.com/ASCII-58/chaoxingsignfacker');
                    });
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Image.create({ "id": 16777274, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Image.draggable(false);
                    Image.width(20);
                    Image.height(20);
                    Image.margin({ right: 10 });
                    Image.fillColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Image);
                this.SettingTexts.bind(this)('项目地址', '在 GitHub 上查看源码');
                this.Chevron.bind(this)();
                Row.pop();
                Column.pop();
                Column.pop();
                // 通用：两行式设置行(标题 + 说明)
                ListItem.pop();
            };
            this.observeComponentCreation2(itemCreation2, ListItem);
            // 通用：两行式设置行(标题 + 说明)
            ListItem.pop();
        }
        List.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
