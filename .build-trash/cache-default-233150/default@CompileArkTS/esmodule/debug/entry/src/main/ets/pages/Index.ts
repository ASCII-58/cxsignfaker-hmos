if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface HomePage_Params {
    currentIndex?: number;
    titleName?: string;
    classList?: ClassInfo[] | null;
    isClassListRefreshing?: boolean;
    otherUserList?: UserDataAndId[];
    expandedSection?: number;
    loginSheetVisible?: boolean;
    loginSheetType?: number;
    locationsSheetVisible?: boolean;
    btnAddPressed?: boolean;
    actionPressed?: string;
    installInfo?: string;
    tabLabelScale?: number[];
    userHostName?: Resource | string;
    userHostPhone?: Resource | string;
    userUrl?: string;
    userQRValue?: string;
    cloneSessionCookies?: string;
    cloneSessionName?: string;
    pageInfos?: NavPathStack;
    classListLoading?: boolean;
    controller?: HdsTabsController;
    supportFloatingBar?: boolean;
    naviIndicatorHeight?: number;
    statusBarHeight?: number;
    hdsMaterialLevel?: number;
    listScroller?: Scroller;
    tabBarMask?: HdsTabsBackgroundStyle;
    openLinkContext?;
}
interface UserInfoComponent_Params {
    pathInfos?: NavPathStack;
    HostImageData?: image.PixelMap | Resource;
    url?: string;
    hostName?: Resource | string;
    hostPhone?: Resource | string;
    QRvalue?: string;
    onLogout?: () => void;
    activeSheet?: number;
    sheetVisible?: boolean;
    iconPressed?: number;
    shareLoading?: boolean;
    isReady?: boolean;
    avatarTapCount?: number;
    avatarTapTimer?: number;
    uiContext?: UIContext;
    context?: Context;
}
interface ClassIcon_Params {
    imageurl?: string;
    ImageData?: image.PixelMap | null;
    isLoaded?: boolean;
}
interface ClassListItem_Params {
    classInfo?: ClassInfo;
    pathInfos?: NavPathStack;
    isPressed?: boolean;
}
import { DatabaseManager } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import type { UserDataAndId } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import { loginFunction } from "@normalized:N&&&entry/src/main/ets/utils/Login&";
import type image from "@ohos:multimedia.image";
import { CourseAndActivity } from "@normalized:N&&&entry/src/main/ets/utils/classFun&";
import type { ClassInfo } from "@normalized:N&&&entry/src/main/ets/utils/classFun&";
import scanBarcode from "@hms:core.scan.scanBarcode";
import scanCore from "@hms:core.scan.scanCore";
import curves from "@native:ohos.curves";
import { LengthMetrics } from "@ohos:arkui.node";
import type { UIContext } from "@ohos:arkui.UIContext";
import { hdsEffect } from "@hms:hds.hdsBaseComponent";
import { HdsNavDestination } from "@hms:hds.hdsBaseComponent";
import { HdsTabs } from "@hms:hds.hdsBaseComponent";
import { HdsTabsController } from "@hms:hds.hdsBaseComponent";
import type { HdsTabsBackgroundStyle } from "@hms:hds.hdsBaseComponent";
import { ScrollEffectType } from "@hms:hds.hdsBaseComponent";
import type { HdsNavDestinationAttribute } from "@hms:hds.hdsBaseComponent";
import type { HdsTabsAttribute } from "@hms:hds.hdsBaseComponent";
import type { hdsMaterial } from "@hms:hds.hdsMaterial";
import hilog from "@ohos:hilog";
import type { BusinessError } from "@ohos:base";
import deviceInfo from "@ohos:deviceInfo";
import promptAction from "@ohos:promptAction";
import { loginByCommon, loginByURL } from "@normalized:N&&&entry/src/main/ets/Component/LoginCom&";
import { OtherUserItem } from "@normalized:N&&&entry/src/main/ets/Component/OtherUserCom&";
import { CloneSessionBanner } from "@normalized:N&&&entry/src/main/ets/Component/CloneSessionBanner&";
import ShareUtils from "@normalized:N&&&entry/src/main/ets/utils/shareUtils&";
import systemShare from "@hms:collaboration.systemShare";
import preferences from "@ohos:data.preferences";
import utd from "@ohos:data.uniformTypeDescriptor";
import type common from "@ohos:app.ability.common";
import type Want from "@ohos:app.ability.Want";
import { SettingsComponent } from "@normalized:N&&&entry/src/main/ets/Component/SettingsComponent&";
import { LocationFavoritesComponent } from "@normalized:N&&&entry/src/main/ets/Component/LocationFavoritesComponent&";
const TAG = 'IndexPage';
const DOMAIN = 0x0004;
// 沉浸光感枚举值别名（与 SDK 6.1 d.ts 一致）：MaterialType.ADAPTIVE=100（跟随系统材质策略）、
// MaterialLevel.EXQUISITE=0/GENTLE=1/SMOOTH=2。档位存 AppStorage「hdsMaterialLevel」，
// 设置页「沉浸光感」切换后首页页签与标题栏联动（官方 Spatialization 沉浸光感案例同款）
const HDS_MATERIAL_TYPE_ADAPTIVE = 100;
const HDS_MATERIAL_LEVEL_GENTLE = 1;
AppStorage.setOrCreate('userHostName', { "id": 16777224, "type": 10003, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
AppStorage.setOrCreate('userHostPhone', { "id": 16777223, "type": 10003, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
AppStorage.setOrCreate('userUrl', '');
AppStorage.setOrCreate('userQRValue', '');
// 克隆登录会话（对齐上游 cloneInstance：仅内存有效，重启即失效；cookies 为空串表示不在克隆状态）
AppStorage.setOrCreate('cloneSessionCookies', '');
AppStorage.setOrCreate('cloneSessionName', '');
AppStorage.setOrCreate('cloneSessionPhone', '');
AppStorage.setOrCreate('hdsMaterialLevel', HDS_MATERIAL_LEVEL_GENTLE);
interface UserInfoComponentInterface {
    hostName: Resource | string;
    hostPhone: Resource | string;
    QRvalue: string;
    url: string;
    onLogout: () => void;
}
class ClassListItem extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__classInfo = new SynchedPropertyObjectOneWayPU(params.classInfo, this, "classInfo");
        this.__pathInfos = this.initializeConsume('pathInfos', "pathInfos");
        this.__isPressed = new ObservedPropertySimplePU(false, this, "isPressed");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: ClassListItem_Params) {
        if (params.isPressed !== undefined) {
            this.isPressed = params.isPressed;
        }
    }
    updateStateVars(params: ClassListItem_Params) {
        this.__classInfo.reset(params.classInfo);
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__classInfo.purgeDependencyOnElmtId(rmElmtId);
        this.__pathInfos.purgeDependencyOnElmtId(rmElmtId);
        this.__isPressed.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__classInfo.aboutToBeDeleted();
        this.__pathInfos.aboutToBeDeleted();
        this.__isPressed.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    updateRecycleElmtId(oldElmtId, newElmtId) {
        this.__classInfo.updateElmtId(oldElmtId, newElmtId);
        this.__pathInfos.updateElmtId(oldElmtId, newElmtId);
        this.__isPressed.updateElmtId(oldElmtId, newElmtId);
    }
    private __classInfo: SynchedPropertySimpleOneWayPU<ClassInfo>;
    get classInfo() {
        return this.__classInfo.get();
    }
    set classInfo(newValue: ClassInfo) {
        this.__classInfo.set(newValue);
    }
    private __pathInfos: ObservedPropertyAbstractPU<NavPathStack>;
    get pathInfos() {
        return this.__pathInfos.get();
    }
    set pathInfos(newValue: NavPathStack) {
        this.__pathInfos.set(newValue);
    }
    private __isPressed: ObservedPropertySimplePU<boolean>;
    get isPressed() {
        return this.__isPressed.get();
    }
    set isPressed(newValue: boolean) {
        this.__isPressed.set(newValue);
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            globalThis.Context.animation({ duration: 150, curve: Curve.EaseInOut });
            Row.width('100%');
            Row.height(68);
            Row.padding({ left: 16, right: 16 });
            Row.scale({ x: this.isPressed ? 0.98 : 1, y: this.isPressed ? 0.98 : 1 });
            globalThis.Context.animation(null);
            Row.onTouch((event: TouchEvent) => {
                if (event.type === TouchType.Down)
                    this.isPressed = true;
                else if (event.type === TouchType.Up || event.type === TouchType.Cancel)
                    this.isPressed = false;
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            __Recycle__.create();
        }, __Recycle__);
        {
            this.observeRecycleComponentCreation("ClassIcon", (elmtId, isInitialRender, recycleNode = null) => {
                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                if (isInitialRender) {
                    let componentCall = recycleNode ? recycleNode : new ClassIcon(this, { imageurl: this.classInfo.imageURL }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/Index.ets", line: 60, col: 7 });
                    ViewPU.createRecycle(componentCall, recycleNode !== null, "ClassIcon", () => {
                        if (recycleNode && typeof recycleNode.aboutToReuseInternal === "function") {
                            recycleNode.aboutToReuseInternal();
                        }
                        else {
                            if (recycleNode.aboutToReuse && typeof recycleNode.aboutToReuse === "function") {
                                recycleNode.aboutToReuse({ imageurl: this.classInfo.imageURL });
                            }
                            recycleNode.rerender();
                        }
                    });
                    let paramsLambda = () => {
                        return {
                            imageurl: this.classInfo.imageURL
                        };
                    };
                    componentCall.paramsGenerator_ = paramsLambda;
                }
                else {
                    this.updateStateVarsOfChildByElmtId(elmtId, {
                        imageurl: this.classInfo.imageURL
                    });
                }
                ViewStackProcessor.StopGetAccessRecording();
            });
        }
        __Recycle__.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            if (isInitialRender) {
                Column.layoutWeight(1);
                Column.alignItems(HorizontalAlign.Start);
                Column.margin({ left: 12 });
            }
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.classInfo.name);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                Text.fontSize(16);
                Text.fontWeight(FontWeight.Medium);
                Text.maxLines(1);
                Text.textOverflow({ overflow: TextOverflow.Ellipsis });
            }
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.classInfo.teacherfactor);
            Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                Text.fontSize(13);
                Text.maxLines(1);
                Text.textOverflow({ overflow: TextOverflow.Ellipsis });
            }
        }, Text);
        Text.pop();
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 125830088, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Image.fillColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                Image.draggable(false);
                Image.width(14);
                Image.height(14);
            }
        }, Image);
        Row.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
class ClassIcon extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__imageurl = new SynchedPropertySimpleOneWayPU(params.imageurl, this, "imageurl");
        this.__ImageData = new ObservedPropertyObjectPU(null, this, "ImageData");
        this.__isLoaded = new ObservedPropertySimplePU(false, this, "isLoaded");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: ClassIcon_Params) {
        if (params.ImageData !== undefined) {
            this.ImageData = params.ImageData;
        }
        if (params.isLoaded !== undefined) {
            this.isLoaded = params.isLoaded;
        }
    }
    updateStateVars(params: ClassIcon_Params) {
        this.__imageurl.reset(params.imageurl);
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__imageurl.purgeDependencyOnElmtId(rmElmtId);
        this.__ImageData.purgeDependencyOnElmtId(rmElmtId);
        this.__isLoaded.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__imageurl.aboutToBeDeleted();
        this.__ImageData.aboutToBeDeleted();
        this.__isLoaded.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    updateRecycleElmtId(oldElmtId, newElmtId) {
        this.__imageurl.updateElmtId(oldElmtId, newElmtId);
        this.__ImageData.updateElmtId(oldElmtId, newElmtId);
        this.__isLoaded.updateElmtId(oldElmtId, newElmtId);
    }
    private __imageurl: SynchedPropertySimpleOneWayPU<string>;
    get imageurl() {
        return this.__imageurl.get();
    }
    set imageurl(newValue: string) {
        this.__imageurl.set(newValue);
    }
    private __ImageData: ObservedPropertyObjectPU<image.PixelMap | null>;
    get ImageData() {
        return this.__ImageData.get();
    }
    set ImageData(newValue: image.PixelMap | null) {
        this.__ImageData.set(newValue);
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
            Column.create();
            if (isInitialRender) {
                Column.width(44);
                Column.height(44);
                Column.borderRadius(12);
                Column.clip(true);
                Column.onAppear(async () => {
                    if (!this.isLoaded) {
                        this.ImageData = await loginFunction.GetPic(this.imageurl);
                        this.isLoaded = true;
                    }
                });
            }
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create(this.ImageData);
            Image.borderColor({ "id": 16777237, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Image.alt({ "id": 16777218, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                Image.draggable(false);
                Image.width(44);
                Image.height(44);
                Image.borderWidth(2);
                Image.borderRadius(12);
            }
        }, Image);
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
export function init(name: string, parent = null) {
    const __name__ = name;
    {
        (parent ? parent : this).observeComponentCreation2((elmtId, isInitialRender, name = __name__) => {
            if (isInitialRender) {
                let componentCall = new HomePage(parent ? parent : this, {}, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/Index.ets", line: 120, col: 3 });
                ViewPU.create(componentCall);
                let paramsLambda = () => {
                    return {};
                };
                componentCall.paramsGenerator_ = paramsLambda;
            }
            else {
                (parent ? parent : this).updateStateVarsOfChildByElmtId(elmtId, {});
            }
        }, { name: "HomePage" });
    }
}
class UserInfoComponent extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__pathInfos = this.initializeConsume('pathInfos', "pathInfos");
        this.__HostImageData = new ObservedPropertyObjectPU({ "id": 16777218, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }, this, "HostImageData");
        this.__url = new SynchedPropertySimpleOneWayPU(params.url, this, "url");
        this.__hostName = new SynchedPropertyObjectOneWayPU(params.hostName, this, "hostName");
        this.__hostPhone = new SynchedPropertyObjectOneWayPU(params.hostPhone, this, "hostPhone");
        this.__QRvalue = new SynchedPropertySimpleOneWayPU(params.QRvalue, this, "QRvalue");
        this.onLogout = () => { };
        this.__activeSheet = new ObservedPropertySimplePU(-1, this, "activeSheet");
        this.__sheetVisible = new ObservedPropertySimplePU(false, this, "sheetVisible");
        this.__iconPressed = new ObservedPropertySimplePU(-1, this, "iconPressed");
        this.__shareLoading = new ObservedPropertySimplePU(false, this, "shareLoading");
        this.__isReady = new ObservedPropertySimplePU(false, this, "isReady");
        this.__avatarTapCount = new ObservedPropertySimplePU(0, this, "avatarTapCount");
        this.avatarTapTimer = -1;
        this.uiContext = this.getUIContext();
        this.context = this.uiContext.getHostContext() as Context;
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: UserInfoComponent_Params) {
        if (params.HostImageData !== undefined) {
            this.HostImageData = params.HostImageData;
        }
        if (params.onLogout !== undefined) {
            this.onLogout = params.onLogout;
        }
        if (params.activeSheet !== undefined) {
            this.activeSheet = params.activeSheet;
        }
        if (params.sheetVisible !== undefined) {
            this.sheetVisible = params.sheetVisible;
        }
        if (params.iconPressed !== undefined) {
            this.iconPressed = params.iconPressed;
        }
        if (params.shareLoading !== undefined) {
            this.shareLoading = params.shareLoading;
        }
        if (params.isReady !== undefined) {
            this.isReady = params.isReady;
        }
        if (params.avatarTapCount !== undefined) {
            this.avatarTapCount = params.avatarTapCount;
        }
        if (params.avatarTapTimer !== undefined) {
            this.avatarTapTimer = params.avatarTapTimer;
        }
        if (params.uiContext !== undefined) {
            this.uiContext = params.uiContext;
        }
        if (params.context !== undefined) {
            this.context = params.context;
        }
    }
    updateStateVars(params: UserInfoComponent_Params) {
        this.__url.reset(params.url);
        this.__hostName.reset(params.hostName);
        this.__hostPhone.reset(params.hostPhone);
        this.__QRvalue.reset(params.QRvalue);
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__pathInfos.purgeDependencyOnElmtId(rmElmtId);
        this.__HostImageData.purgeDependencyOnElmtId(rmElmtId);
        this.__url.purgeDependencyOnElmtId(rmElmtId);
        this.__hostName.purgeDependencyOnElmtId(rmElmtId);
        this.__hostPhone.purgeDependencyOnElmtId(rmElmtId);
        this.__QRvalue.purgeDependencyOnElmtId(rmElmtId);
        this.__activeSheet.purgeDependencyOnElmtId(rmElmtId);
        this.__sheetVisible.purgeDependencyOnElmtId(rmElmtId);
        this.__iconPressed.purgeDependencyOnElmtId(rmElmtId);
        this.__shareLoading.purgeDependencyOnElmtId(rmElmtId);
        this.__isReady.purgeDependencyOnElmtId(rmElmtId);
        this.__avatarTapCount.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__pathInfos.aboutToBeDeleted();
        this.__HostImageData.aboutToBeDeleted();
        this.__url.aboutToBeDeleted();
        this.__hostName.aboutToBeDeleted();
        this.__hostPhone.aboutToBeDeleted();
        this.__QRvalue.aboutToBeDeleted();
        this.__activeSheet.aboutToBeDeleted();
        this.__sheetVisible.aboutToBeDeleted();
        this.__iconPressed.aboutToBeDeleted();
        this.__shareLoading.aboutToBeDeleted();
        this.__isReady.aboutToBeDeleted();
        this.__avatarTapCount.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __pathInfos: ObservedPropertyAbstractPU<NavPathStack>;
    get pathInfos() {
        return this.__pathInfos.get();
    }
    set pathInfos(newValue: NavPathStack) {
        this.__pathInfos.set(newValue);
    }
    private __HostImageData: ObservedPropertyObjectPU<image.PixelMap | Resource>;
    get HostImageData() {
        return this.__HostImageData.get();
    }
    set HostImageData(newValue: image.PixelMap | Resource) {
        this.__HostImageData.set(newValue);
    }
    private __url: SynchedPropertySimpleOneWayPU<string>;
    get url() {
        return this.__url.get();
    }
    set url(newValue: string) {
        this.__url.set(newValue);
    }
    private __hostName: SynchedPropertySimpleOneWayPU<Resource | string>;
    get hostName() {
        return this.__hostName.get();
    }
    set hostName(newValue: Resource | string) {
        this.__hostName.set(newValue);
    }
    private __hostPhone: SynchedPropertySimpleOneWayPU<Resource | string>;
    get hostPhone() {
        return this.__hostPhone.get();
    }
    set hostPhone(newValue: Resource | string) {
        this.__hostPhone.set(newValue);
    }
    private __QRvalue: SynchedPropertySimpleOneWayPU<string>;
    get QRvalue() {
        return this.__QRvalue.get();
    }
    set QRvalue(newValue: string) {
        this.__QRvalue.set(newValue);
    }
    private onLogout: () => void;
    private __activeSheet: ObservedPropertySimplePU<number>;
    get activeSheet() {
        return this.__activeSheet.get();
    }
    set activeSheet(newValue: number) {
        this.__activeSheet.set(newValue);
    }
    private __sheetVisible: ObservedPropertySimplePU<boolean>;
    get sheetVisible() {
        return this.__sheetVisible.get();
    }
    set sheetVisible(newValue: boolean) {
        this.__sheetVisible.set(newValue);
    }
    private __iconPressed: ObservedPropertySimplePU<number>;
    get iconPressed() {
        return this.__iconPressed.get();
    }
    set iconPressed(newValue: number) {
        this.__iconPressed.set(newValue);
    }
    private __shareLoading: ObservedPropertySimplePU<boolean>;
    get shareLoading() {
        return this.__shareLoading.get();
    }
    set shareLoading(newValue: boolean) {
        this.__shareLoading.set(newValue);
    }
    private __isReady: ObservedPropertySimplePU<boolean>;
    get isReady() {
        return this.__isReady.get();
    }
    set isReady(newValue: boolean) {
        this.__isReady.set(newValue);
    }
    private __avatarTapCount: ObservedPropertySimplePU<number>;
    get avatarTapCount() {
        return this.__avatarTapCount.get();
    }
    set avatarTapCount(newValue: number) {
        this.__avatarTapCount.set(newValue);
    }
    private avatarTapTimer: number;
    private uiContext: UIContext;
    private context: Context;
    aboutToAppear() {
        Context.animateTo({ duration: 400, curve: curves.interpolatingSpring(0, 1, 300, 28) }, () => {
            this.isReady = true;
        });
    }
    // 头像连点/长按 → 直接进入 Debug 路由页（密码校验在面板页内完成，
    // 不再经过 bindSheet，避免全屏 sheet 遮挡其内 pushPath 的子页面）
    openDebugPanel() {
        this.avatarTapCount = 0;
        this.pathInfos.pushPath({ name: 'DebugPanel' });
    }
    /** 图钉按钮按压触控：按下进入按压态并保持到抬手/移出按钮(40x40)边界。
     *  不能用"非 Down 即 200ms 定时复位"的写法：按住时手指微抖会持续产生 Move
     *  事件被误判成抬手，按压动画(~300ms)刚播完就被复位，看起来"一按完就弹回" */
    private pressTouch(pressedKey: number): (event: TouchEvent) => void {
        return (event: TouchEvent) => {
            if (event.type === TouchType.Down) {
                this.iconPressed = pressedKey;
            }
            else if (event.type === TouchType.Up || event.type === TouchType.Cancel) {
                this.iconPressed = -1;
            }
            else if (event.type === TouchType.Move && this.iconPressed === pressedKey) {
                const t = event.touches[0];
                if (t.x < 0 || t.y < 0 || t.x > 40 || t.y > 40) {
                    this.iconPressed = -1;
                }
            }
        };
    }
    UnifiedSheet(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.activeSheet === 0) {
                this.ifElseBranchUpdateFunction(0, () => {
                    {
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            if (isInitialRender) {
                                let componentCall = new SettingsComponent(this, {}, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/Index.ets", line: 175, col: 7 });
                                ViewPU.create(componentCall);
                                let paramsLambda = () => {
                                    return {};
                                };
                                componentCall.paramsGenerator_ = paramsLambda;
                            }
                            else {
                                this.updateStateVarsOfChildByElmtId(elmtId, {});
                            }
                        }, { name: "SettingsComponent" });
                    }
                });
            }
            else if (this.activeSheet === 1) {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.width('100%');
                        Column.height('100%');
                        Column.backgroundColor({ "id": 16777250, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Column.borderRadius({ topLeft: 20, topRight: 20 });
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
                        Text.create('二维码名片');
                        Text.fontSize(24);
                        Text.fontWeight(FontWeight.Bold);
                        Text.width('100%');
                        Text.textAlign(TextAlign.Start);
                        Text.padding({ left: 20, bottom: 20 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        If.create();
                        if (this.QRvalue) {
                            this.ifElseBranchUpdateFunction(0, () => {
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    Column.create();
                                    Column.width('100%');
                                    Column.alignItems(HorizontalAlign.Center);
                                    Column.margin({ bottom: 40 });
                                }, Column);
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    Column.create();
                                    Column.padding(20);
                                    Column.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                    Column.borderRadius(16);
                                    Column.shadow({ radius: 12, color: '#00000010', offsetY: 4 });
                                }, Column);
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    QRCode.create(this.QRvalue);
                                    QRCode.width(200);
                                    QRCode.height(200);
                                }, QRCode);
                                QRCode.pop();
                                Column.pop();
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    Text.create(this.hostName);
                                    Text.fontSize(20);
                                    Text.fontWeight(FontWeight.Medium);
                                    Text.margin({ top: 20 });
                                    Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                }, Text);
                                Text.pop();
                                Column.pop();
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    Button.createWithLabel(this.shareLoading ? '准备中...' : '分享名片');
                                    Button.width('90%');
                                    Button.height(50);
                                    Button.fontColor({ "id": 16777259, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                    Button.backgroundColor({ "id": 16777235, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                    Button.borderRadius(25);
                                    Button.enabled(!this.shareLoading);
                                    Button.onClick(async () => {
                                        this.shareLoading = true;
                                        const shareUtils = new ShareUtils(this.context, this.QRvalue);
                                        const ok = await shareUtils.prepare();
                                        if (ok) {
                                            this.doShare(shareUtils.FileUri, this.QRvalue);
                                        }
                                        else {
                                            promptAction.showToast({ message: '生成分享图片失败' });
                                        }
                                        this.shareLoading = false;
                                    });
                                }, Button);
                                Button.pop();
                            });
                        }
                        else {
                            this.ifElseBranchUpdateFunction(1, () => {
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    Column.create();
                                    Column.height(300);
                                    Column.justifyContent(FlexAlign.Center);
                                }, Column);
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    LoadingProgress.create();
                                    LoadingProgress.width(60);
                                    LoadingProgress.height(60);
                                    LoadingProgress.color({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                }, LoadingProgress);
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    Text.create('正在加载用户信息...');
                                    Text.fontSize(16);
                                    Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                    Text.margin({ top: 20 });
                                }, Text);
                                Text.pop();
                                Column.pop();
                            });
                        }
                    }, If);
                    If.pop();
                    Column.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(2, () => {
                });
            }
        }, If);
        If.pop();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.padding(16);
            Row.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Row.opacity(this.isReady ? 1 : 0);
            Row.translate({ y: this.isReady ? 0 : -16 });
            Row.bindSheet({ value: this.sheetVisible, changeEvent: newValue => { this.sheetVisible = newValue; } }, { builder: this.UnifiedSheet.bind(this) }, {
                // 设置内容长且可滚动：固定 90% 高度（activeSheet 在打开前已就位，选项按内容分支生效）；
                // 二维码名片内容短，保持自适应高度档位
                height: this.activeSheet === 0 ? '90%' : 'auto',
                detents: this.activeSheet === 0 ? undefined : [SheetSize.MEDIUM, SheetSize.LARGE],
                // 内容组件自身背景透明，表面色统一由 sheet 提供（延伸进小白条避让区，双色会形成断层）
                backgroundColor: { "id": 16777250, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create(this.HostImageData);
            Image.draggable(false);
            Image.width(60);
            Image.height(60);
            Image.borderRadius(30);
            Image.objectFit(ImageFit.Cover);
            Image.alt({ "id": 16777218, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Image.onAppear(async () => {
                if (this.url !== '')
                    this.HostImageData = await loginFunction.GetPic(this.url) as PixelMap;
            });
            Image.onClick(() => {
                this.avatarTapCount++;
                clearTimeout(this.avatarTapTimer);
                if (this.avatarTapCount >= 5) {
                    this.openDebugPanel();
                }
                else {
                    this.avatarTapTimer = setTimeout(() => { this.avatarTapCount = 0; }, 1500);
                }
            });
            globalThis.Gesture.create(GesturePriority.Low);
            LongPressGesture.create({ repeat: false, duration: 800 });
            LongPressGesture.onAction(() => { this.openDebugPanel(); });
            LongPressGesture.pop();
            globalThis.Gesture.pop();
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.layoutWeight(1);
            Column.alignItems(HorizontalAlign.Start);
            Column.margin({ left: 12 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.hostName);
            Text.fontSize(18);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.maxLines(1);
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.hostPhone);
            Text.fontSize(13);
            Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
        }, Text);
        Text.pop();
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 4 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            globalThis.Context.animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) });
            Column.width(40);
            Column.height(40);
            Column.borderRadius(20);
            Column.justifyContent(FlexAlign.Center);
            Column.backgroundColor({ "id": 125829510, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Column.scale({ x: this.iconPressed === 0 ? 0.85 : 1, y: this.iconPressed === 0 ? 0.85 : 1 });
            globalThis.Context.animation(null);
            Column.visualEffect(new hdsEffect.HdsEffectBuilder()
                .pointLight({
                sourceType: this.iconPressed === 0 ? hdsEffect.PointLightSourceType.BRIGHT
                    : hdsEffect.PointLightSourceType.NONE,
                illuminatedType: hdsEffect.PointLightIlluminatedType.BORDER
            })
                .buildEffect());
            Column.onTouch(this.pressTouch(0));
            Column.onClick(() => {
                this.activeSheet = 0;
                this.sheetVisible = true;
            });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777294, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Image.width(22);
            Image.height(22);
            Image.draggable(false);
            Image.fillColor({ "id": 16777248, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
        }, Image);
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            globalThis.Context.animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) });
            Column.width(40);
            Column.height(40);
            Column.borderRadius(20);
            Column.justifyContent(FlexAlign.Center);
            Column.backgroundColor({ "id": 125829510, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Column.scale({ x: this.iconPressed === 1 ? 0.85 : 1, y: this.iconPressed === 1 ? 0.85 : 1 });
            globalThis.Context.animation(null);
            Column.visualEffect(new hdsEffect.HdsEffectBuilder()
                .pointLight({
                sourceType: this.iconPressed === 1 ? hdsEffect.PointLightSourceType.BRIGHT
                    : hdsEffect.PointLightSourceType.NONE,
                illuminatedType: hdsEffect.PointLightIlluminatedType.BORDER
            })
                .buildEffect());
            Column.onTouch(this.pressTouch(1));
            Column.onClick(() => {
                this.activeSheet = 1;
                this.sheetVisible = true;
            });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777295, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Image.width(22);
            Image.height(22);
            Image.draggable(false);
            Image.fillColor({ "id": 16777248, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
        }, Image);
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            globalThis.Context.animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) });
            Column.width(40);
            Column.height(40);
            Column.borderRadius(20);
            Column.justifyContent(FlexAlign.Center);
            Column.backgroundColor({ "id": 125829510, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Column.scale({ x: this.iconPressed === 2 ? 0.85 : 1, y: this.iconPressed === 2 ? 0.85 : 1 });
            globalThis.Context.animation(null);
            Column.visualEffect(new hdsEffect.HdsEffectBuilder()
                .pointLight({
                sourceType: this.iconPressed === 2 ? hdsEffect.PointLightSourceType.BRIGHT
                    : hdsEffect.PointLightSourceType.NONE,
                illuminatedType: hdsEffect.PointLightIlluminatedType.BORDER
            })
                .buildEffect());
            Column.onTouch(this.pressTouch(2));
            Column.onClick(() => { this.onLogout(); });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777279, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Image.width(22);
            Image.height(22);
            Image.draggable(false);
            Image.fillColor({ "id": 16777263, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
        }, Image);
        Column.pop();
        Row.pop();
        Row.pop();
    }
    private async doShare(ShareUri: string, ShareStr: string) {
        const ctx = this.uiContext.getHostContext() as common.UIAbilityContext;
        let shareData: systemShare.SharedData = new systemShare.SharedData({
            utd: utd.UniformDataType.IMAGE, uri: ShareUri,
            title: '分享二维码', description: '分享二维码', label: '二维码'
        });
        try {
            shareData.addRecord({
                utd: utd.UniformDataType.PLAIN_TEXT, content: ShareStr,
                title: '分享url', description: '可通过分享的url添加账号', label: 'url'
            });
        }
        catch (e) {
            console.error(`addRecord: ${e?.message}`);
        }
        let controller: systemShare.ShareController = new systemShare.ShareController(shareData);
        controller.show(ctx, {
            selectionMode: systemShare.SelectionMode.SINGLE,
            previewMode: systemShare.SharePreviewMode.DETAIL
        }).catch((error: BusinessError) => { console.error(`Share error: ${error?.message}`); });
    }
    rerender() {
        this.updateDirtyElements();
    }
}
export default class HomePage extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__currentIndex = new ObservedPropertySimplePU(0, this, "currentIndex");
        this.__titleName = new ObservedPropertySimplePU('首页', this, "titleName");
        this.__classList = new ObservedPropertyObjectPU(null, this, "classList");
        this.__isClassListRefreshing = new ObservedPropertySimplePU(false, this, "isClassListRefreshing");
        this.__otherUserList = new ObservedPropertyObjectPU([], this, "otherUserList");
        this.__expandedSection = new ObservedPropertySimplePU(-1, this, "expandedSection");
        this.__loginSheetVisible = new ObservedPropertySimplePU(false, this, "loginSheetVisible");
        this.__loginSheetType = new ObservedPropertySimplePU(-1, this, "loginSheetType");
        this.__locationsSheetVisible = new ObservedPropertySimplePU(false, this, "locationsSheetVisible");
        this.__btnAddPressed = new ObservedPropertySimplePU(false, this, "btnAddPressed");
        this.__actionPressed = new ObservedPropertySimplePU('', this, "actionPressed");
        this.__installInfo = new ObservedPropertySimplePU('', this, "installInfo");
        this.__tabLabelScale = new ObservedPropertyObjectPU([1, 1], this, "tabLabelScale");
        this.__userHostName = this.createStorageLink('userHostName', { "id": 16777224, "type": 10003, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }, "userHostName");
        this.__userHostPhone = this.createStorageLink('userHostPhone', { "id": 16777223, "type": 10003, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }, "userHostPhone");
        this.__userUrl = this.createStorageLink('userUrl', '', "userUrl");
        this.__userQRValue = this.createStorageLink('userQRValue', '', "userQRValue");
        this.__cloneSessionCookies = this.createStorageLink('cloneSessionCookies', '', "cloneSessionCookies");
        this.__cloneSessionName = this.createStorageLink('cloneSessionName', '', "cloneSessionName");
        this.pageInfos = new NavPathStack();
        this.classListLoading = false;
        this.controller = new HdsTabsController();
        this.supportFloatingBar = deviceInfo.sdkApiVersion >= 23;
        this.__naviIndicatorHeight = this.createStorageLink('naviIndicatorHeight', 0, "naviIndicatorHeight");
        this.__statusBarHeight = this.createStorageLink('statusBarHeight', 0, "statusBarHeight");
        this.__hdsMaterialLevel = this.createStorageLink('hdsMaterialLevel', HDS_MATERIAL_LEVEL_GENTLE, "hdsMaterialLevel");
        this.listScroller = new Scroller();
        this.tabBarMask = { maskColor: { "id": 16777250, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } };
        this.openLinkContext = this.getUIContext().getHostContext() as common.UIAbilityContext;
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: HomePage_Params) {
        if (params.currentIndex !== undefined) {
            this.currentIndex = params.currentIndex;
        }
        if (params.titleName !== undefined) {
            this.titleName = params.titleName;
        }
        if (params.classList !== undefined) {
            this.classList = params.classList;
        }
        if (params.isClassListRefreshing !== undefined) {
            this.isClassListRefreshing = params.isClassListRefreshing;
        }
        if (params.otherUserList !== undefined) {
            this.otherUserList = params.otherUserList;
        }
        if (params.expandedSection !== undefined) {
            this.expandedSection = params.expandedSection;
        }
        if (params.loginSheetVisible !== undefined) {
            this.loginSheetVisible = params.loginSheetVisible;
        }
        if (params.loginSheetType !== undefined) {
            this.loginSheetType = params.loginSheetType;
        }
        if (params.locationsSheetVisible !== undefined) {
            this.locationsSheetVisible = params.locationsSheetVisible;
        }
        if (params.btnAddPressed !== undefined) {
            this.btnAddPressed = params.btnAddPressed;
        }
        if (params.actionPressed !== undefined) {
            this.actionPressed = params.actionPressed;
        }
        if (params.installInfo !== undefined) {
            this.installInfo = params.installInfo;
        }
        if (params.tabLabelScale !== undefined) {
            this.tabLabelScale = params.tabLabelScale;
        }
        if (params.pageInfos !== undefined) {
            this.pageInfos = params.pageInfos;
        }
        if (params.classListLoading !== undefined) {
            this.classListLoading = params.classListLoading;
        }
        if (params.controller !== undefined) {
            this.controller = params.controller;
        }
        if (params.supportFloatingBar !== undefined) {
            this.supportFloatingBar = params.supportFloatingBar;
        }
        if (params.listScroller !== undefined) {
            this.listScroller = params.listScroller;
        }
        if (params.tabBarMask !== undefined) {
            this.tabBarMask = params.tabBarMask;
        }
        if (params.openLinkContext !== undefined) {
            this.openLinkContext = params.openLinkContext;
        }
    }
    updateStateVars(params: HomePage_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__currentIndex.purgeDependencyOnElmtId(rmElmtId);
        this.__titleName.purgeDependencyOnElmtId(rmElmtId);
        this.__classList.purgeDependencyOnElmtId(rmElmtId);
        this.__isClassListRefreshing.purgeDependencyOnElmtId(rmElmtId);
        this.__otherUserList.purgeDependencyOnElmtId(rmElmtId);
        this.__expandedSection.purgeDependencyOnElmtId(rmElmtId);
        this.__loginSheetVisible.purgeDependencyOnElmtId(rmElmtId);
        this.__loginSheetType.purgeDependencyOnElmtId(rmElmtId);
        this.__locationsSheetVisible.purgeDependencyOnElmtId(rmElmtId);
        this.__btnAddPressed.purgeDependencyOnElmtId(rmElmtId);
        this.__actionPressed.purgeDependencyOnElmtId(rmElmtId);
        this.__installInfo.purgeDependencyOnElmtId(rmElmtId);
        this.__tabLabelScale.purgeDependencyOnElmtId(rmElmtId);
        this.__userHostName.purgeDependencyOnElmtId(rmElmtId);
        this.__userHostPhone.purgeDependencyOnElmtId(rmElmtId);
        this.__userUrl.purgeDependencyOnElmtId(rmElmtId);
        this.__userQRValue.purgeDependencyOnElmtId(rmElmtId);
        this.__cloneSessionCookies.purgeDependencyOnElmtId(rmElmtId);
        this.__cloneSessionName.purgeDependencyOnElmtId(rmElmtId);
        this.__naviIndicatorHeight.purgeDependencyOnElmtId(rmElmtId);
        this.__statusBarHeight.purgeDependencyOnElmtId(rmElmtId);
        this.__hdsMaterialLevel.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__currentIndex.aboutToBeDeleted();
        this.__titleName.aboutToBeDeleted();
        this.__classList.aboutToBeDeleted();
        this.__isClassListRefreshing.aboutToBeDeleted();
        this.__otherUserList.aboutToBeDeleted();
        this.__expandedSection.aboutToBeDeleted();
        this.__loginSheetVisible.aboutToBeDeleted();
        this.__loginSheetType.aboutToBeDeleted();
        this.__locationsSheetVisible.aboutToBeDeleted();
        this.__btnAddPressed.aboutToBeDeleted();
        this.__actionPressed.aboutToBeDeleted();
        this.__installInfo.aboutToBeDeleted();
        this.__tabLabelScale.aboutToBeDeleted();
        this.__userHostName.aboutToBeDeleted();
        this.__userHostPhone.aboutToBeDeleted();
        this.__userUrl.aboutToBeDeleted();
        this.__userQRValue.aboutToBeDeleted();
        this.__cloneSessionCookies.aboutToBeDeleted();
        this.__cloneSessionName.aboutToBeDeleted();
        this.__naviIndicatorHeight.aboutToBeDeleted();
        this.__statusBarHeight.aboutToBeDeleted();
        this.__hdsMaterialLevel.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __currentIndex: ObservedPropertySimplePU<number>;
    get currentIndex() {
        return this.__currentIndex.get();
    }
    set currentIndex(newValue: number) {
        this.__currentIndex.set(newValue);
    }
    private __titleName: ObservedPropertySimplePU<string>;
    get titleName() {
        return this.__titleName.get();
    }
    set titleName(newValue: string) {
        this.__titleName.set(newValue);
    }
    private __classList: ObservedPropertyObjectPU<ClassInfo[] | null>;
    get classList() {
        return this.__classList.get();
    }
    set classList(newValue: ClassInfo[] | null) {
        this.__classList.set(newValue);
    }
    private __isClassListRefreshing: ObservedPropertySimplePU<boolean>;
    get isClassListRefreshing() {
        return this.__isClassListRefreshing.get();
    }
    set isClassListRefreshing(newValue: boolean) {
        this.__isClassListRefreshing.set(newValue);
    }
    private __otherUserList: ObservedPropertyObjectPU<UserDataAndId[]>;
    get otherUserList() {
        return this.__otherUserList.get();
    }
    set otherUserList(newValue: UserDataAndId[]) {
        this.__otherUserList.set(newValue);
    }
    private __expandedSection: ObservedPropertySimplePU<number>;
    get expandedSection() {
        return this.__expandedSection.get();
    }
    set expandedSection(newValue: number) {
        this.__expandedSection.set(newValue);
    }
    private __loginSheetVisible: ObservedPropertySimplePU<boolean>;
    get loginSheetVisible() {
        return this.__loginSheetVisible.get();
    }
    set loginSheetVisible(newValue: boolean) {
        this.__loginSheetVisible.set(newValue);
    }
    private __loginSheetType: ObservedPropertySimplePU<number>;
    get loginSheetType() {
        return this.__loginSheetType.get();
    }
    set loginSheetType(newValue: number) {
        this.__loginSheetType.set(newValue);
    }
    private __locationsSheetVisible: ObservedPropertySimplePU<boolean>;
    get locationsSheetVisible() {
        return this.__locationsSheetVisible.get();
    }
    set locationsSheetVisible(newValue: boolean) {
        this.__locationsSheetVisible.set(newValue);
    }
    private __btnAddPressed: ObservedPropertySimplePU<boolean>;
    get btnAddPressed() {
        return this.__btnAddPressed.get();
    }
    set btnAddPressed(newValue: boolean) {
        this.__btnAddPressed.set(newValue);
    }
    private __actionPressed: ObservedPropertySimplePU<string>;
    get actionPressed() {
        return this.__actionPressed.get();
    }
    set actionPressed(newValue: string) {
        this.__actionPressed.set(newValue);
    }
    private __installInfo: ObservedPropertySimplePU<string>;
    get installInfo() {
        return this.__installInfo.get();
    }
    set installInfo(newValue: string) {
        this.__installInfo.set(newValue);
    }
    private __tabLabelScale: ObservedPropertyObjectPU<number[]>;
    get tabLabelScale() {
        return this.__tabLabelScale.get();
    }
    set tabLabelScale(newValue: number[]) {
        this.__tabLabelScale.set(newValue);
    }
    private __userHostName: ObservedPropertyAbstractPU<Resource | string>;
    get userHostName() {
        return this.__userHostName.get();
    }
    set userHostName(newValue: Resource | string) {
        this.__userHostName.set(newValue);
    }
    private __userHostPhone: ObservedPropertyAbstractPU<Resource | string>;
    get userHostPhone() {
        return this.__userHostPhone.get();
    }
    set userHostPhone(newValue: Resource | string) {
        this.__userHostPhone.set(newValue);
    }
    private __userUrl: ObservedPropertyAbstractPU<string>;
    get userUrl() {
        return this.__userUrl.get();
    }
    set userUrl(newValue: string) {
        this.__userUrl.set(newValue);
    }
    private __userQRValue: ObservedPropertyAbstractPU<string>;
    get userQRValue() {
        return this.__userQRValue.get();
    }
    set userQRValue(newValue: string) {
        this.__userQRValue.set(newValue);
    }
    private __cloneSessionCookies: ObservedPropertyAbstractPU<string>;
    get cloneSessionCookies() {
        return this.__cloneSessionCookies.get();
    }
    set cloneSessionCookies(newValue: string) {
        this.__cloneSessionCookies.set(newValue);
    }
    private __cloneSessionName: ObservedPropertyAbstractPU<string>;
    get cloneSessionName() {
        return this.__cloneSessionName.get();
    }
    set cloneSessionName(newValue: string) {
        this.__cloneSessionName.set(newValue);
    }
    private pageInfos: NavPathStack;
    private classListLoading: boolean;
    private controller: HdsTabsController;
    // 悬浮页签（barFloatingStyle）为 6.1.0(23) 新特性：按系统 API 版本运行时判断，
    // 低版本系统自动退化为沉浸式页签（build 内两条分支共用 HdsTabContents 构建器）。
    // 注意：不能用 canIUse('apis: 23')——实测 6.1(API 24) 真机返回 false，与文档不符
    private readonly supportFloatingBar: boolean;
    private __naviIndicatorHeight: ObservedPropertyAbstractPU<number>; // EntryAbility 实测的系统手势条高度
    get naviIndicatorHeight() {
        return this.__naviIndicatorHeight.get();
    }
    set naviIndicatorHeight(newValue: number) {
        this.__naviIndicatorHeight.set(newValue);
    }
    private __statusBarHeight: ObservedPropertyAbstractPU<number>; // EntryAbility 实测的状态栏高度
    get statusBarHeight() {
        return this.__statusBarHeight.get();
    }
    set statusBarHeight(newValue: number) {
        this.__statusBarHeight.set(newValue);
    }
    private __hdsMaterialLevel: ObservedPropertyAbstractPU<number>; // 沉浸光感档位：页签与标题栏联动
    get hdsMaterialLevel() {
        return this.__hdsMaterialLevel.get();
    }
    set hdsMaterialLevel(newValue: number) {
        this.__hdsMaterialLevel.set(newValue);
    }
    private listScroller: Scroller; // 标题栏渐变模糊的滚动绑定源
    private readonly tabBarMask: HdsTabsBackgroundStyle;
    private openLinkContext;
    // 页签项：图标+文字（应用市场风格），选中态主题蓝
    TabBarItem(targetIndex: number, title: Resource, symbol: Resource, parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.height('100%');
            Column.justifyContent(FlexAlign.Center);
            Column.scale({
                x: this.tabLabelScale[targetIndex] ?? 1,
                y: this.tabLabelScale[targetIndex] ?? 1
            });
            Column.onClick(() => { this.switchTab(targetIndex); });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            SymbolGlyph.create(symbol);
            SymbolGlyph.fontSize(22);
            SymbolGlyph.fontColor([this.currentIndex === targetIndex ? { "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : { "id": 16777262, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }]);
        }, SymbolGlyph);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(title);
            Text.fontSize(12);
            Text.margin({ top: 2 });
            Text.fontWeight(this.currentIndex === targetIndex ? FontWeight.Medium : FontWeight.Regular);
            Text.fontColor(this.currentIndex === targetIndex ? { "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : { "id": 16777262, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.maxLines(1);
        }, Text);
        Text.pop();
        Column.pop();
    }
    loginSheetContent(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.loginSheetType === 0) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        __Recycle__.create();
                    }, __Recycle__);
                    {
                        this.observeRecycleComponentCreation("loginByCommon", (elmtId, isInitialRender, recycleNode = null) => {
                            ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                            if (isInitialRender) {
                                let componentCall = recycleNode ? recycleNode : new loginByCommon(this, { isShow: this.__loginSheetVisible, otherUserList: this.__otherUserList }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/Index.ets", line: 406, col: 7 });
                                ViewPU.createRecycle(componentCall, recycleNode !== null, "loginByCommon", () => {
                                    if (recycleNode && typeof recycleNode.aboutToReuseInternal === "function") {
                                        recycleNode.aboutToReuseInternal();
                                    }
                                    else {
                                        if (recycleNode.aboutToReuse && typeof recycleNode.aboutToReuse === "function") {
                                            recycleNode.aboutToReuse({ isShow: this.loginSheetVisible, otherUserList: this.otherUserList });
                                        }
                                        recycleNode.rerender();
                                    }
                                });
                                let paramsLambda = () => {
                                    return {
                                        isShow: this.loginSheetVisible,
                                        otherUserList: this.otherUserList
                                    };
                                };
                                componentCall.paramsGenerator_ = paramsLambda;
                            }
                            else {
                                this.updateStateVarsOfChildByElmtId(elmtId, {});
                            }
                            ViewStackProcessor.StopGetAccessRecording();
                        });
                    }
                    __Recycle__.pop();
                });
            }
            else if (this.loginSheetType === 1) {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        __Recycle__.create();
                    }, __Recycle__);
                    {
                        this.observeRecycleComponentCreation("loginByURL", (elmtId, isInitialRender, recycleNode = null) => {
                            ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                            if (isInitialRender) {
                                let componentCall = recycleNode ? recycleNode : new loginByURL(this, { isShow: this.__loginSheetVisible, otherUserList: this.__otherUserList }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/Index.ets", line: 408, col: 7 });
                                ViewPU.createRecycle(componentCall, recycleNode !== null, "loginByURL", () => {
                                    if (recycleNode && typeof recycleNode.aboutToReuseInternal === "function") {
                                        recycleNode.aboutToReuseInternal();
                                    }
                                    else {
                                        if (recycleNode.aboutToReuse && typeof recycleNode.aboutToReuse === "function") {
                                            recycleNode.aboutToReuse({ isShow: this.loginSheetVisible, otherUserList: this.otherUserList });
                                        }
                                        recycleNode.rerender();
                                    }
                                });
                                let paramsLambda = () => {
                                    return {
                                        isShow: this.loginSheetVisible,
                                        otherUserList: this.otherUserList
                                    };
                                };
                                componentCall.paramsGenerator_ = paramsLambda;
                            }
                            else {
                                this.updateStateVarsOfChildByElmtId(elmtId, {});
                            }
                            ViewStackProcessor.StopGetAccessRecording();
                        });
                    }
                    __Recycle__.pop();
                });
            }
            else // 收藏位置管理 sheet（独立于 UnifiedSheet/设置 sheet）
             {
                this.ifElseBranchUpdateFunction(2, () => {
                });
            }
        }, If);
        If.pop();
    }
    // 收藏位置管理 sheet（独立于 UnifiedSheet/设置 sheet）
    LocationsSheetBuilder(parent = null) {
        {
            this.observeComponentCreation2((elmtId, isInitialRender) => {
                if (isInitialRender) {
                    let componentCall = new LocationFavoritesComponent(this, { onClose: () => {
                            this.locationsSheetVisible = false;
                        } }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/Index.ets", line: 414, col: 5 });
                    ViewPU.create(componentCall);
                    let paramsLambda = () => {
                        return {
                            onClose: () => {
                                this.locationsSheetVisible = false;
                            }
                        };
                    };
                    componentCall.paramsGenerator_ = paramsLambda;
                }
                else {
                    this.updateStateVarsOfChildByElmtId(elmtId, {});
                }
            }, { name: "LocationFavoritesComponent" });
        }
    }
    AddUserMenu(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Menu.create();
        }, Menu);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            MenuItem.create({ content: '扫码添加', startIcon: { "id": 16777292, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } });
            MenuItem.onClick(() => this.startScan());
        }, MenuItem);
        MenuItem.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            MenuItem.create({ content: '账号登录', startIcon: { "id": 16777293, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } });
            MenuItem.onClick(() => { this.loginSheetType = 0; this.loginSheetVisible = true; });
        }, MenuItem);
        MenuItem.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            MenuItem.create({ content: '链接登录', startIcon: { "id": 16777289, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } });
            MenuItem.onClick(() => { this.loginSheetType = 1; this.loginSheetVisible = true; });
        }, MenuItem);
        MenuItem.pop();
        Menu.pop();
    }
    ActionItem(icon: Resource, label: string, onClickAction: () => void, iconColor?: ResourceColor, parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            globalThis.Context.animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) });
            Row.width('100%');
            Row.height(52);
            Row.padding({ left: 16, right: 16 });
            Row.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Row.scale({ x: this.actionPressed === label ? 0.97 : 1, y: this.actionPressed === label ? 0.97 : 1 });
            globalThis.Context.animation(null);
            Row.onTouch((event: TouchEvent) => {
                if (event.type === TouchType.Down) {
                    this.actionPressed = label;
                }
                else {
                    setTimeout(() => { this.actionPressed = ''; }, 200);
                }
            });
            Row.onClick(() => onClickAction());
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create(icon);
            Image.width(24);
            Image.height(24);
            Image.fillColor(iconColor ?? { "id": 16777248, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Image.draggable(false);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(label);
            Text.fontSize(16);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.margin({ left: 12 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Blank.create();
        }, Blank);
        Blank.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 125830088, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Image.width(14);
            Image.height(14);
            Image.draggable(false);
            Image.fillColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
        }, Image);
        Row.pop();
    }
    SectionHeader(title: string, count: number, sectionIndex: number, showAdd: boolean = false, parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.height(52);
            Row.padding({ left: 16, right: 16 });
            Row.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Row.onClick(() => {
                Context.animateTo({ duration: 400, curve: curves.interpolatingSpring(0, 1, 280, 26) }, () => {
                    this.expandedSection = this.expandedSection === sectionIndex ? -1 : sectionIndex;
                });
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777265, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            globalThis.Context.animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 280, 26) });
            Image.draggable(false);
            Image.width(14);
            Image.height(14);
            Image.fillColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Image.rotate({ angle: this.expandedSection === sectionIndex ? 90 : 0 });
            globalThis.Context.animation(null);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(title);
            Text.fontSize(16);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.margin({ left: 8 });
            Text.layoutWeight(1);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (count > 0) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(`(${count})`);
                        Text.fontSize(13);
                        Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.margin({ right: 4 });
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
            if (showAdd) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        globalThis.Context.animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) });
                        Column.width(32);
                        Column.height(32);
                        Column.borderRadius(16);
                        Column.justifyContent(FlexAlign.Center);
                        Column.backgroundColor({ "id": 16777235, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Column.margin({ left: 8 });
                        Column.scale({ x: this.btnAddPressed ? 0.85 : 1, y: this.btnAddPressed ? 0.85 : 1 });
                        globalThis.Context.animation(null);
                        Column.visualEffect(new hdsEffect.HdsEffectBuilder()
                            .pointLight({
                            sourceType: this.btnAddPressed ? hdsEffect.PointLightSourceType.BRIGHT
                                : hdsEffect.PointLightSourceType.NONE,
                            illuminatedType: hdsEffect.PointLightIlluminatedType.BORDER
                        })
                            .buildEffect());
                        Column.onTouch((event: TouchEvent) => {
                            if (event.type === TouchType.Down) {
                                this.btnAddPressed = true;
                            }
                            else {
                                setTimeout(() => { this.btnAddPressed = false; }, 200);
                            }
                        });
                        Column.bindMenu({ builder: this.AddUserMenu.bind(this) });
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Image.create({ "id": 16777276, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Image.draggable(false);
                        Image.width(18);
                        Image.height(18);
                        Image.fillColor({ "id": 16777259, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    }, Image);
                    Column.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        Row.pop();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            HdsNavDestination.create(() => {
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    // 6.1(23) 起支持悬浮页签：底栏胶囊化悬浮于内容之上；低版本系统退化为沉浸式页签
                    if (this.supportFloatingBar) {
                        this.ifElseBranchUpdateFunction(0, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                HdsTabs.create({ barPosition: BarPosition.End, index: this.currentIndex, controller: this.controller });
                                HdsTabs.height('100%');
                                HdsTabs.vertical(false);
                                HdsTabs.barMode(BarMode.Fixed);
                                HdsTabs.animationDuration(0);
                                HdsTabs.barOverlap(true);
                                HdsTabs.barFloatingStyle({
                                    // 等级随设置「沉浸光感」切换（默认 GENTLE），与标题栏联动；barBottomMargin 取实测手势条高度，
                                    // 胶囊落在手势条区域内而非其上方，无实测值时退回系统级 8vp 内边距（示例同款兜底）；
                                    // gradientMask 必须显式置透明：默认值自带黑色渐变遮罩，会在胶囊下方糊出一条黑边
                                    barWidth: { smallWidth: 280, mediumWidth: 400, largeWidth: 560 },
                                    barBottomMargin: this.naviIndicatorHeight > 0 ? this.naviIndicatorHeight : { "id": 125830927, "type": 10002, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" },
                                    gradientMask: { maskColor: Color.Transparent },
                                    adaptToHandedness: true,
                                    systemMaterialEffect: {
                                        materialType: HDS_MATERIAL_TYPE_ADAPTIVE as hdsMaterial.MaterialType,
                                        materialLevel: this.hdsMaterialLevel as hdsMaterial.MaterialLevel
                                    }
                                });
                                HdsTabs.onTabBarClick(() => {
                                    this.popCurrentTabLabel();
                                });
                                HdsTabs.backgroundColor({ "id": 16777250, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                HdsTabs.scrollable(false);
                                HdsTabs.onChange((index) => {
                                    this.titleName = index === 0 ? '首页' : '用户中心';
                                    this.currentIndex = index;
                                });
                            }, HdsTabs);
                            this.HdsTabContents.bind(this)();
                            HdsTabs.pop();
                        });
                    }
                    else {
                        this.ifElseBranchUpdateFunction(1, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                HdsTabs.create({ barPosition: BarPosition.End, index: this.currentIndex, controller: this.controller });
                                HdsTabs.height('100%');
                                HdsTabs.vertical(false);
                                HdsTabs.barMode(BarMode.Fixed);
                                HdsTabs.animationDuration(0);
                                HdsTabs.barOverlap(true);
                                HdsTabs.barBackgroundStyle(this.tabBarMask);
                                HdsTabs.onTabBarClick(() => {
                                    this.popCurrentTabLabel();
                                });
                                HdsTabs.backgroundColor({ "id": 16777250, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                HdsTabs.scrollable(false);
                                HdsTabs.onChange((index) => {
                                    this.titleName = index === 0 ? '首页' : '用户中心';
                                    this.currentIndex = index;
                                });
                            }, HdsTabs);
                            this.HdsTabContents.bind(this)();
                            HdsTabs.pop();
                        });
                    }
                }, If);
                If.pop();
            }, { moduleName: "entry", pagePath: "entry/src/main/ets/pages/Index" });
            HdsNavDestination.backgroundColor({ "id": 16777250, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            HdsNavDestination.titleBar({
                content: {
                    // 标题+搜索框走 stackBuilder 自定义：搜索框带 geometryTransition，点击时与搜索页输入框
                    // 做一镜到底转场；用户中心 Tab 不渲染搜索框。系统 menu 按钮是系统渲染的，挂不上
                    // geometryTransition，做不了一镜到底，故搜索入口用自绘搜索框
                    stackBuilder: () => { this.HomeTitle(); }
                },
                style: {
                    scrollEffectOpts: {
                        // 用示例同款 GRADIENT_BLUR：6.1 的 IMMERSIVE_GRADIENT_BLUR 模糊区域更大、默认背板更实，
                        // 沉浸光感材质下静止时显成一条色带，失去示例的透明观感
                        enableScrollEffect: true,
                        scrollEffectType: ScrollEffectType.GRADIENT_BLUR,
                        // 渐变模糊终止线对齐标题栏底边（状态栏+56，示例同款）：模糊量铺满整个标题区高度连续过渡，
                        // 而非默认 vp(8) 就饱和；6.0(20) 起支持
                        blurEffectiveEndOffset: LengthMetrics.vp(this.statusBarHeight + 56)
                    },
                    systemMaterialEffect: this.supportFloatingBar ? {
                        // 等级随设置「沉浸光感」切换（默认 GENTLE），与底部页签保持同一档位联动
                        materialType: HDS_MATERIAL_TYPE_ADAPTIVE as hdsMaterial.MaterialType,
                        materialLevel: this.hdsMaterialLevel as hdsMaterial.MaterialLevel
                    } : undefined
                },
                // 官方示例同款显式声明（沉浸一体化的关键）：关闭内容对标题栏的组件级避让，
                // 否则内容被整体下移到栏底、永远无法穿透到栏下（模拟器实测表现为栏区一块不透明色块）
                avoidLayoutSafeArea: false,
                enableComponentSafeArea: false
            });
            HdsNavDestination.ignoreLayoutSafeArea([LayoutSafeAreaType.SYSTEM], [LayoutSafeAreaEdge.TOP, LayoutSafeAreaEdge.BOTTOM]);
            HdsNavDestination.bindToScrollable([this.listScroller]);
            HdsNavDestination.hideBackButton(true);
            HdsNavDestination.backgroundImageSize({ width: '100%', height: '100%' });
            HdsNavDestination.borderRadius({ "id": 125830913, "type": 10002, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            HdsNavDestination.height('100%');
            HdsNavDestination.width('100%');
            HdsNavDestination.onReady((ctx: NavDestinationContext) => {
                this.pageInfos = ctx.pathStack;
                this.initPageData(); // HdsNavDestination 无 onAppear，初始化挂在 onReady
            });
            HdsNavDestination.onBackPressed(() => {
                if (this.currentIndex === 1) {
                    this.currentIndex = 0;
                    this.controller.changeIndex(0);
                    return true;
                }
                this.openLinkContext.moveAbilityToBackground(); // 首页返回：退回桌面（应用移至后台）
                return true;
            });
        }, HdsNavDestination);
        HdsNavDestination.pop();
    }
    /**
     * 页面数据初始化（由 onReady 触发）：校验主用户登录态，拉取其他用户与使用时长
     */
    private async initPageData(): Promise<void> {
        try {
            const dbManager = DatabaseManager.getInstance();
            const hostUser = await this.getHostUser();
            const HostUser = await loginFunction.getUserInfo(hostUser.cookies);
            if (HostUser.msg !== 'successful') {
                hilog.error(DOMAIN, TAG, `Failed to fetch host user info: ${HostUser.msg}`);
                this.pageInfos.replacePath({ name: "LoginPage" }, false);
                return;
            }
            this.otherUserList = await dbManager.getAllUsers();
            this.userHostName = HostUser.uname;
            this.userHostPhone = hostUser.phone;
            this.userUrl = HostUser.pic;
            this.userQRValue = `http://cdn.aquamarine5.fun/?phone=${hostUser.phone}&pwd=${encodeURIComponent(hostUser.pwd)}&name=${encodeURIComponent(HostUser.uname)}`;
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Error in initPageData: ${e.message}`);
        }
        await this.loadInstallInfo();
    }
    // 标题栏 stackBuilder：标题 + 搜索框。搜索框带 geometryTransition，
    // 点击时与搜索页输入框做一镜到底转场；用户中心 Tab 不渲染搜索框
    HomeTitle(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.height(56);
            Row.alignItems(VerticalAlign.Center);
            Row.padding({ left: 16, right: 16 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.titleName);
            Text.fontSize(24);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.currentIndex === 0) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Search.create({ placeholder: '搜索课程...' });
                        Search.layoutWeight(1);
                        Search.height(40);
                        Search.margin({ left: 16 });
                        Search.borderRadius(20);
                        Search.backgroundColor({ "id": 125829156, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Search.placeholderColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Search.geometryTransition('SEARCH_ONE_SHOT_DEMO_TRANSITION_ID', { follow: true });
                        Search.shadow({ radius: 6, color: '#00000020', offsetX: 0, offsetY: 2 });
                        Search.onTouch((event: TouchEvent) => { if (event.type === TouchType.Up)
                            this.showSearchPage(); });
                    }, Search);
                    Search.pop();
                });
            }
            else // stackBuilder 内容被系统锚定在状态栏下方（真机实测 37vp 起），不要再加 statusBarHeight
             {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        Row.pop();
    }
    // 一镜到底跳搜索页：关闭系统默认转场（pushPath 第二参 false），由 geometryTransition 弹簧动画接管
    private showSearchPage(): void {
        this.getUIContext().animateTo({
            curve: curves.interpolatingSpring(0, 1, 342, 38)
        }, () => { this.pageInfos.pushPath({ name: 'SearchCoursePage' }, false); });
    }
    // 课程/用户中心两个 TabContent：悬浮页签与退化分支共用，保证内容只有一份
    HdsTabContents(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TabContent.create(() => {
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Refresh.create({ refreshing: { value: this.isClassListRefreshing, changeEvent: newValue => { this.isClassListRefreshing = newValue; } } });
                    Refresh.width('100%');
                    Refresh.height('100%');
                    Refresh.onRefreshing(async () => { await this.loadClassList(); });
                }, Refresh);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    List.create({ space: 0, scroller: this.listScroller });
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
                            // 内容会被永远裁剪在标题栏底边之下，无法产生示例那种内容穿透标题栏的渐变模糊（模拟器实测）
                            ListItem.pop();
                        }
                        ViewStackProcessor.StopGetAccessRecording();
                    };
                    const itemCreation2 = (elmtId, isInitialRender) => {
                        ListItem.create(deepRenderFunction, true);
                        // 让位标题栏的空白必须做成列表首项（随内容滚动收起）：List 的 .padding 是固定视口内缩，
                        // 内容会被永远裁剪在标题栏底边之下，无法产生示例那种内容穿透标题栏的渐变模糊（模拟器实测）
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
                        // 内容会被永远裁剪在标题栏底边之下，无法产生示例那种内容穿透标题栏的渐变模糊（模拟器实测）
                        ListItem.pop();
                    };
                    this.observeComponentCreation2(itemCreation2, ListItem);
                    // 让位标题栏的空白必须做成列表首项（随内容滚动收起）：List 的 .padding 是固定视口内缩，
                    // 内容会被永远裁剪在标题栏底边之下，无法产生示例那种内容穿透标题栏的渐变模糊（模拟器实测）
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
                                                let componentCall = new CloneSessionBanner(this, { onExit: () => { this.exitCloneSession(); } }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/Index.ets", line: 674, col: 15 });
                                                ViewPU.create(componentCall);
                                                let paramsLambda = () => {
                                                    return {
                                                        onExit: () => { this.exitCloneSession(); }
                                                    };
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
                        const classInfo = _item;
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
                                ListItem.onClick(() => { this.pageInfos.pushPath({ name: 'ActivityListPage', param: classInfo }); });
                            };
                            const deepRenderFunction = (elmtId, isInitialRender) => {
                                itemCreation(elmtId, isInitialRender);
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    __Recycle__.create();
                                }, __Recycle__);
                                {
                                    this.observeRecycleComponentCreation("ClassListItem", (elmtId, isInitialRender, recycleNode = null) => {
                                        ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                                        if (isInitialRender) {
                                            let componentCall = recycleNode ? recycleNode : new ClassListItem(this, { classInfo: classInfo }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/Index.ets", line: 679, col: 26 });
                                            ViewPU.createRecycle(componentCall, recycleNode !== null, "ClassListItem", () => {
                                                if (recycleNode && typeof recycleNode.aboutToReuseInternal === "function") {
                                                    recycleNode.aboutToReuseInternal();
                                                }
                                                else {
                                                    if (recycleNode.aboutToReuse && typeof recycleNode.aboutToReuse === "function") {
                                                        recycleNode.aboutToReuse({ classInfo: classInfo });
                                                    }
                                                    recycleNode.rerender();
                                                }
                                            });
                                            let paramsLambda = () => {
                                                return {
                                                    classInfo: classInfo
                                                };
                                            };
                                            componentCall.paramsGenerator_ = paramsLambda;
                                        }
                                        else {
                                            this.updateStateVarsOfChildByElmtId(elmtId, {
                                                classInfo: classInfo
                                            });
                                        }
                                        ViewStackProcessor.StopGetAccessRecording();
                                    });
                                }
                                __Recycle__.pop();
                                ListItem.pop();
                            };
                            this.observeComponentCreation2(itemCreation2, ListItem);
                            ListItem.pop();
                        }
                    };
                    this.forEachUpdateFunction(elmtId, this.classList, forEachItemGenFunction, (classInfo: ClassInfo) => classInfo.id, true, false);
                }, ForEach);
                ForEach.pop();
                List.pop();
                Refresh.pop();
            });
            TabContent.height('100%');
            TabContent.width('100%');
            TabContent.tabBar({ builder: () => {
                    this.TabBarItem.call(this, 0, { "id": 16777222, "type": 10003, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }, { "id": 125831935, "type": 40000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                } });
            TabContent.onAppear(async () => {
                await this.loadClassList();
            });
        }, TabContent);
        TabContent.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TabContent.create(() => {
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.width('100%');
                    Column.height('100%');
                    Column.bindSheet({ value: this.loginSheetVisible, changeEvent: newValue => { this.loginSheetVisible = newValue; } }, { builder: this.loginSheetContent.bind(this) }, {
                        height: 'auto', detents: [SheetSize.MEDIUM, SheetSize.LARGE],
                        backgroundColor: { "id": 125829132, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }
                    });
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    __Common__.create();
                    __Common__.margin({ top: this.statusBarHeight + 56 });
                }, __Common__);
                {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        if (isInitialRender) {
                            let componentCall = new UserInfoComponent(this, {
                                hostName: this.userHostName,
                                hostPhone: this.userHostPhone,
                                url: this.userUrl,
                                QRvalue: this.userQRValue,
                                onLogout: () => { this.showLogoutDialog(); }
                            }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/Index.ets", line: 697, col: 9 });
                            ViewPU.create(componentCall);
                            let paramsLambda = () => {
                                return {
                                    hostName: this.userHostName,
                                    hostPhone: this.userHostPhone,
                                    url: this.userUrl,
                                    QRvalue: this.userQRValue,
                                    onLogout: () => { this.showLogoutDialog(); }
                                };
                            };
                            componentCall.paramsGenerator_ = paramsLambda;
                        }
                        else {
                            this.updateStateVarsOfChildByElmtId(elmtId, {
                                hostName: this.userHostName,
                                hostPhone: this.userHostPhone,
                                url: this.userUrl,
                                QRvalue: this.userQRValue
                            });
                        }
                    }, { name: "UserInfoComponent" });
                }
                __Common__.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.height(10);
                    Row.width('100%');
                    Row.backgroundColor({ "id": 16777250, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Row);
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Column);
                this.SectionHeader.bind(this)('其他用户', this.otherUserList.length, 0, true);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    if (this.expandedSection === 0 && this.otherUserList.length > 0) {
                        this.ifElseBranchUpdateFunction(0, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Column.create();
                                Column.transition(TransitionEffect.OPACITY
                                    .combine(TransitionEffect.translate({ y: -10 }))
                                    .animation({ duration: 400, curve: curves.interpolatingSpring(0, 1, 280, 26) }));
                            }, Column);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                List.create({ space: 0 });
                                List.divider({ strokeWidth: 0.5, color: { "id": 125831013, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }, startMargin: 72, endMargin: 16 });
                                List.scrollBar(BarState.Off);
                                List.constraintSize({ maxHeight: 360 });
                            }, List);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                ForEach.create();
                                const forEachItemGenFunction = (_item, index) => {
                                    const item = _item;
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
                                        };
                                        const deepRenderFunction = (elmtId, isInitialRender) => {
                                            itemCreation(elmtId, isInitialRender);
                                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                __Recycle__.create();
                                            }, __Recycle__);
                                            {
                                                this.observeRecycleComponentCreation("OtherUserItem", (elmtId, isInitialRender, recycleNode = null) => {
                                                    ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                                                    if (isInitialRender) {
                                                        let componentCall = recycleNode ? recycleNode : new OtherUserItem(this, {
                                                            userData: item, otherUserList: this.__otherUserList, index: index,
                                                            onCloneLogin: () => { this.enterCloneSession(); }
                                                        }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/Index.ets", line: 715, col: 21 });
                                                        ViewPU.createRecycle(componentCall, recycleNode !== null, "OtherUserItem", () => {
                                                            if (recycleNode && typeof recycleNode.aboutToReuseInternal === "function") {
                                                                recycleNode.aboutToReuseInternal();
                                                            }
                                                            else {
                                                                if (recycleNode.aboutToReuse && typeof recycleNode.aboutToReuse === "function") {
                                                                    recycleNode.aboutToReuse({ userData: item, otherUserList: this.otherUserList, index: index,
                                                                        onCloneLogin: () => { this.enterCloneSession(); } });
                                                                }
                                                                recycleNode.rerender();
                                                            }
                                                        });
                                                        let paramsLambda = () => {
                                                            return {
                                                                userData: item,
                                                                otherUserList: this.otherUserList,
                                                                index: index,
                                                                onCloneLogin: () => { this.enterCloneSession(); }
                                                            };
                                                        };
                                                        componentCall.paramsGenerator_ = paramsLambda;
                                                    }
                                                    else {
                                                        this.updateStateVarsOfChildByElmtId(elmtId, {
                                                            userData: item, index: index
                                                        });
                                                    }
                                                    ViewStackProcessor.StopGetAccessRecording();
                                                });
                                            }
                                            __Recycle__.pop();
                                            ListItem.pop();
                                        };
                                        this.observeComponentCreation2(itemCreation2, ListItem);
                                        ListItem.pop();
                                    }
                                };
                                this.forEachUpdateFunction(elmtId, this.otherUserList, forEachItemGenFunction, (item: UserDataAndId) => item.id.toString(), true, false);
                            }, ForEach);
                            ForEach.pop();
                            List.pop();
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
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.height(10);
                    Row.width('100%');
                    Row.backgroundColor({ "id": 16777250, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Row);
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Column.bindSheet({ value: this.locationsSheetVisible, changeEvent: newValue => { this.locationsSheetVisible = newValue; } }, { builder: this.LocationsSheetBuilder.bind(this) }, {
                        height: SheetSize.LARGE,
                        backgroundColor: { "id": 125829132, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" },
                        // 系统右上角 ✕ 会压住组件自绘的关闭按钮，改用按钮/下拉关闭
                        showClose: false
                    });
                }, Column);
                this.ActionItem.bind(this)({ "id": 16777278, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }, '签到统计', () => {
                    this.pageInfos.pushPath({ name: 'SignStatsPage' });
                });
                this.ActionItem.bind(this)({ "id": 16777305, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }, '签到排行榜', () => {
                    this.pageInfos.pushPath({ name: 'LeaderboardPage' });
                });
                this.ActionItem.bind(this)({ "id": 16777286, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }, '管理收藏的位置', () => {
                    this.locationsSheetVisible = true;
                });
                this.ActionItem.bind(this)({ "id": 16777274, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }, '反馈问题', () => {
                    this.openLinkContext.openLink('https://github.com/ASCII-58/chaoxingsignfaker-for-harmony-OS-NEXT/issues/new')
                        .catch((e: BusinessError<void>) => { hilog.error(0x0000, 'Link', `${e.code}`); });
                });
                this.ActionItem.bind(this)({ "id": 16777270, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }, '联系我们', () => {
                    let want: Want = { action: 'ohos.want.action.viewData', uri: 'mailto:xyxy1029@petalmail.com' };
                    this.openLinkContext.startAbility(want)
                        .catch((e: BusinessError) => { hilog.error(0x0000, 'Mail', `${e.code}`); });
                });
                Column.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.height(10);
                    Row.width('100%');
                    Row.backgroundColor({ "id": 16777250, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Row);
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    if (this.installInfo !== '') {
                        this.ifElseBranchUpdateFunction(0, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Column.create();
                                Column.width('100%');
                                Column.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                Column.borderRadius(16);
                                Column.padding({ left: 4, right: 4 });
                            }, Column);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Row.create();
                                Row.width('100%');
                                Row.padding(12);
                            }, Row);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create('使用时长');
                                Text.fontSize(16);
                                Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            }, Text);
                            Text.pop();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Blank.create();
                            }, Blank);
                            Blank.pop();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create(this.installInfo);
                                Text.fontSize(14);
                                Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            }, Text);
                            Text.pop();
                            Row.pop();
                            Column.pop();
                        });
                    }
                    // 底部不再留避让垫条：内容一贯到底，末项随滚动沉入悬浮胶囊之下（应用市场同款沉浸）
                    else {
                        this.ifElseBranchUpdateFunction(1, () => {
                        });
                    }
                }, If);
                If.pop();
                Column.pop();
            });
            TabContent.tabBar({ builder: () => {
                    this.TabBarItem.call(this, 1, { "id": 16777231, "type": 10003, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }, { "id": 125832135, "type": 40000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                } });
        }, TabContent);
        TabContent.pop();
    }
    /**
     * 切换标签页：弹性缩放反馈 + 平滑内容过渡
     */
    private switchTab(targetIndex: number) {
        if (this.currentIndex === targetIndex) {
            return;
        }
        Context.animateTo({ curve: curves.springMotion(0.32, 0.85) }, () => {
            this.currentIndex = targetIndex;
            this.controller.changeIndex(targetIndex);
        });
        this.popCurrentTabLabel();
    }
    /**
     * 当前选中页签文字的弹性回弹动效
     */
    private popCurrentTabLabel() {
        const idx = this.currentIndex;
        this.tabLabelScale[idx] = 1.15;
        Context.animateTo({ curve: curves.springMotion(0.32, 0.85) }, () => {
            this.tabLabelScale[idx] = 1;
        });
    }
    /**
     * 拉取课程列表(首载与下拉刷新共用)；下拉刷新失败时给出提示并保留原列表
     */
    private async loadClassList(): Promise<void> {
        if (this.classListLoading) {
            this.isClassListRefreshing = false; // 已有拉取在进行，直接收起下拉指示器
            return;
        }
        this.classListLoading = true;
        try {
            // 克隆登录时浏览的是克隆用户的课程，课程列表请求走克隆会话
            const cookies = this.cloneSessionCookies !== ''
                ? this.cloneSessionCookies
                : (await this.getHostUser()).cookies;
            const result = await CourseAndActivity.getClassList(cookies);
            if (result.msg) {
                this.classList = result.classList;
            }
            else if (this.isClassListRefreshing) {
                promptAction.showToast({ message: '课程列表刷新失败' });
            }
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Failed to load class list: ${(e as Error).message}`);
            if (this.isClassListRefreshing) {
                promptAction.showToast({ message: '课程列表刷新失败' });
            }
        }
        finally {
            this.classListLoading = false;
            this.isClassListRefreshing = false;
        }
    }
    private async loadInstallInfo() {
        try {
            const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
            let pref = await preferences.getPreferences(context, 'settings');
            const firstInstall = await pref.get('first_install_time', 0) as number;
            if (firstInstall > 0) {
                const days = Math.floor((Date.now() - firstInstall) / (24 * 60 * 60 * 1000));
                if (days < 1) {
                    this.installInfo = '已使用不到1天';
                }
                else if (days < 30) {
                    this.installInfo = `已使用 ${days} 天`;
                }
                else if (days < 365) {
                    const months = Math.floor(days / 30);
                    this.installInfo = `已使用 ${months} 个月`;
                }
                else {
                    const years = Math.floor(days / 365);
                    const remainMonths = Math.floor((days % 365) / 30);
                    if (remainMonths > 0) {
                        this.installInfo = `已使用 ${years} 年 ${remainMonths} 个月`;
                    }
                    else {
                        this.installInfo = `已使用 ${years} 年`;
                    }
                }
            }
        }
        catch (e) {
            console.error('Failed to load install info', e);
        }
    }
    private showLogoutDialog() {
        AlertDialog.show({
            title: '退出登录', message: '确认退出登录吗？',
            primaryButton: { value: '取消', action: () => { } },
            secondaryButton: {
                value: '退出',
                action: async () => {
                    try {
                        await DatabaseManager.getInstance().clearHostUserTable();
                    }
                    catch (e) {
                        hilog.error(DOMAIN, TAG, `Failed to clear host user: ${e.message}`);
                    }
                    this.pageInfos.replacePath({ name: "LoginPage" }, false);
                }
            }
        });
    }
    /**
     * 克隆登录：切到克隆会话后清空旧课程列表再按克隆用户拉取，避免残留主用户课程
     */
    private async enterCloneSession(): Promise<void> {
        this.classList = null;
        await this.loadClassList();
        this.switchTab(0);
        promptAction.showToast({ message: `已克隆登录：${this.cloneSessionName}`, duration: 2000 });
    }
    /**
     * 退出克隆：清空克隆会话并恢复主用户课程列表
     */
    private async exitCloneSession(): Promise<void> {
        AppStorage.setOrCreate('cloneSessionCookies', '');
        AppStorage.setOrCreate('cloneSessionName', '');
        AppStorage.setOrCreate('cloneSessionPhone', '');
        this.classList = null;
        await this.loadClassList();
        promptAction.showToast({ message: '已退出克隆登录', duration: 2000 });
    }
    private async getHostUser(): Promise<UserDataAndId> {
        return await DatabaseManager.getInstance().getUserByPosition(1, true) as UserDataAndId;
    }
    private startScan(): void {
        let options: scanBarcode.ScanOptions = {
            scanTypes: [scanCore.ScanType.ALL], enableMultiMode: true, enableAlbum: true
        };
        try {
            if (canIUse("SystemCapability.Multimedia.Scan.ScanBarcode")) {
                scanBarcode.startScanForResult(this.getUIContext().getHostContext(), options)
                    .then(async (r: scanBarcode.ScanResult) => {
                    let msg = await loginFunction.LoginByURL(r.originalValue);
                    promptAction.showToast({ message: msg });
                    this.otherUserList = await DatabaseManager.getInstance().getAllUsers();
                }).catch((e: BusinessError) => { hilog.error(0x0001, 'Scan', `${e.code}`); });
            }
        }
        catch (e) {
            hilog.error(0x0001, 'Scan', 'Scan error');
        }
    }
    rerender() {
        this.updateDirtyElements();
    }
}
(function () {
    if (typeof NavigationBuilderRegister === "function") {
        NavigationBuilderRegister("HomePage", wrapBuilder(init));
    }
})();
