if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface facePicker_Params {
    signIdArray?: Array<number>;
    faceObjectIdArr?: string[];
    otherUser?: Array<userMenu>;
    otherUserDialogIsShow?: boolean;
    statusText?: string;
    isPreparing?: boolean;
}
import type { userMenu } from './SignerUsers';
import hilog from "@ohos:hilog";
import { DatabaseManager } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import { loginFunction } from "@normalized:N&&&entry/src/main/ets/utils/Login&";
import { ChaoxingUtils } from "@normalized:N&&&entry/src/main/ets/utils/utils&";
import type { Context } from "@ohos:abilityAccessCtrl";
import promptAction from "@ohos:promptAction";
import picker from "@ohos:file.picker";
import JSON from "@ohos:util.json";
import { FaceApi, randomizeFaceImage } from "@normalized:N&&&entry/src/main/ets/utils/faceApi&";
import { uploadImageForObject } from "@normalized:N&&&entry/src/main/ets/utils/upload&";
const TAG = 'FacePicker';
const DOMAIN = 0x0014;
export class facePicker extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__signIdArray = new SynchedPropertyObjectTwoWayPU(params.signIdArray, this, "signIdArray");
        this.__faceObjectIdArr = new SynchedPropertyObjectTwoWayPU(params.faceObjectIdArr, this, "faceObjectIdArr");
        this.__otherUser = new SynchedPropertyObjectOneWayPU(params.otherUser, this, "otherUser");
        this.__otherUserDialogIsShow = new SynchedPropertySimpleTwoWayPU(params.otherUserDialogIsShow, this, "otherUserDialogIsShow");
        this.__statusText = new ObservedPropertySimplePU('', this, "statusText");
        this.__isPreparing = new ObservedPropertySimplePU(false, this, "isPreparing");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: facePicker_Params) {
        if (params.statusText !== undefined) {
            this.statusText = params.statusText;
        }
        if (params.isPreparing !== undefined) {
            this.isPreparing = params.isPreparing;
        }
    }
    updateStateVars(params: facePicker_Params) {
        this.__otherUser.reset(params.otherUser);
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__signIdArray.purgeDependencyOnElmtId(rmElmtId);
        this.__faceObjectIdArr.purgeDependencyOnElmtId(rmElmtId);
        this.__otherUser.purgeDependencyOnElmtId(rmElmtId);
        this.__otherUserDialogIsShow.purgeDependencyOnElmtId(rmElmtId);
        this.__statusText.purgeDependencyOnElmtId(rmElmtId);
        this.__isPreparing.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__signIdArray.aboutToBeDeleted();
        this.__faceObjectIdArr.aboutToBeDeleted();
        this.__otherUser.aboutToBeDeleted();
        this.__otherUserDialogIsShow.aboutToBeDeleted();
        this.__statusText.aboutToBeDeleted();
        this.__isPreparing.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __signIdArray: SynchedPropertySimpleOneWayPU<Array<number>>;
    get signIdArray() {
        return this.__signIdArray.get();
    }
    set signIdArray(newValue: Array<number>) {
        this.__signIdArray.set(newValue);
    }
    private __faceObjectIdArr: SynchedPropertySimpleOneWayPU<string[]>;
    get faceObjectIdArr() {
        return this.__faceObjectIdArr.get();
    }
    set faceObjectIdArr(newValue: string[]) {
        this.__faceObjectIdArr.set(newValue);
    }
    private __otherUser: SynchedPropertySimpleOneWayPU<Array<userMenu>>;
    get otherUser() {
        return this.__otherUser.get();
    }
    set otherUser(newValue: Array<userMenu>) {
        this.__otherUser.set(newValue);
    }
    private __otherUserDialogIsShow: SynchedPropertySimpleTwoWayPU<boolean>;
    get otherUserDialogIsShow() {
        return this.__otherUserDialogIsShow.get();
    }
    set otherUserDialogIsShow(newValue: boolean) {
        this.__otherUserDialogIsShow.set(newValue);
    }
    private __statusText: ObservedPropertySimplePU<string>;
    get statusText() {
        return this.__statusText.get();
    }
    set statusText(newValue: string) {
        this.__statusText.set(newValue);
    }
    private __isPreparing: ObservedPropertySimplePU<boolean>;
    get isPreparing() {
        return this.__isPreparing.get();
    }
    set isPreparing(newValue: boolean) {
        this.__isPreparing.set(newValue);
    }
    private resetFaceIds() {
        this.faceObjectIdArr = new Array(this.signIdArray.length).fill('');
    }
    private refreshStatusText(finished: number, total: number) {
        const okCount = this.faceObjectIdArr.filter(id => id).length;
        if (finished >= total && okCount === total) {
            this.statusText = `全部人脸照片准备完成 ✓ (${okCount}/${total})`;
        }
        else {
            this.statusText = `已获取 ${okCount}/${total} 张人脸照片`;
        }
    }
    private requireUsersSelected(): boolean {
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
            return false;
        }
        return true;
    }
    /** 自动获取每个用户的账号默认人脸（对齐上游 UseProfileImage 流程） */
    private async useProfileFaces() {
        if (!this.requireUsersSelected()) {
            return;
        }
        this.isPreparing = true;
        this.resetFaceIds();
        this.statusText = '正在获取默认人脸...';
        const context = this.getUIContext().getHostContext() as Context;
        const dbManager = DatabaseManager.getInstance();
        try {
            for (let index = 0; index < this.signIdArray.length; index++) {
                try {
                    const userInfo = await dbManager.getUserById(this.signIdArray[index]);
                    if (!userInfo) {
                        throw new Error('用户不存在');
                    }
                    const profileObjectId = await FaceApi.GetProfileFaceObjectId(userInfo.cookies);
                    const rawPath = context.cacheDir + '/' + ChaoxingUtils.generatePhotoName() + '_raw.jpg';
                    await FaceApi.DownloadFaceImage(profileObjectId, rawPath);
                    const processedPath = context.cacheDir + '/' + ChaoxingUtils.generatePhotoName() + '.jpg';
                    await randomizeFaceImage(rawPath, processedPath);
                    const puid = (await loginFunction.getUserInfo(userInfo.cookies)).puid;
                    // processedPath 已由 randomizeFaceImage 随机裁剪过，关闭上传层随机化避免二次裁剪影响人脸比对
                    this.faceObjectIdArr[index] = await uploadImageForObject(context, userInfo.cookies, puid, processedPath, undefined, false);
                }
                catch (e) {
                    hilog.error(DOMAIN, TAG, `Prepare profile face failed: ${(e as Error).message}`);
                    promptAction.showToast({ message: `用户 ${index + 1} 默认人脸获取失败`, duration: 2000 });
                }
                this.refreshStatusText(index + 1, this.signIdArray.length);
            }
        }
        finally {
            this.isPreparing = false;
        }
    }
    /** 从相册为人脸签到选择照片 */
    private async pickFaces() {
        if (!this.requireUsersSelected()) {
            return;
        }
        this.isPreparing = true;
        this.resetFaceIds();
        const context = this.getUIContext().getHostContext() as Context;
        const dbManager = DatabaseManager.getInstance();
        try {
            const photoSelectOptions = new picker.PhotoSelectOptions();
            photoSelectOptions.MIMEType = picker.PhotoViewMIMETypes.IMAGE_TYPE;
            photoSelectOptions.maxSelectNumber = this.signIdArray.length;
            const photoViewPicker = new picker.PhotoViewPicker();
            const res = await photoViewPicker.select(photoSelectOptions);
            const uriArr = res.photoUris;
            if (!uriArr || uriArr.length === 0) {
                this.statusText = '';
                return;
            }
            const total = this.signIdArray.length;
            this.statusText = `正在上传人脸照片 (0/${total})`;
            for (let index = 0; index < total; index++) {
                try {
                    const userInfo = await dbManager.getUserById(this.signIdArray[index]);
                    if (!userInfo) {
                        throw new Error('用户不存在');
                    }
                    const puid = (await loginFunction.getUserInfo(userInfo.cookies)).puid;
                    const objectId = await uploadImageForObject(context, userInfo.cookies, puid, uriArr[index % uriArr.length]);
                    this.faceObjectIdArr[index] = objectId;
                }
                catch (e) {
                    hilog.error(DOMAIN, TAG, `Upload face photo failed: ${(e as Error).message}`);
                    promptAction.showToast({ message: `用户 ${index + 1} 人脸照片上传失败`, duration: 2000 });
                }
                this.refreshStatusText(index + 1, total);
            }
        }
        catch (error) {
            hilog.error(DOMAIN, TAG, 'Face photo selection failed', JSON.stringify(error));
            this.statusText = '人脸照片选择失败';
        }
        finally {
            this.isPreparing = false;
        }
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.padding(16);
            Column.backgroundColor({ "id": 125829555, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Column.borderRadius(16);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 状态指示点
            Flex.create({ direction: FlexDirection.Row, wrap: FlexWrap.Wrap, justifyContent: FlexAlign.Center });
            // 状态指示点
            Flex.padding(10);
            // 状态指示点
            Flex.width('100%');
        }, Flex);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            ForEach.create();
            const forEachItemGenFunction = (_item, index: number) => {
                const signId = _item;
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Circle.create({ width: 8, height: 8 });
                    Circle.fill(this.faceObjectIdArr[index] ? { "id": 125829150, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : { "id": 125829141, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Circle.margin(4);
                }, Circle);
            };
            this.forEachUpdateFunction(elmtId, this.signIdArray, forEachItemGenFunction, undefined, true, false);
        }, ForEach);
        ForEach.pop();
        // 状态指示点
        Flex.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.statusText) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.statusText);
                        Text.fontSize(14);
                        Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.margin({ top: 8, bottom: 8 });
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
            Row.width('100%');
            Row.margin({ top: 12 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('自动获取默认人脸');
            Button.layoutWeight(1);
            Button.fontSize(14);
            Button.fontColor({ "id": 125829231, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.backgroundColor({ "id": 125829510, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.enabled(!this.isPreparing);
            Button.onClick(() => {
                this.useProfileFaces();
            });
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('从相册选择');
            Button.layoutWeight(1);
            Button.fontSize(14);
            Button.fontColor({ "id": 125829231, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.backgroundColor({ "id": 125829510, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.enabled(!this.isPreparing);
            Button.onClick(() => {
                this.pickFaces();
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
