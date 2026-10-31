if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface GestureSignComponent_Params {
    activityId?: string;
    hostCookies?: string;
    /** 校验通过回传手势码，重置/失效回传 '' */
    onSignCode?: (code: string) => void;
    gesturePattern?: number[];
    gesturePoints?: boolean[];
    codeReady?: boolean;
    resultMsg?: string;
    isValidating?: boolean;
}
import { Sign } from "@normalized:N&&&entry/src/main/ets/utils/sign&";
import hilog from "@ohos:hilog";
import promptAction from "@ohos:promptAction";
import { LightButton } from "@normalized:N&&&entry/src/main/ets/Component/LightButton&";
const TAG = 'GestureSignComponent';
const DOMAIN = 0x0009;
const GESTURE_GRID_SIZE = 9; // 手势网格大小（3x3）
const GESTURE_AREA_SIZE = 250; // 手势绘制区域边长（vp）
const CELL_PITCH = 90; // 相邻圆点中心距：250 = 3*70 + 2*20
const FIRST_CENTER = 35; // 首个圆点中心坐标
const HIT_RADIUS = 45; // 滑动时命中圆点的判定半径（vp）
export class GestureSignComponent extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__activityId = new SynchedPropertySimpleOneWayPU(params.activityId, this, "activityId");
        this.__hostCookies = new SynchedPropertySimpleOneWayPU(params.hostCookies, this, "hostCookies");
        this.onSignCode = undefined;
        this.__gesturePattern = new ObservedPropertyObjectPU([], this, "gesturePattern");
        this.__gesturePoints = new ObservedPropertyObjectPU(Array(GESTURE_GRID_SIZE).fill(false), this, "gesturePoints");
        this.__codeReady = new ObservedPropertySimplePU(false, this, "codeReady");
        this.__resultMsg = new ObservedPropertySimplePU('', this, "resultMsg");
        this.__isValidating = new ObservedPropertySimplePU(false, this, "isValidating");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: GestureSignComponent_Params) {
        if (params.onSignCode !== undefined) {
            this.onSignCode = params.onSignCode;
        }
        if (params.gesturePattern !== undefined) {
            this.gesturePattern = params.gesturePattern;
        }
        if (params.gesturePoints !== undefined) {
            this.gesturePoints = params.gesturePoints;
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
    updateStateVars(params: GestureSignComponent_Params) {
        this.__activityId.reset(params.activityId);
        this.__hostCookies.reset(params.hostCookies);
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__activityId.purgeDependencyOnElmtId(rmElmtId);
        this.__hostCookies.purgeDependencyOnElmtId(rmElmtId);
        this.__gesturePattern.purgeDependencyOnElmtId(rmElmtId);
        this.__gesturePoints.purgeDependencyOnElmtId(rmElmtId);
        this.__codeReady.purgeDependencyOnElmtId(rmElmtId);
        this.__resultMsg.purgeDependencyOnElmtId(rmElmtId);
        this.__isValidating.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__activityId.aboutToBeDeleted();
        this.__hostCookies.aboutToBeDeleted();
        this.__gesturePattern.aboutToBeDeleted();
        this.__gesturePoints.aboutToBeDeleted();
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
    /** 主用户 Cookie，仅用于即时校验手势码 */
    private __hostCookies: SynchedPropertySimpleOneWayPU<string>;
    get hostCookies() {
        return this.__hostCookies.get();
    }
    set hostCookies(newValue: string) {
        this.__hostCookies.set(newValue);
    }
    /** 校验通过回传手势码，重置/失效回传 '' */
    private onSignCode?: (code: string) => void;
    private __gesturePattern: ObservedPropertyObjectPU<number[]>; // 手势顺序（1~9）
    get gesturePattern() {
        return this.__gesturePattern.get();
    }
    set gesturePattern(newValue: number[]) {
        this.__gesturePattern.set(newValue);
    }
    private __gesturePoints: ObservedPropertyObjectPU<boolean[]>;
    get gesturePoints() {
        return this.__gesturePoints.get();
    }
    set gesturePoints(newValue: boolean[]) {
        this.__gesturePoints.set(newValue);
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
    /** 圆点编号（1~9）对应的中心坐标（相对绘制区域） */
    private centerOf(pointNo: number): number[] {
        const idx = pointNo - 1;
        return [FIRST_CENTER + (idx % 3) * CELL_PITCH, FIRST_CENTER + Math.floor(idx / 3) * CELL_PITCH];
    }
    private polylinePoints(): Array<number[]> {
        return this.gesturePattern.map((n: number): number[] => this.centerOf(n));
    }
    /** 命中检测：返回坐标下的圆点编号（1~9），未命中返回 0 */
    private hitTest(x: number, y: number): number {
        const col = Math.round((x - FIRST_CENTER) / CELL_PITCH);
        const row = Math.round((y - FIRST_CENTER) / CELL_PITCH);
        if (col < 0 || col > 2 || row < 0 || row > 2) {
            return 0;
        }
        const cx = FIRST_CENTER + col * CELL_PITCH;
        const cy = FIRST_CENTER + row * CELL_PITCH;
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > HIT_RADIUS * HIT_RADIUS) {
            return 0;
        }
        return row * 3 + col + 1;
    }
    private addPoint(pointNo: number) {
        if (this.codeReady || pointNo <= 0 || pointNo > GESTURE_GRID_SIZE) {
            return;
        }
        if (!this.gesturePoints[pointNo - 1]) {
            this.gesturePoints[pointNo - 1] = true;
            this.gesturePattern.push(pointNo);
            hilog.debug(DOMAIN, TAG, `Gesture pattern: ${this.gesturePattern.join(',')}`);
        }
    }
    onGesturePointClick(index: number) {
        this.addPoint(index + 1);
    }
    /** 滑动/按下时按触摸点命中圆点，抬手自动校验；TouchObject.x/y 相对当前组件 */
    private onTouchPoint(event: TouchEvent) {
        if (event.type === TouchType.Up || event.type === TouchType.Cancel) {
            // 抬手自动校验；校验失败会在 submitGesture 内自动重置
            if (this.gesturePattern.length > 0 && !this.codeReady && !this.isValidating) {
                this.submitGesture();
            }
            return;
        }
        if (event.type !== TouchType.Down && event.type !== TouchType.Move) {
            return;
        }
        if (event.touches.length === 0) {
            return;
        }
        const touch = event.touches[0];
        this.addPoint(this.hitTest(touch.x, touch.y));
    }
    resetGesture() {
        this.gesturePoints = Array(GESTURE_GRID_SIZE).fill(false);
        this.gesturePattern = [];
        this.resultMsg = '';
        if (this.codeReady) {
            this.codeReady = false;
            this.onSignCode?.('');
        }
    }
    async submitGesture() {
        if (this.gesturePattern.length === 0) {
            promptAction.showToast({ message: '请绘制手势' });
            return;
        }
        try {
            this.isValidating = true;
            const gestureCode = this.gesturePattern.join('');
            const isCorrect = await Sign.CheckSignCode(this.hostCookies, this.activityId, gestureCode);
            if (!isCorrect) {
                promptAction.showToast({ message: '手势错误，请重新绘制' });
                this.resetGesture();
                return;
            }
            this.resultMsg = '手势校验通过，请点击下方按钮签到';
            this.codeReady = true;
            this.onSignCode?.(gestureCode);
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Gesture validate failed: ${(e as Error).message}`);
            this.resultMsg = `手势校验失败: ${(e as Error).message}`;
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
            Text.create('请在圆点上滑动绘制手势图案（为所有勾选用户代签）');
            Text.fontSize(14);
            Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.margin({ bottom: 24 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 手势绘制区域：滑动（PanGesture）+ 点击（onClick）两种输入方式
            Stack.create();
            // 手势绘制区域：滑动（PanGesture）+ 点击（onClick）两种输入方式
            Stack.width(GESTURE_AREA_SIZE);
            // 手势绘制区域：滑动（PanGesture）+ 点击（onClick）两种输入方式
            Stack.height(GESTURE_AREA_SIZE);
            // 手势绘制区域：滑动（PanGesture）+ 点击（onClick）两种输入方式
            Stack.onTouch((event: TouchEvent) => this.onTouchPoint(event));
            // 手势绘制区域：滑动（PanGesture）+ 点击（onClick）两种输入方式
            Stack.margin({ bottom: 24 });
        }, Stack);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Grid.create();
            Grid.columnsTemplate('1fr 1fr 1fr');
            Grid.rowsTemplate('1fr 1fr 1fr');
            Grid.width(GESTURE_AREA_SIZE);
            Grid.height(GESTURE_AREA_SIZE);
            Grid.columnsGap(20);
            Grid.rowsGap(20);
        }, Grid);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            ForEach.create();
            const forEachItemGenFunction = _item => {
                const index = _item;
                {
                    const itemCreation2 = (elmtId, isInitialRender) => {
                        GridItem.create(() => { }, false);
                    };
                    const observedDeepRender = () => {
                        this.observeComponentCreation2(itemCreation2, GridItem);
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Circle.create({ width: 60, height: 60 });
                            Circle.fill(this.gesturePoints[index] ? { "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : { "id": 16777258, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            Circle.onClick(() => this.onGesturePointClick(index));
                        }, Circle);
                        GridItem.pop();
                    };
                    observedDeepRender();
                }
            };
            this.forEachUpdateFunction(elmtId, Array.from<number, number>({ length: GESTURE_GRID_SIZE }, (_, i: number) => i), forEachItemGenFunction);
        }, ForEach);
        ForEach.pop();
        Grid.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 已选圆点连线
            if (this.gesturePattern.length > 1) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Polyline.create({ width: GESTURE_AREA_SIZE, height: GESTURE_AREA_SIZE });
                        Polyline.points(this.polylinePoints());
                        Polyline.stroke({ "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Polyline.strokeWidth(4);
                        Polyline.fillOpacity(0);
                        Polyline.hitTestBehavior(HitTestMode.None);
                    }, Polyline);
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        // 手势绘制区域：滑动（PanGesture）+ 点击（onClick）两种输入方式
        Stack.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 手势顺序显示
            if (this.gesturePattern.length > 0) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(`手势顺序: ${this.gesturePattern.join(' → ')}`);
                        Text.fontSize(14);
                        Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.margin({ bottom: 16 });
                    }, Text);
                    Text.pop();
                });
            }
            // 校验结果信息
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 校验结果信息
            if (this.resultMsg) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.resultMsg);
                        Text.fontSize(14);
                        Text.fontColor(this.codeReady ? { "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : { "id": 16777232, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.margin({ bottom: 16 });
                    }, Text);
                    Text.pop();
                });
            }
            // 操作按钮
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 操作按钮
            Row.create();
            // 操作按钮
            Row.margin({ bottom: 8 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            __Common__.create();
            __Common__.width(100);
            __Common__.margin({ right: 10 });
        }, __Common__);
        {
            this.observeComponentCreation2((elmtId, isInitialRender) => {
                if (isInitialRender) {
                    let componentCall = new LightButton(this, {
                        label: '重置',
                        btnEnabled: true,
                        onButton: () => {
                            this.resetGesture();
                        }
                    }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/Component/GestureSignComponent.ets", line: 193, col: 9 });
                    ViewPU.create(componentCall);
                    let paramsLambda = () => {
                        return {
                            label: '重置',
                            btnEnabled: true,
                            onButton: () => {
                                this.resetGesture();
                            }
                        };
                    };
                    componentCall.paramsGenerator_ = paramsLambda;
                }
                else {
                    this.updateStateVarsOfChildByElmtId(elmtId, {
                        label: '重置',
                        btnEnabled: true
                    });
                }
            }, { name: "LightButton" });
        }
        __Common__.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            __Common__.create();
            __Common__.width(120);
        }, __Common__);
        {
            this.observeComponentCreation2((elmtId, isInitialRender) => {
                if (isInitialRender) {
                    let componentCall = new LightButton(this, {
                        label: this.isValidating ? '校验中...' : '校验手势',
                        btnEnabled: !this.codeReady && this.gesturePattern.length > 0 && !this.isValidating,
                        onButton: () => {
                            this.submitGesture();
                        }
                    }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/Component/GestureSignComponent.ets", line: 203, col: 9 });
                    ViewPU.create(componentCall);
                    let paramsLambda = () => {
                        return {
                            label: this.isValidating ? '校验中...' : '校验手势',
                            btnEnabled: !this.codeReady && this.gesturePattern.length > 0 && !this.isValidating,
                            onButton: () => {
                                this.submitGesture();
                            }
                        };
                    };
                    componentCall.paramsGenerator_ = paramsLambda;
                }
                else {
                    this.updateStateVarsOfChildByElmtId(elmtId, {
                        label: this.isValidating ? '校验中...' : '校验手势',
                        btnEnabled: !this.codeReady && this.gesturePattern.length > 0 && !this.isValidating
                    });
                }
            }, { name: "LightButton" });
        }
        __Common__.pop();
        // 操作按钮
        Row.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
