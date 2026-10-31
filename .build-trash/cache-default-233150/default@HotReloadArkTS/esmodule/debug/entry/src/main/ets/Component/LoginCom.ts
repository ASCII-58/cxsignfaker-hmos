if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface loginByURL_Params {
    otherUserList?: UserDataAndId[];
    LoginURL?: string;
    LoginEnable?: boolean;
    isShow?: boolean;
    urlTranslateY?: number;
    urlScale?: number;
    isLoading?: boolean;
    loginBtnLight?: hdsEffect.PointLightSourceType;
}
interface loginByCommon_Params {
    otherUserList?: UserDataAndId[];
    username?: string;
    password?: string;
    LoginEnable?: boolean;
    isShow?: boolean;
    commonTranslateY?: number;
    commonScale?: number;
    isLoading?: boolean;
    isPasswordVisible?: boolean;
    loginBtnLight?: hdsEffect.PointLightSourceType;
}
import promptAction from "@ohos:promptAction";
import { DatabaseManager } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import type { UserData, UserDataAndId } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import { loginFunction } from "@normalized:N&&&entry/src/main/ets/utils/Login&";
import { ChaoxingUtils } from "@normalized:N&&&entry/src/main/ets/utils/utils&";
import { hdsEffect } from "@hms:hds.hdsBaseComponent";
export class loginByCommon extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__otherUserList = new SynchedPropertyObjectTwoWayPU(params.otherUserList, this, "otherUserList");
        this.__username = new ObservedPropertySimplePU('', this, "username");
        this.__password = new ObservedPropertySimplePU('', this, "password");
        this.__LoginEnable = new ObservedPropertySimplePU(false, this, "LoginEnable");
        this.__isShow = new SynchedPropertySimpleTwoWayPU(params.isShow, this, "isShow");
        this.__commonTranslateY = new ObservedPropertySimplePU(0, this, "commonTranslateY");
        this.__commonScale = new ObservedPropertySimplePU(1, this, "commonScale");
        this.__isLoading = new ObservedPropertySimplePU(false, this, "isLoading");
        this.__isPasswordVisible = new ObservedPropertySimplePU(false, this, "isPasswordVisible");
        this.__loginBtnLight = new ObservedPropertySimplePU(hdsEffect.PointLightSourceType.NONE, this, "loginBtnLight");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: loginByCommon_Params) {
        if (params.username !== undefined) {
            this.username = params.username;
        }
        if (params.password !== undefined) {
            this.password = params.password;
        }
        if (params.LoginEnable !== undefined) {
            this.LoginEnable = params.LoginEnable;
        }
        if (params.commonTranslateY !== undefined) {
            this.commonTranslateY = params.commonTranslateY;
        }
        if (params.commonScale !== undefined) {
            this.commonScale = params.commonScale;
        }
        if (params.isLoading !== undefined) {
            this.isLoading = params.isLoading;
        }
        if (params.isPasswordVisible !== undefined) {
            this.isPasswordVisible = params.isPasswordVisible;
        }
        if (params.loginBtnLight !== undefined) {
            this.loginBtnLight = params.loginBtnLight;
        }
    }
    updateStateVars(params: loginByCommon_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__otherUserList.purgeDependencyOnElmtId(rmElmtId);
        this.__username.purgeDependencyOnElmtId(rmElmtId);
        this.__password.purgeDependencyOnElmtId(rmElmtId);
        this.__LoginEnable.purgeDependencyOnElmtId(rmElmtId);
        this.__isShow.purgeDependencyOnElmtId(rmElmtId);
        this.__commonTranslateY.purgeDependencyOnElmtId(rmElmtId);
        this.__commonScale.purgeDependencyOnElmtId(rmElmtId);
        this.__isLoading.purgeDependencyOnElmtId(rmElmtId);
        this.__isPasswordVisible.purgeDependencyOnElmtId(rmElmtId);
        this.__loginBtnLight.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__otherUserList.aboutToBeDeleted();
        this.__username.aboutToBeDeleted();
        this.__password.aboutToBeDeleted();
        this.__LoginEnable.aboutToBeDeleted();
        this.__isShow.aboutToBeDeleted();
        this.__commonTranslateY.aboutToBeDeleted();
        this.__commonScale.aboutToBeDeleted();
        this.__isLoading.aboutToBeDeleted();
        this.__isPasswordVisible.aboutToBeDeleted();
        this.__loginBtnLight.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    updateRecycleElmtId(oldElmtId, newElmtId) {
        this.__otherUserList.updateElmtId(oldElmtId, newElmtId);
        this.__username.updateElmtId(oldElmtId, newElmtId);
        this.__password.updateElmtId(oldElmtId, newElmtId);
        this.__LoginEnable.updateElmtId(oldElmtId, newElmtId);
        this.__isShow.updateElmtId(oldElmtId, newElmtId);
        this.__commonTranslateY.updateElmtId(oldElmtId, newElmtId);
        this.__commonScale.updateElmtId(oldElmtId, newElmtId);
        this.__isLoading.updateElmtId(oldElmtId, newElmtId);
        this.__isPasswordVisible.updateElmtId(oldElmtId, newElmtId);
        this.__loginBtnLight.updateElmtId(oldElmtId, newElmtId);
    }
    private __otherUserList: SynchedPropertySimpleOneWayPU<UserDataAndId[]>;
    get otherUserList() {
        return this.__otherUserList.get();
    }
    set otherUserList(newValue: UserDataAndId[]) {
        this.__otherUserList.set(newValue);
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
    private __isShow: SynchedPropertySimpleTwoWayPU<boolean>;
    get isShow() {
        return this.__isShow.get();
    }
    set isShow(newValue: boolean) {
        this.__isShow.set(newValue);
    }
    private __commonTranslateY: ObservedPropertySimplePU<number>;
    get commonTranslateY() {
        return this.__commonTranslateY.get();
    }
    set commonTranslateY(newValue: number) {
        this.__commonTranslateY.set(newValue);
    }
    private __commonScale: ObservedPropertySimplePU<number>;
    get commonScale() {
        return this.__commonScale.get();
    }
    set commonScale(newValue: number) {
        this.__commonScale.set(newValue);
    }
    private __isLoading: ObservedPropertySimplePU<boolean>;
    get isLoading() {
        return this.__isLoading.get();
    }
    set isLoading(newValue: boolean) {
        this.__isLoading.set(newValue);
    }
    private __isPasswordVisible: ObservedPropertySimplePU<boolean>;
    get isPasswordVisible() {
        return this.__isPasswordVisible.get();
    }
    set isPasswordVisible(newValue: boolean) {
        this.__isPasswordVisible.set(newValue);
    }
    private __loginBtnLight: ObservedPropertySimplePU<hdsEffect.PointLightSourceType>;
    get loginBtnLight() {
        return this.__loginBtnLight.get();
    }
    set loginBtnLight(newValue: hdsEffect.PointLightSourceType) {
        this.__loginBtnLight.set(newValue);
    }
    async handleLogin() {
        this.isLoading = true;
        try {
            const uname = ChaoxingUtils.encryptByAES(this.username);
            const pwd = ChaoxingUtils.encryptByAES(this.password);
            const result = await loginFunction.LoginChaoXing(ChaoxingUtils.getLoginBody(uname, pwd));
            if (result.ok && result.cookies) {
                const cookies = result.cookies;
                const info = await loginFunction.getUserInfo(cookies);
                try {
                    const dbManager = DatabaseManager.getInstance();
                    const userData: UserData = {
                        phone: this.username,
                        pwd: pwd,
                        cookies: cookies,
                        uid: info.uid
                    };
                    let operationResult = await dbManager.insertUser(userData);
                    if (operationResult === 1) {
                        promptAction.showToast({ message: '登录成功', duration: 2000 });
                        this.otherUserList = await dbManager.getAllUsers();
                        this.isShow = !this.isShow;
                    }
                    else if (operationResult === 0) {
                        promptAction.showToast({ message: '数据库异常，可能需要重启应用', duration: 10000 });
                    }
                    else {
                        promptAction.showToast({ message: '用户已登录', duration: 2000 });
                    }
                    this.username = '';
                    this.password = '';
                }
                catch (e) {
                    this.username = '';
                    this.password = '';
                    if (e instanceof Error) {
                        promptAction.showToast({
                            message: '添加失败，请重试' +
                                (e.message.includes("手机号已存在，请使用其他手机号") ? ', 该账号已添加' : ''),
                            duration: 2000
                        });
                        this.triggerShakeAnimation();
                        return;
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
        finally {
            this.isLoading = false;
        }
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.translate({ y: this.commonTranslateY });
            Column.scale({ x: this.commonScale, y: this.commonScale });
            if (isInitialRender) {
                Column.width('100%');
                Column.constraintSize({ minHeight: '100%' });
            }
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('账号登录');
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
            Column.create({ space: 15 });
            if (isInitialRender) {
                Column.padding({ left: 20, right: 20 });
                Column.margin({ bottom: 30 });
            }
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TextInput.create({ placeholder: '手机号', text: this.username });
            TextInput.backgroundColor({ "id": 16777258, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                TextInput.type(InputType.PhoneNumber);
                TextInput.cancelButton({ style: CancelButtonStyle.INPUT });
                TextInput.enterKeyType(EnterKeyType.Next);
                TextInput.onChange((value: string) => {
                    this.username = value;
                    if (this.username && this.password) {
                        this.LoginEnable = true;
                    }
                });
                TextInput.placeholderFont({ size: 16 });
                TextInput.height(50);
                TextInput.width('100%');
                TextInput.borderRadius(12);
                TextInput.padding({ left: 15, right: 15 });
            }
        }, TextInput);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Stack.create({ alignContent: Alignment.End });
            if (isInitialRender) {
                Stack.width('100%');
            }
        }, Stack);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TextInput.create({ placeholder: '密码', text: this.password });
            TextInput.fontColor(this.isPasswordVisible ? { "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : Color.Transparent);
            TextInput.fontFamily(this.isPasswordVisible ? 'HarmonyOS Sans' : 'monospace');
            TextInput.caretColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            TextInput.backgroundColor({ "id": 16777258, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                TextInput.type(InputType.Normal);
                TextInput.enterKeyType(EnterKeyType.Go);
                TextInput.onSubmit(() => {
                    if (this.LoginEnable && !this.isLoading) {
                        this.handleLogin();
                    }
                });
                TextInput.onChange((value: string) => {
                    this.password = value;
                    if (this.username && this.password) {
                        this.LoginEnable = true;
                    }
                });
                TextInput.placeholderFont({ size: 16 });
                TextInput.height(50);
                TextInput.width('100%');
                TextInput.borderRadius(12);
                TextInput.padding({ left: 15, right: 40 });
            }
        }, TextInput);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (!this.isPasswordVisible && this.password.length > 0) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.password.replace(/./g, '•'));
                        Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        if (isInitialRender) {
                            Text.fontSize(16);
                            Text.fontFamily('monospace');
                            Text.maxLines(1);
                            Text.textOverflow({ overflow: TextOverflow.Clip });
                            Text.width('100%');
                            Text.height(50);
                            Text.padding({ left: 15, right: 40 });
                            Text.hitTestBehavior(HitTestMode.None);
                        }
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
            Image.create(this.isPasswordVisible ? { "id": 16777271, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : { "id": 16777272, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Image.fillColor({ "id": 16777260, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                Image.draggable(false);
                Image.width(24);
                Image.height(24);
                Image.margin({ right: 12 });
                Image.onClick(() => {
                    this.isPasswordVisible = !this.isPasswordVisible;
                });
            }
        }, Image);
        Stack.pop();
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithChild();
            Button.enabled(this.LoginEnable && !this.isLoading);
            Button.backgroundColor({ "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.visualEffect(new hdsEffect.HdsEffectBuilder()
                .pointLight({
                sourceType: this.loginBtnLight,
                illuminatedType: hdsEffect.PointLightIlluminatedType.BORDER
            })
                .buildEffect());
            if (isInitialRender) {
                Button.type(ButtonType.Capsule);
                Button.width('90%');
                Button.height(50);
                Button.shadow({ radius: 8, color: '#00000020', offsetY: 4 });
                Button.onTouch((event: TouchEvent) => {
                    if (event.type === TouchType.Down) {
                        Context.animateTo({ duration: 200, curve: Curve.EaseInOut }, () => {
                            this.loginBtnLight = hdsEffect.PointLightSourceType.BRIGHT;
                        });
                    }
                    else if (event.type === TouchType.Up || event.type === TouchType.Cancel) {
                        Context.animateTo({ duration: 200, curve: Curve.EaseInOut }, () => {
                            this.loginBtnLight = hdsEffect.PointLightSourceType.NONE;
                        });
                    }
                });
                Button.onClick(() => {
                    this.handleLogin();
                });
                Button.margin({ bottom: 20 });
            }
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
                        LoadingProgress.color({ "id": 16777259, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        if (isInitialRender) {
                            LoadingProgress.width(20);
                            LoadingProgress.height(20);
                            LoadingProgress.margin({ right: 10 });
                        }
                    }, LoadingProgress);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('登录中...');
                        Text.fontColor({ "id": 16777259, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        if (isInitialRender) {
                            Text.fontSize(18);
                            Text.fontWeight(FontWeight.Medium);
                        }
                    }, Text);
                    Text.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('登录');
                        Text.fontColor({ "id": 16777259, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        if (isInitialRender) {
                            Text.fontSize(18);
                            Text.fontWeight(FontWeight.Medium);
                        }
                    }, Text);
                    Text.pop();
                });
            }
        }, If);
        If.pop();
        Row.pop();
        Button.pop();
        Column.pop();
    }
    // Trigger shake animation for error feedback
    private triggerShakeAnimation() {
        Context.animateTo({ duration: 100, curve: Curve.EaseOut }, () => {
            this.commonTranslateY = 10;
            this.commonScale = 0.98;
        });
        setTimeout(() => {
            Context.animateTo({ duration: 100, curve: Curve.EaseOut }, () => {
                this.commonTranslateY = -10;
            });
            setTimeout(() => {
                Context.animateTo({ duration: 100, curve: Curve.EaseOut }, () => {
                    this.commonTranslateY = 0;
                    this.commonScale = 1;
                });
            }, 100);
        }, 100);
    }
    rerender() {
        this.updateDirtyElements();
    }
}
export class loginByURL extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__otherUserList = new SynchedPropertyObjectTwoWayPU(params.otherUserList, this, "otherUserList");
        this.__LoginURL = new ObservedPropertySimplePU('', this, "LoginURL");
        this.__LoginEnable = new ObservedPropertySimplePU(false, this, "LoginEnable");
        this.__isShow = new SynchedPropertySimpleTwoWayPU(params.isShow, this, "isShow");
        this.__urlTranslateY = new ObservedPropertySimplePU(0, this, "urlTranslateY");
        this.__urlScale = new ObservedPropertySimplePU(1, this, "urlScale");
        this.__isLoading = new ObservedPropertySimplePU(false, this, "isLoading");
        this.__loginBtnLight = new ObservedPropertySimplePU(hdsEffect.PointLightSourceType.NONE, this, "loginBtnLight");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: loginByURL_Params) {
        if (params.LoginURL !== undefined) {
            this.LoginURL = params.LoginURL;
        }
        if (params.LoginEnable !== undefined) {
            this.LoginEnable = params.LoginEnable;
        }
        if (params.urlTranslateY !== undefined) {
            this.urlTranslateY = params.urlTranslateY;
        }
        if (params.urlScale !== undefined) {
            this.urlScale = params.urlScale;
        }
        if (params.isLoading !== undefined) {
            this.isLoading = params.isLoading;
        }
        if (params.loginBtnLight !== undefined) {
            this.loginBtnLight = params.loginBtnLight;
        }
    }
    updateStateVars(params: loginByURL_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__otherUserList.purgeDependencyOnElmtId(rmElmtId);
        this.__LoginURL.purgeDependencyOnElmtId(rmElmtId);
        this.__LoginEnable.purgeDependencyOnElmtId(rmElmtId);
        this.__isShow.purgeDependencyOnElmtId(rmElmtId);
        this.__urlTranslateY.purgeDependencyOnElmtId(rmElmtId);
        this.__urlScale.purgeDependencyOnElmtId(rmElmtId);
        this.__isLoading.purgeDependencyOnElmtId(rmElmtId);
        this.__loginBtnLight.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__otherUserList.aboutToBeDeleted();
        this.__LoginURL.aboutToBeDeleted();
        this.__LoginEnable.aboutToBeDeleted();
        this.__isShow.aboutToBeDeleted();
        this.__urlTranslateY.aboutToBeDeleted();
        this.__urlScale.aboutToBeDeleted();
        this.__isLoading.aboutToBeDeleted();
        this.__loginBtnLight.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    updateRecycleElmtId(oldElmtId, newElmtId) {
        this.__otherUserList.updateElmtId(oldElmtId, newElmtId);
        this.__LoginURL.updateElmtId(oldElmtId, newElmtId);
        this.__LoginEnable.updateElmtId(oldElmtId, newElmtId);
        this.__isShow.updateElmtId(oldElmtId, newElmtId);
        this.__urlTranslateY.updateElmtId(oldElmtId, newElmtId);
        this.__urlScale.updateElmtId(oldElmtId, newElmtId);
        this.__isLoading.updateElmtId(oldElmtId, newElmtId);
        this.__loginBtnLight.updateElmtId(oldElmtId, newElmtId);
    }
    private __otherUserList: SynchedPropertySimpleOneWayPU<UserDataAndId[]>;
    get otherUserList() {
        return this.__otherUserList.get();
    }
    set otherUserList(newValue: UserDataAndId[]) {
        this.__otherUserList.set(newValue);
    }
    private __LoginURL: ObservedPropertySimplePU<string>;
    get LoginURL() {
        return this.__LoginURL.get();
    }
    set LoginURL(newValue: string) {
        this.__LoginURL.set(newValue);
    }
    private __LoginEnable: ObservedPropertySimplePU<boolean>;
    get LoginEnable() {
        return this.__LoginEnable.get();
    }
    set LoginEnable(newValue: boolean) {
        this.__LoginEnable.set(newValue);
    }
    private __isShow: SynchedPropertySimpleTwoWayPU<boolean>;
    get isShow() {
        return this.__isShow.get();
    }
    set isShow(newValue: boolean) {
        this.__isShow.set(newValue);
    }
    private __urlTranslateY: ObservedPropertySimplePU<number>;
    get urlTranslateY() {
        return this.__urlTranslateY.get();
    }
    set urlTranslateY(newValue: number) {
        this.__urlTranslateY.set(newValue);
    }
    private __urlScale: ObservedPropertySimplePU<number>;
    get urlScale() {
        return this.__urlScale.get();
    }
    set urlScale(newValue: number) {
        this.__urlScale.set(newValue);
    }
    private __isLoading: ObservedPropertySimplePU<boolean>;
    get isLoading() {
        return this.__isLoading.get();
    }
    set isLoading(newValue: boolean) {
        this.__isLoading.set(newValue);
    }
    private __loginBtnLight: ObservedPropertySimplePU<hdsEffect.PointLightSourceType>;
    get loginBtnLight() {
        return this.__loginBtnLight.get();
    }
    set loginBtnLight(newValue: hdsEffect.PointLightSourceType) {
        this.__loginBtnLight.set(newValue);
    }
    async handleLogin() {
        this.isLoading = true;
        try {
            const LoginMSG = await loginFunction.LoginByURL(this.LoginURL);
            promptAction.showToast({ message: LoginMSG });
            if (LoginMSG === '添加成功') {
                let dbManager = DatabaseManager.getInstance();
                this.otherUserList = await dbManager.getAllUsers();
                this.isShow = !this.isShow;
            }
            else {
                this.LoginURL = '';
                this.LoginEnable = false;
                this.triggerShakeAnimation();
            }
        }
        finally {
            this.isLoading = false;
        }
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.translate({ y: this.urlTranslateY });
            Column.scale({ x: this.urlScale, y: this.urlScale });
            if (isInitialRender) {
                Column.width('100%');
                Column.constraintSize({ minHeight: '100%' });
            }
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('链接登录');
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
            Column.create({ space: 15 });
            if (isInitialRender) {
                Column.padding({ left: 20, right: 20 });
                Column.margin({ bottom: 30 });
            }
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TextInput.create({ placeholder: 'URL', text: this.LoginURL });
            TextInput.backgroundColor({ "id": 16777258, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                TextInput.type(InputType.Normal);
                TextInput.cancelButton({ style: CancelButtonStyle.INPUT });
                TextInput.enterKeyType(EnterKeyType.Go);
                TextInput.onSubmit(() => {
                    if (this.LoginEnable && !this.isLoading) {
                        this.handleLogin();
                    }
                });
                TextInput.onChange((value: string) => {
                    this.LoginURL = value;
                    if (this.LoginURL) {
                        this.LoginEnable = true;
                    }
                });
                TextInput.placeholderFont({ size: 16 });
                TextInput.height(50);
                TextInput.width('100%');
                TextInput.borderRadius(12);
                TextInput.padding({ left: 15, right: 15 });
            }
        }, TextInput);
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithChild();
            Button.enabled(this.LoginEnable && !this.isLoading);
            Button.backgroundColor({ "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.visualEffect(new hdsEffect.HdsEffectBuilder()
                .pointLight({
                sourceType: this.loginBtnLight,
                illuminatedType: hdsEffect.PointLightIlluminatedType.BORDER
            })
                .buildEffect());
            if (isInitialRender) {
                Button.type(ButtonType.Capsule);
                Button.width('90%');
                Button.height(50);
                Button.shadow({ radius: 8, color: '#00000020', offsetY: 4 });
                Button.onClick(() => {
                    this.handleLogin();
                });
                Button.onTouch((event: TouchEvent) => {
                    if (event.type === TouchType.Down) {
                        Context.animateTo({ duration: 200, curve: Curve.EaseInOut }, () => {
                            this.loginBtnLight = hdsEffect.PointLightSourceType.BRIGHT;
                        });
                    }
                    else if (event.type === TouchType.Up || event.type === TouchType.Cancel) {
                        Context.animateTo({ duration: 200, curve: Curve.EaseInOut }, () => {
                            this.loginBtnLight = hdsEffect.PointLightSourceType.NONE;
                        });
                    }
                });
                Button.margin({ bottom: 20 });
            }
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
                        LoadingProgress.color({ "id": 16777259, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        if (isInitialRender) {
                            LoadingProgress.width(20);
                            LoadingProgress.height(20);
                            LoadingProgress.margin({ right: 10 });
                        }
                    }, LoadingProgress);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('登录中...');
                        Text.fontColor({ "id": 16777259, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        if (isInitialRender) {
                            Text.fontSize(18);
                            Text.fontWeight(FontWeight.Medium);
                        }
                    }, Text);
                    Text.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('登录');
                        Text.fontColor({ "id": 16777259, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        if (isInitialRender) {
                            Text.fontSize(18);
                            Text.fontWeight(FontWeight.Medium);
                        }
                    }, Text);
                    Text.pop();
                });
            }
        }, If);
        If.pop();
        Row.pop();
        Button.pop();
        Column.pop();
    }
    // Trigger shake animation for error feedback
    private triggerShakeAnimation() {
        Context.animateTo({ duration: 100, curve: Curve.EaseOut }, () => {
            this.urlTranslateY = 10;
            this.urlScale = 0.98;
        });
        setTimeout(() => {
            Context.animateTo({ duration: 100, curve: Curve.EaseOut }, () => {
                this.urlTranslateY = -10;
            });
            setTimeout(() => {
                Context.animateTo({ duration: 100, curve: Curve.EaseOut }, () => {
                    this.urlTranslateY = 0;
                    this.urlScale = 1;
                });
            }, 100);
        }, 100);
    }
    rerender() {
        this.updateDirtyElements();
    }
}
