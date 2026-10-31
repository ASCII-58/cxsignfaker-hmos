if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface OtherUserItem_Params {
    userData?: UserDataAndId;
    index?: number;
    otherUserList?: UserDataAndId[];
    onCloneLogin?: () => void;
    userImage?: image.PixelMap | null;
    userName?: string;
    isLoaded?: boolean;
    shareDialogVisible?: boolean;
    iconPressed?: string;
    shareLoading?: boolean;
    dbManger?: DatabaseManager;
    uiContext?: UIContext;
    context?: Context;
}
import { DatabaseManager } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import type { UserDataAndId } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import type image from "@ohos:multimedia.image";
import { loginFunction } from "@normalized:N&&&entry/src/main/ets/utils/Login&";
import ShareUtils from "@normalized:N&&&entry/src/main/ets/utils/shareUtils&";
import systemShare from "@hms:collaboration.systemShare";
import utd from "@ohos:data.uniformTypeDescriptor";
import type common from "@ohos:app.ability.common";
import type { BusinessError } from "@ohos:base";
import type { UIContext } from "@ohos:arkui.UIContext";
import promptAction from "@ohos:promptAction";
const TAG = 'OtherUserItem';
const DOMAIN = 0x0009;
export class OtherUserItem extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__userData = new SynchedPropertyObjectOneWayPU(params.userData, this, "userData");
        this.__index = new SynchedPropertySimpleOneWayPU(params.index, this, "index");
        this.__otherUserList = new SynchedPropertyObjectTwoWayPU(params.otherUserList, this, "otherUserList");
        this.onCloneLogin = undefined;
        this.__userImage = new ObservedPropertyObjectPU(null, this, "userImage");
        this.__userName = new ObservedPropertySimplePU('', this, "userName");
        this.__isLoaded = new ObservedPropertySimplePU(false, this, "isLoaded");
        this.__shareDialogVisible = new ObservedPropertySimplePU(false, this, "shareDialogVisible");
        this.__iconPressed = new ObservedPropertySimplePU('', this, "iconPressed");
        this.__shareLoading = new ObservedPropertySimplePU(false, this, "shareLoading");
        this.dbManger = DatabaseManager.getInstance();
        this.uiContext = this.getUIContext();
        this.context = this.uiContext.getHostContext() as Context;
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: OtherUserItem_Params) {
        if (params.onCloneLogin !== undefined) {
            this.onCloneLogin = params.onCloneLogin;
        }
        if (params.userImage !== undefined) {
            this.userImage = params.userImage;
        }
        if (params.userName !== undefined) {
            this.userName = params.userName;
        }
        if (params.isLoaded !== undefined) {
            this.isLoaded = params.isLoaded;
        }
        if (params.shareDialogVisible !== undefined) {
            this.shareDialogVisible = params.shareDialogVisible;
        }
        if (params.iconPressed !== undefined) {
            this.iconPressed = params.iconPressed;
        }
        if (params.shareLoading !== undefined) {
            this.shareLoading = params.shareLoading;
        }
        if (params.dbManger !== undefined) {
            this.dbManger = params.dbManger;
        }
        if (params.uiContext !== undefined) {
            this.uiContext = params.uiContext;
        }
        if (params.context !== undefined) {
            this.context = params.context;
        }
    }
    updateStateVars(params: OtherUserItem_Params) {
        this.__userData.reset(params.userData);
        this.__index.reset(params.index);
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__userData.purgeDependencyOnElmtId(rmElmtId);
        this.__index.purgeDependencyOnElmtId(rmElmtId);
        this.__otherUserList.purgeDependencyOnElmtId(rmElmtId);
        this.__userImage.purgeDependencyOnElmtId(rmElmtId);
        this.__userName.purgeDependencyOnElmtId(rmElmtId);
        this.__isLoaded.purgeDependencyOnElmtId(rmElmtId);
        this.__shareDialogVisible.purgeDependencyOnElmtId(rmElmtId);
        this.__iconPressed.purgeDependencyOnElmtId(rmElmtId);
        this.__shareLoading.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__userData.aboutToBeDeleted();
        this.__index.aboutToBeDeleted();
        this.__otherUserList.aboutToBeDeleted();
        this.__userImage.aboutToBeDeleted();
        this.__userName.aboutToBeDeleted();
        this.__isLoaded.aboutToBeDeleted();
        this.__shareDialogVisible.aboutToBeDeleted();
        this.__iconPressed.aboutToBeDeleted();
        this.__shareLoading.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    updateRecycleElmtId(oldElmtId, newElmtId) {
        this.__userData.updateElmtId(oldElmtId, newElmtId);
        this.__index.updateElmtId(oldElmtId, newElmtId);
        this.__otherUserList.updateElmtId(oldElmtId, newElmtId);
        this.__userImage.updateElmtId(oldElmtId, newElmtId);
        this.__userName.updateElmtId(oldElmtId, newElmtId);
        this.__isLoaded.updateElmtId(oldElmtId, newElmtId);
        this.__shareDialogVisible.updateElmtId(oldElmtId, newElmtId);
        this.__iconPressed.updateElmtId(oldElmtId, newElmtId);
        this.__shareLoading.updateElmtId(oldElmtId, newElmtId);
    }
    private __userData: SynchedPropertySimpleOneWayPU<UserDataAndId>;
    get userData() {
        return this.__userData.get();
    }
    set userData(newValue: UserDataAndId) {
        this.__userData.set(newValue);
    }
    private __index: SynchedPropertySimpleOneWayPU<number>;
    get index() {
        return this.__index.get();
    }
    set index(newValue: number) {
        this.__index.set(newValue);
    }
    private __otherUserList: SynchedPropertySimpleOneWayPU<UserDataAndId[]>;
    get otherUserList() {
        return this.__otherUserList.get();
    }
    set otherUserList(newValue: UserDataAndId[]) {
        this.__otherUserList.set(newValue);
    }
    private onCloneLogin?: () => void;
    private __userImage: ObservedPropertyObjectPU<image.PixelMap | null>;
    get userImage() {
        return this.__userImage.get();
    }
    set userImage(newValue: image.PixelMap | null) {
        this.__userImage.set(newValue);
    }
    private __userName: ObservedPropertySimplePU<string>;
    get userName() {
        return this.__userName.get();
    }
    set userName(newValue: string) {
        this.__userName.set(newValue);
    }
    private __isLoaded: ObservedPropertySimplePU<boolean>;
    get isLoaded() {
        return this.__isLoaded.get();
    }
    set isLoaded(newValue: boolean) {
        this.__isLoaded.set(newValue);
    }
    private __shareDialogVisible: ObservedPropertySimplePU<boolean>;
    get shareDialogVisible() {
        return this.__shareDialogVisible.get();
    }
    set shareDialogVisible(newValue: boolean) {
        this.__shareDialogVisible.set(newValue);
    }
    private __iconPressed: ObservedPropertySimplePU<string>;
    get iconPressed() {
        return this.__iconPressed.get();
    }
    set iconPressed(newValue: string) {
        this.__iconPressed.set(newValue);
    }
    private __shareLoading: ObservedPropertySimplePU<boolean>;
    get shareLoading() {
        return this.__shareLoading.get();
    }
    set shareLoading(newValue: boolean) {
        this.__shareLoading.set(newValue);
    }
    private dbManger: DatabaseManager;
    private uiContext: UIContext;
    private context: Context;
    QRShareSheetContent(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.backgroundColor({ "id": 125829132, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                Column.width('100%');
                Column.height('100%');
                Column.borderRadius({ topLeft: 20, topRight: 20 });
            }
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('分享用户');
            if (isInitialRender) {
                Text.fontSize(24);
                Text.fontWeight(FontWeight.Bold);
                Text.width('100%');
                Text.textAlign(TextAlign.Start);
                Text.padding({ left: 20, bottom: 20 });
            }
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            if (isInitialRender) {
                Column.width('100%');
                Column.alignItems(HorizontalAlign.Center);
                Column.margin({ bottom: 40 });
            }
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                Column.padding(20);
                Column.borderRadius(16);
                Column.shadow({ radius: 12, color: '#00000010', offsetY: 4 });
            }
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            QRCode.create(this.getShareUrl());
            if (isInitialRender) {
                QRCode.width(200);
                QRCode.height(200);
            }
        }, QRCode);
        QRCode.pop();
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.userName);
            Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                Text.fontSize(20);
                Text.fontWeight(FontWeight.Medium);
                Text.margin({ top: 20 });
            }
        }, Text);
        Text.pop();
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel(this.shareLoading ? '准备中...' : '分享名片');
            Button.fontColor({ "id": 16777259, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.backgroundColor({ "id": 16777235, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.enabled(!this.shareLoading);
            if (isInitialRender) {
                Button.width('90%');
                Button.height(50);
                Button.borderRadius(25);
                Button.onClick(async () => {
                    this.shareLoading = true;
                    const shareStr = this.getShareUrl();
                    const shareUtils = new ShareUtils(this.context, shareStr);
                    const ok = await shareUtils.prepare();
                    if (ok) {
                        this.doShare(shareUtils.FileUri, shareStr);
                    }
                    else {
                        promptAction.showToast({ message: '生成分享图片失败' });
                    }
                    this.shareLoading = false;
                });
            }
        }, Button);
        Button.pop();
        Column.pop();
    }
    private getShareUrl(): string {
        return `http://cdn.aquamarine5.fun/?phone=${this.userData.phone}&pwd=${encodeURIComponent(this.userData.pwd)}&name=${encodeURIComponent(this.userName)}`;
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
    private showCloneDialog() {
        AlertDialog.show({
            title: '克隆登录',
            message: `将以「${this.userName || this.userData.phone}」的身份克隆登录，浏览其课程并代签。\n克隆会话仅本次运行有效，可随时退出。`,
            primaryButton: {
                value: '取消',
                action: () => { }
            },
            secondaryButton: {
                value: '克隆登录',
                action: () => {
                    AppStorage.setOrCreate('cloneSessionCookies', this.userData.cookies);
                    AppStorage.setOrCreate('cloneSessionName', this.userName || this.userData.phone);
                    AppStorage.setOrCreate('cloneSessionPhone', this.userData.phone);
                    if (this.onCloneLogin) {
                        this.onCloneLogin();
                    }
                }
            }
        });
    }
    private showDeleteDialog() {
        AlertDialog.show({
            title: '确认删除',
            message: `确认删除用户${this.userName}吗？\n`,
            primaryButton: {
                value: '取消',
                action: () => { }
            },
            secondaryButton: {
                value: '删除',
                action: () => {
                    this.dbManger.deleteUser(this.userData.id).then(result => {
                        if (result === 1) {
                            this.otherUserList.splice(this.index, 1);
                        }
                    });
                }
            }
        });
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Row.bindSheet({ value: this.shareDialogVisible, changeEvent: newValue => { this.shareDialogVisible = newValue; } }, { builder: this.QRShareSheetContent.bind(this) }, {
                height: 'auto', detents: [SheetSize.MEDIUM, SheetSize.LARGE],
                backgroundColor: { "id": 125829132, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }
            });
            if (isInitialRender) {
                Row.width('100%');
                Row.height(68);
                Row.padding({ left: 16, right: 16 });
                Row.onAppear(async () => {
                    if (!this.isLoaded) {
                        let userInfo = await loginFunction.getUserInfo(this.userData.cookies);
                        this.userName = userInfo.uname;
                        this.userImage = await loginFunction.GetPic(userInfo.pic);
                        this.isLoaded = true;
                    }
                });
            }
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create(this.userImage);
            Image.alt({ "id": 16777218, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                Image.draggable(false);
                Image.width(44);
                Image.height(44);
                Image.borderRadius(10);
            }
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            if (isInitialRender) {
                Column.layoutWeight(1);
                Column.alignItems(HorizontalAlign.Start);
                Column.margin({ left: 12 });
            }
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.userName);
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
            Text.create(this.userData.phone);
            Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                Text.fontSize(13);
            }
        }, Text);
        Text.pop();
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            globalThis.Context.animation({ duration: 150, curve: Curve.EaseInOut });
            Column.width(32);
            Column.height(32);
            Column.borderRadius(16);
            Column.justifyContent(FlexAlign.Center);
            Column.scale({ x: this.iconPressed === 'clone' ? 0.85 : 1, y: this.iconPressed === 'clone' ? 0.85 : 1 });
            globalThis.Context.animation(null);
            Column.onTouch((event: TouchEvent) => {
                this.iconPressed = event.type === TouchType.Down ? 'clone' : '';
            });
            Column.onClick(() => { this.showCloneDialog(); });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777291, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Image.fillColor({ "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                Image.draggable(false);
                Image.width(18);
                Image.height(18);
            }
        }, Image);
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            globalThis.Context.animation({ duration: 150, curve: Curve.EaseInOut });
            Column.width(32);
            Column.height(32);
            Column.borderRadius(16);
            Column.justifyContent(FlexAlign.Center);
            Column.scale({ x: this.iconPressed === 'share' ? 0.85 : 1, y: this.iconPressed === 'share' ? 0.85 : 1 });
            globalThis.Context.animation(null);
            Column.onTouch((event: TouchEvent) => {
                this.iconPressed = event.type === TouchType.Down ? 'share' : '';
            });
            Column.onClick(() => { this.shareDialogVisible = true; });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777295, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Image.fillColor({ "id": 16777248, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                Image.draggable(false);
                Image.width(18);
                Image.height(18);
            }
        }, Image);
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            globalThis.Context.animation({ duration: 150, curve: Curve.EaseInOut });
            Column.width(32);
            Column.height(32);
            Column.borderRadius(16);
            Column.justifyContent(FlexAlign.Center);
            Column.scale({ x: this.iconPressed === 'delete' ? 0.85 : 1, y: this.iconPressed === 'delete' ? 0.85 : 1 });
            globalThis.Context.animation(null);
            Column.onTouch((event: TouchEvent) => {
                this.iconPressed = event.type === TouchType.Down ? 'delete' : '';
            });
            Column.onClick(() => { this.showDeleteDialog(); });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777277, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Image.fillColor({ "id": 16777263, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                Image.draggable(false);
                Image.width(18);
                Image.height(18);
            }
        }, Image);
        Column.pop();
        Row.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
