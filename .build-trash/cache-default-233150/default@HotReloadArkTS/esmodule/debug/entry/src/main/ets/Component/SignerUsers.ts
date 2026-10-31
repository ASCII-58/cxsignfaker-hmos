if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface userItem_Params {
    bgColor?: Resource;
    user?: userMenu;
    signIdArray?: number[];
}
interface Icon_Params {
    UserId?: number;
    ImageData?: image.PixelMap | null;
    isLoaded?: boolean;
}
import type image from "@ohos:multimedia.image";
import hilog from "@ohos:hilog";
import { DatabaseManager } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import { loginFunction } from "@normalized:N&&&entry/src/main/ets/utils/Login&";
const TAG = 'SignerUsers';
const DOMAIN = 0x0012;
/** 会话级头像缓存：userId → 头像。避免每次打开选择列表都重新走 DB + 网络下载 */
const avatarCache = new Map<number, image.PixelMap>();
/** 签到用户选择列表中的用户项 */
export interface userMenu {
    uname: string;
    id: number;
    SignPermission: number;
}
export class Icon extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__UserId = new SynchedPropertySimpleOneWayPU(params.UserId, this, "UserId");
        this.__ImageData = new ObservedPropertyObjectPU(null, this, "ImageData");
        this.__isLoaded = new ObservedPropertySimplePU(false, this, "isLoaded");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: Icon_Params) {
        if (params.ImageData !== undefined) {
            this.ImageData = params.ImageData;
        }
        if (params.isLoaded !== undefined) {
            this.isLoaded = params.isLoaded;
        }
    }
    updateStateVars(params: Icon_Params) {
        this.__UserId.reset(params.UserId);
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__UserId.purgeDependencyOnElmtId(rmElmtId);
        this.__ImageData.purgeDependencyOnElmtId(rmElmtId);
        this.__isLoaded.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__UserId.aboutToBeDeleted();
        this.__ImageData.aboutToBeDeleted();
        this.__isLoaded.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    updateRecycleElmtId(oldElmtId, newElmtId) {
        this.__UserId.updateElmtId(oldElmtId, newElmtId);
        this.__ImageData.updateElmtId(oldElmtId, newElmtId);
        this.__isLoaded.updateElmtId(oldElmtId, newElmtId);
    }
    private __UserId: SynchedPropertySimpleOneWayPU<number>;
    get UserId() {
        return this.__UserId.get();
    }
    set UserId(newValue: number) {
        this.__UserId.set(newValue);
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
            Stack.create();
            if (isInitialRender) {
                Stack.margin({ right: 12 });
                Stack.onAppear(async () => {
                    const cached = avatarCache.get(this.UserId);
                    if (cached) {
                        this.ImageData = cached;
                        this.isLoaded = true;
                        return;
                    }
                    try {
                        const userData = await DatabaseManager.getInstance().getUserById(this.UserId);
                        if (userData) {
                            const url = (await loginFunction.getUserInfo(userData.cookies)).pic;
                            const pic = await loginFunction.GetPic(url);
                            if (pic) {
                                this.ImageData = pic;
                                avatarCache.set(this.UserId, pic);
                                this.isLoaded = true;
                            }
                        }
                    }
                    catch (e) {
                        hilog.error(DOMAIN, TAG, `[Icon] Load failed for user ${this.UserId}: %{public}s`, (e as Error).message);
                    }
                });
            }
        }, Stack);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.ImageData) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Image.create(this.ImageData);
                        Image.border({ width: 1, color: { "id": 125831013, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } });
                        if (isInitialRender) {
                            Image.draggable(false);
                            Image.width(48);
                            Image.height(48);
                            Image.borderRadius(24);
                            Image.objectFit(ImageFit.Cover);
                        }
                    }, Image);
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 加载占位图
                        Circle.create({ width: 48, height: 48 });
                        // 加载占位图
                        Circle.fill({ "id": 125829156, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    }, Circle);
                });
            }
        }, If);
        If.pop();
        Stack.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
export class userItem extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__bgColor = new ObservedPropertyObjectPU({ "id": 125829555, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }, this, "bgColor");
        this.__user = new SynchedPropertyObjectOneWayPU(params.user, this, "user");
        this.__signIdArray = new SynchedPropertyObjectTwoWayPU(params.signIdArray, this, "signIdArray");
        this.setInitiallyProvidedValue(params);
        this.declareWatch("signIdArray", this.onSelectionChange);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: userItem_Params) {
        if (params.bgColor !== undefined) {
            this.bgColor = params.bgColor;
        }
    }
    updateStateVars(params: userItem_Params) {
        this.__user.reset(params.user);
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__bgColor.purgeDependencyOnElmtId(rmElmtId);
        this.__user.purgeDependencyOnElmtId(rmElmtId);
        this.__signIdArray.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__bgColor.aboutToBeDeleted();
        this.__user.aboutToBeDeleted();
        this.__signIdArray.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    updateRecycleElmtId(oldElmtId, newElmtId) {
        this.__bgColor.updateElmtId(oldElmtId, newElmtId);
        this.__user.updateElmtId(oldElmtId, newElmtId);
        this.__signIdArray.updateElmtId(oldElmtId, newElmtId);
    }
    private __bgColor: ObservedPropertyObjectPU<Resource>; // 默认卡片背景
    get bgColor() {
        return this.__bgColor.get();
    }
    set bgColor(newValue: Resource) {
        this.__bgColor.set(newValue);
    }
    private __user: SynchedPropertySimpleOneWayPU<userMenu>;
    get user() {
        return this.__user.get();
    }
    set user(newValue: userMenu) {
        this.__user.set(newValue);
    }
    private __signIdArray: SynchedPropertySimpleOneWayPU<number[]>;
    get signIdArray() {
        return this.__signIdArray.get();
    }
    set signIdArray(newValue: number[]) {
        this.__signIdArray.set(newValue);
    }
    onSelectionChange() {
        // 选中状态由 Checkbox 呈现，此处预留联动
    }
    private permissionText(): string {
        if (this.user.SignPermission === 1) {
            return '可签到';
        }
        if (this.user.SignPermission === 0) {
            return '已签到';
        }
        if (this.user.SignPermission === 2) {
            return '已截止';
        }
        return '无权限(可强制重签)';
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.backgroundColor(ObservedObject.GetRawObject(this.bgColor));
            if (isInitialRender) {
                Row.width('100%');
                Row.padding(12);
                Row.borderRadius(12);
                Row.margin({ bottom: 8 });
            }
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            __Recycle__.create();
        }, __Recycle__);
        {
            this.observeRecycleComponentCreation("Icon", (elmtId, isInitialRender, recycleNode = null) => {
                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                if (isInitialRender) {
                    let componentCall = recycleNode ? recycleNode : new Icon(this, { UserId: this.user.id }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/Component/SignerUsers.ets", line: 96, col: 7 });
                    ViewPU.createRecycle(componentCall, recycleNode !== null, "Icon", () => {
                        if (recycleNode && typeof recycleNode.aboutToReuseInternal === "function") {
                            recycleNode.aboutToReuseInternal();
                        }
                        else {
                            if (recycleNode.aboutToReuse && typeof recycleNode.aboutToReuse === "function") {
                                recycleNode.aboutToReuse({ UserId: this.user.id });
                            }
                            recycleNode.rerender();
                        }
                    });
                    let paramsLambda = () => {
                        return {
                            UserId: this.user.id
                        };
                    };
                    componentCall.paramsGenerator_ = paramsLambda;
                }
                else {
                    this.updateStateVarsOfChildByElmtId(elmtId, {
                        UserId: this.user.id
                    });
                }
                ViewStackProcessor.StopGetAccessRecording();
            });
        }
        __Recycle__.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            if (isInitialRender) {
                Column.alignItems(HorizontalAlign.Start);
                Column.layoutWeight(1);
            }
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.user.uname);
            Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                Text.fontSize(16);
                Text.fontWeight(FontWeight.Medium);
            }
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.permissionText());
            Text.fontColor(this.user.SignPermission === 1 ? { "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : { "id": 125829141, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                Text.fontSize(12);
                Text.margin({ top: 4 });
            }
        }, Text);
        Text.pop();
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 使用 Checkbox 代替纯背景色变化，交互更明确
            Checkbox.create();
            // 使用 Checkbox 代替纯背景色变化，交互更明确
            Checkbox.select(this.signIdArray.includes(this.user.id));
            // 使用 Checkbox 代替纯背景色变化，交互更明确
            Checkbox.selectedColor({ "id": 125829150, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                // 使用 Checkbox 代替纯背景色变化，交互更明确
                Checkbox.hitTestBehavior(HitTestMode.None);
            }
        }, Checkbox);
        // 使用 Checkbox 代替纯背景色变化，交互更明确
        Checkbox.pop();
        Row.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
