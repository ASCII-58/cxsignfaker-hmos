if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface LightButton_Params {
    label?: string;
    btnEnabled?: boolean;
    bgColor?: Resource;
    btnFontSize?: number;
    btnHeight?: number;
    onButton?: () => void;
    pressed?: boolean;
}
export class LightButton extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__label = new SynchedPropertySimpleOneWayPU(params.label, this, "label");
        this.__btnEnabled = new SynchedPropertySimpleOneWayPU(params.btnEnabled, this, "btnEnabled");
        this.__bgColor = new SynchedPropertyObjectOneWayPU(params.bgColor, this, "bgColor");
        this.__btnFontSize = new SynchedPropertySimpleOneWayPU(params.btnFontSize, this, "btnFontSize");
        this.__btnHeight = new SynchedPropertySimpleOneWayPU(params.btnHeight, this, "btnHeight");
        this.onButton = () => { };
        this.__pressed = new ObservedPropertySimplePU(false, this, "pressed");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: LightButton_Params) {
        if (params.label === undefined) {
            this.__label.set('');
        }
        if (params.btnEnabled === undefined) {
            this.__btnEnabled.set(true);
        }
        if (params.bgColor === undefined) {
            this.__bgColor.set({ "id": 125829510, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
        }
        if (params.btnFontSize === undefined) {
            this.__btnFontSize.set(14);
        }
        if (params.btnHeight === undefined) {
            this.__btnHeight.set(40);
        }
        if (params.onButton !== undefined) {
            this.onButton = params.onButton;
        }
        if (params.pressed !== undefined) {
            this.pressed = params.pressed;
        }
    }
    updateStateVars(params: LightButton_Params) {
        this.__label.reset(params.label);
        this.__btnEnabled.reset(params.btnEnabled);
        this.__bgColor.reset(params.bgColor);
        this.__btnFontSize.reset(params.btnFontSize);
        this.__btnHeight.reset(params.btnHeight);
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__label.purgeDependencyOnElmtId(rmElmtId);
        this.__btnEnabled.purgeDependencyOnElmtId(rmElmtId);
        this.__bgColor.purgeDependencyOnElmtId(rmElmtId);
        this.__btnFontSize.purgeDependencyOnElmtId(rmElmtId);
        this.__btnHeight.purgeDependencyOnElmtId(rmElmtId);
        this.__pressed.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__label.aboutToBeDeleted();
        this.__btnEnabled.aboutToBeDeleted();
        this.__bgColor.aboutToBeDeleted();
        this.__btnFontSize.aboutToBeDeleted();
        this.__btnHeight.aboutToBeDeleted();
        this.__pressed.aboutToBeDeleted();
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
    private __btnEnabled: SynchedPropertySimpleOneWayPU<boolean>;
    get btnEnabled() {
        return this.__btnEnabled.get();
    }
    set btnEnabled(newValue: boolean) {
        this.__btnEnabled.set(newValue);
    }
    private __bgColor: SynchedPropertySimpleOneWayPU<Resource>;
    get bgColor() {
        return this.__bgColor.get();
    }
    set bgColor(newValue: Resource) {
        this.__bgColor.set(newValue);
    }
    private __btnFontSize: SynchedPropertySimpleOneWayPU<number>;
    get btnFontSize() {
        return this.__btnFontSize.get();
    }
    set btnFontSize(newValue: number) {
        this.__btnFontSize.set(newValue);
    }
    private __btnHeight: SynchedPropertySimpleOneWayPU<number>;
    get btnHeight() {
        return this.__btnHeight.get();
    }
    set btnHeight(newValue: number) {
        this.__btnHeight.set(newValue);
    }
    private onButton: () => void;
    private __pressed: ObservedPropertySimplePU<boolean>;
    get pressed() {
        return this.__pressed.get();
    }
    set pressed(newValue: boolean) {
        this.__pressed.set(newValue);
    }
    private setPressed(on: boolean) {
        if (this.pressed === on) {
            return;
        }
        Context.animateTo({ duration: on ? 120 : 200, curve: on ? Curve.EaseOut : Curve.EaseInOut }, () => {
            this.pressed = on;
        });
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel(this.label);
            Button.width('100%');
            Button.height(this.btnHeight);
            Button.fontSize(this.btnFontSize);
            Button.fontColor({ "id": 16777259, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.backgroundColor(ObservedObject.GetRawObject(this.bgColor));
            Button.enabled(this.btnEnabled);
            Button.scale({ x: this.pressed ? 0.96 : 1, y: this.pressed ? 0.96 : 1 });
            Button.shadow({
                radius: this.pressed ? 16 : 0,
                color: this.pressed ? { "id": 16777251, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : Color.Transparent,
                offsetY: 0
            });
            Button.onTouch((event: TouchEvent) => {
                // Down/Move 都重申按压态（幂等）：手指微动产生 Move 时不会丢状态
                this.setPressed(event.type === TouchType.Down || event.type === TouchType.Move);
            });
            Button.onClick(() => {
                this.onButton();
            });
        }, Button);
        Button.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
