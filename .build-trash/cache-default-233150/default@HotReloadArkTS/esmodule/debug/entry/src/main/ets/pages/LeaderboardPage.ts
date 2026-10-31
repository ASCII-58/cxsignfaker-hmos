if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface LeaderboardPage_Params {
    entries?: LeaderboardEntry[];
    isLoading?: boolean;
    isRefreshing?: boolean;
    statusBarHeight?: number;
    pathInfos?: NavPathStack;
    listScroller?: Scroller;
    supportFloatingBar?: boolean;
}
import hilog from "@ohos:hilog";
import { LengthMetrics } from "@ohos:arkui.node";
import promptAction from "@ohos:promptAction";
import deviceInfo from "@ohos:deviceInfo";
import { HdsNavDestination } from "@hms:hds.hdsBaseComponent";
import { ScrollEffectType } from "@hms:hds.hdsBaseComponent";
import type { HdsNavDestinationAttribute } from "@hms:hds.hdsBaseComponent";
import type { hdsMaterial } from "@hms:hds.hdsMaterial";
import { LeaderboardReporter } from "@normalized:N&&&entry/src/main/ets/utils/LeaderboardReporter&";
import type { LeaderboardEntry } from "@normalized:N&&&entry/src/main/ets/utils/LeaderboardReporter&";
const TAG = 'LeaderboardPage';
const DOMAIN = 0x0009;
// 沉浸光感枚举值别名（首页/统计页同款）
const HDS_MATERIAL_TYPE_ADAPTIVE = 100;
const HDS_MATERIAL_LEVEL_GENTLE = 1;
/** 榜单拉取条数上限（Worker 端最大 200） */
const LEADERBOARD_LIMIT = 50;
/** 排名 → 展示色：前三名奖牌色，其余用次要文本色 */
function rankColor(rank: number): Resource {
    if (rank === 1) {
        return { "id": 16777303, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" };
    }
    else if (rank === 2) {
        return { "id": 16777304, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" };
    }
    else if (rank === 3) {
        return { "id": 16777284, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" };
    }
    return { "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" };
}
export function initLeaderboard(name: string, parent = null) {
    const __name__ = name;
    {
        (parent ? parent : this).observeComponentCreation2((elmtId, isInitialRender, name = __name__) => {
            if (isInitialRender) {
                let componentCall = new LeaderboardPage(parent ? parent : this, {}, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/LeaderboardPage.ets", line: 33, col: 3 });
                ViewPU.create(componentCall);
                let paramsLambda = () => {
                    return {};
                };
                componentCall.paramsGenerator_ = paramsLambda;
            }
            else {
                (parent ? parent : this).updateStateVarsOfChildByElmtId(elmtId, {});
            }
        }, { name: "LeaderboardPage" });
    }
}
class LeaderboardPage extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__entries = new ObservedPropertyObjectPU([], this, "entries");
        this.__isLoading = new ObservedPropertySimplePU(true, this, "isLoading");
        this.__isRefreshing = new ObservedPropertySimplePU(false, this, "isRefreshing");
        this.__statusBarHeight = this.createStorageProp('statusBarHeight', 0, "statusBarHeight");
        this.pathInfos = new NavPathStack();
        this.listScroller = new Scroller();
        this.supportFloatingBar = deviceInfo.sdkApiVersion >= 23;
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: LeaderboardPage_Params) {
        if (params.entries !== undefined) {
            this.entries = params.entries;
        }
        if (params.isLoading !== undefined) {
            this.isLoading = params.isLoading;
        }
        if (params.isRefreshing !== undefined) {
            this.isRefreshing = params.isRefreshing;
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
    updateStateVars(params: LeaderboardPage_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__entries.purgeDependencyOnElmtId(rmElmtId);
        this.__isLoading.purgeDependencyOnElmtId(rmElmtId);
        this.__isRefreshing.purgeDependencyOnElmtId(rmElmtId);
        this.__statusBarHeight.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__entries.aboutToBeDeleted();
        this.__isLoading.aboutToBeDeleted();
        this.__isRefreshing.aboutToBeDeleted();
        this.__statusBarHeight.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __entries: ObservedPropertyObjectPU<LeaderboardEntry[]>;
    get entries() {
        return this.__entries.get();
    }
    set entries(newValue: LeaderboardEntry[]) {
        this.__entries.set(newValue);
    }
    private __isLoading: ObservedPropertySimplePU<boolean>;
    get isLoading() {
        return this.__isLoading.get();
    }
    set isLoading(newValue: boolean) {
        this.__isLoading.set(newValue);
    }
    private __isRefreshing: ObservedPropertySimplePU<boolean>;
    get isRefreshing() {
        return this.__isRefreshing.get();
    }
    set isRefreshing(newValue: boolean) {
        this.__isRefreshing.set(newValue);
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
    private async loadData() {
        try {
            this.entries = await LeaderboardReporter.fetchLeaderboard(LEADERBOARD_LIMIT);
        }
        catch (e) {
            hilog.error(DOMAIN, TAG, `Failed to load leaderboard: ${(e as Error).message}`);
            promptAction.showToast({ message: '排行榜加载失败' });
        }
        finally {
            this.isLoading = false;
            this.isRefreshing = false;
        }
    }
    /** 榜单说明卡片：排序口径 + 上榜人数 */
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
            Text.create('排行榜');
            Text.fontSize(16);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.width('100%');
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(`共 ${this.entries.length} 人上榜 · 按「当前连续天数」排序，同天比累计次数`);
            Text.fontSize(12);
            Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.width('100%');
            Text.margin({ top: 6 });
        }, Text);
        Text.pop();
        Column.pop();
    }
    RankItem(entry: LeaderboardEntry, rank: number, parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.padding({ top: 10, bottom: 10 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(`${rank}`);
            Text.fontSize(16);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor(rankColor(rank));
            Text.width(32);
            Text.textAlign(TextAlign.Center);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.layoutWeight(1);
            Column.alignItems(HorizontalAlign.Start);
            Column.margin({ left: 8 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(entry.display_name);
            Text.fontSize(15);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.maxLines(1);
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(`累计 ${entry.total_signs} 次（${entry.total_days} 天） · 本周 ${entry.week_signs} 次 · 最长连续 ${entry.longest_streak} 天`);
            Text.fontSize(12);
            Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.maxLines(1);
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
            Text.margin({ top: 3 });
        }, Text);
        Text.pop();
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.alignItems(HorizontalAlign.End);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(`${entry.streak_days}`);
            Text.fontSize(18);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('连续天数');
            Text.fontSize(10);
            Text.fontColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            Text.margin({ top: 2 });
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
                    else if (this.entries.length === 0) {
                        this.ifElseBranchUpdateFunction(1, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Column.create();
                                Column.width('100%');
                                Column.height('100%');
                                Column.justifyContent(FlexAlign.Center);
                            }, Column);
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create('暂无上榜记录');
                                Text.fontSize(16);
                                Text.fontColor({ "id": 16777253, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                            }, Text);
                            Text.pop();
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create('完成一次云端签到后，这里将展示全平台排行榜');
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
                                Refresh.create({ refreshing: { value: this.isRefreshing, changeEvent: newValue => { this.isRefreshing = newValue; } } });
                                Refresh.width('100%');
                                Refresh.height('100%');
                                Refresh.onRefreshing(async () => { await this.loadData(); });
                            }, Refresh);
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
                                        Column.create();
                                        Column.padding(14);
                                        Column.width('100%');
                                        Column.backgroundColor({ "id": 16777234, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                        Column.borderRadius(14);
                                    }, Column);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        ForEach.create();
                                        const forEachItemGenFunction = (_item, index: number) => {
                                            const entry = _item;
                                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                Column.create();
                                                Column.width('100%');
                                            }, Column);
                                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                If.create();
                                                if (index > 0) {
                                                    this.ifElseBranchUpdateFunction(0, () => {
                                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                            Divider.create();
                                                            Divider.color({ "id": 16777237, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
                                                        }, Divider);
                                                    });
                                                }
                                                else {
                                                    this.ifElseBranchUpdateFunction(1, () => {
                                                    });
                                                }
                                            }, If);
                                            If.pop();
                                            this.RankItem.bind(this)(entry, index + 1);
                                            Column.pop();
                                        };
                                        this.forEachUpdateFunction(elmtId, this.entries, forEachItemGenFunction, (entry: LeaderboardEntry) => entry.uid.toString(), true, false);
                                    }, ForEach);
                                    ForEach.pop();
                                    Column.pop();
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
                            Refresh.pop();
                        });
                    }
                }, If);
                If.pop();
            }, { moduleName: "entry", pagePath: "entry/src/main/ets/pages/LeaderboardPage" });
            HdsNavDestination.height('100%');
            HdsNavDestination.width('100%');
            HdsNavDestination.backgroundColor({ "id": 16777250, "type": 10001, params: [], "bundleName": "com.xhub.chaoxingsignfaker", "moduleName": "entry" });
            HdsNavDestination.titleBar({
                content: {
                    title: { mainTitle: '签到排行榜' }
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
        NavigationBuilderRegister("LeaderboardPage", wrapBuilder(initLeaderboard));
    }
})();
