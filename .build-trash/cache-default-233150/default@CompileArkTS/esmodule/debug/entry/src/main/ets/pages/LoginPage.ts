if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface Login_Params {
    username?: string;
    password?: string;
    LoginEnable?: boolean;
    titleOpacity?: number;
    titleTranslateY?: number;
    formOpacity?: number;
    formTranslateY?: number;
    isLoading?: boolean;
    shakeTranslateY?: number;
    shakeScale?: number;
    pageInfos?: NavPathStack;
}
interface FloatingTextInput_Params {
    label?: string;
    inputType?: InputType;
    value?: string;
    isFocused?: boolean;
    onChange?: (value: string) => void;
    onSubmit?: () => void;
}
import curves from "@native:ohos.curves";
import promptAction from "@ohos:promptAction";
import { DatabaseManager } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import type { UserData } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import { ChaoxingUtils } from "@normalized:N&&&entry/src/main/ets/utils/utils&";
import { loginFunction } from "@normalized:N&&&entry/src/main/ets/utils/Login&";
import type common from "@ohos:app.ability.common";
class FloatingTextInput extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__label = new SynchedPropertySimpleOneWayPU(params.label, this, "label");
        this.__inputType = new SynchedPropertySimpleOneWayPU(params.inputType, this, "inputType");
        this.__value = new SynchedPropertySimpleOneWayPU(params.value, this, "value");
        this.__isFocused = new ObservedPropertySimplePU(false, this, "isFocused");
        this.onChange = () => { };
        this.onSubmit = () => { };
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: FloatingTextInput_Params) {
        if (params.label === undefined) {
            this.__label.set('');
        }
        if (params.inputType === undefined) {
            this.__inputType.set(InputType.Normal);
        }
        if (params.value === undefined) {
            this.__value.set('');
        }
        if (params.isFocused !== undefined) {
            this.isFocused = params.isFocused;
        }
        if (params.onChange !== undefined) {
            this.onChange = params.onChange;
        }
        if (params.onSubmit !== undefined) {
            this.onSubmit = params.onSubmit;
        }
    }
    updateStateVars(params: FloatingTextInput_Params) {
        this.__label.reset(params.label);
        this.__inputType.reset(params.inputType);
        this.__value.reset(params.value);
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__label.purgeDependencyOnElmtId(rmElmtId);
        this.__inputType.purgeDependencyOnElmtId(rmElmtId);
        this.__value.purgeDependencyOnElmtId(rmElmtId);
        this.__isFocused.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__label.aboutToBeDeleted();
        this.__inputType.aboutToBeDeleted();
        this.__value.aboutToBeDeleted();
        this.__isFocused.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __label: SynchedPropertySimpleOneWayPU<string>;
    get label() {
        return this.__label.get();
    }
    set label(newValue: string) {
        this.__label.set(newValue);
    }
    private __inputType: SynchedPropertySimpleOneWayPU<InputType>;
    get inputType() {
        return this.__inputType.get();
    }
    set inputType(newValue: InputType) {
        this.__inputType.set(newValue);
    }
    private __value: SynchedPropertySimpleOneWayPU<string>;
    get value() {
        return this.__value.get();
    }
    set value(newValue: string) {
        this.__value.set(newValue);
    }
    private __isFocused: ObservedPropertySimplePU<boolean>;
    get isFocused() {
        return this.__isFocused.get();
    }
    set isFocused(newValue: boolean) {
        this.__isFocused.set(newValue);
    }
    private onChange: (value: string) => void;
    private onSubmit: () => void;
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Stack.create();
            Stack.height(56);
            Stack.width('100%');
        }, Stack);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TextInput.create({ text: this.value });
            TextInput.type(this.inputType);
            TextInput.showPasswordIcon(this.inputType === InputType.Password);
            TextInput.cancelButton({ style: CancelButtonStyle.INPUT });
            TextInput.enterKeyType(this.inputType === InputType.Password ? EnterKeyType.Go : EnterKeyType.Next);
            TextInput.onChange(this.onChange);
            TextInput.onSubmit(this.onSubmit);
            TextInput.onFocus(() => {
                this.isFocused = true;
            });
            TextInput.onBlur(() => {
                this.isFocused = false;
            });
            TextInput.placeholderFont({ size: 16 });
            TextInput.height(56);
            TextInput.width('100%');
            TextInput.backgroundColor({ "id": 125829489, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            TextInput.borderRadius(16);
            TextInput.padding({ left: 20, right: 20, top: this.isFocused || this.value ? 20 : 0 });
            TextInput.border({
                width: this.isFocused ? 2 : 0,
                color: this.isFocused ? { "id": 125829135, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : Color.Transparent
            });
        }, TextInput);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.alignItems(HorizontalAlign.Start);
            Column.width('100%');
            Column.height('100%');
            Column.hitTestBehavior(HitTestMode.None);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.label);
            globalThis.Context.animation({ duration: 200, curve: Curve.EaseOut });
            Text.fontSize(this.isFocused || this.value ? 12 : 16);
            Text.fontColor(this.isFocused ? { "id": 125829135, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : { "id": 16777261, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.position({
                left: this.isFocused || this.value ? 12 : 20,
                top: this.isFocused || this.value ? 8 : 18
            });
            globalThis.Context.animation(null);
        }, Text);
        Text.pop();
        Column.pop();
        Stack.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
export function init(parent = null) {
    {
        (parent ? parent : this).observeComponentCreation2((elmtId, isInitialRender) => {
            if (isInitialRender) {
                let componentCall = new Login(parent ? parent : this, {}, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/LoginPage.ets", line: 63, col: 3 });
                ViewPU.create(componentCall);
                let paramsLambda = () => {
                    return {};
                };
                componentCall.paramsGenerator_ = paramsLambda;
            }
            else {
                (parent ? parent : this).updateStateVarsOfChildByElmtId(elmtId, {});
            }
        }, { name: "Login" });
    }
}
export default class Login extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__username = new ObservedPropertySimplePU('', this, "username");
        this.__password = new ObservedPropertySimplePU('', this, "password");
        this.__LoginEnable = new ObservedPropertySimplePU(false, this, "LoginEnable");
        this.__titleOpacity = new ObservedPropertySimplePU(0, this, "titleOpacity");
        this.__titleTranslateY = new ObservedPropertySimplePU(-50, this, "titleTranslateY");
        this.__formOpacity = new ObservedPropertySimplePU(0, this, "formOpacity");
        this.__formTranslateY = new ObservedPropertySimplePU(30, this, "formTranslateY");
        this.__isLoading = new ObservedPropertySimplePU(false, this, "isLoading");
        this.__shakeTranslateY = new ObservedPropertySimplePU(0, this, "shakeTranslateY");
        this.__shakeScale = new ObservedPropertySimplePU(1, this, "shakeScale");
        this.__pageInfos = this.initializeConsume('pathInfos', "pageInfos");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: Login_Params) {
        if (params.username !== undefined) {
            this.username = params.username;
        }
        if (params.password !== undefined) {
            this.password = params.password;
        }
        if (params.LoginEnable !== undefined) {
            this.LoginEnable = params.LoginEnable;
        }
        if (params.titleOpacity !== undefined) {
            this.titleOpacity = params.titleOpacity;
        }
        if (params.titleTranslateY !== undefined) {
            this.titleTranslateY = params.titleTranslateY;
        }
        if (params.formOpacity !== undefined) {
            this.formOpacity = params.formOpacity;
        }
        if (params.formTranslateY !== undefined) {
            this.formTranslateY = params.formTranslateY;
        }
        if (params.isLoading !== undefined) {
            this.isLoading = params.isLoading;
        }
        if (params.shakeTranslateY !== undefined) {
            this.shakeTranslateY = params.shakeTranslateY;
        }
        if (params.shakeScale !== undefined) {
            this.shakeScale = params.shakeScale;
        }
    }
    updateStateVars(params: Login_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__username.purgeDependencyOnElmtId(rmElmtId);
        this.__password.purgeDependencyOnElmtId(rmElmtId);
        this.__LoginEnable.purgeDependencyOnElmtId(rmElmtId);
        this.__titleOpacity.purgeDependencyOnElmtId(rmElmtId);
        this.__titleTranslateY.purgeDependencyOnElmtId(rmElmtId);
        this.__formOpacity.purgeDependencyOnElmtId(rmElmtId);
        this.__formTranslateY.purgeDependencyOnElmtId(rmElmtId);
        this.__isLoading.purgeDependencyOnElmtId(rmElmtId);
        this.__shakeTranslateY.purgeDependencyOnElmtId(rmElmtId);
        this.__shakeScale.purgeDependencyOnElmtId(rmElmtId);
        this.__pageInfos.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__username.aboutToBeDeleted();
        this.__password.aboutToBeDeleted();
        this.__LoginEnable.aboutToBeDeleted();
        this.__titleOpacity.aboutToBeDeleted();
        this.__titleTranslateY.aboutToBeDeleted();
        this.__formOpacity.aboutToBeDeleted();
        this.__formTranslateY.aboutToBeDeleted();
        this.__isLoading.aboutToBeDeleted();
        this.__shakeTranslateY.aboutToBeDeleted();
        this.__shakeScale.aboutToBeDeleted();
        this.__pageInfos.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __username: ObservedPropertySimplePU<string>;
    get username() {
        return this.__username.get();
    }
    set username(newValue: string) {
        this.__username.set(newValue);
    }
    private __password: ObservedPropertySimplePU<string>;
    get password() {
        return this.__password.get();
    }
    set password(newValue: string) {
        this.__password.set(newValue);
    }
    private __LoginEnable: ObservedPropertySimplePU<boolean>;
    get LoginEnable() {
        return this.__LoginEnable.get();
    }
    set LoginEnable(newValue: boolean) {
        this.__LoginEnable.set(newValue);
    }
    private __titleOpacity: ObservedPropertySimplePU<number>;
    get titleOpacity() {
        return this.__titleOpacity.get();
    }
    set titleOpacity(newValue: number) {
        this.__titleOpacity.set(newValue);
    }
    private __titleTranslateY: ObservedPropertySimplePU<number>;
    get titleTranslateY() {
        return this.__titleTranslateY.get();
    }
    set titleTranslateY(newValue: number) {
        this.__titleTranslateY.set(newValue);
    }
    private __formOpacity: ObservedPropertySimplePU<number>;
    get formOpacity() {
        return this.__formOpacity.get();
    }
    set formOpacity(newValue: number) {
        this.__formOpacity.set(newValue);
    }
    private __formTranslateY: ObservedPropertySimplePU<number>;
    get formTranslateY() {
        return this.__formTranslateY.get();
    }
    set formTranslateY(newValue: number) {
        this.__formTranslateY.set(newValue);
    }
    private __isLoading: ObservedPropertySimplePU<boolean>;
    get isLoading() {
        return this.__isLoading.get();
    }
    set isLoading(newValue: boolean) {
        this.__isLoading.set(newValue);
    }
    private __shakeTranslateY: ObservedPropertySimplePU<number>;
    get shakeTranslateY() {
        return this.__shakeTranslateY.get();
    }
    set shakeTranslateY(newValue: number) {
        this.__shakeTranslateY.set(newValue);
    }
    private __shakeScale: ObservedPropertySimplePU<number>;
    get shakeScale() {
        return this.__shakeScale.get();
    }
    set shakeScale(newValue: number) {
        this.__shakeScale.set(newValue);
    }
    private __pageInfos: ObservedPropertyAbstractPU<NavPathStack>;
    get pageInfos() {
        return this.__pageInfos.get();
    }
    set pageInfos(newValue: NavPathStack) {
        this.__pageInfos.set(newValue);
    }
    aboutToAppear() {
        // 标题入口动画
        Context.animateTo({ duration: 600, curve: curves.springMotion(0.6, 0.8), delay: 100 }, () => {
            this.titleOpacity = 1;
            this.titleTranslateY = 0;
        });
        // 表单入口动画
        Context.animateTo({ duration: 600, curve: curves.springMotion(0.6, 0.8), delay: 300 }, () => {
            this.formOpacity = 1;
            this.formTranslateY = 0;
        });
    }
    async handleLogin() {
        this.isLoading = true;
        try {
            const uname = ChaoxingUtils.encryptByAES(this.username);
            const pwd = ChaoxingUtils.encryptByAES(this.password);
            const result = await loginFunction.LoginChaoXing(ChaoxingUtils.getLoginBody(uname, pwd));
            if (result.ok && result.cookies) {
                try {
                    const cookies = result.cookies;
                    const info = await loginFunction.getUserInfo(cookies);
                    const dbManager = DatabaseManager.getInstance();
                    const userData: UserData = {
                        phone: this.username,
                        pwd: pwd,
                        cookies: cookies,
                        uid: info.uid
                    };
                    await dbManager.insertUser(userData, true);
                    promptAction.showToast({ message: '登录成功', duration: 2000 });
                    this.pageInfos.replacePath({ name: "HomePage" }, false);
                }
                catch (e) {
                    this.username = '';
                    this.password = '';
                    if (e instanceof Error) {
                        if (e.message.includes('主用户已登录')) {
                            promptAction.showToast({ message: '主用户已登录,请勿重复登录', duration: 2000 });
                        }
                        else {
                            promptAction.showToast({
                                message: '登录失败: ' + e.message,
                                duration: 2000
                            });
                        }
                        this.triggerShakeAnimation();
                    }
                }
            }
            else {
                promptAction.showToast({
                    message: result.message,
                    duration: 1500,
                    bottom: '20%'
                });
                this.username = '';
                this.password = '';
                this.triggerShakeAnimation();
            }
        }
        catch (error) {
            promptAction.showToast({ message: '发生错误，请重试' });
            this.triggerShakeAnimation();
        }
        finally {
            this.isLoading = false;
        }
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            NavDestination.create(() => {
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Scroll.create();
                    Scroll.width('100%');
                    Scroll.height('100%');
                    Scroll.backgroundColor({ "id": 125829132, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Scroll);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.width('100%');
                    Column.constraintSize({ minHeight: '100%' });
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.height('12%');
                }, Column);
                Column.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.alignItems(HorizontalAlign.Start);
                    Column.width('90%');
                    Column.margin({ bottom: 40 });
                    Column.opacity(this.titleOpacity);
                    Column.translate({ y: this.titleTranslateY });
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('学习通账号登录');
                    Text.fontSize(32);
                    Text.fontWeight(FontWeight.Bold);
                    Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.lineHeight(40);
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('使用超星学习通账号登录，管理你的课程签到');
                    Text.fontSize(14);
                    Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.margin({ top: 8 });
                }, Text);
                Text.pop();
                Column.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create({ space: 24 });
                    Column.width('90%');
                    Column.opacity(this.formOpacity);
                    Column.translate({ y: this.formTranslateY, x: this.shakeTranslateY });
                    Column.scale({ x: this.shakeScale, y: this.shakeScale });
                }, Column);
                {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        if (isInitialRender) {
                            let componentCall = new FloatingTextInput(this, {
                                label: '手机号',
                                inputType: InputType.PhoneNumber,
                                value: this.username,
                                onChange: (value: string) => {
                                    this.username = value;
                                    if (this.username && this.password) {
                                        this.LoginEnable = true;
                                    }
                                }
                            }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/LoginPage.ets", line: 171, col: 13 });
                            ViewPU.create(componentCall);
                            let paramsLambda = () => {
                                return {
                                    label: '手机号',
                                    inputType: InputType.PhoneNumber,
                                    value: this.username,
                                    onChange: (value: string) => {
                                        this.username = value;
                                        if (this.username && this.password) {
                                            this.LoginEnable = true;
                                        }
                                    }
                                };
                            };
                            componentCall.paramsGenerator_ = paramsLambda;
                        }
                        else {
                            this.updateStateVarsOfChildByElmtId(elmtId, {
                                label: '手机号',
                                inputType: InputType.PhoneNumber,
                                value: this.username
                            });
                        }
                    }, { name: "FloatingTextInput" });
                }
                {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        if (isInitialRender) {
                            let componentCall = new FloatingTextInput(this, {
                                label: '密码',
                                inputType: InputType.Password,
                                value: this.password,
                                onChange: (value: string) => {
                                    this.password = value;
                                    if (this.username && this.password) {
                                        this.LoginEnable = true;
                                    }
                                },
                                onSubmit: () => {
                                    if (this.LoginEnable && !this.isLoading) {
                                        this.handleLogin();
                                    }
                                }
                            }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/LoginPage.ets", line: 183, col: 13 });
                            ViewPU.create(componentCall);
                            let paramsLambda = () => {
                                return {
                                    label: '密码',
                                    inputType: InputType.Password,
                                    value: this.password,
                                    onChange: (value: string) => {
                                        this.password = value;
                                        if (this.username && this.password) {
                                            this.LoginEnable = true;
                                        }
                                    },
                                    onSubmit: () => {
                                        if (this.LoginEnable && !this.isLoading) {
                                            this.handleLogin();
                                        }
                                    }
                                };
                            };
                            componentCall.paramsGenerator_ = paramsLambda;
                        }
                        else {
                            this.updateStateVarsOfChildByElmtId(elmtId, {
                                label: '密码',
                                inputType: InputType.Password,
                                value: this.password
                            });
                        }
                    }, { name: "FloatingTextInput" });
                }
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Button.createWithChild();
                    Button.type(ButtonType.Capsule);
                    Button.enabled(this.LoginEnable && !this.isLoading);
                    Button.width('100%');
                    Button.height(48);
                    Button.backgroundColor({ "id": 16777252, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Button.shadow({ radius: 10, color: 'rgba(10, 89, 247, 0.2)', offsetY: 5 });
                    Button.onClick(() => {
                        this.handleLogin();
                    });
                    Button.margin({ top: 20 });
                }, Button);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    if (this.isLoading) {
                        this.ifElseBranchUpdateFunction(0, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                LoadingProgress.create();
                                LoadingProgress.width(24);
                                LoadingProgress.height(24);
                                LoadingProgress.color({ "id": 16777259, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                LoadingProgress.margin({ right: 10 });
                            }, LoadingProgress);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create('登录中...');
                                Text.fontColor({ "id": 16777259, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                Text.fontSize(18);
                                Text.fontWeight(FontWeight.Medium);
                            }, Text);
                            Text.pop();
                        });
                    }
                    else {
                        this.ifElseBranchUpdateFunction(1, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create('登录');
                                Text.fontColor({ "id": 16777259, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                Text.fontSize(18);
                                Text.fontWeight(FontWeight.Medium);
                            }, Text);
                            Text.pop();
                        });
                    }
                }, If);
                If.pop();
                Row.pop();
                Button.pop();
                Column.pop();
                Column.pop();
                Scroll.pop();
            }, { moduleName: "entry", pagePath: "entry/src/main/ets/pages/LoginPage" });
            NavDestination.onBackPressed(() => {
                const context = getContext(this) as common.UIAbilityContext;
                context.terminateSelf(); // 这会完全退出应用，进程结束
                return true;
            });
            NavDestination.height('100%');
            NavDestination.width('100%');
            NavDestination.hideBackButton(true);
        }, NavDestination);
        NavDestination.pop();
    }
    private triggerShakeAnimation() {
        Context.animateTo({ duration: 100, curve: Curve.EaseOut }, () => {
            this.shakeTranslateY = 10;
            this.shakeScale = 0.98;
        });
        setTimeout(() => {
            Context.animateTo({ duration: 100, curve: Curve.EaseOut }, () => {
                this.shakeTranslateY = -10;
            });
            setTimeout(() => {
                Context.animateTo({ duration: 100, curve: Curve.EaseOut }, () => {
                    this.shakeTranslateY = 0;
                    this.shakeScale = 1;
                });
            }, 100);
        }, 100);
    }
    rerender() {
        this.updateDirtyElements();
    }
}
(function () {
    if (typeof NavigationBuilderRegister === "function") {
        NavigationBuilderRegister("LoginPage", wrapBuilder(init));
    }
})();
