if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface DebugPanelPage_Params {
    unlocked?: boolean;
    pwdInput?: string;
}
import promptAction from "@ohos:promptAction";
import { DebugPage } from "@normalized:N&&&entry/src/main/ets/Component/DebugPage&";
// Debug 面板路由页：
// 1. 以 NavDestination 全屏呈现 DebugPage——替代旧的 bindSheet 承载方式，
//    sheet 之上 pushPath 的子页面会被全屏 sheet 遮挡（模型对比页"看不见"）。
// 2. 密码门内置于本页：头像连点直接进入本页，未解锁时先校验密码
//    （TextInput 支持键盘 Enter 提交），通过后再渲染 DebugPage。
export function init(parent = null) {
    {
        (parent ? parent : this).observeComponentCreation2((elmtId, isInitialRender) => {
            if (isInitialRender) {
                let componentCall = new DebugPanelPage(parent ? parent : this, {}, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/DebugPanelPage.ets", line: 11, col: 3 });
                ViewPU.create(componentCall);
                let paramsLambda = () => {
                    return {};
                };
                componentCall.paramsGenerator_ = paramsLambda;
            }
            else {
                (parent ? parent : this).updateStateVarsOfChildByElmtId(elmtId, {});
            }
        }, { name: "DebugPanelPage" });
    }
}
class DebugPanelPage extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__unlocked = new ObservedPropertySimplePU(false, this, "unlocked");
        this.__pwdInput = new ObservedPropertySimplePU('', this, "pwdInput");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: DebugPanelPage_Params) {
        if (params.unlocked !== undefined) {
            this.unlocked = params.unlocked;
        }
        if (params.pwdInput !== undefined) {
            this.pwdInput = params.pwdInput;
        }
    }
    updateStateVars(params: DebugPanelPage_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__unlocked.purgeDependencyOnElmtId(rmElmtId);
        this.__pwdInput.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__unlocked.aboutToBeDeleted();
        this.__pwdInput.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __unlocked: ObservedPropertySimplePU<boolean>;
    get unlocked() {
        return this.__unlocked.get();
    }
    set unlocked(newValue: boolean) {
        this.__unlocked.set(newValue);
    }
    private __pwdInput: ObservedPropertySimplePU<string>;
    get pwdInput() {
        return this.__pwdInput.get();
    }
    set pwdInput(newValue: string) {
        this.__pwdInput.set(newValue);
    }
    confirmPwd() {
        if (this.pwdInput === 'nnn') {
            this.unlocked = true;
            this.pwdInput = '';
        }
        else {
            promptAction.showToast({ message: '密码错误' });
            this.pwdInput = '';
        }
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            NavDestination.create(() => {
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    if (this.unlocked) {
                        this.ifElseBranchUpdateFunction(0, () => {
                            {
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    if (isInitialRender) {
                                        let componentCall = new DebugPage(this, {}, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/DebugPanelPage.ets", line: 32, col: 9 });
                                        ViewPU.create(componentCall);
                                        let paramsLambda = () => {
                                            return {};
                                        };
                                        componentCall.paramsGenerator_ = paramsLambda;
                                    }
                                    else {
                                        this.updateStateVarsOfChildByElmtId(elmtId, {});
                                    }
                                }, { name: "DebugPage" });
                            }
                        });
                    }
                    else {
                        this.ifElseBranchUpdateFunction(1, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Column.create();
                                Column.width('100%');
                                Column.height('100%');
                                Column.justifyContent(FlexAlign.Center);
                                Column.alignItems(HorizontalAlign.Center);
                                Column.backgroundColor({ "id": 125829132, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            }, Column);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create('输入调试密码');
                                Text.fontSize(24);
                                Text.fontWeight(FontWeight.Bold);
                                Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                Text.margin({ bottom: 24 });
                            }, Text);
                            Text.pop();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                TextInput.create({ placeholder: '请输入密码', text: { value: this.pwdInput, changeEvent: newValue => { this.pwdInput = newValue; } } });
                                TextInput.type(InputType.Password);
                                TextInput.enterKeyType(EnterKeyType.Done);
                                TextInput.width('80%');
                                TextInput.height(50);
                                TextInput.backgroundColor({ "id": 125829492, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                TextInput.borderRadius(12);
                                TextInput.margin({ bottom: 20 });
                                TextInput.onSubmit(() => { this.confirmPwd(); });
                            }, TextInput);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Button.createWithLabel('确认');
                                Button.width('80%');
                                Button.height(50);
                                Button.fontColor({ "id": 16777259, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                Button.backgroundColor({ "id": 16777235, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                Button.borderRadius(25);
                                Button.onClick(() => { this.confirmPwd(); });
                            }, Button);
                            Button.pop();
                            Column.pop();
                        });
                    }
                }, If);
                If.pop();
            }, { moduleName: "entry", pagePath: "entry/src/main/ets/pages/DebugPanelPage" });
            NavDestination.height('100%');
            NavDestination.width('100%');
        }, NavDestination);
        NavDestination.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
(function () {
    if (typeof NavigationBuilderRegister === "function") {
        NavigationBuilderRegister("DebugPanel", wrapBuilder(init));
    }
})();
