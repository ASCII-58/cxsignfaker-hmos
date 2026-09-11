import { hilog } from '@kit.PerformanceAnalysisKit';
import { LengthMetrics, promptAction } from '@kit.ArkUI';
import { deviceInfo } from '@kit.BasicServicesKit';
import { HdsNavDestination, ScrollEffectType } from '@kit.UIDesignKit';
// hdsMaterial 是 6.1(23) API：API<23 系统无该导出，静态 import 值会启动即崩（SignStatsPage 同款处理），
// 这里只做类型导入，枚举值用常量
import type { hdsMaterial } from '@kit.UIDesignKit';
import { LeaderboardEntry, LeaderboardReporter } from '../utils/LeaderboardReporter';

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
    return $r('app.color.medal_gold')
  } else if (rank === 2) {
    return $r('app.color.medal_silver')
  } else if (rank === 3) {
    return $r('app.color.medal_bronze')
  }
  return $r('app.color.secondary_text')
}

@Builder
export function initLeaderboard(name: string) {
  LeaderboardPage()
}

/**
 * 签到排行榜页：展示全平台用户按「当前连续天数」排序的云端榜单
 * （数据来自 Cloudflare Worker + D1 公开只读接口 /leaderboard，由 LeaderboardReporter 拉取）
 */
@Component
struct LeaderboardPage {
  @State entries: LeaderboardEntry[] = [];
  @State isLoading: boolean = true;
  @State isRefreshing: boolean = false;
  @StorageProp('statusBarHeight') statusBarHeight: number = 0; // EntryAbility 实测的状态栏高度
  private pathInfos: NavPathStack = new NavPathStack();
  private listScroller: Scroller = new Scroller(); // 标题栏渐变模糊的滚动绑定源
  // 6.1(23) 起支持沉浸光感材质，低版本系统走默认样式（首页同款）
  private readonly supportFloatingBar: boolean = deviceInfo.sdkApiVersion >= 23

  private async loadData() {
    try {
      this.entries = await LeaderboardReporter.fetchLeaderboard(LEADERBOARD_LIMIT)
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Failed to load leaderboard: ${(e as Error).message}`)
      promptAction.showToast({ message: '排行榜加载失败' })
    } finally {
      this.isLoading = false
      this.isRefreshing = false
    }
  }

  /** 榜单说明卡片：排序口径 + 上榜人数 */
  @Builder
  SummaryCard() {
    Column() {
      Text('排行榜')
        .fontSize(16).fontWeight(FontWeight.Medium)
        .fontColor($r('app.color.primary_text')).width('100%')
      Text(`共 ${this.entries.length} 人上榜 · 按「当前连续天数」排序，同天比累计次数`)
        .fontSize(12).fontColor($r('app.color.secondary_text'))
        .width('100%').margin({ top: 6 })
    }
    .alignItems(HorizontalAlign.Start)
    .padding(14).width('100%')
    .backgroundColor($r('app.color.card_background'))
    .borderRadius(14)
  }

  @Builder
  RankItem(entry: LeaderboardEntry, rank: number) {
    Row() {
      Text(`${rank}`)
        .fontSize(16).fontWeight(FontWeight.Bold)
        .fontColor(rankColor(rank))
        .width(32).textAlign(TextAlign.Center)
      Column() {
        Text(entry.display_name)
          .fontSize(15).fontWeight(FontWeight.Medium)
          .fontColor($r('app.color.primary_text'))
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
        Text(`累计 ${entry.total_signs} 次（${entry.total_days} 天） · 本周 ${entry.week_signs} 次 · 最长连续 ${entry.longest_streak} 天`)
          .fontSize(12).fontColor($r('app.color.secondary_text'))
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .margin({ top: 3 })
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
      .margin({ left: 8 })

      Column() {
        Text(`${entry.streak_days}`)
          .fontSize(18).fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.primary_text'))
        Text('连续天数')
          .fontSize(10).fontColor($r('app.color.secondary_text'))
          .margin({ top: 2 })
      }
      .alignItems(HorizontalAlign.End)
    }
    .width('100%')
    .padding({ top: 10, bottom: 10 })
  }

  build() {
    // HdsNavDestination（首页/统计页同款悬浮标题栏）：无级渐变模糊随列表滚动连续变化
    HdsNavDestination() {
      if (this.isLoading) {
        Column() {
          LoadingProgress()
            .width(44).height(44)
            .color($r('app.color.icon'))
        }
        .width('100%').height('100%')
        .justifyContent(FlexAlign.Center)
      } else if (this.entries.length === 0) {
        Column() {
          Text('暂无上榜记录')
            .fontSize(16).fontColor($r('app.color.primary_text'))
          Text('完成一次云端签到后，这里将展示全平台排行榜')
            .fontSize(13).fontColor($r('app.color.secondary_text'))
            .margin({ top: 8 })
        }
        .width('100%').height('100%')
        .justifyContent(FlexAlign.Center)
      } else {
        Refresh({ refreshing: $$this.isRefreshing }) {
          List({ space: 0, scroller: this.listScroller }) {
            // 让位标题栏的空白做成列表首项（随内容滚动收起，保证标题栏渐变模糊生效，首页同款）
            ListItem() {
              Column().height(this.statusBarHeight + 56)
            }.width('100%')
            ListItem() {
              this.SummaryCard()
            }.width('100%').padding({ left: 16, right: 16 })
            ListItem() {
              Column() {
                ForEach(this.entries, (entry: LeaderboardEntry, index: number) => {
                  Column() {
                    if (index > 0) {
                      Divider()
                        .color($r('app.color.class_icon_border'))
                    }
                    this.RankItem(entry, index + 1)
                  }
                  .width('100%')
                }, (entry: LeaderboardEntry) => entry.uid.toString())
              }
              .padding(14).width('100%')
              .backgroundColor($r('app.color.card_background'))
              .borderRadius(14)
            }.width('100%').padding({ left: 16, right: 16 }).margin({ top: 10 })
            ListItem() {
              Column().height(24)
            }.width('100%')
          }
          .width('100%').height('100%')
          .scrollBar(BarState.Off)
        }
        .width('100%').height('100%')
        .onRefreshing(async () => { await this.loadData(); }) // 下拉刷新榜单（首页课程列表同款）
      }
    }
    .height('100%')
    .width('100%')
    .backgroundColor($r('app.color.page_background'))
    .titleBar({
      content: {
        title: { mainTitle: '签到排行榜' }
      },
      style: {
        scrollEffectOpts: { // 系统级无级渐变模糊（首页同款）：模糊量随列表滚动连续变化
          enableScrollEffect: true,
          scrollEffectType: ScrollEffectType.GRADIENT_BLUR,
          blurEffectiveEndOffset: LengthMetrics.vp(this.statusBarHeight + 56)
        },
        systemMaterialEffect: this.supportFloatingBar ? { // 沉浸光感材质（首页同款），6.0 走默认样式
          materialType: HDS_MATERIAL_TYPE_ADAPTIVE as hdsMaterial.MaterialType,
          materialLevel: HDS_MATERIAL_LEVEL_GENTLE as hdsMaterial.MaterialLevel
        } : undefined
      },
      avoidLayoutSafeArea: false,
      enableComponentSafeArea: false
    })
    .ignoreLayoutSafeArea([LayoutSafeAreaType.SYSTEM], [LayoutSafeAreaEdge.TOP, LayoutSafeAreaEdge.BOTTOM]) // 内容铺满状态栏和手势条之下
    .bindToScrollable([this.listScroller]) // 标题栏模糊绑定列表滚动
    .onReady((ctx: NavDestinationContext) => {
      this.pathInfos = ctx.pathStack;
    })
    .onAppear(() => {
      this.loadData()
    })
  }
}
