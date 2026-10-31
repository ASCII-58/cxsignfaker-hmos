if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface LocationFavoritesComponent_Params {
    /** 关闭收藏位置 sheet（由宿主页面控制 bindSheet 显隐） */
    onClose?: () => void;
    locations?: SavedLocation[];
    editingId?: number;
    noteInput?: string;
    gcjLat?: number;
    gcjLon?: number;
    hasPicked?: boolean;
    pickedAddress?: string;
    gpsLocating?: boolean;
    manageVisible?: boolean;
    dbManager?: DatabaseManager;
    webController?: webview.WebviewController;
    webReady?: boolean;
    tileCacheDir?: string;
    tileInflight?: Set<string>;
    geocodeTimer?: number;
    geocodeSeq?: number;
}
import hilog from "@ohos:hilog";
import promptAction from "@ohos:promptAction";
import geoLocationManager from "@ohos:geoLocationManager";
import abilityAccessCtrl from "@ohos:abilityAccessCtrl";
import type common from "@ohos:app.ability.common";
import type { Permissions } from "@ohos:abilityAccessCtrl";
import type { BusinessError } from "@ohos:base";
import fs from "@ohos:file.fs";
import webview from "@ohos:web.webview";
import http from "@ohos:net.http";
import { DatabaseManager } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import type { SavedLocation } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import { ChaoxingUtils } from "@normalized:N&&&entry/src/main/ets/utils/utils&";
const TAG = 'LocationFavorites';
const DOMAIN = 0x0008;
/** 地图初始中心（定位不可用时的默认视野） */
const DEFAULT_CENTER: MapLatLng = { latitude: 39.90923, longitude: 116.39743 };
/** 地图下方选点卡片的预留高度，保证地图视口不随选点状态变化跳动 */
const SELECTION_CARD_HEIGHT = 200;
/** 高德在线瓦片（GCJ-02，与本项目坐标换算一致）；style=7 为带注记路网图 */
const TILE_URL = 'https://wprd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x={x}&y={y}&z={z}';
/** 瓦片磁盘缓存上限（字节）：按文件字节 LRU 淘汰；1.5MB 时连文件系统块对齐开销也计入后，
 *  系统设置里显示的"用户数据"仍稳定低于 5MB 占用预算 */
const TILE_DISK_CACHE_BYTES = 1536 * 1024;
/** Leaflet 地图坐标 */
interface MapLatLng {
    latitude: number;
    longitude: number;
}
/** 推给 H5 的收藏针数据 */
interface FavoritePin {
    id: number;
    lat: number;
    lng: number;
    label: string;
}
/** 瓦片缓存文件元信息（LRU 用） */
interface TileStat {
    name: string;
    mtime: number;
    size: number;
}
export class LocationFavoritesComponent extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.onClose = undefined;
        this.__locations = new ObservedPropertyObjectPU([]
        /** 正在编辑的位置 id；-1 表示新增 */
        , this, "locations");
        this.__editingId = new ObservedPropertySimplePU(-1, this, "editingId");
        this.__noteInput = new ObservedPropertySimplePU(''
        /** 当前选点坐标（GCJ-02，与瓦片投影一致） */
        , this, "noteInput");
        this.__gcjLat = new ObservedPropertySimplePU(DEFAULT_CENTER.latitude, this, "gcjLat");
        this.__gcjLon = new ObservedPropertySimplePU(DEFAULT_CENTER.longitude, this, "gcjLon");
        this.__hasPicked = new ObservedPropertySimplePU(false, this, "hasPicked");
        this.__pickedAddress = new ObservedPropertySimplePU('', this, "pickedAddress");
        this.__gpsLocating = new ObservedPropertySimplePU(false, this, "gpsLocating");
        this.__manageVisible = new ObservedPropertySimplePU(false, this, "manageVisible");
        this.dbManager = DatabaseManager.getInstance();
        this.webController = new webview.WebviewController();
        this.webReady = false;
        this.tileCacheDir = '';
        this.tileInflight = new Set();
        this.geocodeTimer = -1;
        this.geocodeSeq = 0;
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: LocationFavoritesComponent_Params) {
        if (params.onClose !== undefined) {
            this.onClose = params.onClose;
        }
        if (params.locations !== undefined) {
            this.locations = params.locations;
        }
        if (params.editingId !== undefined) {
            this.editingId = params.editingId;
        }
        if (params.noteInput !== undefined) {
            this.noteInput = params.noteInput;
        }
        if (params.gcjLat !== undefined) {
            this.gcjLat = params.gcjLat;
        }
        if (params.gcjLon !== undefined) {
            this.gcjLon = params.gcjLon;
        }
        if (params.hasPicked !== undefined) {
            this.hasPicked = params.hasPicked;
        }
        if (params.pickedAddress !== undefined) {
            this.pickedAddress = params.pickedAddress;
        }
        if (params.gpsLocating !== undefined) {
            this.gpsLocating = params.gpsLocating;
        }
        if (params.manageVisible !== undefined) {
            this.manageVisible = params.manageVisible;
        }
        if (params.dbManager !== undefined) {
            this.dbManager = params.dbManager;
        }
        if (params.webController !== undefined) {
            this.webController = params.webController;
        }
        if (params.webReady !== undefined) {
            this.webReady = params.webReady;
        }
        if (params.tileCacheDir !== undefined) {
            this.tileCacheDir = params.tileCacheDir;
        }
        if (params.tileInflight !== undefined) {
            this.tileInflight = params.tileInflight;
        }
        if (params.geocodeTimer !== undefined) {
            this.geocodeTimer = params.geocodeTimer;
        }
        if (params.geocodeSeq !== undefined) {
            this.geocodeSeq = params.geocodeSeq;
        }
    }
    updateStateVars(params: LocationFavoritesComponent_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__locations.purgeDependencyOnElmtId(rmElmtId);
        this.__editingId.purgeDependencyOnElmtId(rmElmtId);
        this.__noteInput.purgeDependencyOnElmtId(rmElmtId);
        this.__gcjLat.purgeDependencyOnElmtId(rmElmtId);
        this.__gcjLon.purgeDependencyOnElmtId(rmElmtId);
        this.__hasPicked.purgeDependencyOnElmtId(rmElmtId);
        this.__pickedAddress.purgeDependencyOnElmtId(rmElmtId);
        this.__gpsLocating.purgeDependencyOnElmtId(rmElmtId);
        this.__manageVisible.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__locations.aboutToBeDeleted();
        this.__editingId.aboutToBeDeleted();
        this.__noteInput.aboutToBeDeleted();
        this.__gcjLat.aboutToBeDeleted();
        this.__gcjLon.aboutToBeDeleted();
        this.__hasPicked.aboutToBeDeleted();
        this.__pickedAddress.aboutToBeDeleted();
        this.__gpsLocating.aboutToBeDeleted();
        this.__manageVisible.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    /** 关闭收藏位置 sheet（由宿主页面控制 bindSheet 显隐） */
    private onClose?: () => void;
    private __locations: ObservedPropertyObjectPU<SavedLocation[]>;
    get locations() {
        return this.__locations.get();
    }
    set locations(newValue: SavedLocation[]) {
        this.__locations.set(newValue);
    }
    /** 正在编辑的位置 id；-1 表示新增 */
    private __editingId: ObservedPropertySimplePU<number>;
    get editingId() {
        return this.__editingId.get();
    }
    set editingId(newValue: number) {
        this.__editingId.set(newValue);
    }
    private __noteInput: ObservedPropertySimplePU<string>;
    get noteInput() {
        return this.__noteInput.get();
    }
    set noteInput(newValue: string) {
        this.__noteInput.set(newValue);
    }
    /** 当前选点坐标（GCJ-02，与瓦片投影一致） */
    private __gcjLat: ObservedPropertySimplePU<number>;
    get gcjLat() {
        return this.__gcjLat.get();
    }
    set gcjLat(newValue: number) {
        this.__gcjLat.set(newValue);
    }
    private __gcjLon: ObservedPropertySimplePU<number>;
    get gcjLon() {
        return this.__gcjLon.get();
    }
    set gcjLon(newValue: number) {
        this.__gcjLon.set(newValue);
    }
    private __hasPicked: ObservedPropertySimplePU<boolean>;
    get hasPicked() {
        return this.__hasPicked.get();
    }
    set hasPicked(newValue: boolean) {
        this.__hasPicked.set(newValue);
    }
    private __pickedAddress: ObservedPropertySimplePU<string>;
    get pickedAddress() {
        return this.__pickedAddress.get();
    }
    set pickedAddress(newValue: string) {
        this.__pickedAddress.set(newValue);
    }
    private __gpsLocating: ObservedPropertySimplePU<boolean>;
    get gpsLocating() {
        return this.__gpsLocating.get();
    }
    set gpsLocating(newValue: boolean) {
        this.__gpsLocating.set(newValue);
    }
    private __manageVisible: ObservedPropertySimplePU<boolean>;
    get manageVisible() {
        return this.__manageVisible.get();
    }
    set manageVisible(newValue: boolean) {
        this.__manageVisible.set(newValue);
    }
    private dbManager: DatabaseManager;
    private webController: webview.WebviewController;
    /** H5 地图就绪握手；就绪后才允许 runJavaScript 推送状态 */
    private webReady: boolean;
    /** 瓦片磁盘缓存目录（cacheDir/maptiles，卸载/清理缓存时随系统回收） */
    private tileCacheDir: string;
    /** 在途瓦片下载去重 */
    private tileInflight: Set<string>;
    private geocodeTimer: number;
    private geocodeSeq: number;
    aboutToAppear(): void {
        const context = getContext(this) as common.UIAbilityContext;
        this.tileCacheDir = `${context.cacheDir}/maptiles`;
        try {
            if (!fs.accessSync(this.tileCacheDir)) {
                fs.mkdirSync(this.tileCacheDir, true);
            }
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Prepare tile cache dir failed: ${e.message}`);
        }
    }
    // ---------- 数据 ----------
    async loadLocations() {
        try {
            this.locations = await this.dbManager.getAllSavedLocations();
            this.syncFavorites();
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Failed to load saved locations: ${e.message}`);
            promptAction.showToast({ message: '加载收藏位置失败' });
        }
    }
    currentLocation(): SavedLocation | undefined {
        return this.locations.find((loc: SavedLocation) => loc.id === this.editingId);
    }
    locationTitle(loc: SavedLocation): string {
        return loc.note !== '' ? loc.note : loc.address;
    }
    /** 当前选点对应的 BD-09 坐标（签到提交用） */
    bd09Display(): string {
        const bd = ChaoxingUtils.gcj02_to_bd09(this.gcjLat, this.gcjLon);
        return `经度 ${bd.lon.toFixed(6)}  纬度 ${bd.lat.toFixed(6)}`;
    }
    // ---------- H5 地图状态同步 ----------
    /** H5 地图加载完成：补推当前收藏与选点状态，未选点则自动定位 */
    onMapReady() {
        this.webReady = true;
        this.syncFavorites();
        if (this.hasPicked) {
            this.syncPin();
            this.flyTo(this.gcjLat, this.gcjLon, 16);
        }
        else {
            this.locateCurrent();
        }
    }
    /** 点按地图选点 */
    onMapClick(lat: number, lon: number) {
        this.pickPosition(lat, lon, false, '');
    }
    /** 拖动/点按选点针后同步位置 */
    onPinDragEnd(lat: number, lon: number) {
        this.gcjLat = lat;
        this.gcjLon = lon;
        this.hasPicked = true;
        this.scheduleGeocode();
    }
    /** 点击收藏针 = 选中该收藏（选点针移过去并填充备注，保存即修改） */
    onFavoriteClick(id: number) {
        const loc = this.locations.find((l: SavedLocation) => l.id === id);
        if (loc) {
            this.selectFavorite(loc);
        }
    }
    /** 取消选点：同步移除地图上的选点针 */
    clearSelection() {
        this.editingId = -1;
        this.noteInput = '';
        this.hasPicked = false;
        this.pickedAddress = '';
        this.syncPin();
    }
    // ---------- H5 → ArkTS 回调（registerJavaScriptProxy 注册） ----------
    async saveLocation() {
        if (!this.hasPicked) {
            promptAction.showToast({ message: '请先在地图上点选位置' });
            return;
        }
        const note = this.noteInput.trim();
        // 选点针拖动结束时坐标已同步到 gcjLat/gcjLon
        const bd = ChaoxingUtils.gcj02_to_bd09(this.gcjLat, this.gcjLon);
        const latitude = ChaoxingUtils.toLocationInt(bd.lat).toString();
        const longitude = ChaoxingUtils.toLocationInt(bd.lon).toString();
        const address = this.pickedAddress;
        try {
            let result: number;
            if (this.editingId === -1) {
                result = await this.dbManager.insertSavedLocation({
                    note,
                    latitude,
                    longitude,
                    address
                });
            }
            else {
                result = await this.dbManager.updateSavedLocation(this.editingId, {
                    note,
                    latitude,
                    longitude,
                    address
                });
            }
            if (result !== 1) {
                promptAction.showToast({ message: '保存失败' });
                return;
            }
            promptAction.showToast({ message: '已保存' });
            this.clearSelection();
            await this.loadLocations();
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Failed to save location: ${e.message}`);
            promptAction.showToast({ message: '保存失败' });
        }
    }
    confirmDelete(loc: SavedLocation) {
        AlertDialog.show({
            title: '删除收藏位置',
            message: `确定删除「${this.locationTitle(loc)}」吗？`,
            primaryButton: {
                value: '取消',
                action: () => {
                }
            },
            secondaryButton: {
                value: '删除',
                action: () => {
                    this.deleteLocation(loc.id);
                }
            }
        });
    }
    async deleteLocation(id: number) {
        try {
            const result = await this.dbManager.deleteSavedLocation(id);
            promptAction.showToast({ message: result === 1 ? '已删除' : '删除失败' });
            if (result === 1) {
                if (this.editingId === id) {
                    this.clearSelection();
                }
                await this.loadLocations();
            }
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Failed to delete location: ${e.message}`);
            promptAction.showToast({ message: '删除失败' });
        }
    }
    MapPanel(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Stack.create({ alignContent: Alignment.TopStart });
            Stack.width('100%');
            Stack.layoutWeight(1);
        }, Stack);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Web.create({ src: { "id": 0, "type": 30000, params: ['map/map.html'], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }, controller: this.webController });
            Web.javaScriptAccess(true);
            Web.zoomAccess(false);
            Web.backgroundColor('#E9EDF0');
            Web.onControllerAttached(() => {
                this.webController.registerJavaScriptProxy(this, 'arkBridge', ['onMapReady', 'onMapClick', 'onPinDragEnd', 'onFavoriteClick']);
                this.webController.refresh();
            });
            Web.onInterceptRequest((event?: OnInterceptRequestEvent): any => {
                // 未拦截时返回 undefined（运行时等价 null）：Web 继续走默认网络加载
                return this.onInterceptTile(event) as any;
            });
            Web.width('100%');
            Web.height('100%');
        }, Web);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 悬浮层：顶部提示 + 右下角图标按钮
            // 容器与所有非交互子元素必须 hitTestBehavior(None)，否则会挡住地图的触摸
            Column.create();
            // 悬浮层：顶部提示 + 右下角图标按钮
            // 容器与所有非交互子元素必须 hitTestBehavior(None)，否则会挡住地图的触摸
            Column.width('100%');
            // 悬浮层：顶部提示 + 右下角图标按钮
            // 容器与所有非交互子元素必须 hitTestBehavior(None)，否则会挡住地图的触摸
            Column.height('100%');
            // 悬浮层：顶部提示 + 右下角图标按钮
            // 容器与所有非交互子元素必须 hitTestBehavior(None)，否则会挡住地图的触摸
            Column.alignItems(HorizontalAlign.End);
            // 悬浮层：顶部提示 + 右下角图标按钮
            // 容器与所有非交互子元素必须 hitTestBehavior(None)，否则会挡住地图的触摸
            Column.hitTestBehavior(HitTestMode.None);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.justifyContent(FlexAlign.End);
            Row.padding({ right: 12, top: 10 });
            Row.hitTestBehavior(HitTestMode.None);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.hasPicked ? this.pickedAddress : '点按地图选点，点按定位针选中收藏');
            Text.fontSize(12);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.maxLines(1);
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
            Text.constraintSize({ maxWidth: '70%' });
            Text.padding({
                left: 10,
                right: 10,
                top: 5,
                bottom: 5
            });
            Text.borderRadius(12);
            Text.backgroundColor({ "id": 16777258, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.opacity(this.hasPicked && this.pickedAddress === '' ? 0 : 1);
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Blank.create();
            Blank.hitTestBehavior(HitTestMode.None);
        }, Blank);
        Blank.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create({ space: 10 });
            Column.padding({ right: 12, bottom: 12 });
            Column.hitTestBehavior(HitTestMode.None);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithChild();
            Button.type(ButtonType.Circle);
            Button.width(42);
            Button.height(42);
            Button.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.shadow({ radius: 6, color: 'rgba(0,0,0,0.2)', offsetY: 2 });
            Button.onClick(() => {
                this.manageVisible = true;
            });
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            SymbolGlyph.create({ "id": 125831524, "type": 40000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            SymbolGlyph.fontSize(20);
            SymbolGlyph.fontColor([{ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }]);
        }, SymbolGlyph);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithChild();
            Button.type(ButtonType.Circle);
            Button.width(42);
            Button.height(42);
            Button.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Button.shadow({ radius: 6, color: 'rgba(0,0,0,0.2)', offsetY: 2 });
            Button.enabled(!this.gpsLocating);
            Button.opacity(this.gpsLocating ? 0.5 : 1);
            Button.onClick(() => {
                this.locateCurrent();
            });
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            SymbolGlyph.create({ "id": 125832501, "type": 40000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            SymbolGlyph.fontSize(20);
            SymbolGlyph.fontColor([{ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }]);
        }, SymbolGlyph);
        Button.pop();
        Column.pop();
        // 悬浮层：顶部提示 + 右下角图标按钮
        // 容器与所有非交互子元素必须 hitTestBehavior(None)，否则会挡住地图的触摸
        Column.pop();
        Stack.pop();
    }
    // ---------- 瓦片磁盘缓存（LRU） ----------
    /** 底部选点卡（固定预留高度）：新增/编辑共用 */
    SelectionCard(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.height(SELECTION_CARD_HEIGHT);
            Column.padding({
                left: 20,
                right: 20,
                top: 10,
                bottom: 12
            });
            Column.alignItems(HorizontalAlign.Start);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.hasPicked) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create({ space: 10 });
                        Column.width('100%');
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.alignItems(HorizontalAlign.Start);
                        Column.width('100%');
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(`已选: ${this.pickedAddress}`);
                        Text.fontSize(13);
                        Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.maxLines(2);
                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.bd09Display());
                        Text.fontSize(11);
                        Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.margin({ top: 2 });
                    }, Text);
                    Text.pop();
                    Column.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        TextInput.create({ placeholder: '位置备注（如：第一教学楼），可留空', text: { value: this.noteInput, changeEvent: newValue => { this.noteInput = newValue; } } });
                        TextInput.height(44);
                        TextInput.borderRadius(10);
                        TextInput.backgroundColor({ "id": 16777258, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        TextInput.maxLength(30);
                    }, TextInput);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create({ space: 12 });
                        Row.width('100%');
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('取消');
                        Button.layoutWeight(1);
                        Button.height(40);
                        Button.borderRadius(20);
                        Button.fontSize(15);
                        Button.backgroundColor({ "id": 16777258, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Button.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Button.onClick(() => {
                            this.clearSelection();
                        });
                    }, Button);
                    Button.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel(this.editingId === -1 ? '收藏此位置' : '保存修改');
                        Button.layoutWeight(2);
                        Button.height(40);
                        Button.borderRadius(20);
                        Button.fontSize(15);
                        Button.backgroundColor({ "id": 16777235, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Button.fontColor({ "id": 16777259, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Button.onClick(() => {
                            this.saveLocation();
                        });
                    }, Button);
                    Button.pop();
                    Row.pop();
                    Column.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.width('100%');
                        Column.height('100%');
                        Column.justifyContent(FlexAlign.Center);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('在地图上点按选点');
                        Text.fontSize(14);
                        Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('选好位置后可填写备注收藏；已收藏的地点会以定位针固定在地图上');
                        Text.fontSize(12);
                        Text.fontColor({ "id": 16777260, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.margin({ top: 6 });
                        Text.textAlign(TextAlign.Center);
                    }, Text);
                    Text.pop();
                    Column.pop();
                });
            }
        }, If);
        If.pop();
        Column.pop();
    }
    /** 管理收藏列表（独立半屏 sheet） */
    ManageSheet(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.height('100%');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width(36);
            Column.height(4);
            Column.borderRadius(2);
            Column.margin({ top: 10 });
        }, Column);
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.padding({
                left: 20,
                right: 20,
                top: 12,
                bottom: 12
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('已收藏的位置');
            Text.fontSize(18);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Blank.create();
        }, Blank);
        Blank.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(`${this.locations.length} 个`);
            Text.fontSize(13);
            Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.locations.length === 0) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.width('100%');
                        Column.margin({ top: 50 });
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('还没有收藏的地点');
                        Text.fontSize(15);
                        Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('关闭本页，在地图上点按选点后即可收藏');
                        Text.fontSize(12);
                        Text.fontColor({ "id": 16777260, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.margin({ top: 6 });
                    }, Text);
                    Text.pop();
                    Column.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        List.create({ space: 8 });
                        List.width('100%');
                        List.layoutWeight(1);
                        List.padding({ left: 16, right: 16 });
                        List.scrollBar(BarState.Off);
                    }, List);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        ForEach.create();
                        const forEachItemGenFunction = _item => {
                            const loc = _item;
                            {
                                const itemCreation = (elmtId, isInitialRender) => {
                                    ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                                    ListItem.create(deepRenderFunction, true);
                                    if (!isInitialRender) {
                                        ListItem.pop();
                                    }
                                    ViewStackProcessor.StopGetAccessRecording();
                                };
                                const itemCreation2 = (elmtId, isInitialRender) => {
                                    ListItem.create(deepRenderFunction, true);
                                };
                                const deepRenderFunction = (elmtId, isInitialRender) => {
                                    itemCreation(elmtId, isInitialRender);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Row.create();
                                        Row.width('100%');
                                        Row.padding(12);
                                        Row.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                        Row.borderRadius(12);
                                    }, Row);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Column.create();
                                        Column.alignItems(HorizontalAlign.Start);
                                        Column.layoutWeight(1);
                                        Column.onClick(() => {
                                            this.selectFavorite(loc);
                                            this.manageVisible = false;
                                        });
                                    }, Column);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(this.locationTitle(loc));
                                        Text.fontSize(15);
                                        Text.fontWeight(FontWeight.Medium);
                                        Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                        Text.maxLines(1);
                                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                    }, Text);
                                    Text.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(loc.address);
                                        Text.fontSize(12);
                                        Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                        Text.maxLines(1);
                                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                        Text.margin({ top: 3 });
                                    }, Text);
                                    Text.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(`经度 ${(ChaoxingUtils.parseStoredCoord(loc.longitude)).toFixed(6)}  纬度 ${(ChaoxingUtils.parseStoredCoord(loc.latitude)).toFixed(6)}`);
                                        Text.fontSize(11);
                                        Text.fontColor({ "id": 16777248, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                        Text.margin({ top: 3 });
                                    }, Text);
                                    Text.pop();
                                    Column.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Button.createWithLabel('编辑');
                                        Button.fontSize(13);
                                        Button.height(28);
                                        Button.borderRadius(14);
                                        Button.backgroundColor({ "id": 16777258, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                        Button.fontColor({ "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                        Button.margin({ right: 8 });
                                        Button.onClick(() => {
                                            this.selectFavorite(loc);
                                            this.manageVisible = false;
                                        });
                                    }, Button);
                                    Button.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Button.createWithLabel('删除');
                                        Button.fontSize(13);
                                        Button.height(28);
                                        Button.borderRadius(14);
                                        Button.backgroundColor({ "id": 16777258, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                        Button.fontColor({ "id": 16777263, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                        Button.onClick(() => {
                                            this.confirmDelete(loc);
                                        });
                                    }, Button);
                                    Button.pop();
                                    Row.pop();
                                    ListItem.pop();
                                };
                                this.observeComponentCreation2(itemCreation2, ListItem);
                                ListItem.pop();
                            }
                        };
                        this.forEachUpdateFunction(elmtId, this.locations, forEachItemGenFunction, (loc: SavedLocation) => loc.id.toString(), false, false);
                    }, ForEach);
                    ForEach.pop();
                    List.pop();
                });
            }
        }, If);
        If.pop();
        Column.pop();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor({ "id": 125829132, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Column.borderRadius({ topLeft: 20, topRight: 20 });
            Column.bindSheet({ value: this.manageVisible, changeEvent: newValue => { this.manageVisible = newValue; } }, { builder: () => {
                    this.ManageSheet.call(this);
                } }, {
                height: 420,
                showClose: false,
                backgroundColor: { "id": 125829132, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" }
            });
            Column.onAppear(() => {
                this.loadLocations();
            });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 半屏弹层拖拽指示条
            Column.create();
            // 半屏弹层拖拽指示条
            Column.width(36);
            // 半屏弹层拖拽指示条
            Column.height(4);
            // 半屏弹层拖拽指示条
            Column.borderRadius(2);
            // 半屏弹层拖拽指示条
            Column.margin({ top: 10 });
        }, Column);
        // 半屏弹层拖拽指示条
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.padding({
                left: 20,
                right: 20,
                top: 12,
                bottom: 12
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('收藏的位置');
            Text.fontSize(24);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.layoutWeight(1);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('✕');
            Text.fontSize(18);
            Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.width(32);
            Text.height(32);
            Text.textAlign(TextAlign.Center);
            Text.borderRadius(16);
            Text.backgroundColor({ "id": 16777258, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.onClick(() => {
                if (this.onClose) {
                    this.onClose();
                }
            });
        }, Text);
        Text.pop();
        Row.pop();
        this.MapPanel.bind(this)();
        this.SelectionCard.bind(this)();
        Column.pop();
    }
    // ---------- 选点 ----------
    /** 安全执行 H5 脚本；页面未就绪或执行失败时静默（状态会在 onMapReady 握手时补推） */
    private runJs(expr: string) {
        if (!this.webReady) {
            return;
        }
        try {
            this.webController.runJavaScript(expr);
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Run JS failed: ${e.message}`);
        }
    }
    /** 收藏针全量重画（琥珀色星形针 + 备注标签） */
    private syncFavorites() {
        const pins: FavoritePin[] = this.locations.map((loc: SavedLocation): FavoritePin => {
            const gcj = ChaoxingUtils.bd09_to_gcj02(ChaoxingUtils.parseStoredCoord(loc.latitude), ChaoxingUtils.parseStoredCoord(loc.longitude));
            return {
                id: loc.id,
                lat: gcj.lat,
                lng: gcj.lon,
                label: this.markerLabel(loc)
            };
        });
        this.runJs(`window.setFavorites(${JSON.stringify(JSON.stringify(pins))})`);
    }
    /** 收藏针上方的标签文案：有备注时"备注 · 地点"，否则只显示地点 */
    private markerLabel(loc: SavedLocation): string {
        return loc.note !== '' ? `${loc.note} · ${loc.address}` : loc.address;
    }
    /** 选点针（红色水滴针 + 地址标签）；位置或标签变化时同步 */
    private syncPin() {
        if (this.hasPicked) {
            const label = this.pickedAddress !== '' ? this.pickedAddress : '选点';
            this.runJs(`window.setPin(${this.gcjLat},${this.gcjLon},${JSON.stringify(label)},true)`);
        }
        else {
            this.runJs('window.clearPin()');
        }
    }
    // ---------- 逆地理编码 ----------
    /** 镜头飞行到指定点 */
    private flyTo(lat: number, lon: number, zoom: number) {
        this.runJs(`window.flyTo(${lat},${lon},${zoom})`);
    }
    /**
     * 拦截瓦片请求：命中缓存直接回本地文件；未命中放行网络并异步落盘。
     * 对应 Map Kit 瓦片缓存管理中 diskCacheEnabled/diskCachePath 的自管实现。
     */
    private onInterceptTile(event?: OnInterceptRequestEvent): WebResourceResponse | undefined {
        if (!event) {
            return undefined;
        }
        const url = event.request.getRequestUrl();
        if (!url.includes('appmaptile')) {
            return undefined;
        }
        const m = url.match(/[?&]x=(\d+)&y=(\d+)&z=(\d+)/);
        if (!m || this.tileCacheDir === '') {
            return undefined;
        }
        const key = `${m[3]}_${m[1]}_${m[2]}.png`;
        const filePath = `${this.tileCacheDir}/${key}`;
        try {
            if (fs.accessSync(filePath)) {
                const file = fs.openSync(filePath, fs.OpenMode.READ_ONLY);
                const resp = new WebResourceResponse();
                resp.setResponseData(file.fd);
                resp.setResponseEncoding('utf-8');
                resp.setResponseMimeType('image/png');
                return resp;
            }
        }
        catch (e) {
            // 缓存读取失败则走网络
        }
        this.cacheTileAsync(url, filePath, key);
        return undefined;
    }
    // ---------- 增删改 ----------
    /** 未命中的瓦片异步拉取落盘；完成后做 LRU 容量检查（上限 4MB） */
    private cacheTileAsync(url: string, filePath: string, key: string) {
        if (this.tileInflight.has(key)) {
            return;
        }
        this.tileInflight.add(key);
        const req = http.createHttp();
        req.request(url, {
            method: http.RequestMethod.GET,
            expectDataType: http.HttpDataType.ARRAY_BUFFER,
            connectTimeout: 8000,
            readTimeout: 8000
        }).then((res: http.HttpResponse) => {
            if (res.responseCode === 200) {
                const ab = res.result as ArrayBuffer;
                if (ab.byteLength > 0) {
                    const file = fs.openSync(filePath, fs.OpenMode.READ_WRITE | fs.OpenMode.CREATE | fs.OpenMode.TRUNC);
                    fs.writeSync(file.fd, ab);
                    fs.closeSync(file.fd);
                    this.evictTileCache();
                }
            }
        }).catch((e: BusinessError<void>) => {
            hilog.error(DOMAIN, TAG, `Fetch tile failed: ${e.message}`);
        }).finally(() => {
            req.destroy();
            this.tileInflight.delete(key);
        });
    }
    /** 缓存总量超上限时按修改时间从旧到新淘汰 */
    private evictTileCache() {
        try {
            const names: string[] = fs.listFileSync(this.tileCacheDir);
            const stats: TileStat[] = [];
            let total = 0;
            for (const name of names) {
                const st = fs.statSync(`${this.tileCacheDir}/${name}`);
                total += st.size;
                stats.push({ name, mtime: st.mtime, size: st.size });
            }
            if (total <= TILE_DISK_CACHE_BYTES) {
                return;
            }
            stats.sort((a: TileStat, b: TileStat) => a.mtime - b.mtime);
            for (const st of stats) {
                if (total <= TILE_DISK_CACHE_BYTES) {
                    break;
                }
                fs.unlinkSync(`${this.tileCacheDir}/${st.name}`);
                total -= st.size;
            }
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Evict tile cache failed: ${e.message}`);
        }
    }
    /** 选点统一入口：地图点按、拖动针、定位；addressOverride 非空时直接作为地址 */
    private pickPosition(lat: number, lon: number, fly: boolean, addressOverride: string) {
        this.gcjLat = lat;
        this.gcjLon = lon;
        this.hasPicked = true;
        this.syncPin();
        if (fly) {
            this.flyTo(lat, lon, 16);
        }
        if (addressOverride !== '') {
            this.pickedAddress = addressOverride;
        }
        else {
            this.scheduleGeocode();
        }
    }
    /** 按当前选点状态同步针与镜头 */
    private applySelectionToMap() {
        if (!this.hasPicked) {
            return;
        }
        this.syncPin();
        this.flyTo(this.gcjLat, this.gcjLon, 16);
    }
    // ---------- UI ----------
    /** 点击收藏针/列表项 = 选中该收藏 */
    private selectFavorite(loc: SavedLocation) {
        this.editingId = loc.id;
        this.noteInput = loc.note;
        this.pickedAddress = loc.address;
        const gcj = ChaoxingUtils.bd09_to_gcj02(ChaoxingUtils.parseStoredCoord(loc.latitude), ChaoxingUtils.parseStoredCoord(loc.longitude));
        this.pickPosition(gcj.lat, gcj.lon, true, loc.address);
    }
    /** 定位到当前位置：仅移动镜头，不打标记、不选点 */
    private async locateCurrent() {
        try {
            const atManager = abilityAccessCtrl.createAtManager();
            const permissions: Array<Permissions> = ['ohos.permission.APPROXIMATELY_LOCATION', 'ohos.permission.LOCATION'];
            const context = getContext(this) as common.UIAbilityContext;
            const result = await atManager.requestPermissionsFromUser(context, permissions);
            if (!result.authResults.every((r: number) => r === 0)) {
                promptAction.showToast({ message: '未获得定位权限，请在系统设置中开启', duration: 1500 });
                return;
            }
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Request location permission failed: ${e.message}`);
            promptAction.showToast({ message: '定位权限请求失败' });
            return;
        }
        this.gpsLocating = true;
        try {
            const location = await geoLocationManager.getCurrentLocation();
            const gcj = ChaoxingUtils.wgs84_to_gcj02(location.latitude, location.longitude);
            this.flyTo(gcj.lat, gcj.lon, 16);
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Get current location failed: ${e.message}`);
            promptAction.showToast({ message: '定位失败，请检查定位服务' });
        }
        finally {
            this.gpsLocating = false;
        }
    }
    private scheduleGeocode() {
        if (this.geocodeTimer >= 0) {
            clearTimeout(this.geocodeTimer);
        }
        this.geocodeSeq++;
        const seq = this.geocodeSeq;
        this.geocodeTimer = setTimeout(() => {
            this.geocodeTimer = -1;
            this.reverseGeocode(seq);
        }, 500);
    }
    /** 选点后取地址；getAddressesFromLocation 中国境内按 GCJ-02 请求 */
    private async reverseGeocode(seq: number) {
        try {
            const addresses = await geoLocationManager.getAddressesFromLocation({
                latitude: this.gcjLat,
                longitude: this.gcjLon,
                maxItems: 1
            });
            if (seq !== this.geocodeSeq) {
                return;
            }
            if (addresses.length > 0 && addresses[0].placeName) {
                this.pickedAddress = addresses[0].placeName;
            }
            else {
                this.pickedAddress = `${this.gcjLat.toFixed(6)}, ${this.gcjLon.toFixed(6)}`;
            }
            // 地址回填后刷新选点针上方的标签
            this.syncPin();
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Reverse geocode failed: ${e.message}`);
            if (seq !== this.geocodeSeq) {
                return;
            }
            this.pickedAddress = `${this.gcjLat.toFixed(6)}, ${this.gcjLon.toFixed(6)}`;
        }
    }
    rerender() {
        this.updateDirtyElements();
    }
}
