if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface SignPage_Params {
    canSign?: boolean;
    activityInfo?: null | ActivityInfo;
    commonQueryParams?: CommonSignParams;
    otherUser?: Array<userMenu>;
    signIdArray?: Array<number>;
    ifPhoto?: boolean;
    otherUserDialogIsShow?: boolean;
    objectidArr?: string[];
    DestinationLocationName?: string;
    hostCookies?: string;
    cloneSessionCookies?: string;
    signDetail?: SignDetailResult | null;
    faceRequired?: boolean;
    faceObjectIdArr?: string[];
    qrPosition?: QRCodePosition | null;
    captchaSheetShow?: boolean;
    captchaUser?: CaptchaUserParam | null;
    captchaSession?: number;
    locationPickerShow?: boolean;
    savedLocations?: SavedLocation[];
    gpsLocating?: boolean;
    captchaResolver?: ((validate: string | null) => void) | null;
    pendingSignCode?: string;
}
import { SignType } from "@normalized:N&&&entry/src/main/ets/pages/ActivityListPage&";
import type { ActivityInfo } from "@normalized:N&&&entry/src/main/ets/pages/ActivityListPage&";
import { parseSignResult, Sign } from "@normalized:N&&&entry/src/main/ets/utils/sign&";
import type { CommonSignParams, SignDetailResult, SignOutcome, UserQueryObject } from "@normalized:N&&&entry/src/main/ets/utils/sign&";
import { FaceApi } from "@normalized:N&&&entry/src/main/ets/utils/faceApi&";
import hilog from "@ohos:hilog";
import { DatabaseManager } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import type { SavedLocation, SignRecordData, UserDataAndId } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import { loginFunction } from "@normalized:N&&&entry/src/main/ets/utils/Login&";
import { ChaoxingUtils } from "@normalized:N&&&entry/src/main/ets/utils/utils&";
import { FunctionalButton } from "@hms:core.atomicserviceComponent.atomicserviceUi";
import { functionalButtonComponentManager } from "@hms:core.atomicserviceComponent.atomicserviceUi";
import type { BusinessError } from "@ohos:base";
import promptAction from "@ohos:promptAction";
import { GestureSignComponent } from "@normalized:N&&&entry/src/main/ets/Component/GestureSignComponent&";
import { PasswordSignComponent } from "@normalized:N&&&entry/src/main/ets/Component/PasswordSignComponent&";
import { userItem } from "@normalized:N&&&entry/src/main/ets/Component/SignerUsers&";
import type { userMenu } from "@normalized:N&&&entry/src/main/ets/Component/SignerUsers&";
import { QRCodeLocation } from "@normalized:N&&&entry/src/main/ets/Component/QRCodeLocationCard&";
import type { QRCodePosition } from "@normalized:N&&&entry/src/main/ets/Component/QRCodeLocationCard&";
import { photoPicker } from "@normalized:N&&&entry/src/main/ets/Component/PhotoPicker&";
import { facePicker } from "@normalized:N&&&entry/src/main/ets/Component/FacePicker&";
import { LightButton } from "@normalized:N&&&entry/src/main/ets/Component/LightButton&";
import scanBarcode from "@hms:core.scan.scanBarcode";
import scanCore from "@hms:core.scan.scanCore";
import UrlTools from "@normalized:N&&&entry/src/main/ets/utils/urlTools&";
import geoLocationManager from "@ohos:geoLocationManager";
import abilityAccessCtrl from "@ohos:abilityAccessCtrl";
import type common from "@ohos:app.ability.common";
import type { Permissions } from "@ohos:abilityAccessCtrl";
import { CaptchaComponent } from "@normalized:N&&&entry/src/main/ets/Component/Captcha&";
import type { CaptchaUserParam } from "@normalized:N&&&entry/src/main/ets/Component/Captcha&";
import { LeaderboardReporter } from "@normalized:N&&&entry/src/main/ets/utils/LeaderboardReporter&";
const TAG = 'SignerPage';
const DOMAIN = 0x0008;
/** 导航入口 Builder */
export function initSignInfo(name: string, activityInfo: ActivityInfo, parent = null) {
    {
        (parent ? parent : this).observeComponentCreation2((elmtId, isInitialRender) => {
            if (isInitialRender) {
                let componentCall = new SignPage(parent ? parent : this, { activityInfo: activityInfo }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/SignerPage.ets", line: 31, col: 3 });
                ViewPU.create(componentCall);
                let paramsLambda = () => {
                    return {
                        activityInfo: activityInfo
                    };
                };
                componentCall.paramsGenerator_ = paramsLambda;
            }
            else {
                (parent ? parent : this).updateStateVarsOfChildByElmtId(elmtId, {});
            }
        }, { name: "SignPage" });
    }
}
export class SignPage extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__canSign = new ObservedPropertySimplePU(true, this, "canSign");
        this.__activityInfo = new ObservedPropertyObjectPU(null, this, "activityInfo");
        this.__commonQueryParams = new ObservedPropertyObjectPU({
            activeId: '',
            latitude: '',
            longitude: '',
            address: '',
            enc: ''
        }, this, "commonQueryParams");
        this.__otherUser = new ObservedPropertyObjectPU([], this, "otherUser");
        this.__signIdArray = new ObservedPropertyObjectPU([], this, "signIdArray");
        this.__ifPhoto = new ObservedPropertySimplePU(false, this, "ifPhoto");
        this.__otherUserDialogIsShow = new ObservedPropertySimplePU(false, this, "otherUserDialogIsShow");
        this.__objectidArr = new ObservedPropertyObjectPU([], this, "objectidArr");
        this.__DestinationLocationName = new ObservedPropertySimplePU('获取中...' // 初始状态
        , this, "DestinationLocationName");
        this.__hostCookies = new ObservedPropertySimplePU('', this, "hostCookies");
        this.__cloneSessionCookies = this.createStorageProp('cloneSessionCookies', '', "cloneSessionCookies");
        this.__signDetail = new ObservedPropertyObjectPU(null, this, "signDetail");
        this.__faceRequired = new ObservedPropertySimplePU(false, this, "faceRequired");
        this.__faceObjectIdArr = new ObservedPropertyObjectPU([], this, "faceObjectIdArr");
        this.__qrPosition = new ObservedPropertyObjectPU(null, this, "qrPosition");
        this.__captchaSheetShow = new ObservedPropertySimplePU(false, this, "captchaSheetShow");
        this.__captchaUser = new ObservedPropertyObjectPU(null
        /** 验证码弹层会话号：每次 requestCaptcha 自增；弹层已开时原地换内容，不关闭重开 */
        , this, "captchaUser");
        this.__captchaSession = new ObservedPropertySimplePU(0, this, "captchaSession");
        this.__locationPickerShow = new ObservedPropertySimplePU(false, this, "locationPickerShow");
        this.__savedLocations = new ObservedPropertyObjectPU([], this, "savedLocations");
        this.__gpsLocating = new ObservedPropertySimplePU(false, this, "gpsLocating");
        this.captchaResolver = null;
        this.__pendingSignCode = new ObservedPropertySimplePU('', this, "pendingSignCode");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: SignPage_Params) {
        if (params.canSign !== undefined) {
            this.canSign = params.canSign;
        }
        if (params.activityInfo !== undefined) {
            this.activityInfo = params.activityInfo;
        }
        if (params.commonQueryParams !== undefined) {
            this.commonQueryParams = params.commonQueryParams;
        }
        if (params.otherUser !== undefined) {
            this.otherUser = params.otherUser;
        }
        if (params.signIdArray !== undefined) {
            this.signIdArray = params.signIdArray;
        }
        if (params.ifPhoto !== undefined) {
            this.ifPhoto = params.ifPhoto;
        }
        if (params.otherUserDialogIsShow !== undefined) {
            this.otherUserDialogIsShow = params.otherUserDialogIsShow;
        }
        if (params.objectidArr !== undefined) {
            this.objectidArr = params.objectidArr;
        }
        if (params.DestinationLocationName !== undefined) {
            this.DestinationLocationName = params.DestinationLocationName;
        }
        if (params.hostCookies !== undefined) {
            this.hostCookies = params.hostCookies;
        }
        if (params.signDetail !== undefined) {
            this.signDetail = params.signDetail;
        }
        if (params.faceRequired !== undefined) {
            this.faceRequired = params.faceRequired;
        }
        if (params.faceObjectIdArr !== undefined) {
            this.faceObjectIdArr = params.faceObjectIdArr;
        }
        if (params.qrPosition !== undefined) {
            this.qrPosition = params.qrPosition;
        }
        if (params.captchaSheetShow !== undefined) {
            this.captchaSheetShow = params.captchaSheetShow;
        }
        if (params.captchaUser !== undefined) {
            this.captchaUser = params.captchaUser;
        }
        if (params.captchaSession !== undefined) {
            this.captchaSession = params.captchaSession;
        }
        if (params.locationPickerShow !== undefined) {
            this.locationPickerShow = params.locationPickerShow;
        }
        if (params.savedLocations !== undefined) {
            this.savedLocations = params.savedLocations;
        }
        if (params.gpsLocating !== undefined) {
            this.gpsLocating = params.gpsLocating;
        }
        if (params.captchaResolver !== undefined) {
            this.captchaResolver = params.captchaResolver;
        }
        if (params.pendingSignCode !== undefined) {
            this.pendingSignCode = params.pendingSignCode;
        }
    }
    updateStateVars(params: SignPage_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__canSign.purgeDependencyOnElmtId(rmElmtId);
        this.__activityInfo.purgeDependencyOnElmtId(rmElmtId);
        this.__commonQueryParams.purgeDependencyOnElmtId(rmElmtId);
        this.__otherUser.purgeDependencyOnElmtId(rmElmtId);
        this.__signIdArray.purgeDependencyOnElmtId(rmElmtId);
        this.__ifPhoto.purgeDependencyOnElmtId(rmElmtId);
        this.__otherUserDialogIsShow.purgeDependencyOnElmtId(rmElmtId);
        this.__objectidArr.purgeDependencyOnElmtId(rmElmtId);
        this.__DestinationLocationName.purgeDependencyOnElmtId(rmElmtId);
        this.__hostCookies.purgeDependencyOnElmtId(rmElmtId);
        this.__cloneSessionCookies.purgeDependencyOnElmtId(rmElmtId);
        this.__signDetail.purgeDependencyOnElmtId(rmElmtId);
        this.__faceRequired.purgeDependencyOnElmtId(rmElmtId);
        this.__faceObjectIdArr.purgeDependencyOnElmtId(rmElmtId);
        this.__qrPosition.purgeDependencyOnElmtId(rmElmtId);
        this.__captchaSheetShow.purgeDependencyOnElmtId(rmElmtId);
        this.__captchaUser.purgeDependencyOnElmtId(rmElmtId);
        this.__captchaSession.purgeDependencyOnElmtId(rmElmtId);
        this.__locationPickerShow.purgeDependencyOnElmtId(rmElmtId);
        this.__savedLocations.purgeDependencyOnElmtId(rmElmtId);
        this.__gpsLocating.purgeDependencyOnElmtId(rmElmtId);
        this.__pendingSignCode.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__canSign.aboutToBeDeleted();
        this.__activityInfo.aboutToBeDeleted();
        this.__commonQueryParams.aboutToBeDeleted();
        this.__otherUser.aboutToBeDeleted();
        this.__signIdArray.aboutToBeDeleted();
        this.__ifPhoto.aboutToBeDeleted();
        this.__otherUserDialogIsShow.aboutToBeDeleted();
        this.__objectidArr.aboutToBeDeleted();
        this.__DestinationLocationName.aboutToBeDeleted();
        this.__hostCookies.aboutToBeDeleted();
        this.__cloneSessionCookies.aboutToBeDeleted();
        this.__signDetail.aboutToBeDeleted();
        this.__faceRequired.aboutToBeDeleted();
        this.__faceObjectIdArr.aboutToBeDeleted();
        this.__qrPosition.aboutToBeDeleted();
        this.__captchaSheetShow.aboutToBeDeleted();
        this.__captchaUser.aboutToBeDeleted();
        this.__captchaSession.aboutToBeDeleted();
        this.__locationPickerShow.aboutToBeDeleted();
        this.__savedLocations.aboutToBeDeleted();
        this.__gpsLocating.aboutToBeDeleted();
        this.__pendingSignCode.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __canSign: ObservedPropertySimplePU<boolean>;
    get canSign() {
        return this.__canSign.get();
    }
    set canSign(newValue: boolean) {
        this.__canSign.set(newValue);
    }
    private __activityInfo: ObservedPropertyObjectPU<null | ActivityInfo>;
    get activityInfo() {
        return this.__activityInfo.get();
    }
    set activityInfo(newValue: null | ActivityInfo) {
        this.__activityInfo.set(newValue);
    }
    private __commonQueryParams: ObservedPropertyObjectPU<CommonSignParams>;
    get commonQueryParams() {
        return this.__commonQueryParams.get();
    }
    set commonQueryParams(newValue: CommonSignParams) {
        this.__commonQueryParams.set(newValue);
    }
    private __otherUser: ObservedPropertyObjectPU<Array<userMenu>>;
    get otherUser() {
        return this.__otherUser.get();
    }
    set otherUser(newValue: Array<userMenu>) {
        this.__otherUser.set(newValue);
    }
    private __signIdArray: ObservedPropertyObjectPU<Array<number>>;
    get signIdArray() {
        return this.__signIdArray.get();
    }
    set signIdArray(newValue: Array<number>) {
        this.__signIdArray.set(newValue);
    }
    private __ifPhoto: ObservedPropertySimplePU<boolean>;
    get ifPhoto() {
        return this.__ifPhoto.get();
    }
    set ifPhoto(newValue: boolean) {
        this.__ifPhoto.set(newValue);
    }
    private __otherUserDialogIsShow: ObservedPropertySimplePU<boolean>;
    get otherUserDialogIsShow() {
        return this.__otherUserDialogIsShow.get();
    }
    set otherUserDialogIsShow(newValue: boolean) {
        this.__otherUserDialogIsShow.set(newValue);
    }
    private __objectidArr: ObservedPropertyObjectPU<string[]>;
    get objectidArr() {
        return this.__objectidArr.get();
    }
    set objectidArr(newValue: string[]) {
        this.__objectidArr.set(newValue);
    }
    private __DestinationLocationName: ObservedPropertySimplePU<string>; // 初始状态
    get DestinationLocationName() {
        return this.__DestinationLocationName.get();
    }
    set DestinationLocationName(newValue: string) {
        this.__DestinationLocationName.set(newValue);
    }
    private __hostCookies: ObservedPropertySimplePU<string>;
    get hostCookies() {
        return this.__hostCookies.get();
    }
    set hostCookies(newValue: string) {
        this.__hostCookies.set(newValue);
    }
    private __cloneSessionCookies: ObservedPropertyAbstractPU<string>;
    get cloneSessionCookies() {
        return this.__cloneSessionCookies.get();
    }
    set cloneSessionCookies(newValue: string) {
        this.__cloneSessionCookies.set(newValue);
    }
    private __signDetail: ObservedPropertyObjectPU<SignDetailResult | null>;
    get signDetail() {
        return this.__signDetail.get();
    }
    set signDetail(newValue: SignDetailResult | null) {
        this.__signDetail.set(newValue);
    }
    private __faceRequired: ObservedPropertySimplePU<boolean>;
    get faceRequired() {
        return this.__faceRequired.get();
    }
    set faceRequired(newValue: boolean) {
        this.__faceRequired.set(newValue);
    }
    private __faceObjectIdArr: ObservedPropertyObjectPU<string[]>;
    get faceObjectIdArr() {
        return this.__faceObjectIdArr.get();
    }
    set faceObjectIdArr(newValue: string[]) {
        this.__faceObjectIdArr.set(newValue);
    }
    private __qrPosition: ObservedPropertyObjectPU<QRCodePosition | null>;
    get qrPosition() {
        return this.__qrPosition.get();
    }
    set qrPosition(newValue: QRCodePosition | null) {
        this.__qrPosition.set(newValue);
    }
    private __captchaSheetShow: ObservedPropertySimplePU<boolean>;
    get captchaSheetShow() {
        return this.__captchaSheetShow.get();
    }
    set captchaSheetShow(newValue: boolean) {
        this.__captchaSheetShow.set(newValue);
    }
    private __captchaUser: ObservedPropertyObjectPU<CaptchaUserParam | null>;
    get captchaUser() {
        return this.__captchaUser.get();
    }
    set captchaUser(newValue: CaptchaUserParam | null) {
        this.__captchaUser.set(newValue);
    }
    /** 验证码弹层会话号：每次 requestCaptcha 自增；弹层已开时原地换内容，不关闭重开 */
    private __captchaSession: ObservedPropertySimplePU<number>;
    get captchaSession() {
        return this.__captchaSession.get();
    }
    set captchaSession(newValue: number) {
        this.__captchaSession.set(newValue);
    }
    private __locationPickerShow: ObservedPropertySimplePU<boolean>;
    get locationPickerShow() {
        return this.__locationPickerShow.get();
    }
    set locationPickerShow(newValue: boolean) {
        this.__locationPickerShow.set(newValue);
    }
    private __savedLocations: ObservedPropertyObjectPU<SavedLocation[]>;
    get savedLocations() {
        return this.__savedLocations.get();
    }
    set savedLocations(newValue: SavedLocation[]) {
        this.__savedLocations.set(newValue);
    }
    private __gpsLocating: ObservedPropertySimplePU<boolean>;
    get gpsLocating() {
        return this.__gpsLocating.get();
    }
    set gpsLocating(newValue: boolean) {
        this.__gpsLocating.set(newValue);
    }
    private captchaResolver: ((validate: string | null) => void) | null;
    // 手势/签到码组件校验通过后回传的码
    private __pendingSignCode: ObservedPropertySimplePU<string>;
    get pendingSignCode() {
        return this.__pendingSignCode.get();
    }
    set pendingSignCode(newValue: string) {
        this.__pendingSignCode.set(newValue);
    }
    otherUserMenu(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            List.create();
            List.width('100%');
            List.height('100%');
            List.padding(16);
        }, List);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            ForEach.create();
            const forEachItemGenFunction = _item => {
                const user = _item;
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
                        ListItem.onClick(() => {
                            if (user.SignPermission === -1) {
                                // 无权限用户支持强制重签：已选中则直接取消，未选中需确认后跳过预检加入
                                if (this.signIdArray.includes(user.id)) {
                                    this.signIdArray = this.signIdArray.filter(num => num !== user.id);
                                    return;
                                }
                                AlertDialog.show({
                                    title: '强制重签',
                                    message: `${user.uname} 无签到权限（可能不在该班级），将跳过预检直接尝试签到，可能失败，是否继续？`,
                                    primaryButton: {
                                        value: '取消',
                                        action: () => {
                                        }
                                    },
                                    secondaryButton: {
                                        value: '强制重签',
                                        action: () => {
                                            this.signIdArray.push(user.id);
                                        }
                                    }
                                });
                                return;
                            }
                            if (user.SignPermission === 2) {
                                promptAction.showToast({ message: '该签到对此用户已截止', duration: 1500 });
                                return;
                            }
                            if (this.signIdArray.includes(user.id)) {
                                this.signIdArray = this.signIdArray.filter(num => num !== user.id);
                            }
                            else {
                                this.signIdArray.push(user.id);
                            }
                        });
                    };
                    const deepRenderFunction = (elmtId, isInitialRender) => {
                        itemCreation(elmtId, isInitialRender);
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            __Recycle__.create();
                        }, __Recycle__);
                        {
                            this.observeRecycleComponentCreation("userItem", (elmtId, isInitialRender, recycleNode = null) => {
                                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                                if (isInitialRender) {
                                    let componentCall = recycleNode ? recycleNode : new userItem(this, { user: user, signIdArray: this.__signIdArray }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/SignerPage.ets", line: 77, col: 11 });
                                    ViewPU.createRecycle(componentCall, recycleNode !== null, "userItem", () => {
                                        if (recycleNode && typeof recycleNode.aboutToReuseInternal === "function") {
                                            recycleNode.aboutToReuseInternal();
                                        }
                                        else {
                                            if (recycleNode.aboutToReuse && typeof recycleNode.aboutToReuse === "function") {
                                                recycleNode.aboutToReuse({ user: user, signIdArray: this.signIdArray });
                                            }
                                            recycleNode.rerender();
                                        }
                                    });
                                    let paramsLambda = () => {
                                        return {
                                            user: user,
                                            signIdArray: this.signIdArray
                                        };
                                    };
                                    componentCall.paramsGenerator_ = paramsLambda;
                                }
                                else {
                                    this.updateStateVarsOfChildByElmtId(elmtId, {
                                        user: user
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
            this.forEachUpdateFunction(elmtId, this.otherUser, forEachItemGenFunction);
        }, ForEach);
        ForEach.pop();
        List.pop();
    }
    SavedLocationPickerBuilder(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.padding(16);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.savedLocations.length === 0) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.width('100%');
                        Column.margin({ top: 60, bottom: 60 });
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('暂无收藏位置');
                        Text.fontSize(16);
                        Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('可在「用户中心 → 管理收藏的位置」中添加');
                        Text.fontSize(13);
                        Text.fontColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.margin({ top: 8 });
                    }, Text);
                    Text.pop();
                    Column.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        List.create({ space: 8 });
                        List.width('100%');
                        List.height('100%');
                        List.scrollBar(BarState.Off);
                    }, List);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        ForEach.create();
                        const forEachItemGenFunction = _item => {
                            const loc = _item;
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
                                    ListItem.onClick(() => {
                                        this.applySavedLocation(loc);
                                    });
                                };
                                const deepRenderFunction = (elmtId, isInitialRender) => {
                                    itemCreation(elmtId, isInitialRender);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Column.create();
                                        Column.alignItems(HorizontalAlign.Start);
                                        Column.width('100%');
                                        Column.padding(12);
                                        Column.backgroundColor({ "id": 125829555, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                        Column.borderRadius(12);
                                    }, Column);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(loc.note !== '' ? loc.note : loc.address);
                                        Text.fontSize(16);
                                        Text.fontWeight(FontWeight.Medium);
                                        Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                        Text.maxLines(1);
                                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                    }, Text);
                                    Text.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(loc.address);
                                        Text.fontSize(12);
                                        Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                        Text.maxLines(2);
                                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                        Text.margin({ top: 3 });
                                    }, Text);
                                    Text.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(`经度 ${ChaoxingUtils.parseStoredCoord(loc.longitude).toFixed(6)}  纬度 ${ChaoxingUtils.parseStoredCoord(loc.latitude).toFixed(6)}`);
                                        Text.fontSize(11);
                                        Text.fontColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                        Text.margin({ top: 3 });
                                    }, Text);
                                    Text.pop();
                                    Column.pop();
                                    ListItem.pop();
                                };
                                this.observeComponentCreation2(itemCreation2, ListItem);
                                ListItem.pop();
                            }
                        };
                        this.forEachUpdateFunction(elmtId, this.savedLocations, forEachItemGenFunction, (loc: SavedLocation) => loc.id.toString(), false, false);
                    }, ForEach);
                    ForEach.pop();
                    List.pop();
                });
            }
        }, If);
        If.pop();
        Column.pop();
    }
    /** 打开收藏位置选择 sheet（每次打开前重新加载，保证数据最新） */
    private async openSavedLocationPicker() {
        try {
            this.savedLocations = await DatabaseManager.getInstance().getAllSavedLocations();
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Failed to load saved locations: ${e.message}`);
        }
        this.locationPickerShow = true;
    }
    /** 应用收藏位置：库里按 ×1e6 整数存 BD-09 坐标，转回小数赋给签到参数 */
    private applySavedLocation(loc: SavedLocation) {
        this.commonQueryParams.address = loc.address;
        this.commonQueryParams.longitude = ChaoxingUtils.parseStoredCoord(loc.longitude).toString();
        this.commonQueryParams.latitude = ChaoxingUtils.parseStoredCoord(loc.latitude).toString();
        this.locationPickerShow = false;
        promptAction.showToast({ message: `已选择：${loc.note !== '' ? loc.note : loc.address}`, duration: 1500 });
    }
    private getLocationContext(): common.UIAbilityContext {
        return this.getUIContext().getHostContext() as common.UIAbilityContext;
    }
    /** 请求前台定位权限（APPROXIMATELY_LOCATION 为 API 9+ 前台定位的必要权限） */
    private async ensureLocationPermission(): Promise<boolean> {
        try {
            const atManager = abilityAccessCtrl.createAtManager();
            const permissions: Array<Permissions> = ['ohos.permission.APPROXIMATELY_LOCATION', 'ohos.permission.LOCATION'];
            const result = await atManager.requestPermissionsFromUser(this.getLocationContext(), permissions);
            return result.authResults.every((r: number) => r === 0);
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Request location permission failed: ${e.message}`);
            return false;
        }
    }
    /** 使用当前位置：WGS-84 → GCJ-02 → BD-09，与地图选点保持同一坐标系链路 */
    private async useCurrentLocation() {
        const granted = await this.ensureLocationPermission();
        if (!granted) {
            promptAction.showToast({ message: '未获得定位权限，请在系统设置中开启', duration: 1500 });
            return;
        }
        this.gpsLocating = true;
        try {
            const location = await geoLocationManager.getCurrentLocation();
            hilog.info(DOMAIN, TAG, `GPS raw(wgs84): lat=${location.latitude} lon=${location.longitude}`);
            const gcj = ChaoxingUtils.wgs84_to_gcj02(location.latitude, location.longitude);
            const bd = ChaoxingUtils.gcj02_to_bd09(gcj.lat, gcj.lon);
            let address = '我的位置';
            try {
                const addresses = await geoLocationManager.getAddressesFromLocation({
                    latitude: location.latitude,
                    longitude: location.longitude,
                    maxItems: 1
                });
                if (addresses.length > 0) {
                    const geo = addresses[0];
                    if (geo.placeName) {
                        address = geo.placeName;
                    }
                    else if (geo.descriptions && geo.descriptions.length > 0) {
                        address = geo.descriptions[0];
                    }
                }
            }
            catch (e) {
                hilog.error(DOMAIN, TAG, `Reverse geocode failed: ${e.message}`);
            }
            this.commonQueryParams.address = address;
            this.commonQueryParams.longitude = bd.lon.toString();
            this.commonQueryParams.latitude = bd.lat.toString();
            promptAction.showToast({ message: '已使用当前位置', duration: 1500 });
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `GetCurrentLocation failed: ${e.message}`);
            promptAction.showToast({ message: '定位失败，请重试或使用地图选点', duration: 1500 });
        }
        finally {
            this.gpsLocating = false;
        }
    }
    UserSelectionCard(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.padding(14);
            Column.width('100%');
            Column.backgroundColor({ "id": 125829555, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Column.borderRadius(14);
            Column.margin({ left: 16, right: 16, bottom: 12 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.margin({ bottom: 10 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('签到用户');
            Text.fontSize(16);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.layoutWeight(1);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('选择用户');
            Button.fontSize(13);
            Button.height(32);
            Button.borderRadius(16);
            Button.backgroundColor({ "id": 125829510, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.onClick(() => {
                this.otherUserDialogIsShow = true;
            });
            Button.bindSheet({ value: this.otherUserDialogIsShow, changeEvent: newValue => { this.otherUserDialogIsShow = newValue; } }, { builder: this.otherUserMenu.bind(this) }, {
                title: { title: { "id": 16777229, "type": 10003, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } },
                backgroundColor: { "id": 125829507, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" },
                detents: [SheetSize.MEDIUM, SheetSize.LARGE]
            });
        }, Button);
        Button.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.signIdArray.length === 0) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('请选择至少一个用户进行签到');
                        Text.fontSize(14);
                        Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.padding({ top: 8, bottom: 4 });
                    }, Text);
                    Text.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Flex.create({ direction: FlexDirection.Row, wrap: FlexWrap.Wrap });
                    }, Flex);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        ForEach.create();
                        const forEachItemGenFunction = _item => {
                            const user = _item;
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Row.create();
                                Row.padding({
                                    left: 10,
                                    right: 10,
                                    top: 5,
                                    bottom: 5
                                });
                                Row.backgroundColor({ "id": 125829135, "type": 10001, params: [0.1], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                Row.borderRadius(14);
                                Row.margin({ right: 8, bottom: 6 });
                                Row.onClick(() => {
                                    this.signIdArray = this.signIdArray.filter(num => num !== user.id);
                                });
                            }, Row);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create(user.uname);
                                Text.fontSize(13);
                                Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            }, Text);
                            Text.pop();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Image.create({ "id": 125830852, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                Image.draggable(false);
                                Image.width(14);
                                Image.height(14);
                                Image.fillColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                Image.margin({ left: 4 });
                            }, Image);
                            Row.pop();
                        };
                        this.forEachUpdateFunction(elmtId, this.otherUser.filter(u => this.signIdArray.includes(u.id)), forEachItemGenFunction);
                    }, ForEach);
                    ForEach.pop();
                    Flex.pop();
                });
            }
        }, If);
        If.pop();
        Column.pop();
    }
    LocationCard(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.padding(14);
            Column.width('100%');
            Column.backgroundColor({ "id": 125829555, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Column.borderRadius(14);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.margin({ bottom: 10 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('要求位置');
            Text.fontSize(14);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.width('100%');
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.padding(12);
            Row.backgroundColor({ "id": 125829555, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Row.borderRadius(10);
            Row.border({ width: 1, color: { "id": 125831013, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } });
            Row.onClick(() => {
                if (this.DestinationLocationName !== '获取中...' && this.DestinationLocationName !== '该签到无要求位置') {
                    ChaoxingUtils.copyText(this.DestinationLocationName);
                }
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.DestinationLocationName);
            Text.layoutWeight(1);
            Text.fontSize(16);
            Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.maxLines(3);
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.commonQueryParams.address) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.alignItems(HorizontalAlign.Start);
                        Column.width('100%');
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(`已选: ${this.commonQueryParams.address}`);
                        Text.fontSize(13);
                        Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.margin({ top: 10 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create({ space: 12 });
                        Row.margin({ top: 4 });
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(`经度 ${this.commonQueryParams.longitude.substring(0, 10)}`);
                        Text.fontSize(11);
                        Text.fontColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(`纬度 ${this.commonQueryParams.latitude.substring(0, 10)}`);
                        Text.fontSize(11);
                        Text.fontColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    }, Text);
                    Text.pop();
                    Row.pop();
                    Column.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('请点击下方按钮选择位置');
                        Text.fontSize(13);
                        Text.fontColor({ "id": 125829141, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.margin({ top: 12, bottom: 6 });
                        Text.width('100%');
                    }, Text);
                    Text.pop();
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.margin({ top: 12 });
        }, Column);
        {
            this.observeComponentCreation2((elmtId, isInitialRender) => {
                if (isInitialRender) {
                    let componentCall = new FunctionalButton(this, {
                        params: {
                            openType: functionalButtonComponentManager.OpenType.CHOOSE_LOCATION,
                            label: '打开地图选点',
                            styleOption: {
                                bgColor: functionalButtonComponentManager.ColorType.DEFAULT,
                                size: functionalButtonComponentManager.SizeType.DEFAULT,
                                plain: false,
                                disabled: false,
                                loading: false,
                                hoverClass: functionalButtonComponentManager.HoverClassType.HOVER_CLASS,
                                hoverStartTime: 0,
                                hoverStayTime: 0,
                                styleConfig: new functionalButtonComponentManager.ButtonConfig().fontSize(15)
                            },
                        },
                        controller: new functionalButtonComponentManager.FunctionalButtonController()
                            .onChooseLocation((err, data) => {
                            if (err) {
                                hilog.error(0x0000, "Sign", "Location Error: %{public}s", err.message);
                                return;
                            }
                            const LoginLocation = ChaoxingUtils.gcj02_to_bd09(data.latitude, data.longitude);
                            hilog.info(DOMAIN, TAG, `PickedLocation raw(gcj02): lat=${data.latitude} lon=${data.longitude} name=${data.name}`);
                            hilog.info(DOMAIN, TAG, `PickedLocation bd09: lat=${LoginLocation.lat} lon=${LoginLocation.lon}`);
                            this.commonQueryParams.address = data.name as string;
                            this.commonQueryParams.longitude = LoginLocation.lon.toString();
                            this.commonQueryParams.latitude = LoginLocation.lat.toString();
                        })
                    }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/SignerPage.ets", line: 373, col: 9 });
                    ViewPU.create(componentCall);
                    let paramsLambda = () => {
                        return {
                            params: {
                                openType: functionalButtonComponentManager.OpenType.CHOOSE_LOCATION,
                                label: '打开地图选点',
                                styleOption: {
                                    bgColor: functionalButtonComponentManager.ColorType.DEFAULT,
                                    size: functionalButtonComponentManager.SizeType.DEFAULT,
                                    plain: false,
                                    disabled: false,
                                    loading: false,
                                    hoverClass: functionalButtonComponentManager.HoverClassType.HOVER_CLASS,
                                    hoverStartTime: 0,
                                    hoverStayTime: 0,
                                    styleConfig: new functionalButtonComponentManager.ButtonConfig().fontSize(15)
                                },
                            },
                            controller: new functionalButtonComponentManager.FunctionalButtonController()
                                .onChooseLocation((err, data) => {
                                if (err) {
                                    hilog.error(0x0000, "Sign", "Location Error: %{public}s", err.message);
                                    return;
                                }
                                const LoginLocation = ChaoxingUtils.gcj02_to_bd09(data.latitude, data.longitude);
                                hilog.info(DOMAIN, TAG, `PickedLocation raw(gcj02): lat=${data.latitude} lon=${data.longitude} name=${data.name}`);
                                hilog.info(DOMAIN, TAG, `PickedLocation bd09: lat=${LoginLocation.lat} lon=${LoginLocation.lon}`);
                                this.commonQueryParams.address = data.name as string;
                                this.commonQueryParams.longitude = LoginLocation.lon.toString();
                                this.commonQueryParams.latitude = LoginLocation.lat.toString();
                            })
                        };
                    };
                    componentCall.paramsGenerator_ = paramsLambda;
                }
                else {
                    this.updateStateVarsOfChildByElmtId(elmtId, {
                        params: {
                            openType: functionalButtonComponentManager.OpenType.CHOOSE_LOCATION,
                            label: '打开地图选点',
                            styleOption: {
                                bgColor: functionalButtonComponentManager.ColorType.DEFAULT,
                                size: functionalButtonComponentManager.SizeType.DEFAULT,
                                plain: false,
                                disabled: false,
                                loading: false,
                                hoverClass: functionalButtonComponentManager.HoverClassType.HOVER_CLASS,
                                hoverStartTime: 0,
                                hoverStayTime: 0,
                                styleConfig: new functionalButtonComponentManager.ButtonConfig().fontSize(15)
                            },
                        }
                    });
                }
            }, { name: "FunctionalButton" });
        }
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 12 });
            Row.width('100%');
            Row.margin({ top: 8 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 签到未指定要求位置时，提供一键 GPS 定位
            if (this.DestinationLocationName === '该签到无要求位置') {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel(this.gpsLocating ? '定位中...' : '使用当前位置');
                        Button.layoutWeight(1);
                        Button.fontSize(13);
                        Button.height(36);
                        Button.borderRadius(18);
                        Button.backgroundColor({ "id": 125829510, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Button.fontColor({ "id": 16777235, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Button.enabled(!this.gpsLocating);
                        Button.onClick(() => {
                            this.useCurrentLocation();
                        });
                    }, Button);
                    Button.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('使用收藏位置');
            Button.layoutWeight(1);
            Button.fontSize(13);
            Button.height(36);
            Button.borderRadius(18);
            Button.backgroundColor({ "id": 125829510, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.onClick(() => {
                this.openSavedLocationPicker();
            });
            Button.bindSheet({ value: this.locationPickerShow, changeEvent: newValue => { this.locationPickerShow = newValue; } }, { builder: this.SavedLocationPickerBuilder.bind(this) }, {
                title: { title: '选择收藏位置' },
                backgroundColor: { "id": 125829507, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" },
                detents: [SheetSize.MEDIUM, SheetSize.LARGE]
            });
        }, Button);
        Button.pop();
        Row.pop();
        Column.pop();
    }
    QRCodeCard(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            __Recycle__.create();
        }, __Recycle__);
        {
            this.observeRecycleComponentCreation("QRCodeLocation", (elmtId, isInitialRender, recycleNode = null) => {
                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                if (isInitialRender) {
                    let componentCall = recycleNode ? recycleNode : new QRCodeLocation(this, {
                        ActivityId: this.activityInfo?.ActivityId.toString() || '',
                        positionRequired: this.signDetail?.ifopenAddress === 1,
                        onPositionChange: (position: QRCodePosition) => {
                            this.qrPosition = position;
                        }
                    }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/SignerPage.ets", line: 451, col: 5 });
                    ViewPU.createRecycle(componentCall, recycleNode !== null, "QRCodeLocation", () => {
                        if (recycleNode && typeof recycleNode.aboutToReuseInternal === "function") {
                            recycleNode.aboutToReuseInternal();
                        }
                        else {
                            if (recycleNode.aboutToReuse && typeof recycleNode.aboutToReuse === "function") {
                                recycleNode.aboutToReuse({ ActivityId: this.activityInfo?.ActivityId.toString() || '',
                                    positionRequired: this.signDetail?.ifopenAddress === 1,
                                    onPositionChange: (position: QRCodePosition) => {
                                        this.qrPosition = position;
                                    } });
                            }
                            recycleNode.rerender();
                        }
                    });
                    let paramsLambda = () => {
                        return {
                            ActivityId: this.activityInfo?.ActivityId.toString() || '',
                            positionRequired: this.signDetail?.ifopenAddress === 1,
                            onPositionChange: (position: QRCodePosition) => {
                                this.qrPosition = position;
                            }
                        };
                    };
                    componentCall.paramsGenerator_ = paramsLambda;
                }
                else {
                    this.updateStateVarsOfChildByElmtId(elmtId, {
                        ActivityId: this.activityInfo?.ActivityId.toString() || '',
                        positionRequired: this.signDetail?.ifopenAddress === 1
                    });
                }
                ViewStackProcessor.StopGetAccessRecording();
            });
        }
        __Recycle__.pop();
    }
    GestureSignCard(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.hostCookies) {
                this.ifElseBranchUpdateFunction(0, () => {
                    {
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            if (isInitialRender) {
                                let componentCall = new GestureSignComponent(this, {
                                    activityId: this.activityInfo?.ActivityId || '',
                                    hostCookies: this.hostCookies,
                                    onSignCode: (code: string) => {
                                        this.pendingSignCode = code;
                                    }
                                }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/SignerPage.ets", line: 464, col: 9 });
                                ViewPU.create(componentCall);
                                let paramsLambda = () => {
                                    return {
                                        activityId: this.activityInfo?.ActivityId || '',
                                        hostCookies: this.hostCookies,
                                        onSignCode: (code: string) => {
                                            this.pendingSignCode = code;
                                        }
                                    };
                                };
                                componentCall.paramsGenerator_ = paramsLambda;
                            }
                            else {
                                this.updateStateVarsOfChildByElmtId(elmtId, {
                                    activityId: this.activityInfo?.ActivityId || '',
                                    hostCookies: this.hostCookies
                                });
                            }
                        }, { name: "GestureSignComponent" });
                    }
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('加载用户信息中...');
                        Text.fontSize(14);
                        Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.margin(20);
                    }, Text);
                    Text.pop();
                });
            }
        }, If);
        If.pop();
        Column.pop();
    }
    PasswordSignCard(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.hostCookies) {
                this.ifElseBranchUpdateFunction(0, () => {
                    {
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            if (isInitialRender) {
                                let componentCall = new PasswordSignComponent(this, {
                                    activityId: this.activityInfo?.ActivityId || '',
                                    hostCookies: this.hostCookies,
                                    onSignCode: (code: string) => {
                                        this.pendingSignCode = code;
                                    }
                                }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/SignerPage.ets", line: 485, col: 9 });
                                ViewPU.create(componentCall);
                                let paramsLambda = () => {
                                    return {
                                        activityId: this.activityInfo?.ActivityId || '',
                                        hostCookies: this.hostCookies,
                                        onSignCode: (code: string) => {
                                            this.pendingSignCode = code;
                                        }
                                    };
                                };
                                componentCall.paramsGenerator_ = paramsLambda;
                            }
                            else {
                                this.updateStateVarsOfChildByElmtId(elmtId, {
                                    activityId: this.activityInfo?.ActivityId || '',
                                    hostCookies: this.hostCookies
                                });
                            }
                        }, { name: "PasswordSignComponent" });
                    }
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('加载用户信息中...');
                        Text.fontSize(14);
                        Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.margin(20);
                    }, Text);
                    Text.pop();
                });
            }
        }, If);
        If.pop();
        Column.pop();
    }
    CaptchaSheetBuilder(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.captchaUser) {
                this.ifElseBranchUpdateFunction(0, () => {
                    {
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            if (isInitialRender) {
                                let componentCall = new CaptchaComponent(this, {
                                    captchaUser: this.captchaUser,
                                    captchaSession: this.captchaSession,
                                    onValidated: (validate: string) => {
                                        // 弹层跨用户复用：不关闭，原地等待下一位需要验证码的用户刷新内容
                                        this.captchaResolver?.(validate);
                                        this.captchaResolver = null;
                                    },
                                    onSkip: () => {
                                        this.captchaResolver?.(null);
                                        this.captchaResolver = null;
                                    }
                                }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/SignerPage.ets", line: 505, col: 7 });
                                ViewPU.create(componentCall);
                                let paramsLambda = () => {
                                    return {
                                        captchaUser: this.captchaUser,
                                        captchaSession: this.captchaSession,
                                        onValidated: (validate: string) => {
                                            // 弹层跨用户复用：不关闭，原地等待下一位需要验证码的用户刷新内容
                                            this.captchaResolver?.(validate);
                                            this.captchaResolver = null;
                                        },
                                        onSkip: () => {
                                            this.captchaResolver?.(null);
                                            this.captchaResolver = null;
                                        }
                                    };
                                };
                                componentCall.paramsGenerator_ = paramsLambda;
                            }
                            else {
                                this.updateStateVarsOfChildByElmtId(elmtId, {
                                    captchaSession: this.captchaSession
                                });
                            }
                        }, { name: "CaptchaComponent" });
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
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            NavDestination.create(() => {
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    if (this.activityInfo) {
                        this.ifElseBranchUpdateFunction(0, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Column.create();
                                Column.height('100%');
                                Column.backgroundColor({ "id": 125829132, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                Column.bindSheet({ value: this.captchaSheetShow, changeEvent: newValue => { this.captchaSheetShow = newValue; } }, { builder: this.CaptchaSheetBuilder.bind(this) }, {
                                    title: { title: '签到验证码' },
                                    backgroundColor: { "id": 125829507, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" },
                                    detents: [SheetSize.MEDIUM, SheetSize.LARGE],
                                    onWillDismiss: (dismissAction: DismissSheetAction) => {
                                        // 用户点 ✕/蒙层/下拉关闭弹层时视为跳过该用户,否则 captchaResolver 永不回调,签到流程会挂起
                                        this.captchaResolver?.(null);
                                        this.captchaResolver = null;
                                        dismissAction.dismiss();
                                    }
                                });
                            }, Column);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Column.create();
                                Column.width('100%');
                                Column.layoutWeight(1);
                            }, Column);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Row.create();
                                Row.width('100%');
                            }, Row);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create('签到详情');
                                Text.fontSize(24);
                                Text.fontWeight(FontWeight.Bold);
                                Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                Text.padding({ left: 16, top: 20, bottom: 16 });
                            }, Text);
                            Text.pop();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Blank.create();
                            }, Blank);
                            Blank.pop();
                            Row.pop();
                            this.UserSelectionCard.bind(this)();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                If.create();
                                // 人脸校验由服务端 openCheckFaceFlag 决定，与签到类型正交：
                                // 手势/签到码 + 人脸组合也必须在此准备，否则会被 prepareHint 的人脸检查永久阻断
                                if (this.faceRequired) {
                                    this.ifElseBranchUpdateFunction(0, () => {
                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                            Column.create();
                                            Column.margin({ left: 16, right: 16, bottom: 12 });
                                        }, Column);
                                        {
                                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                if (isInitialRender) {
                                                    let componentCall = new facePicker(this, {
                                                        signIdArray: this.__signIdArray,
                                                        faceObjectIdArr: this.__faceObjectIdArr,
                                                        otherUserDialogIsShow: this.__otherUserDialogIsShow,
                                                        otherUser: this.otherUser
                                                    }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/SignerPage.ets", line: 541, col: 17 });
                                                    ViewPU.create(componentCall);
                                                    let paramsLambda = () => {
                                                        return {
                                                            signIdArray: this.signIdArray,
                                                            faceObjectIdArr: this.faceObjectIdArr,
                                                            otherUserDialogIsShow: this.otherUserDialogIsShow,
                                                            otherUser: this.otherUser
                                                        };
                                                    };
                                                    componentCall.paramsGenerator_ = paramsLambda;
                                                }
                                                else {
                                                    this.updateStateVarsOfChildByElmtId(elmtId, {
                                                        otherUser: this.otherUser
                                                    });
                                                }
                                            }, { name: "facePicker" });
                                        }
                                        Column.pop();
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
                                if (this.activityInfo?.signType === SignType.NORMAL) {
                                    this.ifElseBranchUpdateFunction(0, () => {
                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                            If.create();
                                            if (this.ifPhoto) {
                                                this.ifElseBranchUpdateFunction(0, () => {
                                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                        __Common__.create();
                                                        __Common__.margin({ left: 16, right: 16 });
                                                    }, __Common__);
                                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                        __Recycle__.create();
                                                    }, __Recycle__);
                                                    {
                                                        this.observeRecycleComponentCreation("photoPicker", (elmtId, isInitialRender, recycleNode = null) => {
                                                            ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                                                            if (isInitialRender) {
                                                                let componentCall = recycleNode ? recycleNode : new photoPicker(this, {
                                                                    signIdArray: this.__signIdArray,
                                                                    objectidArray: this.__objectidArr,
                                                                    otherUserDialogIsShow: this.__otherUserDialogIsShow,
                                                                    otherUser: this.otherUser
                                                                }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/SignerPage.ets", line: 553, col: 17 });
                                                                ViewPU.createRecycle(componentCall, recycleNode !== null, "photoPicker", () => {
                                                                    if (recycleNode && typeof recycleNode.aboutToReuseInternal === "function") {
                                                                        recycleNode.aboutToReuseInternal();
                                                                    }
                                                                    else {
                                                                        if (recycleNode.aboutToReuse && typeof recycleNode.aboutToReuse === "function") {
                                                                            recycleNode.aboutToReuse({ signIdArray: this.signIdArray,
                                                                                objectidArray: this.objectidArr,
                                                                                otherUserDialogIsShow: this.otherUserDialogIsShow,
                                                                                otherUser: this.otherUser });
                                                                        }
                                                                        recycleNode.rerender();
                                                                    }
                                                                });
                                                                let paramsLambda = () => {
                                                                    return {
                                                                        signIdArray: this.signIdArray,
                                                                        objectidArray: this.objectidArr,
                                                                        otherUserDialogIsShow: this.otherUserDialogIsShow,
                                                                        otherUser: this.otherUser
                                                                    };
                                                                };
                                                                componentCall.paramsGenerator_ = paramsLambda;
                                                            }
                                                            else {
                                                                this.updateStateVarsOfChildByElmtId(elmtId, {
                                                                    otherUser: this.otherUser
                                                                });
                                                            }
                                                            ViewStackProcessor.StopGetAccessRecording();
                                                        });
                                                    }
                                                    __Common__.pop();
                                                    __Recycle__.pop();
                                                });
                                            }
                                            else {
                                                this.ifElseBranchUpdateFunction(1, () => {
                                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                        Column.create();
                                                        Column.alignItems(HorizontalAlign.Start);
                                                        Column.padding({ top: 12, left: 16 });
                                                    }, Column);
                                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                        Text.create('点击下方按钮直接签到');
                                                        Text.fontSize(16);
                                                        Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                                    }, Text);
                                                    Text.pop();
                                                    Column.pop();
                                                });
                                            }
                                        }, If);
                                        If.pop();
                                    });
                                }
                                else if (this.activityInfo?.signType === SignType.LOCATION) {
                                    this.ifElseBranchUpdateFunction(1, () => {
                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                            Column.create();
                                            Column.margin({ left: 16, right: 16 });
                                        }, Column);
                                        this.LocationCard.bind(this)();
                                        Column.pop();
                                    });
                                }
                                else if (this.activityInfo?.signType === SignType.GESTURE) {
                                    this.ifElseBranchUpdateFunction(2, () => {
                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                            Column.create();
                                            Column.margin({ left: 16, right: 16 });
                                        }, Column);
                                        this.GestureSignCard.bind(this)();
                                        Column.pop();
                                    });
                                }
                                else if (this.activityInfo.signType === SignType.QRCODE) {
                                    this.ifElseBranchUpdateFunction(3, () => {
                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                            Column.create();
                                            Column.margin({ left: 16, right: 16 });
                                        }, Column);
                                        this.QRCodeCard.bind(this)();
                                        Column.pop();
                                    });
                                }
                                else if (this.activityInfo.signType === SignType.PASSWORD) {
                                    this.ifElseBranchUpdateFunction(4, () => {
                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                            Column.create();
                                            Column.margin({ left: 16, right: 16 });
                                        }, Column);
                                        this.PasswordSignCard.bind(this)();
                                        Column.pop();
                                    });
                                }
                                else {
                                    this.ifElseBranchUpdateFunction(5, () => {
                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                            Text.create('未支持的签到类型');
                                            Text.fontColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                            Text.padding(32);
                                        }, Text);
                                        Text.pop();
                                    });
                                }
                            }, If);
                            If.pop();
                            Column.pop();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Column.create();
                                Column.width('100%');
                                Column.padding({ top: 8, bottom: 16 });
                                Column.backgroundColor({ "id": 125829129, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            }, Column);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                If.create();
                                if (this.prepareHint() !== '') {
                                    this.ifElseBranchUpdateFunction(0, () => {
                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                            Text.create(this.prepareHint());
                                            Text.fontSize(13);
                                            Text.fontColor({ "id": 16777263, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                            Text.margin({ bottom: 8 });
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
                                Row.create({ space: 12 });
                                Row.width('90%');
                            }, Row);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                If.create();
                                if (this.signOutAvailable()) {
                                    this.ifElseBranchUpdateFunction(0, () => {
                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                            __Common__.create();
                                            __Common__.layoutWeight(1);
                                        }, __Common__);
                                        {
                                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                if (isInitialRender) {
                                                    let componentCall = new LightButton(this, {
                                                        label: '签退',
                                                        btnEnabled: this.canSign,
                                                        bgColor: { "id": 16777263, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" },
                                                        btnFontSize: 18,
                                                        btnHeight: 48,
                                                        onButton: () => {
                                                            this.executeSignOutFlow();
                                                        }
                                                    }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/SignerPage.ets", line: 607, col: 17 });
                                                    ViewPU.create(componentCall);
                                                    let paramsLambda = () => {
                                                        return {
                                                            label: '签退',
                                                            btnEnabled: this.canSign,
                                                            bgColor: { "id": 16777263, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" },
                                                            btnFontSize: 18,
                                                            btnHeight: 48,
                                                            onButton: () => {
                                                                this.executeSignOutFlow();
                                                            }
                                                        };
                                                    };
                                                    componentCall.paramsGenerator_ = paramsLambda;
                                                }
                                                else {
                                                    this.updateStateVarsOfChildByElmtId(elmtId, {
                                                        label: '签退',
                                                        btnEnabled: this.canSign,
                                                        bgColor: { "id": 16777263, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" },
                                                        btnFontSize: 18,
                                                        btnHeight: 48
                                                    });
                                                }
                                            }, { name: "LightButton" });
                                        }
                                        __Common__.pop();
                                    });
                                }
                                else {
                                    this.ifElseBranchUpdateFunction(1, () => {
                                    });
                                }
                            }, If);
                            If.pop();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                __Common__.create();
                                __Common__.layoutWeight(1);
                            }, __Common__);
                            {
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    if (isInitialRender) {
                                        let componentCall = new LightButton(this, {
                                            label: '立即签到',
                                            btnEnabled: this.canSign && this.prepareHint() === '',
                                            bgColor: { "id": 16777235, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" },
                                            btnFontSize: 18,
                                            btnHeight: 48,
                                            onButton: () => {
                                                this.showSignConfirmDialog();
                                            }
                                        }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/SignerPage.ets", line: 619, col: 15 });
                                        ViewPU.create(componentCall);
                                        let paramsLambda = () => {
                                            return {
                                                label: '立即签到',
                                                btnEnabled: this.canSign && this.prepareHint() === '',
                                                bgColor: { "id": 16777235, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" },
                                                btnFontSize: 18,
                                                btnHeight: 48,
                                                onButton: () => {
                                                    this.showSignConfirmDialog();
                                                }
                                            };
                                        };
                                        componentCall.paramsGenerator_ = paramsLambda;
                                    }
                                    else {
                                        this.updateStateVarsOfChildByElmtId(elmtId, {
                                            label: '立即签到',
                                            btnEnabled: this.canSign && this.prepareHint() === '',
                                            bgColor: { "id": 16777235, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" },
                                            btnFontSize: 18,
                                            btnHeight: 48
                                        });
                                    }
                                }, { name: "LightButton" });
                            }
                            __Common__.pop();
                            Row.pop();
                            Column.pop();
                            Column.pop();
                        });
                    }
                    else {
                        this.ifElseBranchUpdateFunction(1, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Column.create();
                                Column.justifyContent(FlexAlign.Center);
                                Column.height('100%');
                            }, Column);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create('参数加载失败');
                                Text.fontColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            }, Text);
                            Text.pop();
                            Column.pop();
                        });
                    }
                }, If);
                If.pop();
            }, { moduleName: "entry", pagePath: "entry/src/main/ets/pages/SignerPage" });
            NavDestination.hideTitleBar(false);
            NavDestination.title('签到', {
                backgroundColor: { "id": 125829129, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }
            });
            NavDestination.onAppear(() => {
                this.initPageData(); // 统一数据初始化入口
            });
        }, NavDestination);
        NavDestination.pop();
    }
    // ---------------- 初始化 ----------------
    private async initPageData() {
        const dbManager = DatabaseManager.getInstance();
        // 获取当前用户信息
        const currentUser = await dbManager.getUserByPosition(1, true) as UserDataAndId;
        if (!this.activityInfo || !currentUser) {
            return;
        }
        // 克隆登录时活动属于克隆用户的课程：活动级请求（详情/位置/手势密码校验/enc）
        // 全部走克隆会话；逐用户签到仍用各自 cookies（hostCookies 由此承载会话 cookies）
        this.hostCookies = this.cloneSessionCookies !== ''
            ? this.cloneSessionCookies
            : currentUser.cookies;
        this.commonQueryParams.activeId = this.activityInfo.ActivityId;
        // 获取活动完整详情（验证码/人脸/拍照要求）
        try {
            this.signDetail = await Sign.GetActiveDetail(this.hostCookies, this.activityInfo.ActivityId);
            this.faceRequired = this.signDetail.openCheckFaceFlag === 1;
            this.ifPhoto = this.signDetail.ifphoto;
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Failed to load active detail: ${e.message}`);
            this.ifPhoto = false;
        }
        // 如果是位置签到，获取位置信息
        if (this.activityInfo.signType === SignType.LOCATION) {
            try {
                const locName = (await Sign.GetLocationSignInfo(this.hostCookies, this.activityInfo.ActivityId))['locationText'] as string;
                this.DestinationLocationName = locName ? locName : '该签到无要求位置';
            }
            catch (e) {
                this.DestinationLocationName = '位置信息获取失败';
            }
        }
        // 加载其他可签到用户
        this.loadOtherUsers(dbManager, this.activityInfo);
    }
    private async loadOtherUsers(dbManager: DatabaseManager, actInfo: ActivityInfo) {
        const newUserList: userMenu[] = [];
        const autoSelectIds: number[] = []; // 自动选择未签到的用户
        // Get user count first
        const userCount = await dbManager.getTableCount('OtherUser');
        // Load main user and other users in parallel
        const loadMainUserPromise = this.loadSingleUser(dbManager, actInfo, 0, true);
        // Create promises for all other users
        const otherUserPromises: Promise<userMenu | null>[] = [];
        for (let i = 1; i <= userCount; i++) {
            otherUserPromises.push(this.loadSingleUser(dbManager, actInfo, i, false));
        }
        // Execute all promises in parallel using allSettled for better error handling
        const results = await Promise.allSettled([
            loadMainUserPromise,
            ...otherUserPromises
        ]);
        // Process main user result
        const mainUserSettled = results[0];
        if (mainUserSettled.status === 'fulfilled' && mainUserSettled.value) {
            const mainUserResult = mainUserSettled.value;
            newUserList.push(mainUserResult);
            if (mainUserResult.SignPermission === 1) {
                autoSelectIds.push(mainUserResult.id);
            }
        }
        // Process other user results
        for (let i = 1; i < results.length; i++) {
            const userSettled = results[i];
            if (userSettled.status === 'fulfilled' && userSettled.value) {
                const userResult = userSettled.value;
                newUserList.push(userResult);
                if (userResult.SignPermission === 1) {
                    autoSelectIds.push(userResult.id);
                }
            }
        }
        this.otherUser = newUserList;
        // 默认选中所有未签到的用户
        this.signIdArray = autoSelectIds;
    }
    /**
     * 加载单个用户的可签到状态（0=主用户，N=OtherUser 第 N 条）
     */
    private async loadSingleUser(dbManager: DatabaseManager, actInfo: ActivityInfo, position: number, isHost: boolean): Promise<userMenu | null> {
        try {
            const userInfo = await dbManager.getUserById(position);
            if (!userInfo) {
                return null;
            }
            const loginInfo = await loginFunction.getUserInfo(userInfo.cookies);
            const permission = await Sign.PreSignIn(actInfo.ActivityId, actInfo.ClassId, actInfo.CourseId, loginInfo.puid ? parseInt(loginInfo.puid) : loginInfo.uid, userInfo.cookies, actInfo.ext);
            return {
                uname: isHost ? loginInfo.uname + ' (主用户)' : loginInfo.uname,
                id: isHost ? 0 : position,
                SignPermission: permission
            };
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Failed to load user at position ${position}`, e);
            return null;
        }
    }
    // ---------------- 签到/签退编排 ----------------
    /**
     * 就绪检查：返回就绪提示文案，空串表示可以签到
     */
    private prepareHint(): string {
        if (this.signIdArray.length === 0) {
            return '请先选择签到用户';
        }
        const selected = this.signIdArray.length;
        // ifphoto 仅属于拍照/普通签到(otherId=0)，其它类型忽略该标记（对齐上游）
        if (this.ifPhoto && this.activityInfo?.signType === SignType.NORMAL) {
            const uploaded = this.objectidArr.filter(id => id).length;
            if (uploaded < selected) {
                return `等待签到图片上传 (${uploaded}/${selected})`;
            }
        }
        if (this.faceRequired) {
            const faces = this.faceObjectIdArr.filter(id => id).length;
            if (faces < selected) {
                return `该签到需要人脸识别，请先为所选用户准备人脸照片 (${faces}/${selected})`;
            }
        }
        if (this.activityInfo?.signType === SignType.LOCATION && !this.commonQueryParams.latitude) {
            return '请先选择签到位置';
        }
        // 对齐上游：二维码签到 ifopenAddress==1 时必须选点后才能扫码
        if (this.activityInfo?.signType === SignType.QRCODE && this.signDetail?.ifopenAddress === 1 &&
            !this.qrPosition) {
            return '该签到要求位置，请先选点';
        }
        if (this.activityInfo?.signType === SignType.GESTURE && !this.pendingSignCode) {
            return '请先绘制并校验手势';
        }
        if (this.activityInfo?.signType === SignType.PASSWORD && !this.pendingSignCode) {
            return '请先输入并校验签到码';
        }
        return '';
    }
    private signOutAvailable(): boolean {
        return this.signDetail !== null && this.signDetail.signOutId > 0 &&
            this.signDetail.signOutPublishTimeStamp > 0;
    }
    /**
     * 构造本轮签到的基础公共参数（签到过程中不可变）
     */
    private buildBaseParams(signCode: string, enc: string): CommonSignParams {
        return {
            activeId: this.activityInfo?.ActivityId || '',
            latitude: this.commonQueryParams.latitude,
            longitude: this.commonQueryParams.longitude,
            address: this.commonQueryParams.address,
            enc: enc,
            signCode: signCode
        };
    }
    // 3. 逻辑方法：显示签到确认对话框
    private showSignConfirmDialog() {
        if (this.signIdArray.length === 0) {
            AlertDialog.show({
                title: '提示',
                message: '请先选择至少一个用户',
                confirm: {
                    value: '知道了',
                    action: () => {
                        this.otherUserDialogIsShow = true;
                    }
                }
            });
            return;
        }
        const selectedUsers = this.otherUser.filter(u => this.signIdArray.includes(u.id));
        const userNames = selectedUsers.map(u => u.uname).join('、');
        AlertDialog.show({
            title: '确认签到',
            message: `即将为以下用户签到：\n${userNames}\n\n是否继续？`,
            primaryButton: {
                value: '修改用户',
                action: () => {
                    this.otherUserDialogIsShow = true;
                }
            },
            secondaryButton: {
                value: '确认签到',
                action: () => {
                    this.handleSignAction();
                }
            }
        });
    }
    private async handleSignAction() {
        const hint = this.prepareHint();
        if (hint) {
            promptAction.showToast({ message: hint });
            return;
        }
        this.canSign = false;
        if (this.activityInfo?.signType === SignType.QRCODE) {
            // 二维码签到：对齐上游 lat/lng 固定 -1，自选位置以 location JSON 提交
            this.commonQueryParams.latitude = '-1';
            this.commonQueryParams.longitude = '-1';
            this.commonQueryParams.address = '';
            if (this.qrPosition) {
                const position = this.qrPosition;
                this.commonQueryParams.location =
                    `{"result":1,"latitude":"${position.latitude.toFixed(6)}","longitude":"${position.longitude.toFixed(6)}","address":"${position.address}","mockData":"{\\"strategy\\":0,\\"probability\\":-1}"}`;
            }
            else {
                this.commonQueryParams.location = '';
            }
            let options: scanBarcode.ScanOptions = {
                scanTypes: [scanCore.ScanType.ALL],
                enableMultiMode: true,
                enableAlbum: true
            };
            try {
                if (canIUse("SystemCapability.Multimedia.Scan.ScanBarcode")) {
                    scanBarcode.startScanForResult(this.getUIContext().getHostContext(), options)
                        .then(async (result: scanBarcode.ScanResult) => {
                        try {
                            const parse = UrlTools.parseUrlParams(result.originalValue);
                            if (!parse || !parse['enc']) {
                                promptAction.showToast({ message: '二维码格式错误' });
                                this.canSign = true;
                                return;
                            }
                            const enc = parse['enc'];
                            hilog.info(DOMAIN, TAG, `Scan successful, enc: ${enc}`);
                            // 扫码成功后，执行统一签到流程
                            await this.executeSignFlow('', enc);
                        }
                        catch (error) {
                            const errorMsg = error instanceof Error ? error.message : String(error);
                            hilog.error(DOMAIN, TAG, `Failed to process scan result: ${errorMsg}`);
                            promptAction.showToast({ message: '处理扫码结果失败' });
                            this.canSign = true;
                        }
                    })
                        .catch((error: BusinessError) => {
                        hilog.error(DOMAIN, TAG, `Failed to get ScanResult. Code:${error.code}, message: ${error.message}`);
                        promptAction.showToast({ message: '扫码失败或已取消' });
                        this.canSign = true;
                    });
                    // 扫码签到需要等待扫码结果，直接返回
                    return;
                }
                else {
                    promptAction.showToast({ message: '不支持扫码功能' });
                    this.canSign = true;
                    return;
                }
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                hilog.error(DOMAIN, TAG, `Failed to start the scanning service: ${errorMsg}`);
                promptAction.showToast({ message: '启动扫码失败' });
                this.canSign = true;
                return;
            }
        }
        // 非扫码签到：统一签到流程
        let encForSign = this.commonQueryParams.enc ?? '';
        if (this.activityInfo?.signType === SignType.LOCATION && !encForSign && this.hostCookies) {
            encForSign = await Sign.GetSignEnc(this.hostCookies, this.activityInfo?.ActivityId || '');
            hilog.info(DOMAIN, TAG, `Location sign enc: ${encForSign || '(empty)'}`);
        }
        await this.executeSignFlow(this.pendingSignCode, encForSign);
    }
    /**
     * 统一签到流程：所有签到类型共用同一条执行路径
     * 逐个用户签到（间隔 200ms，对齐上游），支持验证码与人脸，二维码过期中断剩余用户
     */
    private async executeSignFlow(signCode: string, enc: string): Promise<void> {
        const hashTable = new Map<string, string[]>();
        const baseParams = this.buildBaseParams(signCode, enc);
        // 快照勾选列表，避免签到过程中修改勾选导致错位
        const targetIds = this.signIdArray.slice();
        for (let i = 0; i < targetIds.length; i++) {
            try {
                const userInfo = await this.requireUser(targetIds[i]);
                const outcome = await this.signSingleUser(userInfo, this.objectidArr[i] || '', this.faceObjectIdArr[i] || '', baseParams, hashTable);
                if (outcome.kind === 'qrcodeExpired') {
                    promptAction.showToast({ message: '签到二维码已过期，请重新扫码', duration: 2000 });
                    break;
                }
            }
            catch (e) {
                hilog.error(DOMAIN, TAG, `User ${targetIds[i]} sign error`, e);
            }
            // 对齐上游代签用户间隔
            if (i < targetIds.length - 1) {
                await new Promise<void>((resolve) => setTimeout(resolve, Sign.NEXT_SIGN_INTERVAL_MS));
            }
        }
        // 验证码弹层整轮复用：流程结束统一关闭（先关弹层再弹结果对话框）
        this.captchaSheetShow = false;
        this.captchaResolver = null;
        this.showSignResult(hashTable);
        await this.refreshUserPermissions();
        this.canSign = true;
    }
    /**
     * 为单个用户执行签到（每个用户使用独立的参数对象，避免共享可变状态）
     */
    private async signSingleUser(userInfo: UserDataAndId, photoObjId: string, faceObjId: string, baseParams: CommonSignParams, map: Map<string, string[]>): Promise<SignOutcome> {
        const loginInfo = await loginFunction.getUserInfo(userInfo.cookies);
        const uidForSign = loginInfo.puid ? loginInfo.puid : userInfo.uid.toString();
        const params: CommonSignParams = {
            activeId: baseParams.activeId,
            latitude: baseParams.latitude,
            longitude: baseParams.longitude,
            address: baseParams.address,
            enc: baseParams.enc,
            signCode: baseParams.signCode
        };
        if (this.ifPhoto && photoObjId) {
            params.objectId = photoObjId;
        }
        // 人脸识别参数（对齐上游 addFaceRecognitionParameter）
        if (faceObjId) {
            params.courseId = this.activityInfo?.CourseId || '';
            params.currentFaceId = faceObjId;
            try {
                params.faceEnc = await FaceApi.CheckFaceResultAndGetEnc(userInfo.cookies, this.activityInfo?.ActivityId || '', faceObjId, loginInfo.clientId);
            }
            catch (e) {
                hilog.error(DOMAIN, TAG, `Get faceEnc failed: ${(e as Error).message}`);
                params.courseId = '';
                params.currentFaceId = '';
                params.faceEnc = '';
            }
        }
        const userQueryParams: UserQueryObject = {
            uid: uidForSign,
            name: loginInfo.uname,
            fid: loginInfo.fid.toString()
        };
        let raw = await Sign.DoSignInV2(userInfo.cookies, params, userQueryParams);
        let outcome = parseSignResult(raw);
        // 需要验证码：弹窗完成后带 validate 重新签到（对齐上游 signWithCaptcha）
        if (outcome.needCaptcha) {
            const validate = await this.requestCaptcha(userInfo.cookies, loginInfo.uname, uidForSign);
            if (validate) {
                raw = await Sign.DoSignInV2(userInfo.cookies, params, userQueryParams, validate);
                outcome = parseSignResult(raw);
            }
            else {
                outcome = { kind: 'error', message: '验证码校验被跳过', needCaptcha: false };
            }
        }
        this.recordOutcome(map, outcome, loginInfo.uname, 'sign', uidForSign);
        return outcome;
    }
    /**
     * 页面级签退：为所有勾选用户逐个签退
     */
    private async executeSignOutFlow() {
        if (this.signIdArray.length === 0) {
            promptAction.showToast({ message: '请选择至少一个用户' });
            return;
        }
        this.canSign = false;
        const hashTable = new Map<string, string[]>();
        const targetIds = this.signIdArray.slice();
        for (let i = 0; i < targetIds.length; i++) {
            const label = targetIds[i] === 0 ? '主用户' : `用户${targetIds[i]}`;
            try {
                const userInfo = await this.requireUser(targetIds[i]);
                const info = await Sign.GetSignInfo(userInfo.cookies, this.activityInfo?.ActivityId || '');
                if (info.signOutId <= 0) {
                    this.recordOutcome(hashTable, { kind: 'none', message: '该用户无可用签退', needCaptcha: false }, label, 'signout', userInfo.uid.toString());
                }
                else {
                    await Sign.DoSignOut(userInfo.cookies, info.signInId, info.signOutId);
                    this.recordOutcome(hashTable, { kind: 'success', message: '签退成功', needCaptcha: false }, label, 'signout', userInfo.uid.toString());
                }
            }
            catch (e) {
                hilog.error(DOMAIN, TAG, `User ${targetIds[i]} sign out error`, e);
                this.recordOutcome(hashTable, { kind: 'error', message: `签退失败: ${(e as Error).message}`, needCaptcha: false }, label, 'signout');
            }
            if (i < targetIds.length - 1) {
                await new Promise<void>((resolve) => setTimeout(resolve, Sign.NEXT_SIGN_INTERVAL_MS));
            }
        }
        this.showSignResult(hashTable);
        await this.refreshUserPermissions();
        this.canSign = true;
    }
    private async requireUser(userId: number): Promise<UserDataAndId> {
        const userInfo = await DatabaseManager.getInstance().getUserById(userId);
        if (!userInfo) {
            throw new Error(`用户 ${userId} 不存在`);
        }
        return userInfo;
    }
    /**
     * 弹出滑块验证码并等待用户完成校验
     * @returns validate 值；用户跳过返回 null
     */
    private requestCaptcha(userCookies: string, uname: string, uid: string): Promise<string | null> {
        this.captchaUser = {
            cookies: userCookies,
            uname: uname,
            refererParams: {
                courseId: this.activityInfo?.CourseId || '',
                classId: this.activityInfo?.ClassId || '',
                activePrimaryId: this.activityInfo?.ActivityId || '',
                uid: uid
            }
        };
        // 弹层已打开时自增会话号即原地换内容；仅首次才真正拉起弹层
        this.captchaSession++;
        this.captchaSheetShow = true;
        return new Promise<string | null>((resolve) => {
            this.captchaResolver = resolve;
        });
    }
    /**
     * 按用户名聚合同类签到结果（key = kind|message），并写入本地签到统计
     * @param action 'sign' = 签到 | 'signout' = 签退（统计记录的操作类型）
     */
    private recordOutcome(map: Map<string, string[]>, outcome: SignOutcome, uname: string, action: string = 'sign', uid: string = '') {
        const key = `${outcome.kind}|${outcome.message}`;
        if (map.has(key)) {
            map.get(key)!.push(uname);
        }
        else {
            map.set(key, [uname]);
        }
        this.logSignRecord(outcome, uname, action, uid);
    }
    /**
     * 签到统计落库 + 云端排行榜上报（均 fire-and-forget：失败不影响签到流程，仅记日志）
     */
    private logSignRecord(outcome: SignOutcome, uname: string, action: string, uid: string = '') {
        const record: SignRecordData = {
            uname: uname,
            activityId: this.activityInfo?.ActivityId || '',
            activityName: this.activityInfo?.ActivityName || '',
            signType: this.activityInfo?.signType || '',
            action: action,
            kind: outcome.kind,
            message: outcome.message
        };
        DatabaseManager.getInstance().insertSignRecord(record).catch((e: Error) => {
            hilog.error(DOMAIN, TAG, `Failed to log sign record: ${e.message}`);
        });
        LeaderboardReporter.report(record, uid);
    }
    /**
     * 签到/签退结束后刷新用户权限状态（已签到/可签到/无权限）
     */
    private async refreshUserPermissions() {
        if (!this.activityInfo) {
            return;
        }
        try {
            await this.loadOtherUsers(DatabaseManager.getInstance(), this.activityInfo);
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Refresh user permissions failed: ${(e as Error).message}`);
        }
    }
    private showSignResult(hashTable: Map<string, string[]>) {
        let message = '';
        hashTable.forEach((names, key) => {
            const separator = key.indexOf('|');
            const kind = separator >= 0 ? key.substring(0, separator) : 'error';
            const result = separator >= 0 ? key.substring(separator + 1) : key;
            const displayNames = names.filter(name => name).join(', ');
            if (kind === 'success') {
                message += displayNames ? `✅ ${result}: ${displayNames}\n` : `✅ ${result}\n`;
            }
            else if (kind === 'already') {
                message += displayNames ? `⚠️ ${result}: ${displayNames}\n` : `⚠️ ${result}\n`;
            }
            else {
                message += displayNames ? `❌ ${result}: ${displayNames}\n` : `❌ ${result}\n`;
            }
        });
        if (message === '') {
            message = '未进行任何签到操作';
        }
        AlertDialog.show({
            title: '签到结果',
            message: message,
            confirm: {
                value: '确定',
                action: () => {
                }
            }
        });
    }
    rerender() {
        this.updateDirtyElements();
    }
}
(function () {
    if (typeof NavigationBuilderRegister === "function") {
        NavigationBuilderRegister("SignerPage", wrapBuilder(initSignInfo));
    }
})();
