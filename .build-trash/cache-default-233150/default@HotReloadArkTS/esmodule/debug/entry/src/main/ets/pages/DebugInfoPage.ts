if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface debug_Params {
    pageInfos?: NavPathStack;
    activityId?: string;
    hostCookies?: string;
    opLog?: string;
    captchaSession?: number;
}
import { CaptchaComponent } from "@normalized:N&&&entry/src/main/ets/Component/Captcha&";
import type { CaptchaUserParam } from "@normalized:N&&&entry/src/main/ets/Component/Captcha&";
import { GestureSignComponent } from "@normalized:N&&&entry/src/main/ets/Component/GestureSignComponent&";
import { PasswordSignComponent } from "@normalized:N&&&entry/src/main/ets/Component/PasswordSignComponent&";
import { QRCodeLocation } from "@normalized:N&&&entry/src/main/ets/Component/QRCodeLocationCard&";
import type { QRCodePosition } from "@normalized:N&&&entry/src/main/ets/Component/QRCodeLocationCard&";
import { DatabaseManager } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
// 验证组件操作测试页（Debug 详情页，长按/连点头像 → 密码 → 「打开Debug详情页」进入）：
// 以 Tabs 分组件交互测试——滑块验证码（本地模拟）、手势、签到码、位置选点，
// 各组件的回调统一记入底部操作日志。手势/签到码/位置组件的"校验"依赖真实活动ID与登录态，
// 未填活动ID时仅可操作 UI（绘制/输入/选点），校验按钮会返回失败提示，属预期行为。
export function init(parent = null) {
    {
        (parent ? parent : this).observeComponentCreation2((elmtId, isInitialRender) => {
            if (isInitialRender) {
                let componentCall = new debug(parent ? parent : this, {}, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/DebugInfoPage.ets", line: 13, col: 3 });
                ViewPU.create(componentCall);
                let paramsLambda = () => {
                    return {};
                };
                componentCall.paramsGenerator_ = paramsLambda;
            }
            else {
                (parent ? parent : this).updateStateVarsOfChildByElmtId(elmtId, {});
            }
        }, { name: "debug" });
    }
}
export default class debug extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__pageInfos = this.initializeConsume('pathInfos', "pageInfos");
        this.__activityId = new ObservedPropertySimplePU('', this, "activityId");
        this.__hostCookies = new ObservedPropertySimplePU('', this, "hostCookies");
        this.__opLog = new ObservedPropertySimplePU('尚未触发组件回调', this, "opLog");
        this.__captchaSession = new ObservedPropertySimplePU(1, this, "captchaSession");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: debug_Params) {
        if (params.activityId !== undefined) {
            this.activityId = params.activityId;
        }
        if (params.hostCookies !== undefined) {
            this.hostCookies = params.hostCookies;
        }
        if (params.opLog !== undefined) {
            this.opLog = params.opLog;
        }
        if (params.captchaSession !== undefined) {
            this.captchaSession = params.captchaSession;
        }
    }
    updateStateVars(params: debug_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__pageInfos.purgeDependencyOnElmtId(rmElmtId);
        this.__activityId.purgeDependencyOnElmtId(rmElmtId);
        this.__hostCookies.purgeDependencyOnElmtId(rmElmtId);
        this.__opLog.purgeDependencyOnElmtId(rmElmtId);
        this.__captchaSession.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__pageInfos.aboutToBeDeleted();
        this.__activityId.aboutToBeDeleted();
        this.__hostCookies.aboutToBeDeleted();
        this.__opLog.aboutToBeDeleted();
        this.__captchaSession.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __pageInfos: ObservedPropertyAbstractPU<NavPathStack>;
    get pageInfos() {
        return this.__pageInfos.get();
    }
    set pageInfos(newValue: NavPathStack) {
        this.__pageInfos.set(newValue);
    }
    private __activityId: ObservedPropertySimplePU<string>;
    get activityId() {
        return this.__activityId.get();
    }
    set activityId(newValue: string) {
        this.__activityId.set(newValue);
    }
    private __hostCookies: ObservedPropertySimplePU<string>;
    get hostCookies() {
        return this.__hostCookies.get();
    }
    set hostCookies(newValue: string) {
        this.__hostCookies.set(newValue);
    }
    private __opLog: ObservedPropertySimplePU<string>;
    get opLog() {
        return this.__opLog.get();
    }
    set opLog(newValue: string) {
        this.__opLog.set(newValue);
    }
    private __captchaSession: ObservedPropertySimplePU<number>;
    get captchaSession() {
        return this.__captchaSession.get();
    }
    set captchaSession(newValue: number) {
        this.__captchaSession.set(newValue);
    }
    aboutToAppear(): void {
        this.loadHostCookies();
    }
    /** 主用户 cookies：手势/签到码组件的即时校验用（本地 DB 读取，不发网络请求） */
    private async loadHostCookies(): Promise<void> {
        try {
            const host = await DatabaseManager.getInstance().getUserByPosition(1, true);
            this.hostCookies = host?.cookies ?? '';
        }
        catch (e) {
            this.hostCookies = '';
        }
    }
    private log(line: string): void {
        const time = new Date().toTimeString().substring(0, 8);
        this.opLog = `${time} ${line}\n${this.opLog}`;
    }
    /** 验证码演示用用户上下文：demoMode 全程本地模拟，不访问网络 */
    private captchaDemoUser(): CaptchaUserParam {
        return {
            cookies: 'demo',
            uname: '组件演示用户',
            refererParams: {
                courseId: 'demo',
                classId: 'demo',
                activePrimaryId: this.activityId || 'demo',
                uid: 'demo'
            }
        };
    }
    CaptchaTab(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Scroll.create();
            Scroll.align(Alignment.Top);
            Scroll.width('100%');
            Scroll.height('100%');
        }, Scroll);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create({ space: 12 });
            Column.width('100%');
            Column.padding(12);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('滑块验证码组件（demoMode 本地模拟：奇数轮演示校验成功，偶数轮演示失败回退手动）');
            Text.fontSize(12);
            Text.fontColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.width('100%');
        }, Text);
        Text.pop();
        {
            this.observeComponentCreation2((elmtId, isInitialRender) => {
                if (isInitialRender) {
                    let componentCall = new CaptchaComponent(this, {
                        demoMode: true,
                        captchaUser: this.captchaDemoUser(),
                        captchaSession: this.captchaSession,
                        onValidated: (validate: string) => {
                            this.log(`[滑块验证码] onValidated(validate=${validate.substring(0, 24)}...)`);
                        },
                        onSkip: () => {
                            this.log('[滑块验证码] onSkip() 手动跳过');
                        }
                    }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/DebugInfoPage.ets", line: 67, col: 9 });
                    ViewPU.create(componentCall);
                    let paramsLambda = () => {
                        return {
                            demoMode: true,
                            captchaUser: this.captchaDemoUser(),
                            captchaSession: this.captchaSession,
                            onValidated: (validate: string) => {
                                this.log(`[滑块验证码] onValidated(validate=${validate.substring(0, 24)}...)`);
                            },
                            onSkip: () => {
                                this.log('[滑块验证码] onSkip() 手动跳过');
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
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('重跑演示（会话号+1）');
            Button.fontSize(13);
            Button.height(36);
            Button.onClick(() => {
                this.captchaSession++;
                this.log(`[滑块验证码] 重跑演示，会话号=${this.captchaSession}`);
            });
        }, Button);
        Button.pop();
        Column.pop();
        Scroll.pop();
    }
    GestureTab(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Scroll.create();
            Scroll.align(Alignment.Top);
            Scroll.width('100%');
            Scroll.height('100%');
        }, Scroll);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.padding(12);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('手势签到组件（3x3 绘制 → 校验 → onSignCode 回传手势码；校验需真实活动ID）');
            Text.fontSize(12);
            Text.fontColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.width('100%');
            Text.margin({ bottom: 12 });
        }, Text);
        Text.pop();
        {
            this.observeComponentCreation2((elmtId, isInitialRender) => {
                if (isInitialRender) {
                    let componentCall = new GestureSignComponent(this, {
                        activityId: this.activityId || 'debug',
                        hostCookies: this.hostCookies,
                        onSignCode: (code: string) => {
                            this.log(code ? `[手势签到] onSignCode(${code})` : '[手势签到] onSignCode(\'\') 已重置/失效');
                        }
                    }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/DebugInfoPage.ets", line: 105, col: 9 });
                    ViewPU.create(componentCall);
                    let paramsLambda = () => {
                        return {
                            activityId: this.activityId || 'debug',
                            hostCookies: this.hostCookies,
                            onSignCode: (code: string) => {
                                this.log(code ? `[手势签到] onSignCode(${code})` : '[手势签到] onSignCode(\'\') 已重置/失效');
                            }
                        };
                    };
                    componentCall.paramsGenerator_ = paramsLambda;
                }
                else {
                    this.updateStateVarsOfChildByElmtId(elmtId, {
                        activityId: this.activityId || 'debug',
                        hostCookies: this.hostCookies
                    });
                }
            }, { name: "GestureSignComponent" });
        }
        Column.pop();
        Scroll.pop();
    }
    PasswordTab(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Scroll.create();
            Scroll.align(Alignment.Top);
            Scroll.width('100%');
            Scroll.height('100%');
        }, Scroll);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.padding(12);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('签到码组件（4-8 位数字输入 → 校验 → onSignCode 回传；校验需真实活动ID）');
            Text.fontSize(12);
            Text.fontColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.width('100%');
            Text.margin({ bottom: 12 });
        }, Text);
        Text.pop();
        {
            this.observeComponentCreation2((elmtId, isInitialRender) => {
                if (isInitialRender) {
                    let componentCall = new PasswordSignComponent(this, {
                        activityId: this.activityId || 'debug',
                        hostCookies: this.hostCookies,
                        onSignCode: (code: string) => {
                            this.log(code ? `[签到码] onSignCode(${code})` : '[签到码] onSignCode(\'\') 已重置/失效');
                        }
                    }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/DebugInfoPage.ets", line: 131, col: 9 });
                    ViewPU.create(componentCall);
                    let paramsLambda = () => {
                        return {
                            activityId: this.activityId || 'debug',
                            hostCookies: this.hostCookies,
                            onSignCode: (code: string) => {
                                this.log(code ? `[签到码] onSignCode(${code})` : '[签到码] onSignCode(\'\') 已重置/失效');
                            }
                        };
                    };
                    componentCall.paramsGenerator_ = paramsLambda;
                }
                else {
                    this.updateStateVarsOfChildByElmtId(elmtId, {
                        activityId: this.activityId || 'debug',
                        hostCookies: this.hostCookies
                    });
                }
            }, { name: "PasswordSignComponent" });
        }
        Column.pop();
        Scroll.pop();
    }
    LocationTab(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Scroll.create();
            Scroll.align(Alignment.Top);
            Scroll.width('100%');
            Scroll.height('100%');
        }, Scroll);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.padding(12);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('二维码位置选点卡片（读取要求位置 → 地图选点 → onPositionChange 回传 BD-09 坐标）');
            Text.fontSize(12);
            Text.fontColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.width('100%');
            Text.margin({ bottom: 12 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            __Recycle__.create();
        }, __Recycle__);
        {
            this.observeRecycleComponentCreation("QRCodeLocation", (elmtId, isInitialRender, recycleNode = null) => {
                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                if (isInitialRender) {
                    let componentCall = recycleNode ? recycleNode : new QRCodeLocation(this, {
                        ActivityId: this.activityId,
                        positionRequired: true,
                        onPositionChange: (position: QRCodePosition) => {
                            this.log(`[位置选点] onPositionChange(${position.address}) ` +
                                `lat=${position.latitude} lng=${position.longitude}`);
                        }
                    }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/DebugInfoPage.ets", line: 157, col: 9 });
                    ViewPU.createRecycle(componentCall, recycleNode !== null, "QRCodeLocation", () => {
                        if (recycleNode && typeof recycleNode.aboutToReuseInternal === "function") {
                            recycleNode.aboutToReuseInternal();
                        }
                        else {
                            if (recycleNode.aboutToReuse && typeof recycleNode.aboutToReuse === "function") {
                                recycleNode.aboutToReuse({ ActivityId: this.activityId,
                                    positionRequired: true,
                                    onPositionChange: (position: QRCodePosition) => {
                                        this.log(`[位置选点] onPositionChange(${position.address}) ` +
                                            `lat=${position.latitude} lng=${position.longitude}`);
                                    } });
                            }
                            recycleNode.rerender();
                        }
                    });
                    let paramsLambda = () => {
                        return {
                            ActivityId: this.activityId,
                            positionRequired: true,
                            onPositionChange: (position: QRCodePosition) => {
                                this.log(`[位置选点] onPositionChange(${position.address}) ` +
                                    `lat=${position.latitude} lng=${position.longitude}`);
                            }
                        };
                    };
                    componentCall.paramsGenerator_ = paramsLambda;
                }
                else {
                    this.updateStateVarsOfChildByElmtId(elmtId, {
                        ActivityId: this.activityId,
                        positionRequired: true
                    });
                }
                ViewStackProcessor.StopGetAccessRecording();
            });
        }
        __Recycle__.pop();
        Column.pop();
        Scroll.pop();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            NavDestination.create(() => {
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.width('100%');
                    Column.height('100%');
                    Column.backgroundColor({ "id": 125829132, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create({ space: 12 });
                    Row.width('100%');
                    Row.padding({ left: 16, right: 16, top: 12, bottom: 8 });
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Button.createWithLabel('返回');
                    Button.fontSize(13);
                    Button.height(32);
                    Button.onClick(() => { this.pageInfos.pop(); });
                }, Button);
                Button.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('验证组件操作测试');
                    Text.fontSize(18);
                    Text.fontWeight(FontWeight.Bold);
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Blank.create();
                }, Blank);
                Blank.pop();
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    TextInput.create({ placeholder: '活动ID activeId（手势/签到码/位置校验用，可留空）', text: this.activityId });
                    TextInput.width('100%');
                    TextInput.height(40);
                    TextInput.fontSize(13);
                    TextInput.backgroundColor({ "id": 125829492, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    TextInput.padding({ left: 16, right: 16 });
                    TextInput.onChange((value: string) => {
                        this.activityId = value;
                    });
                }, TextInput);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Tabs.create();
                    Tabs.layoutWeight(1);
                    Tabs.barPosition(BarPosition.End);
                    Tabs.width('100%');
                }, Tabs);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    TabContent.create(() => {
                        this.CaptchaTab.bind(this)();
                    });
                    TabContent.tabBar('滑块验证码');
                }, TabContent);
                TabContent.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    TabContent.create(() => {
                        this.GestureTab.bind(this)();
                    });
                    TabContent.tabBar('手势签到');
                }, TabContent);
                TabContent.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    TabContent.create(() => {
                        this.PasswordTab.bind(this)();
                    });
                    TabContent.tabBar('签到码');
                }, TabContent);
                TabContent.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    TabContent.create(() => {
                        this.LocationTab.bind(this)();
                    });
                    TabContent.tabBar('位置选点');
                }, TabContent);
                TabContent.pop();
                Tabs.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.alignItems(HorizontalAlign.Start);
                    Column.width('100%');
                    Column.padding({ left: 16, right: 16, top: 8, bottom: 12 });
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create('操作日志');
                    Text.fontSize(12);
                    Text.fontColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                    Text.margin({ bottom: 4 });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Scroll.create();
                    Scroll.constraintSize({ maxHeight: 120 });
                    Scroll.align(Alignment.TopStart);
                }, Scroll);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create(this.opLog);
                    Text.fontSize(12);
                    Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Text.width('100%');
                }, Text);
                Text.pop();
                Scroll.pop();
                Column.pop();
                Column.pop();
            }, { moduleName: "entry", pagePath: "entry/src/main/ets/pages/DebugInfoPage" });
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
        NavigationBuilderRegister("Debug", wrapBuilder(init));
    }
})();
