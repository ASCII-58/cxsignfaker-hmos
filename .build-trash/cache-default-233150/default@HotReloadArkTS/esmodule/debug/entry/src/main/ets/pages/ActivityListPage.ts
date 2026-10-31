if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface ActivityListPage_Params {
    classInfo?: ClassInfo | null;
    pathInfos?: NavPathStack;
    courseId?: string;
    teacherfactor?: string;
    classId?: string;
    name?: string;
    ActivityList?: ActivityItem[] | null;
    activityExt?: string;
    isRefreshing?: boolean;
    cloneSessionCookies?: string;
    statusBarHeight?: number;
    loadEpoch?: number;
    listScroller?: Scroller;
    supportFloatingBar?: boolean;
}
interface signIcon_Params {
    signType?: string;
    isEnded?: boolean;
    icon?: ResourceStr;
    isLoaded?: boolean;
}
import { CourseAndActivity } from "@normalized:N&&&entry/src/main/ets/utils/classFun&";
import type { ActivityItem, ClassInfo } from "@normalized:N&&&entry/src/main/ets/utils/classFun&";
import { ChaoxingUtils } from "@normalized:N&&&entry/src/main/ets/utils/utils&";
import { LengthMetrics } from "@ohos:arkui.node";
import promptAction from "@ohos:promptAction";
import deviceInfo from "@ohos:deviceInfo";
import { HdsNavDestination } from "@hms:hds.hdsBaseComponent";
import { ScrollEffectType } from "@hms:hds.hdsBaseComponent";
import type { HdsNavDestinationAttribute } from "@hms:hds.hdsBaseComponent";
import type { hdsMaterial } from "@hms:hds.hdsMaterial";
import { DatabaseManager } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import { CloneSessionBanner } from "@normalized:N&&&entry/src/main/ets/Component/CloneSessionBanner&";
import JSON from "@ohos:util.json";
import hilog from "@ohos:hilog";
const TAG = 'ActivityListPage';
const DOMAIN = 0x0005;
// 沉浸光感枚举值别名（与 SDK 6.1 d.ts 一致）：MaterialType.ADAPTIVE=100、MaterialLevel.GENTLE=1（首页同款）
const HDS_MATERIAL_TYPE_ADAPTIVE = 100;
const HDS_MATERIAL_LEVEL_GENTLE = 1;
/**
 * @param signType '0' 普通/拍照签到 | '2' 扫码签到 | '3' 手势签到 | '4' 位置签到 | '5' 签到码签到
 */
export interface ActivityInfo {
    ActivityId: string;
    CourseId: string;
    ClassId: string;
    signType: SignType;
    /** 活动列表返回的 data.ext，preSign 时使用 */
    ext: string;
    /** 活动名称（仅签到统计落库展示用） */
    ActivityName?: string;
}
export enum SignType {
    NORMAL = "0",
    QRCODE = "2",
    GESTURE = "3",
    LOCATION = "4",
    PASSWORD = "5"
}
class signIcon extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__signType = new SynchedPropertySimpleOneWayPU(params.signType, this, "signType");
        this.__isEnded = new SynchedPropertySimpleOneWayPU(params.isEnded, this, "isEnded");
        this.__icon = new ObservedPropertyObjectPU({ "id": 16777218, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }, this, "icon");
        this.__isLoaded = new ObservedPropertySimplePU(false, this, "isLoaded");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: signIcon_Params) {
        if (params.isEnded === undefined) {
            this.__isEnded.set(false);
        }
        if (params.icon !== undefined) {
            this.icon = params.icon;
        }
        if (params.isLoaded !== undefined) {
            this.isLoaded = params.isLoaded;
        }
    }
    updateStateVars(params: signIcon_Params) {
        this.__signType.reset(params.signType);
        this.__isEnded.reset(params.isEnded);
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__signType.purgeDependencyOnElmtId(rmElmtId);
        this.__isEnded.purgeDependencyOnElmtId(rmElmtId);
        this.__icon.purgeDependencyOnElmtId(rmElmtId);
        this.__isLoaded.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__signType.aboutToBeDeleted();
        this.__isEnded.aboutToBeDeleted();
        this.__icon.aboutToBeDeleted();
        this.__isLoaded.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    updateRecycleElmtId(oldElmtId, newElmtId) {
        this.__signType.updateElmtId(oldElmtId, newElmtId);
        this.__isEnded.updateElmtId(oldElmtId, newElmtId);
        this.__icon.updateElmtId(oldElmtId, newElmtId);
        this.__isLoaded.updateElmtId(oldElmtId, newElmtId);
    }
    private __signType: SynchedPropertySimpleOneWayPU<string>;
    get signType() {
        return this.__signType.get();
    }
    set signType(newValue: string) {
        this.__signType.set(newValue);
    }
    private __isEnded: SynchedPropertySimpleOneWayPU<boolean>;
    get isEnded() {
        return this.__isEnded.get();
    }
    set isEnded(newValue: boolean) {
        this.__isEnded.set(newValue);
    }
    private __icon: ObservedPropertyObjectPU<ResourceStr>;
    get icon() {
        return this.__icon.get();
    }
    set icon(newValue: ResourceStr) {
        this.__icon.set(newValue);
    }
    private __isLoaded: ObservedPropertySimplePU<boolean>;
    get isLoaded() {
        return this.__isLoaded.get();
    }
    set isLoaded(newValue: boolean) {
        this.__isLoaded.set(newValue);
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create(this.icon);
            Image.fillColor(this.isEnded ? { "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : { "id": 16777248, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Image.borderColor(this.isEnded ? { "id": 125831013, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : { "id": 16777237, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Image.opacity(this.isEnded ? 0.5 : 1);
            if (isInitialRender) {
                Image.draggable(false);
                Image.width(44);
                Image.height(44);
                Image.borderWidth(2);
                Image.borderRadius(12);
                Image.margin(10);
                Image.onAppear(() => {
                    if (this.signType === '0') {
                        this.icon = { "id": 16777275, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" };
                    }
                    else if (this.signType === '2') {
                        this.icon = { "id": 16777292, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" };
                    }
                    else if (this.signType === '3') {
                        this.icon = { "id": 16777273, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" };
                    }
                    else if (this.signType === '4') {
                        this.icon = { "id": 16777286, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" };
                    }
                    else if (this.signType === '5') {
                        this.icon = { "id": 16777290, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" };
                    }
                    this.isLoaded = true;
                });
            }
        }, Image);
        Row.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
export function initClassInfo(name: string, classInfo: ClassInfo, parent = null) {
    (parent ? parent : this).observeComponentCreation2((elmtId, isInitialRender) => {
        If.create();
        if (name) {
            (parent ? parent : this).ifElseBranchUpdateFunction(0, () => {
                {
                    (parent ? parent : this).observeComponentCreation2((elmtId, isInitialRender) => {
                        if (isInitialRender) {
                            let componentCall = new ActivityListPage(parent ? parent : this, {
                                classInfo: classInfo
                            }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/ActivityListPage.ets", line: 81, col: 5 });
                            ViewPU.create(componentCall);
                            let paramsLambda = () => {
                                return {
                                    classInfo: classInfo
                                };
                            };
                            componentCall.paramsGenerator_ = paramsLambda;
                        }
                        else {
                            (parent ? parent : this).updateStateVarsOfChildByElmtId(elmtId, {});
                        }
                    }, { name: "ActivityListPage" });
                }
            });
        }
        else {
            this.ifElseBranchUpdateFunction(1, () => {
            });
        }
    }, If);
    If.pop();
}
export class ActivityListPage extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.classInfo = null;
        this.pathInfos = new NavPathStack();
        this.__courseId = new ObservedPropertySimplePU('', this, "courseId");
        this.__teacherfactor = new ObservedPropertySimplePU('', this, "teacherfactor");
        this.__classId = new ObservedPropertySimplePU('', this, "classId");
        this.__name = new ObservedPropertySimplePU('', this, "name");
        this.__ActivityList = new ObservedPropertyObjectPU(null, this, "ActivityList");
        this.__activityExt = new ObservedPropertySimplePU('', this, "activityExt");
        this.__isRefreshing = new ObservedPropertySimplePU(false, this, "isRefreshing");
        this.__cloneSessionCookies = this.createStorageProp('cloneSessionCookies', '', "cloneSessionCookies");
        this.__statusBarHeight = this.createStorageProp('statusBarHeight', 0 // EntryAbility 实测的状态栏高度
        , "statusBarHeight");
        this.loadEpoch = 0 // 每次拉取递增：让 ForEach 生成新 key，强制重建条目
        ;
        this.listScroller = new Scroller() // 标题栏渐变模糊的滚动绑定源
        ;
        this.supportFloatingBar = deviceInfo.sdkApiVersion >= 23;
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: ActivityListPage_Params) {
        if (params.classInfo !== undefined) {
            this.classInfo = params.classInfo;
        }
        if (params.pathInfos !== undefined) {
            this.pathInfos = params.pathInfos;
        }
        if (params.courseId !== undefined) {
            this.courseId = params.courseId;
        }
        if (params.teacherfactor !== undefined) {
            this.teacherfactor = params.teacherfactor;
        }
        if (params.classId !== undefined) {
            this.classId = params.classId;
        }
        if (params.name !== undefined) {
            this.name = params.name;
        }
        if (params.ActivityList !== undefined) {
            this.ActivityList = params.ActivityList;
        }
        if (params.activityExt !== undefined) {
            this.activityExt = params.activityExt;
        }
        if (params.isRefreshing !== undefined) {
            this.isRefreshing = params.isRefreshing;
        }
        if (params.loadEpoch !== undefined) {
            this.loadEpoch = params.loadEpoch;
        }
        if (params.listScroller !== undefined) {
            this.listScroller = params.listScroller;
        }
        if (params.supportFloatingBar !== undefined) {
            this.supportFloatingBar = params.supportFloatingBar;
        }
    }
    updateStateVars(params: ActivityListPage_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__courseId.purgeDependencyOnElmtId(rmElmtId);
        this.__teacherfactor.purgeDependencyOnElmtId(rmElmtId);
        this.__classId.purgeDependencyOnElmtId(rmElmtId);
        this.__name.purgeDependencyOnElmtId(rmElmtId);
        this.__ActivityList.purgeDependencyOnElmtId(rmElmtId);
        this.__activityExt.purgeDependencyOnElmtId(rmElmtId);
        this.__isRefreshing.purgeDependencyOnElmtId(rmElmtId);
        this.__cloneSessionCookies.purgeDependencyOnElmtId(rmElmtId);
        this.__statusBarHeight.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__courseId.aboutToBeDeleted();
        this.__teacherfactor.aboutToBeDeleted();
        this.__classId.aboutToBeDeleted();
        this.__name.aboutToBeDeleted();
        this.__ActivityList.aboutToBeDeleted();
        this.__activityExt.aboutToBeDeleted();
        this.__isRefreshing.aboutToBeDeleted();
        this.__cloneSessionCookies.aboutToBeDeleted();
        this.__statusBarHeight.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private classInfo: ClassInfo | null;
    private pathInfos: NavPathStack;
    private __courseId: ObservedPropertySimplePU<string>; // 课程id
    get courseId() {
        return this.__courseId.get();
    }
    set courseId(newValue: string) {
        this.__courseId.set(newValue);
    }
    private __teacherfactor: ObservedPropertySimplePU<string>;
    get teacherfactor() {
        return this.__teacherfactor.get();
    }
    set teacherfactor(newValue: string) {
        this.__teacherfactor.set(newValue);
    }
    private __classId: ObservedPropertySimplePU<string>; // 班级id
    get classId() {
        return this.__classId.get();
    }
    set classId(newValue: string) {
        this.__classId.set(newValue);
    }
    private __name: ObservedPropertySimplePU<string>;
    get name() {
        return this.__name.get();
    }
    set name(newValue: string) {
        this.__name.set(newValue);
    }
    private __ActivityList: ObservedPropertyObjectPU<ActivityItem[] | null>;
    get ActivityList() {
        return this.__ActivityList.get();
    }
    set ActivityList(newValue: ActivityItem[] | null) {
        this.__ActivityList.set(newValue);
    }
    private __activityExt: ObservedPropertySimplePU<string>;
    get activityExt() {
        return this.__activityExt.get();
    }
    set activityExt(newValue: string) {
        this.__activityExt.set(newValue);
    }
    private __isRefreshing: ObservedPropertySimplePU<boolean>;
    get isRefreshing() {
        return this.__isRefreshing.get();
    }
    set isRefreshing(newValue: boolean) {
        this.__isRefreshing.set(newValue);
    }
    private __cloneSessionCookies: ObservedPropertyAbstractPU<string>;
    get cloneSessionCookies() {
        return this.__cloneSessionCookies.get();
    }
    set cloneSessionCookies(newValue: string) {
        this.__cloneSessionCookies.set(newValue);
    }
    private __statusBarHeight: ObservedPropertyAbstractPU<number>; // EntryAbility 实测的状态栏高度
    get statusBarHeight() {
        return this.__statusBarHeight.get();
    }
    set statusBarHeight(newValue: number) {
        this.__statusBarHeight.set(newValue);
    }
    private loadEpoch: number; // 每次拉取递增：让 ForEach 生成新 key，强制重建条目
    private listScroller: Scroller; // 标题栏渐变模糊的滚动绑定源
    // 6.1(23) 起支持沉浸光感材质，低版本系统走默认样式（首页同款）
    private readonly supportFloatingBar: boolean;
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            HdsNavDestination.create(() => {
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    if (this.ActivityList !== null && this.ActivityList.length > 0) {
                        this.ifElseBranchUpdateFunction(0, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                List.create({ space: 0, initialIndex: 0, scroller: this.listScroller });
                                List.divider({ strokeWidth: 0.5, color: { "id": 125831013, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }, startMargin: 72, endMargin: 16 });
                                List.width('100%');
                                List.height('100%');
                                List.scrollBar(BarState.Off);
                            }, List);
                            {
                                const itemCreation = (elmtId, isInitialRender) => {
                                    ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                                    ListItem.create(deepRenderFunction, true);
                                    if (!isInitialRender) {
                                        // 让位标题栏的空白必须做成列表首项（随内容滚动收起）：List 的 .padding 是固定视口内缩，
                                        // 内容会被永远裁剪在标题栏底边之下，无法产生内容穿透标题栏的渐变模糊（见 Index.ets 同款处理）
                                        ListItem.pop();
                                    }
                                    ViewStackProcessor.StopGetAccessRecording();
                                };
                                const itemCreation2 = (elmtId, isInitialRender) => {
                                    ListItem.create(deepRenderFunction, true);
                                    // 让位标题栏的空白必须做成列表首项（随内容滚动收起）：List 的 .padding 是固定视口内缩，
                                    // 内容会被永远裁剪在标题栏底边之下，无法产生内容穿透标题栏的渐变模糊（见 Index.ets 同款处理）
                                    ListItem.width('100%');
                                };
                                const deepRenderFunction = (elmtId, isInitialRender) => {
                                    itemCreation(elmtId, isInitialRender);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Column.create();
                                        Column.height(this.statusBarHeight + 56);
                                    }, Column);
                                    Column.pop();
                                    // 让位标题栏的空白必须做成列表首项（随内容滚动收起）：List 的 .padding 是固定视口内缩，
                                    // 内容会被永远裁剪在标题栏底边之下，无法产生内容穿透标题栏的渐变模糊（见 Index.ets 同款处理）
                                    ListItem.pop();
                                };
                                this.observeComponentCreation2(itemCreation2, ListItem);
                                // 让位标题栏的空白必须做成列表首项（随内容滚动收起）：List 的 .padding 是固定视口内缩，
                                // 内容会被永远裁剪在标题栏底边之下，无法产生内容穿透标题栏的渐变模糊（见 Index.ets 同款处理）
                                ListItem.pop();
                            }
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                If.create();
                                if (this.cloneSessionCookies !== '') {
                                    this.ifElseBranchUpdateFunction(0, () => {
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
                                                ListItem.width('100%');
                                                ListItem.padding({ left: 16, right: 16, bottom: 8 });
                                            };
                                            const deepRenderFunction = (elmtId, isInitialRender) => {
                                                itemCreation(elmtId, isInitialRender);
                                                {
                                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                        if (isInitialRender) {
                                                            let componentCall = new CloneSessionBanner(this, {}, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/ActivityListPage.ets", line: 118, col: 15 });
                                                            ViewPU.create(componentCall);
                                                            let paramsLambda = () => {
                                                                return {};
                                                            };
                                                            componentCall.paramsGenerator_ = paramsLambda;
                                                        }
                                                        else {
                                                            this.updateStateVarsOfChildByElmtId(elmtId, {});
                                                        }
                                                    }, { name: "CloneSessionBanner" });
                                                }
                                                ListItem.pop();
                                            };
                                            this.observeComponentCreation2(itemCreation2, ListItem);
                                            ListItem.pop();
                                        }
                                    });
                                }
                                else {
                                    this.ifElseBranchUpdateFunction(1, () => {
                                    });
                                }
                            }, If);
                            If.pop();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                ForEach.create();
                                const forEachItemGenFunction = (_item, index: number) => {
                                    const Activity = _item;
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        If.create();
                                        if (!(Activity.type != 2 && Activity.type != 74)) {
                                            this.ifElseBranchUpdateFunction(0, () => {
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
                                                        ListItem.width('100%');
                                                        ListItem.onClick(() => {
                                                            if (this.isActivityEnded(Activity)) {
                                                                promptAction.showToast({ message: '该签到已结束' });
                                                                return;
                                                            }
                                                            if (typeof Activity.endTime === 'number') {
                                                                if (!ChaoxingUtils.isSignActivityActive(Activity.startTime, Activity.endTime) ||
                                                                    !ChaoxingUtils.isSignActivityStarted(Activity.startTime)) {
                                                                    promptAction.showToast({ message: '不在可签到时间内, 无法签到' });
                                                                    return;
                                                                }
                                                            }
                                                            const activityInfo: ActivityInfo = {
                                                                ActivityId: Activity.id,
                                                                CourseId: this.courseId,
                                                                ClassId: this.classId,
                                                                signType: Activity.otherId.toString() as SignType,
                                                                ext: this.activityExt,
                                                                ActivityName: Activity.nameOne
                                                            };
                                                            this.pathInfos.pushPath({ name: 'SignerPage', param: activityInfo });
                                                        });
                                                    };
                                                    const deepRenderFunction = (elmtId, isInitialRender) => {
                                                        itemCreation(elmtId, isInitialRender);
                                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                            Row.create();
                                                            globalThis.Context.animation({ duration: 150, curve: Curve.EaseInOut });
                                                            Row.width('100%');
                                                            Row.height(68);
                                                            Row.padding({ left: 16, right: 16 });
                                                            Row.border({
                                                                width: { left: this.isActivityEnded(Activity) ? 0 : 3 },
                                                                color: { left: this.isActivityEnded(Activity)
                                                                        ? 'transparent'
                                                                        : (this.isActivityActive(Activity)
                                                                            ? { "id": 16777256, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : { "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }) }
                                                            });
                                                            globalThis.Context.animation(null);
                                                        }, Row);
                                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                            __Recycle__.create();
                                                        }, __Recycle__);
                                                        {
                                                            this.observeRecycleComponentCreation("signIcon", (elmtId, isInitialRender, recycleNode = null) => {
                                                                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                                                                if (isInitialRender) {
                                                                    let componentCall = recycleNode ? recycleNode : new signIcon(this, { signType: Activity.otherId.toString(),
                                                                        isEnded: this.isActivityEnded(Activity) }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/ActivityListPage.ets", line: 125, col: 19 });
                                                                    ViewPU.createRecycle(componentCall, recycleNode !== null, "signIcon", () => {
                                                                        if (recycleNode && typeof recycleNode.aboutToReuseInternal === "function") {
                                                                            recycleNode.aboutToReuseInternal();
                                                                        }
                                                                        else {
                                                                            if (recycleNode.aboutToReuse && typeof recycleNode.aboutToReuse === "function") {
                                                                                recycleNode.aboutToReuse({ signType: Activity.otherId.toString(),
                                                                                    isEnded: this.isActivityEnded(Activity) });
                                                                            }
                                                                            recycleNode.rerender();
                                                                        }
                                                                    });
                                                                    let paramsLambda = () => {
                                                                        return {
                                                                            signType: Activity.otherId.toString(),
                                                                            isEnded: this.isActivityEnded(Activity)
                                                                        };
                                                                    };
                                                                    componentCall.paramsGenerator_ = paramsLambda;
                                                                }
                                                                else {
                                                                    this.updateStateVarsOfChildByElmtId(elmtId, {
                                                                        signType: Activity.otherId.toString(),
                                                                        isEnded: this.isActivityEnded(Activity)
                                                                    });
                                                                }
                                                                ViewStackProcessor.StopGetAccessRecording();
                                                            });
                                                        }
                                                        __Recycle__.pop();
                                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                            Column.create();
                                                            Column.layoutWeight(1);
                                                            Column.alignItems(HorizontalAlign.Start);
                                                            Column.margin({ left: 12 });
                                                        }, Column);
                                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                            Text.create(Activity.nameOne);
                                                            Text.fontSize(16);
                                                            Text.fontWeight(FontWeight.Medium);
                                                            Text.fontColor(this.isActivityEnded(Activity)
                                                                ? { "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : { "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                                            Text.maxLines(1);
                                                            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                                        }, Text);
                                                        Text.pop();
                                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                            Text.create(this.getStatusText(Activity));
                                                            Text.fontSize(13);
                                                            Text.fontColor(this.getStatusColor(Activity));
                                                        }, Text);
                                                        Text.pop();
                                                        Column.pop();
                                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                            Image.create({ "id": 125830088, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                                            Image.draggable(false);
                                                            Image.width(14);
                                                            Image.height(14);
                                                            Image.fillColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                                            Image.opacity(this.isActivityEnded(Activity) ? 0.4 : 1);
                                                        }, Image);
                                                        Row.pop();
                                                        ListItem.pop();
                                                    };
                                                    this.observeComponentCreation2(itemCreation2, ListItem);
                                                    ListItem.pop();
                                                }
                                            });
                                        }
                                        else {
                                            this.ifElseBranchUpdateFunction(1, () => {
                                            });
                                        }
                                    }, If);
                                    If.pop();
                                };
                                this.forEachUpdateFunction(elmtId, this.ActivityList, forEachItemGenFunction, (Activity: ActivityItem) => `${this.loadEpoch}_${Activity.id}`, true, false);
                            }, ForEach);
                            ForEach.pop();
                            List.pop();
                        });
                    }
                    else if (this.isRefreshing) {
                        this.ifElseBranchUpdateFunction(1, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Column.create();
                                Column.width('100%');
                                Column.height('100%');
                                Column.justifyContent(FlexAlign.Center);
                            }, Column);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                LoadingProgress.create();
                                LoadingProgress.width(44);
                                LoadingProgress.height(44);
                                LoadingProgress.color({ "id": 16777248, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            }, LoadingProgress);
                            Column.pop();
                        });
                    }
                    else {
                        this.ifElseBranchUpdateFunction(2, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Column.create();
                                Column.width('100%');
                                Column.height('100%');
                                Column.justifyContent(FlexAlign.Center);
                            }, Column);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create('暂无签到活动，可点击右上角刷新');
                                Text.fontSize(14);
                                Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            }, Text);
                            Text.pop();
                            Column.pop();
                        });
                    }
                }, If);
                If.pop();
            }, { moduleName: "entry", pagePath: "entry/src/main/ets/pages/ActivityListPage" });
            HdsNavDestination.height('100%');
            HdsNavDestination.width('100%');
            HdsNavDestination.backgroundColor({ "id": 16777250, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            HdsNavDestination.titleBar({
                content: {
                    title: { mainTitle: this.name },
                    menu: {
                        value: [{
                                content: {
                                    icon: { "id": 16777280, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" },
                                    label: '刷新签到活动',
                                    action: () => { this.loadActivities(true); }
                                }
                            }]
                    }
                },
                style: {
                    scrollEffectOpts: {
                        enableScrollEffect: true,
                        scrollEffectType: ScrollEffectType.GRADIENT_BLUR,
                        blurEffectiveEndOffset: LengthMetrics.vp(this.statusBarHeight + 56)
                    },
                    systemMaterialEffect: this.supportFloatingBar ? {
                        materialType: HDS_MATERIAL_TYPE_ADAPTIVE as hdsMaterial.MaterialType,
                        materialLevel: HDS_MATERIAL_LEVEL_GENTLE as hdsMaterial.MaterialLevel
                    } : undefined
                },
                avoidLayoutSafeArea: false,
                enableComponentSafeArea: false
            });
            HdsNavDestination.ignoreLayoutSafeArea([LayoutSafeAreaType.SYSTEM], [LayoutSafeAreaEdge.TOP, LayoutSafeAreaEdge.BOTTOM]);
            HdsNavDestination.bindToScrollable([this.listScroller]);
            HdsNavDestination.onReady((ctx: NavDestinationContext) => {
                this.pathInfos = ctx.pathStack;
            });
            HdsNavDestination.onAppear(async () => {
                if (!this.classInfo) {
                    hilog.error(DOMAIN, TAG, 'No class info');
                    promptAction.showToast({ message: '未获取到课程信息' });
                    return;
                }
                this.courseId = this.classInfo.id; // 课程id
                hilog.debug(DOMAIN, TAG, `Course ID: ${this.courseId}`);
                this.teacherfactor = this.classInfo?.teacherfactor as string;
                hilog.debug(DOMAIN, TAG, `Teacher: ${this.teacherfactor}`);
                this.classId = this.classInfo.classId; // 班级id
                this.name = this.classInfo?.name as string;
                hilog.debug(DOMAIN, TAG, `Class name: ${this.name}`);
                await this.loadActivities(false);
            });
        }, HdsNavDestination);
        HdsNavDestination.pop();
    }
    /**
     * 拉取签到活动列表(首载与手动刷新共用)
     * @param isManualRefresh 手动点刷新按钮时为 true,成功后给出提示
     */
    private async loadActivities(isManualRefresh: boolean): Promise<void> {
        if (this.isRefreshing) {
            return;
        }
        this.isRefreshing = true;
        try {
            const dbManager = DatabaseManager.getInstance();
            // 克隆登录时活动属于克隆用户的课程，活动列表请求走克隆会话
            const cookies = this.cloneSessionCookies !== ''
                ? this.cloneSessionCookies
                : (await dbManager.getUserByPosition(1, true))?.cookies;
            if (!cookies) {
                throw new Error('用户登录信息错误');
            }
            hilog.debug(DOMAIN, TAG, 'Loading activity list');
            const activityResult = await CourseAndActivity.getActivityList(cookies, this.classId, this.courseId);
            this.loadEpoch++; // key 变化后条目全部重建，签到状态/倒计时随之更新
            this.ActivityList = activityResult ? activityResult.activities : null;
            this.activityExt = activityResult ? activityResult.ext : '';
            hilog.debug(DOMAIN, TAG, `Activity list loaded: ${this.ActivityList ? 'success' : 'failed'}`);
            if (this.ActivityList) {
                this.ActivityList.forEach(element => {
                    hilog.debug(DOMAIN, TAG, `Activity: ${JSON.stringify(element)}`);
                });
            }
            else {
                throw new Error('签到列表获取为空');
            }
            if (isManualRefresh) {
                promptAction.showToast({ message: '签到活动已刷新' });
            }
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Error in loadActivities: ${(e as Error).message}`);
            promptAction.showToast({ message: `刷新签到活动失败: ${(e as Error).message}` });
        }
        finally {
            this.isRefreshing = false;
        }
    }
    private getStatusText(Activity: ActivityItem): string {
        if (typeof Activity.endTime === 'string') {
            return ChaoxingUtils.isSignActivityStarted(Activity.startTime) ? '无截止日期' :
                `${ChaoxingUtils.getRemainingTime(Activity.startTime) / 60000 << 0}分钟开始签到`;
        }
        else {
            if (ChaoxingUtils.isSignActivityEnded(Activity.endTime)) {
                return '已结束';
            }
            else if (ChaoxingUtils.isSignActivityActive(Activity.startTime, Activity.endTime)) {
                return `进行中 · ${ChaoxingUtils.getRemainingTime(Activity.endTime) / 60000 << 0}分钟后结束`;
            }
            else {
                return `${ChaoxingUtils.getRemainingTime(Activity.startTime) / 60000 << 0}分钟后开始签到`;
            }
        }
    }
    private getStatusColor(Activity: ActivityItem): Resource {
        if (typeof Activity.endTime === 'string') {
            return { "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" };
        }
        if (ChaoxingUtils.isSignActivityEnded(Activity.endTime)) {
            return { "id": 16777263, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" };
        }
        else if (ChaoxingUtils.isSignActivityActive(Activity.startTime, Activity.endTime)) {
            return { "id": 16777256, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" };
        }
        else {
            return { "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" };
        }
    }
    private isActivityEnded(Activity: ActivityItem): boolean {
        return typeof Activity.endTime === 'number' && ChaoxingUtils.isSignActivityEnded(Activity.endTime);
    }
    private isActivityActive(Activity: ActivityItem): boolean {
        return typeof Activity.endTime === 'number' &&
            ChaoxingUtils.isSignActivityActive(Activity.startTime, Activity.endTime);
    }
    rerender() {
        this.updateDirtyElements();
    }
}
(function () {
    if (typeof NavigationBuilderRegister === "function") {
        NavigationBuilderRegister("ActivityListPage", wrapBuilder(initClassInfo));
    }
})();
