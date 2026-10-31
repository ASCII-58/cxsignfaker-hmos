if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface QRCodeLocation_Params {
    ActivityId?: string;
    positionRequired?: boolean;
    onPositionChange?: (position: QRCodePosition) => void;
    DestinationLocationName?: string;
    Position?: QRCodePosition | null;
}
import { FunctionalButton } from "@hms:core.atomicserviceComponent.atomicserviceUi";
import { functionalButtonComponentManager } from "@hms:core.atomicserviceComponent.atomicserviceUi";
import hilog from "@ohos:hilog";
import { DatabaseManager } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import { Sign } from "@normalized:N&&&entry/src/main/ets/utils/sign&";
import { ChaoxingUtils } from "@normalized:N&&&entry/src/main/ets/utils/utils&";
/** 二维码签到 location 参数结构（对齐上游 ChaoxingLocationSignEntity 序列化） */
export interface QRCodePosition {
    result: number;
    latitude: number;
    longitude: number;
    address: string;
}
export class QRCodeLocation extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__ActivityId = new SynchedPropertySimpleOneWayPU(params.ActivityId, this, "ActivityId");
        this.__positionRequired = new SynchedPropertySimpleOneWayPU(params.positionRequired, this, "positionRequired");
        this.onPositionChange = undefined;
        this.__DestinationLocationName = new ObservedPropertySimplePU('获取中...', this, "DestinationLocationName");
        this.__Position = new ObservedPropertyObjectPU(null, this, "Position");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: QRCodeLocation_Params) {
        if (params.positionRequired === undefined) {
            this.__positionRequired.set(false);
        }
        if (params.onPositionChange !== undefined) {
            this.onPositionChange = params.onPositionChange;
        }
        if (params.DestinationLocationName !== undefined) {
            this.DestinationLocationName = params.DestinationLocationName;
        }
        if (params.Position !== undefined) {
            this.Position = params.Position;
        }
    }
    updateStateVars(params: QRCodeLocation_Params) {
        this.__ActivityId.reset(params.ActivityId);
        this.__positionRequired.reset(params.positionRequired);
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__ActivityId.purgeDependencyOnElmtId(rmElmtId);
        this.__positionRequired.purgeDependencyOnElmtId(rmElmtId);
        this.__DestinationLocationName.purgeDependencyOnElmtId(rmElmtId);
        this.__Position.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__ActivityId.aboutToBeDeleted();
        this.__positionRequired.aboutToBeDeleted();
        this.__DestinationLocationName.aboutToBeDeleted();
        this.__Position.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    updateRecycleElmtId(oldElmtId, newElmtId) {
        this.__ActivityId.updateElmtId(oldElmtId, newElmtId);
        this.__positionRequired.updateElmtId(oldElmtId, newElmtId);
        this.__DestinationLocationName.updateElmtId(oldElmtId, newElmtId);
        this.__Position.updateElmtId(oldElmtId, newElmtId);
    }
    private __ActivityId: SynchedPropertySimpleOneWayPU<string>;
    get ActivityId() {
        return this.__ActivityId.get();
    }
    set ActivityId(newValue: string) {
        this.__ActivityId.set(newValue);
    }
    /** 服务端 ifopenAddress==1 时该签到要求位置，未选点会被 SignerPage 门控 */
    private __positionRequired: SynchedPropertySimpleOneWayPU<boolean>;
    get positionRequired() {
        return this.__positionRequired.get();
    }
    set positionRequired(newValue: boolean) {
        this.__positionRequired.set(newValue);
    }
    private onPositionChange?: (position: QRCodePosition) => void;
    private __DestinationLocationName: ObservedPropertySimplePU<string>;
    get DestinationLocationName() {
        return this.__DestinationLocationName.get();
    }
    set DestinationLocationName(newValue: string) {
        this.__DestinationLocationName.set(newValue);
    }
    private __Position: ObservedPropertyObjectPU<QRCodePosition | null>;
    get Position() {
        return this.__Position.get();
    }
    set Position(newValue: QRCodePosition | null) {
        this.__Position.set(newValue);
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            if (isInitialRender) {
                Column.padding(16);
                Column.width('100%');
                Column.onAppear(async () => {
                    try {
                        const dbManager = DatabaseManager.getInstance();
                        const currentUser = await dbManager.getUserByPosition(1, true);
                        if (currentUser && this.ActivityId) {
                            const locInfo = await Sign.GetLocationSignInfo(currentUser.cookies, this.ActivityId);
                            const locName = locInfo['locationText'] as string;
                            this.DestinationLocationName = locName ? locName : '该签到无要求位置';
                        }
                    }
                    catch (e) {
                        this.DestinationLocationName = '位置信息获取失败';
                    }
                });
            }
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('要求位置');
            Text.fontColor({ "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                Text.fontSize(14);
                Text.width('100%');
                Text.margin({ bottom: 8 });
            }
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.backgroundColor({ "id": 125829555, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Row.border({ width: 1, color: { "id": 125831013, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } });
            if (isInitialRender) {
                Row.width('100%');
                Row.padding(12);
                Row.borderRadius(12);
                Row.onClick(() => {
                    if (this.DestinationLocationName !== '获取中...' && this.DestinationLocationName !== '该签到无要求位置') {
                        ChaoxingUtils.copyText(this.DestinationLocationName);
                    }
                });
            }
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.DestinationLocationName);
            Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            if (isInitialRender) {
                Text.layoutWeight(1);
                Text.fontSize(16);
                Text.maxLines(3);
                Text.textOverflow({ overflow: TextOverflow.Ellipsis });
            }
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 已选坐标展示
            if (this.Position) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        if (isInitialRender) {
                            Column.alignItems(HorizontalAlign.Start);
                            Column.width('100%');
                            Column.margin({ top: 8 });
                        }
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(`已选位置: ${this.Position.address}`);
                        Text.fontColor({ "id": 125829210, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        if (isInitialRender) {
                            Text.fontSize(14);
                            Text.margin({ top: 8 });
                        }
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(`经度: ${this.Position.longitude}`);
                        Text.fontColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        if (isInitialRender) {
                            Text.fontSize(12);
                        }
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(`纬度: ${this.Position.latitude}`);
                        Text.fontColor({ "id": 125829222, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        if (isInitialRender) {
                            Text.fontSize(12);
                        }
                    }, Text);
                    Text.pop();
                    Column.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.positionRequired ? '该签到要求位置，请先选点后签到' : '该签到可不选位置，选点后将随签到提交');
                        Text.fontColor(this.positionRequired ? { "id": 125829141, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" } : { "id": 125829216, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        if (isInitialRender) {
                            Text.fontSize(14);
                            Text.margin({ top: 16, bottom: 4 });
                            Text.width('100%');
                        }
                    }, Text);
                    Text.pop();
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 地图选点按钮 (FunctionalButton)
            Column.create();
            if (isInitialRender) {
                // 地图选点按钮 (FunctionalButton)
                Column.width('100%');
                // 地图选点按钮 (FunctionalButton)
                Column.margin({ top: 12 });
            }
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            __Common__.create();
            __Common__.enabled(this.DestinationLocationName !== '获取中...' && this.DestinationLocationName !== '该签到无要求位置');
        }, __Common__);
        {
            this.observeComponentCreation2((elmtId, isInitialRender) => {
                if (isInitialRender) {
                    let componentCall = new FunctionalButton(this, {
                        params: {
                            openType: functionalButtonComponentManager.OpenType.CHOOSE_LOCATION,
                            label: '打开地图选点',
                            styleOption: {
                                bgColor: functionalButtonComponentManager.ColorType.DEFAULT,
                                size: functionalButtonComponentManager.SizeType.DEFAULT,
                                plain: false,
                                disabled: false,
                                loading: false,
                                hoverClass: functionalButtonComponentManager.HoverClassType.HOVER_CLASS,
                                hoverStartTime: 0,
                                hoverStayTime: 0,
                                styleConfig: new functionalButtonComponentManager.ButtonConfig().fontSize(16)
                            },
                        },
                        controller: new functionalButtonComponentManager.FunctionalButtonController()
                            .onChooseLocation((err, data) => {
                            if (err) {
                                hilog.error(0x0000, "Sign", "Location Error: %{public}s", err.message);
                                return;
                            }
                            const LoginLocation = ChaoxingUtils.gcj02_to_bd09(data.latitude, data.longitude);
                            const newPosition: QRCodePosition = {
                                result: 1,
                                latitude: LoginLocation.lat,
                                longitude: LoginLocation.lon,
                                address: data.name as string
                            };
                            this.Position = newPosition;
                            this.onPositionChange?.(newPosition);
                        })
                    }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/Component/QRCodeLocationCard.ets", line: 77, col: 9 });
                    ViewPU.create(componentCall);
                    let paramsLambda = () => {
                        return {
                            params: {
                                openType: functionalButtonComponentManager.OpenType.CHOOSE_LOCATION,
                                label: '打开地图选点',
                                styleOption: {
                                    bgColor: functionalButtonComponentManager.ColorType.DEFAULT,
                                    size: functionalButtonComponentManager.SizeType.DEFAULT,
                                    plain: false,
                                    disabled: false,
                                    loading: false,
                                    hoverClass: functionalButtonComponentManager.HoverClassType.HOVER_CLASS,
                                    hoverStartTime: 0,
                                    hoverStayTime: 0,
                                    styleConfig: new functionalButtonComponentManager.ButtonConfig().fontSize(16)
                                },
                            },
                            controller: new functionalButtonComponentManager.FunctionalButtonController()
                                .onChooseLocation((err, data) => {
                                if (err) {
                                    hilog.error(0x0000, "Sign", "Location Error: %{public}s", err.message);
                                    return;
                                }
                                const LoginLocation = ChaoxingUtils.gcj02_to_bd09(data.latitude, data.longitude);
                                const newPosition: QRCodePosition = {
                                    result: 1,
                                    latitude: LoginLocation.lat,
                                    longitude: LoginLocation.lon,
                                    address: data.name as string
                                };
                                this.Position = newPosition;
                                this.onPositionChange?.(newPosition);
                            })
                        };
                    };
                    componentCall.paramsGenerator_ = paramsLambda;
                }
                else {
                    this.updateStateVarsOfChildByElmtId(elmtId, {
                        params: {
                            openType: functionalButtonComponentManager.OpenType.CHOOSE_LOCATION,
                            label: '打开地图选点',
                            styleOption: {
                                bgColor: functionalButtonComponentManager.ColorType.DEFAULT,
                                size: functionalButtonComponentManager.SizeType.DEFAULT,
                                plain: false,
                                disabled: false,
                                loading: false,
                                hoverClass: functionalButtonComponentManager.HoverClassType.HOVER_CLASS,
                                hoverStartTime: 0,
                                hoverStayTime: 0,
                                styleConfig: new functionalButtonComponentManager.ButtonConfig().fontSize(16)
                            },
                        }
                    });
                }
            }, { name: "FunctionalButton" });
        }
        __Common__.pop();
        // 地图选点按钮 (FunctionalButton)
        Column.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
