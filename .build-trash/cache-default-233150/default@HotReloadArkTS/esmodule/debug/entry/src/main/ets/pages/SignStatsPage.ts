if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface SignStatsPage_Params {
    stats?: SignStats | null;
    records?: SignRecord[];
    isLoading?: boolean;
    isSyncing?: boolean;
    statusBarHeight?: number;
    pathInfos?: NavPathStack;
    listScroller?: Scroller;
    supportFloatingBar?: boolean;
}
import { DatabaseManager } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import type { SignRecord, SignStats, SignTypeCount } from "@normalized:N&&&entry/src/main/ets/utils/DataBase&";
import { LeaderboardReporter } from "@normalized:N&&&entry/src/main/ets/utils/LeaderboardReporter&";
import hilog from "@ohos:hilog";
import { LengthMetrics } from "@ohos:arkui.node";
import promptAction from "@ohos:promptAction";
import deviceInfo from "@ohos:deviceInfo";
import { HdsNavDestination } from "@hms:hds.hdsBaseComponent";
import { ScrollEffectType } from "@hms:hds.hdsBaseComponent";
import type { HdsNavDestinationAttribute } from "@hms:hds.hdsBaseComponent";
import type { hdsMaterial } from "@hms:hds.hdsMaterial";
const TAG = 'SignStatsPage';
const DOMAIN = 0x0009;
// 沉浸光感枚举值别名（首页/活动列表同款）
const HDS_MATERIAL_TYPE_ADAPTIVE = 100;
const HDS_MATERIAL_LEVEL_GENTLE = 1;
/** 历史记录展示上限（更早的记录不展示，但仍参与顶部汇总统计） */
const HISTORY_LIMIT = 200;
/** 签到类型展示名（与 ActivityListPage.SignType 的字符串值对应） */
function signTypeLabel(signType: string): string {
    if (signType === '0') {
        return '普通/拍照';
    }
    else if (signType === '2') {
        return '扫码';
    }
    else if (signType === '3') {
        return '手势';
    }
    else if (signType === '4') {
        return '位置';
    }
    else if (signType === '5') {
        return '签到码';
    }
    return '其他';
}
/** 记录时间格式化：yyyy-MM-dd HH:mm */
function formatTime(createTime: number): string {
    const d = new Date(createTime);
    const pad = (n: number): string => n < 10 ? `0${n}` : `${n}`;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function initSignStats(name: string, parent = null) {
    const __name__ = name;
    {
        (parent ? parent : this).observeComponentCreation2((elmtId, isInitialRender, name = __name__) => {
            if (isInitialRender) {
                let componentCall = new SignStatsPage(parent ? parent : this, {}, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/SignStatsPage.ets", line: 46, col: 3 });
                ViewPU.create(componentCall);
                let paramsLambda = () => {
                    return {};
                };
                componentCall.paramsGenerator_ = paramsLambda;
            }
            else {
                (parent ? parent : this).updateStateVarsOfChildByElmtId(elmtId, {});
            }
        }, { name: "SignStatsPage" });
    }
}
class SignStatsPage extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__stats = new ObservedPropertyObjectPU(null, this, "stats");
        this.__records = new ObservedPropertyObjectPU([], this, "records");
        this.__isLoading = new ObservedPropertySimplePU(true, this, "isLoading");
        this.__isSyncing = new ObservedPropertySimplePU(false, this, "isSyncing");
        this.__statusBarHeight = this.createStorageProp('statusBarHeight', 0, "statusBarHeight");
        this.pathInfos = new NavPathStack();
        this.listScroller = new Scroller();
        this.supportFloatingBar = deviceInfo.sdkApiVersion >= 23;
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: SignStatsPage_Params) {
        if (params.stats !== undefined) {
            this.stats = params.stats;
        }
        if (params.records !== undefined) {
            this.records = params.records;
        }
        if (params.isLoading !== undefined) {
            this.isLoading = params.isLoading;
        }
        if (params.isSyncing !== undefined) {
            this.isSyncing = params.isSyncing;
        }
        if (params.pathInfos !== undefined) {
            this.pathInfos = params.pathInfos;
        }
        if (params.listScroller !== undefined) {
            this.listScroller = params.listScroller;
        }
        if (params.supportFloatingBar !== undefined) {
            this.supportFloatingBar = params.supportFloatingBar;
        }
    }
    updateStateVars(params: SignStatsPage_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__stats.purgeDependencyOnElmtId(rmElmtId);
        this.__records.purgeDependencyOnElmtId(rmElmtId);
        this.__isLoading.purgeDependencyOnElmtId(rmElmtId);
        this.__isSyncing.purgeDependencyOnElmtId(rmElmtId);
        this.__statusBarHeight.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__stats.aboutToBeDeleted();
        this.__records.aboutToBeDeleted();
        this.__isLoading.aboutToBeDeleted();
        this.__isSyncing.aboutToBeDeleted();
        this.__statusBarHeight.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __stats: ObservedPropertyObjectPU<SignStats | null>;
    get stats() {
        return this.__stats.get();
    }
    set stats(newValue: SignStats | null) {
        this.__stats.set(newValue);
    }
    private __records: ObservedPropertyObjectPU<SignRecord[]>;
    get records() {
        return this.__records.get();
    }
    set records(newValue: SignRecord[]) {
        this.__records.set(newValue);
    }
    private __isLoading: ObservedPropertySimplePU<boolean>;
    get isLoading() {
        return this.__isLoading.get();
    }
    set isLoading(newValue: boolean) {
        this.__isLoading.set(newValue);
    }
    private __isSyncing: ObservedPropertySimplePU<boolean>;
    get isSyncing() {
        return this.__isSyncing.get();
    }
    set isSyncing(newValue: boolean) {
        this.__isSyncing.set(newValue);
    }
    private __statusBarHeight: ObservedPropertyAbstractPU<number>; // EntryAbility 实测的状态栏高度
    get statusBarHeight() {
        return this.__statusBarHeight.get();
    }
    set statusBarHeight(newValue: number) {
        this.__statusBarHeight.set(newValue);
    }
    private pathInfos: NavPathStack;
    private listScroller: Scroller; // 标题栏渐变模糊的滚动绑定源
    // 6.1(23) 起支持沉浸光感材质，低版本系统走默认样式（首页同款）
    private readonly supportFloatingBar: boolean;
    /** 汇总成功率（无记录时显示占位符） */
    private successRate(): string {
        if (!this.stats || this.stats.signTotal === 0) {
            return '--';
        }
        return `${Math.round(this.stats.signSuccess * 100 / this.stats.signTotal)}%`;
    }
    /** 类型分布条形图的最大值（做分母，避免除零） */
    private maxTypeCount(): number {
        let max = 1;
        this.stats?.typeCounts.forEach((t: SignTypeCount) => {
            if (t.count > max) {
                max = t.count;
            }
        });
        return max;
    }
    /** 结果 kind → 展示颜色：成功绿 / 已签到琥珀 / 其余红 */
    private kindColor(kind: string): Resource {
        if (kind === 'success') {
            return { "id": 16777256, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" };
        }
        else if (kind === 'already') {
            return { "id": 16777232, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" };
        }
        return { "id": 16777263, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" };
    }
    private async loadData() {
        this.isLoading = true;
        try {
            const db = DatabaseManager.getInstance();
            this.stats = await db.getSignStats();
            this.records = await db.getSignRecords(HISTORY_LIMIT);
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Failed to load sign stats: ${(e as Error).message}`);
            promptAction.showToast({ message: '签到统计加载失败' });
        }
        finally {
            this.isLoading = false;
        }
    }
    private confirmClearRecords() {
        AlertDialog.show({
            title: '清空签到统计',
            message: '将删除全部本地签到统计记录，且无法恢复，是否继续？',
            primaryButton: {
                value: '取消',
                action: () => {
                }
            },
            secondaryButton: {
                value: '清空',
                action: async () => {
                    try {
                        await DatabaseManager.getInstance().clearSignRecords();
                        await this.loadData();
                        promptAction.showToast({ message: '已清空签到统计' });
                    }
                    catch (e) {
                        hilog.error(DOMAIN, TAG, `Failed to clear sign records: ${(e as Error).message}`);
                        promptAction.showToast({ message: '清空失败' });
                    }
                }
            }
        });
    }
    /** 本地记录补录到云端排行榜：按原始落库时间上报，计分由 Worker 唯一索引去重 */
    private async syncToCloud() {
        if (this.isSyncing) {
            return;
        }
        this.isSyncing = true;
        try {
            const outcome = await LeaderboardReporter.syncHistoryToCloud();
            promptAction.showToast({
                message: `云同步完成：成功 ${outcome.synced} 条，跳过 ${outcome.skipped} 条，失败 ${outcome.failed} 条`,
                duration: 3000
            });
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Cloud sync failed: ${(e as Error).message}`);
            promptAction.showToast({ message: `云同步失败：${(e as Error).message}` });
        }
        finally {
            this.isSyncing = false;
        }
    }
    SummaryCard(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.alignItems(HorizontalAlign.Start);
            Column.padding(14);
            Column.width('100%');
            Column.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Column.borderRadius(14);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('汇总');
            Text.fontSize(16);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.width('100%');
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.margin({ top: 12 });
        }, Row);
        this.SummaryItem.bind(this)(`${this.stats?.signTotal ?? 0}`, '签到次数');
        this.SummaryItem.bind(this)(`${this.stats?.signSuccess ?? 0}`, '成功');
        this.SummaryItem.bind(this)(`${this.stats?.signFailed ?? 0}`, '失败');
        this.SummaryItem.bind(this)(this.successRate(), '成功率');
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(`已签到(重复) ${this.stats?.signAlready ?? 0} 次 · 签退成功 ${this.stats?.signOutSuccess ?? 0} 次`);
            Text.fontSize(12);
            Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.width('100%');
            Text.margin({ top: 10 });
        }, Text);
        Text.pop();
        Column.pop();
    }
    SummaryItem(value: string, label: string, parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.layoutWeight(1);
            Column.alignItems(HorizontalAlign.Center);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(value);
            Text.fontSize(20);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.maxLines(1);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(label);
            Text.fontSize(12);
            Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.margin({ top: 4 });
        }, Text);
        Text.pop();
        Column.pop();
    }
    TypeCard(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.alignItems(HorizontalAlign.Start);
            Column.padding(14);
            Column.width('100%');
            Column.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Column.borderRadius(14);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('签到类型分布');
            Text.fontSize(16);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.width('100%');
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            ForEach.create();
            const forEachItemGenFunction = _item => {
                const t = _item;
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.margin({ top: 10 });
                    Column.width('100%');
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.width('100%');
                }, Row);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create(signTypeLabel(t.signType));
                    Text.fontSize(13);
                    Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Text);
                Text.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Blank.create();
                }, Blank);
                Blank.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create(`${t.count} 次`);
                    Text.fontSize(12);
                    Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Text);
                Text.pop();
                Row.pop();
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Progress.create({ value: t.count, total: this.maxTypeCount(), type: ProgressType.Linear });
                    Progress.width('100%');
                    Progress.height(6);
                    Progress.margin({ top: 6 });
                    Progress.color({ "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                    Progress.backgroundColor({ "id": 16777237, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                }, Progress);
                Column.pop();
            };
            this.forEachUpdateFunction(elmtId, this.stats?.typeCounts ?? [], forEachItemGenFunction, (t: SignTypeCount) => t.signType, false, false);
        }, ForEach);
        ForEach.pop();
        Column.pop();
    }
    HistoryCard(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.alignItems(HorizontalAlign.Start);
            Column.padding(14);
            Column.width('100%');
            Column.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Column.borderRadius(14);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('最近记录');
            Text.fontSize(16);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.layoutWeight(1);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(`${this.records.length} 条`);
            Text.fontSize(12);
            Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            ForEach.create();
            const forEachItemGenFunction = (_item, index: number) => {
                const record = _item;
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.width('100%');
                    Column.margin({ top: 8 });
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    if (index > 0) {
                        this.ifElseBranchUpdateFunction(0, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Divider.create();
                                Divider.color({ "id": 16777237, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                Divider.margin({ top: 8 });
                            }, Divider);
                        });
                    }
                    else {
                        this.ifElseBranchUpdateFunction(1, () => {
                        });
                    }
                }, If);
                If.pop();
                this.RecordItem.bind(this)(record);
                Column.pop();
            };
            this.forEachUpdateFunction(elmtId, this.records, forEachItemGenFunction, (record: SignRecord) => record.id.toString(), true, false);
        }, ForEach);
        ForEach.pop();
        Column.pop();
    }
    RecordItem(record: SignRecord, parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.alignItems(VerticalAlign.Top);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('●');
            Text.fontSize(12);
            Text.fontColor(this.kindColor(record.kind));
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.layoutWeight(1);
            Column.alignItems(HorizontalAlign.Start);
            Column.margin({ left: 8 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(record.uname);
            Text.fontSize(15);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.maxLines(1);
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (record.action === 'signout') {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('签退');
                        Text.fontSize(10);
                        Text.fontColor({ "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.padding({ left: 6, right: 6, top: 2, bottom: 2 });
                        Text.backgroundColor({ "id": 16777282, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                        Text.borderRadius(8);
                        Text.margin({ left: 6 });
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
            Blank.create();
        }, Blank);
        Blank.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(formatTime(record.createTime));
            Text.fontSize(11);
            Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(`${signTypeLabel(record.signType)} · ${record.activityName !== '' ? record.activityName : '未知活动'}`);
            Text.fontSize(12);
            Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.maxLines(1);
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
            Text.margin({ top: 3 });
            Text.width('100%');
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(record.message);
            Text.fontSize(12);
            Text.fontColor(this.kindColor(record.kind));
            Text.maxLines(2);
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
            Text.margin({ top: 3 });
            Text.width('100%');
        }, Text);
        Text.pop();
        Column.pop();
        Row.pop();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            HdsNavDestination.create(() => {
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    if (this.isLoading) {
                        this.ifElseBranchUpdateFunction(0, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Column.create();
                                Column.width('100%');
                                Column.height('100%');
                                Column.justifyContent(FlexAlign.Center);
                            }, Column);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                LoadingProgress.create();
                                LoadingProgress.width(44);
                                LoadingProgress.height(44);
                                LoadingProgress.color({ "id": 16777248, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            }, LoadingProgress);
                            Column.pop();
                        });
                    }
                    else if (!this.stats || (this.stats.signTotal === 0 && this.stats.signOutSuccess === 0 &&
                        this.records.length === 0)) {
                        this.ifElseBranchUpdateFunction(1, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Column.create();
                                Column.width('100%');
                                Column.height('100%');
                                Column.justifyContent(FlexAlign.Center);
                            }, Column);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create('暂无签到统计');
                                Text.fontSize(16);
                                Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            }, Text);
                            Text.pop();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create('完成签到后，这里将展示签到成功率与历史记录');
                                Text.fontSize(13);
                                Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                Text.margin({ top: 8 });
                            }, Text);
                            Text.pop();
                            Column.pop();
                        });
                    }
                    else {
                        this.ifElseBranchUpdateFunction(2, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                List.create({ space: 0, scroller: this.listScroller });
                                List.width('100%');
                                List.height('100%');
                                List.scrollBar(BarState.Off);
                            }, List);
                            {
                                const itemCreation = (elmtId, isInitialRender) => {
                                    ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                                    ListItem.create(deepRenderFunction, true);
                                    if (!isInitialRender) {
                                        // 让位标题栏的空白做成列表首项（随内容滚动收起，保证标题栏渐变模糊生效，首页同款）
                                        ListItem.pop();
                                    }
                                    ViewStackProcessor.StopGetAccessRecording();
                                };
                                const itemCreation2 = (elmtId, isInitialRender) => {
                                    ListItem.create(deepRenderFunction, true);
                                    // 让位标题栏的空白做成列表首项（随内容滚动收起，保证标题栏渐变模糊生效，首页同款）
                                    ListItem.width('100%');
                                };
                                const deepRenderFunction = (elmtId, isInitialRender) => {
                                    itemCreation(elmtId, isInitialRender);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Column.create();
                                        Column.height(this.statusBarHeight + 56);
                                    }, Column);
                                    Column.pop();
                                    // 让位标题栏的空白做成列表首项（随内容滚动收起，保证标题栏渐变模糊生效，首页同款）
                                    ListItem.pop();
                                };
                                this.observeComponentCreation2(itemCreation2, ListItem);
                                // 让位标题栏的空白做成列表首项（随内容滚动收起，保证标题栏渐变模糊生效，首页同款）
                                ListItem.pop();
                            }
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
                                    ListItem.width('100%');
                                    ListItem.padding({ left: 16, right: 16 });
                                };
                                const deepRenderFunction = (elmtId, isInitialRender) => {
                                    itemCreation(elmtId, isInitialRender);
                                    this.SummaryCard.bind(this)();
                                    ListItem.pop();
                                };
                                this.observeComponentCreation2(itemCreation2, ListItem);
                                ListItem.pop();
                            }
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                If.create();
                                if (this.stats && this.stats.typeCounts.length > 0) {
                                    this.ifElseBranchUpdateFunction(0, () => {
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
                                                ListItem.width('100%');
                                                ListItem.padding({ left: 16, right: 16 });
                                                ListItem.margin({ top: 10 });
                                            };
                                            const deepRenderFunction = (elmtId, isInitialRender) => {
                                                itemCreation(elmtId, isInitialRender);
                                                this.TypeCard.bind(this)();
                                                ListItem.pop();
                                            };
                                            this.observeComponentCreation2(itemCreation2, ListItem);
                                            ListItem.pop();
                                        }
                                    });
                                }
                                else {
                                    this.ifElseBranchUpdateFunction(1, () => {
                                    });
                                }
                            }, If);
                            If.pop();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                If.create();
                                if (this.records.length > 0) {
                                    this.ifElseBranchUpdateFunction(0, () => {
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
                                                ListItem.width('100%');
                                                ListItem.padding({ left: 16, right: 16 });
                                                ListItem.margin({ top: 10 });
                                            };
                                            const deepRenderFunction = (elmtId, isInitialRender) => {
                                                itemCreation(elmtId, isInitialRender);
                                                this.HistoryCard.bind(this)();
                                                ListItem.pop();
                                            };
                                            this.observeComponentCreation2(itemCreation2, ListItem);
                                            ListItem.pop();
                                        }
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
                                                ListItem.width('100%');
                                                ListItem.padding({ left: 16, right: 16 });
                                                ListItem.margin({ top: 16 });
                                            };
                                            const deepRenderFunction = (elmtId, isInitialRender) => {
                                                itemCreation(elmtId, isInitialRender);
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Button.createWithLabel(this.isSyncing ? '同步中...' : '同步记录到云端');
                                                    Button.width('100%');
                                                    Button.height(46);
                                                    Button.borderRadius(23);
                                                    Button.fontSize(16);
                                                    Button.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                                    Button.fontColor({ "id": 16777255, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                                    Button.enabled(!this.isSyncing);
                                                    Button.onClick(() => {
                                                        this.syncToCloud();
                                                    });
                                                }, Button);
                                                Button.pop();
                                                ListItem.pop();
                                            };
                                            this.observeComponentCreation2(itemCreation2, ListItem);
                                            ListItem.pop();
                                        }
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
                                                ListItem.width('100%');
                                                ListItem.padding({ left: 16, right: 16 });
                                                ListItem.margin({ top: 10 });
                                            };
                                            const deepRenderFunction = (elmtId, isInitialRender) => {
                                                itemCreation(elmtId, isInitialRender);
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Button.createWithLabel('清空统计记录');
                                                    Button.width('100%');
                                                    Button.height(46);
                                                    Button.borderRadius(23);
                                                    Button.fontSize(16);
                                                    Button.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                                    Button.fontColor({ "id": 16777263, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                                    Button.onClick(() => {
                                                        this.confirmClearRecords();
                                                    });
                                                }, Button);
                                                Button.pop();
                                                ListItem.pop();
                                            };
                                            this.observeComponentCreation2(itemCreation2, ListItem);
                                            ListItem.pop();
                                        }
                                    });
                                }
                                else {
                                    this.ifElseBranchUpdateFunction(1, () => {
                                    });
                                }
                            }, If);
                            If.pop();
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
                                    ListItem.width('100%');
                                };
                                const deepRenderFunction = (elmtId, isInitialRender) => {
                                    itemCreation(elmtId, isInitialRender);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Column.create();
                                        Column.height(24);
                                    }, Column);
                                    Column.pop();
                                    ListItem.pop();
                                };
                                this.observeComponentCreation2(itemCreation2, ListItem);
                                ListItem.pop();
                            }
                            List.pop();
                        });
                    }
                }, If);
                If.pop();
            }, { moduleName: "entry", pagePath: "entry/src/main/ets/pages/SignStatsPage" });
            HdsNavDestination.height('100%');
            HdsNavDestination.width('100%');
            HdsNavDestination.backgroundColor({ "id": 16777250, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            HdsNavDestination.titleBar({
                content: {
                    title: { mainTitle: '签到统计' },
                    menu: {
                        value: [{
                                content: {
                                    icon: { "id": 16777277, "type": 20000, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" },
                                    label: '清空签到统计',
                                    action: () => {
                                        this.confirmClearRecords();
                                    }
                                }
                            }]
                    }
                },
                style: {
                    scrollEffectOpts: {
                        enableScrollEffect: true,
                        scrollEffectType: ScrollEffectType.GRADIENT_BLUR,
                        blurEffectiveEndOffset: LengthMetrics.vp(this.statusBarHeight + 56)
                    },
                    systemMaterialEffect: this.supportFloatingBar ? {
                        materialType: HDS_MATERIAL_TYPE_ADAPTIVE as hdsMaterial.MaterialType,
                        materialLevel: HDS_MATERIAL_LEVEL_GENTLE as hdsMaterial.MaterialLevel
                    } : undefined
                },
                avoidLayoutSafeArea: false,
                enableComponentSafeArea: false
            });
            HdsNavDestination.ignoreLayoutSafeArea([LayoutSafeAreaType.SYSTEM], [LayoutSafeAreaEdge.TOP, LayoutSafeAreaEdge.BOTTOM]);
            HdsNavDestination.bindToScrollable([this.listScroller]);
            HdsNavDestination.onReady((ctx: NavDestinationContext) => {
                this.pathInfos = ctx.pathStack;
            });
            HdsNavDestination.onAppear(() => {
                this.loadData();
            });
        }, HdsNavDestination);
        HdsNavDestination.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
}
(function () {
    if (typeof NavigationBuilderRegister === "function") {
        NavigationBuilderRegister("SignStatsPage", wrapBuilder(initSignStats));
    }
})();
