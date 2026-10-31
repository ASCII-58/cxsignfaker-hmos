if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface PasswordSignComponent_Params {
    activityId?: string;
    hostCookies?: string;
    /** 校验通过回传签到码，输入变更/清空回传 '' */
    onSignCode?: (code: string) => void;
    signCode?: string;
    codeReady?: boolean;
    resultMsg?: string;
    isValidating?: boolean;
}
import { Sign } from "@normalized:N&&&entry/src/main/ets/utils/sign&";
import hilog from "@ohos:hilog";
import promptAction from "@ohos:promptAction";
import { LightButton } from "@normalized:N&&&entry/src/main/ets/Component/LightButton&";
const TAG = 'PasswordSignComponent';
const DOMAIN = 0x000A;
// 超星平台签到码为 4-8 位数字
const MIN_SIGN_CODE_LENGTH = 4;
const MAX_SIGN_CODE_LENGTH = 8;
export class PasswordSignComponent extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__activityId = new SynchedPropertySimpleOneWayPU(params.activityId, this, "activityId");
        this.__hostCookies = new SynchedPropertySimpleOneWayPU(params.hostCookies, this, "hostCookies");
        this.onSignCode = undefined;
        this.__signCode = new ObservedPropertySimplePU('', this, "signCode");
        this.__codeReady = new ObservedPropertySimplePU(false, this, "codeReady");
        this.__resultMsg = new ObservedPropertySimplePU('', this, "resultMsg");
        this.__isValidating = new ObservedPropertySimplePU(false, this, "isValidating");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: PasswordSignComponent_Params) {
        if (params.onSignCode !== undefined) {
            this.onSignCode = params.onSignCode;
        }
        if (params.signCode !== undefined) {
            this.signCode = params.signCode;
        }
        if (params.codeReady !== undefined) {
            this.codeReady = params.codeReady;
        }
        if (params.resultMsg !== undefined) {
            this.resultMsg = params.resultMsg;
        }
        if (params.isValidating !== undefined) {
            this.isValidating = params.isValidating;
        }
    }
    updateStateVars(params: PasswordSignComponent_Params) {
        this.__activityId.reset(params.activityId);
        this.__hostCookies.reset(params.hostCookies);
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__activityId.purgeDependencyOnElmtId(rmElmtId);
        this.__hostCookies.purgeDependencyOnElmtId(rmElmtId);
        this.__signCode.purgeDependencyOnElmtId(rmElmtId);
        this.__codeReady.purgeDependencyOnElmtId(rmElmtId);
        this.__resultMsg.purgeDependencyOnElmtId(rmElmtId);
        this.__isValidating.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__activityId.aboutToBeDeleted();
        this.__hostCookies.aboutToBeDeleted();
        this.__signCode.aboutToBeDeleted();
        this.__codeReady.aboutToBeDeleted();
        this.__resultMsg.aboutToBeDeleted();
        this.__isValidating.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __activityId: SynchedPropertySimpleOneWayPU<string>;
    get activityId() {
        return this.__activityId.get();
    }
    set activityId(newValue: string) {
        this.__activityId.set(newValue);
    }
    /** 主用户 Cookie，仅用于即时校验签到码 */
    private __hostCookies: SynchedPropertySimpleOneWayPU<string>;
    get hostCookies() {
        return this.__hostCookies.get();
    }
    set hostCookies(newValue: string) {
        this.__hostCookies.set(newValue);
    }
    /** 校验通过回传签到码，输入变更/清空回传 '' */
    private onSignCode?: (code: string) => void;
    private __signCode: ObservedPropertySimplePU<string>;
    get signCode() {
        return this.__signCode.get();
    }
    set signCode(newValue: string) {
        this.__signCode.set(newValue);
    }
    private __codeReady: ObservedPropertySimplePU<boolean>;
    get codeReady() {
        return this.__codeReady.get();
    }
    set codeReady(newValue: boolean) {
        this.__codeReady.set(newValue);
    }
    private __resultMsg: ObservedPropertySimplePU<string>;
    get resultMsg() {
        return this.__resultMsg.get();
    }
    set resultMsg(newValue: string) {
        this.__resultMsg.set(newValue);
    }
    private __isValidating: ObservedPropertySimplePU<boolean>;
    get isValidating() {
        return this.__isValidating.get();
    }
    set isValidating(newValue: boolean) {
        this.__isValidating.set(newValue);
    }
    private invalidate() {
        if (this.codeReady) {
            this.codeReady = false;
        }
        this.resultMsg = '';
        this.onSignCode?.('');
    }
    async submitSignCode() {
        if (!this.signCode || this.signCode.length === 0) {
            promptAction.showToast({ message: '请输入签到码' });
            return;
        }
        if (this.signCode.length < MIN_SIGN_CODE_LENGTH) {
            promptAction.showToast({ message: `签到码为${MIN_SIGN_CODE_LENGTH}-${MAX_SIGN_CODE_LENGTH}位数字` });
            return;
        }
        try {
            this.isValidating = true;
            const isCorrect = await Sign.CheckSignCode(this.hostCookies, this.activityId, this.signCode);
            if (!isCorrect) {
                this.resultMsg = '签到码错误，请重新输入';
                this.signCode = '';
                this.invalidate();
                return;
            }
            this.resultMsg = '签到码校验通过，请点击下方按钮签到';
            this.codeReady = true;
            this.onSignCode?.(this.signCode);
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Sign code validate failed: ${(e as Error).message}`);
            this.resultMsg = `签到码校验失败: ${(e as Error).message}`;
        }
        finally {
            this.isValidating = false;
        }
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.padding(20);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(`请输入${MIN_SIGN_CODE_LENGTH}-${MAX_SIGN_CODE_LENGTH}位数字签到码（为所有勾选用户代签）`);
            Text.fontSize(14);
            Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.margin({ bottom: 24 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 签到码输入框
            Column.create();
            // 签到码输入框
            Column.margin({ bottom: 24 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TextInput.create({ placeholder: '请输入签到码', text: this.signCode });
            TextInput.type(InputType.Number);
            TextInput.maxLength(MAX_SIGN_CODE_LENGTH);
            TextInput.width(250);
            TextInput.fontSize(20);
            TextInput.textAlign(TextAlign.Center);
            TextInput.onChange((value: string) => {
                this.signCode = value;
                this.invalidate();
            });
        }, TextInput);
        // 签到码输入框
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 校验结果信息
            if (this.resultMsg) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.resultMsg);
                        Text.fontSize(14);
                        Text.fontColor(this.codeReady ? { "id": 125829135, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : { "id": 125829141, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.margin({ bottom: 16 });
                    }, Text);
                    Text.pop();
                });
            }
            // 校验按钮
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            __Common__.create();
            __Common__.width(200);
            __Common__.margin({ bottom: 8 });
        }, __Common__);
        {
            this.observeComponentCreation2((elmtId, isInitialRender) => {
                if (isInitialRender) {
                    let componentCall = new 
                    // 校验按钮
                    LightButton(this, {
                        label: this.isValidating ? '校验中...' : '校验签到码',
                        btnEnabled: !this.isValidating,
                        onButton: () => {
                            this.submitSignCode();
                        }
                    }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/Component/PasswordSignComponent.ets", line: 105, col: 7 });
                    ViewPU.create(componentCall);
                    let paramsLambda = () => {
                        return {
                            label: this.isValidating ? '校验中...' : '校验签到码',
                            btnEnabled: !this.isValidating,
                            onButton: () => {
                                this.submitSignCode();
                            }
                        };
                    };
                    componentCall.paramsGenerator_ = paramsLambda;
                }
                else {
                    this.updateStateVarsOfChildByElmtId(elmtId, {
                        label: this.isValidating ? '校验中...' : '校验签到码',
                        btnEnabled: !this.isValidating
                    });
                }
            }, { name: "LightButton" });
        }
        __Common__.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
