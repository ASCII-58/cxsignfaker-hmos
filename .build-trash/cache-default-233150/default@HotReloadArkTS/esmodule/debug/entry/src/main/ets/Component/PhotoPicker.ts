if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface photoPicker_Params {
    signIdArray?: Array<number>;
    objectidArray?: string[];
    otherUserDialogIsShow?: boolean;
    otherUser?: Array<userMenu>;
    isUploading?: boolean;
    totalPercentValue?: number;
    doneCountValue?: number;
    states?: Map<number, UserUploadState>;
}
interface UserUploadRow_Params {
    state?: UserUploadState;
    uname?: string;
}
import { Icon } from "@normalized:N&&&entry/src/main/ets/Component/SignerUsers&";
import type { userMenu } from "@normalized:N&&&entry/src/main/ets/Component/SignerUsers&";
import hilog from "@ohos:hilog";
import { DatabaseManager } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import { loginFunction } from "@normalized:N&&&entry/src/main/ets/utils/Login&";
import type { Context } from "@ohos:abilityAccessCtrl";
import promptAction from "@ohos:promptAction";
import picker from "@ohos:file.picker";
import JSON from "@ohos:util.json";
import { uploadImageForObject } from "@normalized:N&&&entry/src/main/ets/utils/upload&";
const TAG = 'PhotoPicker';
const DOMAIN = 0x0013;
/** 单个用户的上传状态（@Observed 供行组件 @ObjectLink 原地刷新） */
@Observed
class UserUploadState {
    signId: number;
    percent: number = 0;
    done: boolean = false;
    failed: boolean = false;
    active: boolean = false; // 本轮上传中（用于行内进度条常显）
    constructor(signId: number) {
        this.signId = signId;
    }
}
class UserUploadRow extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__state = new SynchedPropertyNesedObjectPU(params.state, this, "state");
        this.__uname = new SynchedPropertySimpleOneWayPU(params.uname, this, "uname");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: UserUploadRow_Params) {
        this.__state.set(params.state);
        if (params.uname === undefined) {
            this.__uname.set('');
        }
    }
    updateStateVars(params: UserUploadRow_Params) {
        this.__state.set(params.state);
        this.__uname.reset(params.uname);
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__state.purgeDependencyOnElmtId(rmElmtId);
        this.__uname.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__state.aboutToBeDeleted();
        this.__uname.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __state: SynchedPropertyNesedObjectPU<UserUploadState>;
    get state() {
        return this.__state.get();
    }
    private __uname: SynchedPropertySimpleOneWayPU<string>;
    get uname() {
        return this.__uname.get();
    }
    set uname(newValue: string) {
        this.__uname.set(newValue);
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 10 });
            Row.width('100%');
            Row.padding(10);
            Row.backgroundColor({ "id": 16777283, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Row.borderRadius(12);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            __Recycle__.create();
        }, __Recycle__);
        {
            this.observeRecycleComponentCreation("Icon", (elmtId, isInitialRender, recycleNode = null) => {
                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                if (isInitialRender) {
                    let componentCall = recycleNode ? recycleNode : new Icon(this, { UserId: this.state.signId }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/Component/PhotoPicker.ets", line: 36, col: 7 });
                    ViewPU.createRecycle(componentCall, recycleNode !== null, "Icon", () => {
                        if (recycleNode && typeof recycleNode.aboutToReuseInternal === "function") {
                            recycleNode.aboutToReuseInternal();
                        }
                        else {
                            if (recycleNode.aboutToReuse && typeof recycleNode.aboutToReuse === "function") {
                                recycleNode.aboutToReuse({ UserId: this.state.signId });
                            }
                            recycleNode.rerender();
                        }
                    });
                    let paramsLambda = () => {
                        return {
                            UserId: this.state.signId
                        };
                    };
                    componentCall.paramsGenerator_ = paramsLambda;
                }
                else {
                    this.updateStateVarsOfChildByElmtId(elmtId, {
                        UserId: this.state.signId
                    });
                }
                ViewStackProcessor.StopGetAccessRecording();
            });
        }
        __Recycle__.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create({ space: 5 });
            Column.alignItems(HorizontalAlign.Start);
            Column.layoutWeight(1);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.uname);
            Text.fontSize(15);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.maxLines(1);
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.state.active && !this.state.failed && !this.state.done) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Progress.create({ value: this.state.percent, total: 100, type: ProgressType.Linear });
                        Progress.style({ strokeWidth: 4 });
                        Progress.color({ "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Progress.width('100%');
                    }, Progress);
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
            If.create();
            if (this.state.failed) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('上传失败');
                        Text.fontSize(12);
                        Text.fontColor({ "id": 16777263, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    }, Text);
                    Text.pop();
                });
            }
            else if (this.state.done) {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('✓ 上传完成');
                        Text.fontSize(12);
                        Text.fontColor({ "id": 16777256, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    }, Text);
                    Text.pop();
                });
            }
            else if (this.state.active && this.state.percent > 0) {
                this.ifElseBranchUpdateFunction(2, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(`${this.state.percent}%`);
                        Text.fontSize(12);
                        Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    }, Text);
                    Text.pop();
                });
            }
            else if (this.state.active) {
                this.ifElseBranchUpdateFunction(3, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('上传中...');
                        Text.fontSize(12);
                        Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    }, Text);
                    Text.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(4, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('待上传');
                        Text.fontSize(12);
                        Text.fontColor({ "id": 16777260, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    }, Text);
                    Text.pop();
                });
            }
        }, If);
        If.pop();
        Row.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
export class photoPicker extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__signIdArray = new SynchedPropertyObjectTwoWayPU(params.signIdArray, this, "signIdArray");
        this.__objectidArray = new SynchedPropertyObjectTwoWayPU(params.objectidArray, this, "objectidArray");
        this.__otherUserDialogIsShow = new SynchedPropertySimpleTwoWayPU(params.otherUserDialogIsShow, this, "otherUserDialogIsShow");
        this.__otherUser = new SynchedPropertyObjectOneWayPU(params.otherUser, this, "otherUser");
        this.__isUploading = new ObservedPropertySimplePU(false, this, "isUploading");
        this.__totalPercentValue = new ObservedPropertySimplePU(0, this, "totalPercentValue");
        this.__doneCountValue = new ObservedPropertySimplePU(0, this, "doneCountValue");
        this.states = new Map();
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: photoPicker_Params) {
        if (params.isUploading !== undefined) {
            this.isUploading = params.isUploading;
        }
        if (params.totalPercentValue !== undefined) {
            this.totalPercentValue = params.totalPercentValue;
        }
        if (params.doneCountValue !== undefined) {
            this.doneCountValue = params.doneCountValue;
        }
        if (params.states !== undefined) {
            this.states = params.states;
        }
    }
    updateStateVars(params: photoPicker_Params) {
        this.__otherUser.reset(params.otherUser);
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__signIdArray.purgeDependencyOnElmtId(rmElmtId);
        this.__objectidArray.purgeDependencyOnElmtId(rmElmtId);
        this.__otherUserDialogIsShow.purgeDependencyOnElmtId(rmElmtId);
        this.__otherUser.purgeDependencyOnElmtId(rmElmtId);
        this.__isUploading.purgeDependencyOnElmtId(rmElmtId);
        this.__totalPercentValue.purgeDependencyOnElmtId(rmElmtId);
        this.__doneCountValue.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__signIdArray.aboutToBeDeleted();
        this.__objectidArray.aboutToBeDeleted();
        this.__otherUserDialogIsShow.aboutToBeDeleted();
        this.__otherUser.aboutToBeDeleted();
        this.__isUploading.aboutToBeDeleted();
        this.__totalPercentValue.aboutToBeDeleted();
        this.__doneCountValue.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    updateRecycleElmtId(oldElmtId, newElmtId) {
        this.__signIdArray.updateElmtId(oldElmtId, newElmtId);
        this.__objectidArray.updateElmtId(oldElmtId, newElmtId);
        this.__otherUserDialogIsShow.updateElmtId(oldElmtId, newElmtId);
        this.__otherUser.updateElmtId(oldElmtId, newElmtId);
        this.__isUploading.updateElmtId(oldElmtId, newElmtId);
        this.__totalPercentValue.updateElmtId(oldElmtId, newElmtId);
        this.__doneCountValue.updateElmtId(oldElmtId, newElmtId);
    }
    private __signIdArray: SynchedPropertySimpleOneWayPU<Array<number>>;
    get signIdArray() {
        return this.__signIdArray.get();
    }
    set signIdArray(newValue: Array<number>) {
        this.__signIdArray.set(newValue);
    }
    private __objectidArray: SynchedPropertySimpleOneWayPU<string[]>;
    get objectidArray() {
        return this.__objectidArray.get();
    }
    set objectidArray(newValue: string[]) {
        this.__objectidArray.set(newValue);
    }
    private __otherUserDialogIsShow: SynchedPropertySimpleTwoWayPU<boolean>;
    get otherUserDialogIsShow() {
        return this.__otherUserDialogIsShow.get();
    }
    set otherUserDialogIsShow(newValue: boolean) {
        this.__otherUserDialogIsShow.set(newValue);
    }
    private __otherUser: SynchedPropertySimpleOneWayPU<Array<userMenu>>;
    get otherUser() {
        return this.__otherUser.get();
    }
    set otherUser(newValue: Array<userMenu>) {
        this.__otherUser.set(newValue);
    }
    private __isUploading: ObservedPropertySimplePU<boolean>;
    get isUploading() {
        return this.__isUploading.get();
    }
    set isUploading(newValue: boolean) {
        this.__isUploading.set(newValue);
    }
    private __totalPercentValue: ObservedPropertySimplePU<number>;
    get totalPercentValue() {
        return this.__totalPercentValue.get();
    }
    set totalPercentValue(newValue: number) {
        this.__totalPercentValue.set(newValue);
    }
    private __doneCountValue: ObservedPropertySimplePU<number>;
    get doneCountValue() {
        return this.__doneCountValue.get();
    }
    set doneCountValue(newValue: number) {
        this.__doneCountValue.set(newValue);
    }
    private states: Map<number, UserUploadState>;
    private userNameOf(signId: number): string {
        const found = this.otherUser.find(u => u.id === signId);
        return found ? found.uname : `用户 ${signId}`;
    }
    private stateOf(signId: number): UserUploadState {
        let st = this.states.get(signId);
        if (!st) {
            st = new UserUploadState(signId);
            this.states.set(signId, st);
        }
        return st;
    }
    private resetStates() {
        this.states.forEach(st => {
            st.percent = 0;
            st.done = false;
            st.failed = false;
            st.active = false;
        });
    }
    private recalcTotal() {
        if (this.states.size === 0) {
            this.totalPercentValue = 0;
            this.doneCountValue = 0;
            return;
        }
        let sum = 0;
        let done = 0;
        this.states.forEach(st => {
            sum += Math.max(st.percent, 0);
            if (st.done) {
                done++;
            }
        });
        this.totalPercentValue = Math.min(100, Math.round(sum / this.states.size));
        this.doneCountValue = done;
    }
    /** 整体替换数组以触发父组件（@Link）同步 */
    private setObjectId(index: number, objectId: string) {
        const next = this.objectidArray.slice();
        next[index] = objectId;
        this.objectidArray = next;
    }
    // 显示图片选择确认对话框
    private showPhotoConfirmDialog() {
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
            title: '确认上传图片',
            message: `将为以下用户上传图片：\n${userNames}\n\n是否继续？`,
            primaryButton: {
                value: '修改用户',
                action: () => {
                    this.otherUserDialogIsShow = true;
                }
            },
            secondaryButton: {
                value: '确认上传',
                action: () => {
                    this.handlePhotoSelect();
                }
            }
        });
    }
    /** 上传单个用户的图片（并发执行） */
    private async uploadOne(state: UserUploadState, index: number, uri: string, context: Context, dbManager: DatabaseManager): Promise<void> {
        try {
            const userInfo = await dbManager.getUserById(state.signId);
            if (!userInfo) {
                throw new Error('用户不存在');
            }
            const puid = String((await loginFunction.getUserInfo(userInfo.cookies)).puid);
            const objectId = await uploadImageForObject(context, userInfo.cookies, puid, uri, (percent: number): void => {
                state.percent = percent;
                this.recalcTotal();
            });
            this.setObjectId(index, objectId);
            state.done = true;
            state.percent = 100;
        }
        catch (error) {
            hilog.error(DOMAIN, TAG, 'Photo upload failed for user %d: %{public}s', state.signId, JSON.stringify(error));
            state.failed = true;
        }
        finally {
            this.recalcTotal();
        }
    }
    // 并发为每个用户上传签到图片
    private async handlePhotoSelect() {
        this.objectidArray = new Array(this.signIdArray.length).fill('');
        this.resetStates();
        this.recalcTotal();
        this.isUploading = true;
        const dbManager = DatabaseManager.getInstance();
        try {
            const photoSelectOptions = new picker.PhotoSelectOptions();
            photoSelectOptions.MIMEType = picker.PhotoViewMIMETypes.IMAGE_TYPE;
            photoSelectOptions.maxSelectNumber = this.signIdArray.length;
            const photoViewPicker = new picker.PhotoViewPicker();
            const context = this.getUIContext().getHostContext() as Context;
            const res = await photoViewPicker.select(photoSelectOptions);
            const uriArr = res.photoUris;
            if (!uriArr || uriArr.length === 0) {
                return;
            }
            promptAction.showToast({ message: '开始上传图片', duration: 1500 });
            this.states.forEach(st => {
                st.active = true;
            });
            const tasks = this.signIdArray.map((signId: number, index: number): Promise<void> => this.uploadOne(this.stateOf(signId), index, uriArr[index % uriArr.length], context, dbManager));
            await Promise.allSettled(tasks);
            promptAction.showToast({
                message: this.doneCountValue === this.signIdArray.length ?
                    '所有图片上传成功' : `${this.doneCountValue}/${this.signIdArray.length} 张上传成功`,
                duration: 2000
            });
        }
        catch (error) {
            hilog.error(DOMAIN, TAG, 'Photo selection failed: %{public}s', JSON.stringify(error));
            promptAction.showToast({ message: '图片选择失败', duration: 2000 });
        }
        finally {
            this.states.forEach(st => {
                st.active = false;
            });
            this.isUploading = false;
        }
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create({ space: 12 });
            Column.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                Column.width('100%');
                Column.padding(16);
                Column.borderRadius(16);
            }
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.signIdArray.length === 0) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('请先选择要代签的用户');
                        Text.fontColor({ "id": 16777260, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        if (isInitialRender) {
                            Text.fontSize(14);
                            Text.width('100%');
                        }
                    }, Text);
                    Text.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 顶部总进度
                        Row.create();
                        if (isInitialRender) {
                            // 顶部总进度
                            Row.width('100%');
                        }
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.isUploading ? '正在上传图片' : '上传进度');
                        Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        if (isInitialRender) {
                            Text.fontSize(14);
                        }
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Blank.create();
                    }, Blank);
                    Blank.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(`${this.doneCountValue}/${this.signIdArray.length}`);
                        Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        if (isInitialRender) {
                            Text.fontSize(13);
                        }
                    }, Text);
                    Text.pop();
                    // 顶部总进度
                    Row.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Progress.create({ value: this.totalPercentValue, total: 100, type: ProgressType.Linear });
                        Progress.color({ "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        if (isInitialRender) {
                            Progress.style({ strokeWidth: 8 });
                            Progress.width('100%');
                        }
                    }, Progress);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 按用户的头像与进度行（内部滚动，避免用户过多时按钮被顶出屏幕）
                        Scroll.create();
                        if (isInitialRender) {
                            // 按用户的头像与进度行（内部滚动，避免用户过多时按钮被顶出屏幕）
                            Scroll.constraintSize({ maxHeight: 264 });
                            // 按用户的头像与进度行（内部滚动，避免用户过多时按钮被顶出屏幕）
                            Scroll.scrollBar(BarState.Auto);
                            // 按用户的头像与进度行（内部滚动，避免用户过多时按钮被顶出屏幕）
                            Scroll.align(Alignment.Top);
                            // 按用户的头像与进度行（内部滚动，避免用户过多时按钮被顶出屏幕）
                            Scroll.width('100%');
                        }
                    }, Scroll);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create({ space: 8 });
                        if (isInitialRender) {
                            Column.width('100%');
                        }
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        ForEach.create();
                        const forEachItemGenFunction = (_item, index: number) => {
                            const signId = _item;
                            {
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    if (isInitialRender) {
                                        let componentCall = new UserUploadRow(this, { state: this.stateOf(signId), uname: this.userNameOf(signId) }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/Component/PhotoPicker.ets", line: 285, col: 15 });
                                        ViewPU.create(componentCall);
                                        let paramsLambda = () => {
                                            return {
                                                state: this.stateOf(signId),
                                                uname: this.userNameOf(signId)
                                            };
                                        };
                                        componentCall.paramsGenerator_ = paramsLambda;
                                    }
                                    else {
                                        this.updateStateVarsOfChildByElmtId(elmtId, {
                                            state: this.stateOf(signId), uname: this.userNameOf(signId)
                                        });
                                    }
                                }, { name: "UserUploadRow" });
                            }
                        };
                        this.forEachUpdateFunction(elmtId, this.signIdArray, forEachItemGenFunction, (signId: number): string => `row_${signId}`, true, false);
                    }, ForEach);
                    ForEach.pop();
                    Column.pop();
                    // 按用户的头像与进度行（内部滚动，避免用户过多时按钮被顶出屏幕）
                    Scroll.pop();
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel(this.isUploading ? '上传中...' : '选择图片 / 拍照');
            Button.fontColor({ "id": 16777259, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.backgroundColor(this.isUploading ? { "id": 16777236, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : { "id": 16777252, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.enabled(!this.isUploading);
            if (isInitialRender) {
                Button.fontSize(16);
                Button.fontWeight(FontWeight.Medium);
                Button.type(ButtonType.Capsule);
                Button.width('60%');
                Button.onClick(() => {
                    this.showPhotoConfirmDialog();
                });
            }
        }, Button);
        Button.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
