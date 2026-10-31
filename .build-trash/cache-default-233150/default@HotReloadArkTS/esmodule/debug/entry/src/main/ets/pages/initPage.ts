if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface UI_Params {
    pathInfos?: NavPathStack;
}
import { DatabaseManager } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import preferences from "@ohos:data.preferences";
import bundleManager from "@ohos:bundle.bundleManager";
import type common from "@ohos:app.ability.common";
import ConfigurationConstant from "@ohos:app.ability.ConfigurationConstant";
import JSON from "@ohos:util.json";
import http from "@ohos:net.http";
import { GITHUB_RUST_API } from "@normalized:N&&&entry/src/main/ets/utils/PublicAPI&";
const TAG = 'InitPage';
const DOMAIN = 0x0001;
const PREF_COLOR_MODE_KEY = 'app_color_mode';
const SIGN_TIME = 'sign_time';
const VERSION = 'version';
// 仅定义需要访问的部分
interface ReleaseInfo {
    created_at: string; // Release 的创建时间
    assets?: AssetInfo[]; // 资产数组（可选）
}
interface AssetInfo {
    created_at: string; // 资产的创建时间
}
// 常量定义
const HTTP_TIMEOUT_MS = 10000;
const ERROR_MAX_REDIRECTS = 'Number of redirects hit maximum amount';
const HTTP_SUCCESS_CODE = 200;
class UI extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__pathInfos = new ObservedPropertyObjectPU(new NavPathStack(), this, "pathInfos");
        this.addProvidedVar("pathInfos", this.__pathInfos, false);
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: UI_Params) {
        if (params.pathInfos !== undefined) {
            this.pathInfos = params.pathInfos;
        }
    }
    updateStateVars(params: UI_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__pathInfos.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__pathInfos.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __pathInfos: ObservedPropertyObjectPU<NavPathStack>;
    get pathInfos() {
        return this.__pathInfos.get();
    }
    set pathInfos(newValue: NavPathStack) {
        this.__pathInfos.set(newValue);
    }
    async aboutToAppear() {
        await this.applyColorMode();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Navigation.create(this.pathInfos, { moduleName: "entry", pagePath: "entry/src/main/ets/pages/initPage", isUserCreateStack: true });
            Navigation.backgroundColor({ "id": 125831007, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Navigation.hideBackButton(true);
            Navigation.ignoreLayoutSafeArea([LayoutSafeAreaType.SYSTEM]);
            Navigation.backgroundImageSize({ width: '100%', height: '100%' });
            Navigation.borderRadius({ "id": 125830913, "type": 10002, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Navigation.height('100%');
            Navigation.width('100%');
            Navigation.onAppear(async () => {
                await this.checkAppStatus();
                const dbManager = DatabaseManager.getInstance();
                const isHostLogin: boolean = !(await dbManager.isHostUserTableEmpty());
                if (isHostLogin) {
                    this.pathInfos.replacePath({ name: "HomePage" }, false);
                }
                else {
                    this.pathInfos.replacePath({
                        name: "LoginPage"
                    }, false);
                }
            });
        }, Navigation);
        Navigation.pop();
    }
    async applyColorMode() {
        try {
            const context = getContext(this) as common.UIAbilityContext;
            let pref = await preferences.getPreferences(context, 'settings');
            const index = await pref.get(PREF_COLOR_MODE_KEY, 0) as number;
            let mode: ConfigurationConstant.ColorMode;
            if (index === 0) {
                mode = ConfigurationConstant.ColorMode.COLOR_MODE_NOT_SET;
            }
            else if (index === 1) {
                mode = ConfigurationConstant.ColorMode.COLOR_MODE_LIGHT;
            }
            else {
                mode = ConfigurationConstant.ColorMode.COLOR_MODE_DARK;
            }
            context.getApplicationContext().setColorMode(mode);
        }
        catch (e) {
            console.error('Failed to apply color mode', e);
        }
    }
    async getUpdateTime(pref: preferences.Preferences, versionNow: string) {
        const httpRequest = http.createHttp();
        const url = GITHUB_RUST_API + versionNow;
        try {
            const result = await httpRequest.request(url, {
                method: http.RequestMethod.GET,
                header: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                connectTimeout: HTTP_TIMEOUT_MS,
                readTimeout: HTTP_TIMEOUT_MS,
            });
            if (result.responseCode === HTTP_SUCCESS_CODE) {
                const ResultBody = JSON.parse(result.result.toString()) as ReleaseInfo;
                const SignTimeStr = (ResultBody.assets as AssetInfo[])[0].created_at;
                let SignTime = new Date(SignTimeStr).getTime();
                await pref.put(SIGN_TIME, SignTime);
                await pref.put(VERSION, versionNow);
                await pref.flush();
                return;
            }
        }
        catch (error) {
            console.log('get github error', JSON.stringify(error));
        }
        finally {
            httpRequest.destroy();
        }
        const signTime = await pref.get(SIGN_TIME, 0) as number;
        if (signTime === 0) {
            await pref.put(SIGN_TIME, Date.now());
        }
        await pref.put(VERSION, versionNow);
        await pref.flush();
    }
    async checkAppStatus() {
        const context = getContext(this) as common.UIAbilityContext;
        let pref = await preferences.getPreferences(context, 'settings');
        const signTime = await pref.get(SIGN_TIME, 0) as number;
        if (signTime === 0) {
            let bundleInfo = await bundleManager.getBundleInfoForSelf(bundleManager.BundleFlag.GET_BUNDLE_INFO_WITH_APPLICATION);
            await this.getUpdateTime(pref, bundleInfo.versionName);
        }
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "UI";
    }
}
registerNamedRoute(() => new UI(undefined, {}), "", { bundleName: "com.xhub.chaoxingsignfaker", moduleName: "entry", pagePath: "pages/initPage", pageFullPath: "entry/src/main/ets/pages/initPage", integratedHsp: "false", moduleType: "followWithHap" });
