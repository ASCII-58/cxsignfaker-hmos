if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface CloneSessionBanner_Params {
    cloneSessionName?: string;
    cloneSessionPhone?: string;
    onExit?: () => void;
}
export class CloneSessionBanner extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__cloneSessionName = this.createStorageProp('cloneSessionName', '', "cloneSessionName");
        this.__cloneSessionPhone = this.createStorageProp('cloneSessionPhone', '', "cloneSessionPhone");
        this.onExit = undefined;
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: CloneSessionBanner_Params) {
        if (params.onExit !== undefined) {
            this.onExit = params.onExit;
        }
    }
    updateStateVars(params: CloneSessionBanner_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__cloneSessionName.purgeDependencyOnElmtId(rmElmtId);
        this.__cloneSessionPhone.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__cloneSessionName.aboutToBeDeleted();
        this.__cloneSessionPhone.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __cloneSessionName: ObservedPropertyAbstractPU<string>;
    get cloneSessionName() {
        return this.__cloneSessionName.get();
    }
    set cloneSessionName(newValue: string) {
        this.__cloneSessionName.set(newValue);
    }
    private __cloneSessionPhone: ObservedPropertyAbstractPU<string>;
    get cloneSessionPhone() {
        return this.__cloneSessionPhone.get();
    }
    set cloneSessionPhone(newValue: string) {
        this.__cloneSessionPhone.set(newValue);
    }
    private onExit?: () => void;
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.padding({ left: 12, right: 10, top: 10, bottom: 10 });
            Row.backgroundColor({ "id": 16777238, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Row.border({ width: 1, color: { "id": 16777239, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } });
            Row.borderRadius(16);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width(40);
            Column.height(40);
            Column.borderRadius(13);
            Column.justifyContent(FlexAlign.Center);
            Column.backgroundColor({ "id": 16777240, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777291, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Image.draggable(false);
            Image.width(20);
            Image.height(20);
            Image.fillColor({ "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
        }, Image);
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.layoutWeight(1);
            Column.alignItems(HorizontalAlign.Start);
            Column.margin({ left: 10 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('克隆登录中');
            Text.fontSize(11);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor({ "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.cloneSessionName);
            Text.fontSize(15);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.maxLines(1);
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
        }, Text);
        Text.pop();
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.onExit) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('退出克隆');
                        Text.fontSize(13);
                        Text.fontWeight(FontWeight.Medium);
                        Text.fontColor({ "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.padding({ left: 14, right: 14, top: 7, bottom: 7 });
                        Text.backgroundColor({ "id": 16777240, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.borderRadius(999);
                        Text.onClick(() => {
                            if (this.onExit) {
                                this.onExit();
                            }
                        });
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
        Row.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
