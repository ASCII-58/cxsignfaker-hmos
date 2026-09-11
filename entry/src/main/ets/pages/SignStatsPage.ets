import { DatabaseManager, SignRecord, SignStats, SignTypeCount } from '../utils/DataBase';
import { LeaderboardReporter } from '../utils/LeaderboardReporter';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { LengthMetrics, promptAction } from '@kit.ArkUI';
import { deviceInfo } from '@kit.BasicServicesKit';
import { HdsNavDestination, ScrollEffectType } from '@kit.UIDesignKit';
// hdsMaterial 是 6.1(23) API：API<23 系统无该导出，静态 import 值会启动即崩（见 Index.ets 同款处理），
// 这里只做类型导入，枚举值用常量
import type { hdsMaterial } from '@kit.UIDesignKit';

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
    return '普通/拍照'
  } else if (signType === '2') {
    return '扫码'
  } else if (signType === '3') {
    return '手势'
  } else if (signType === '4') {
    return '位置'
  } else if (signType === '5') {
    return '签到码'
  }
  return '其他'
}

/** 记录时间格式化：yyyy-MM-dd HH:mm */
function formatTime(createTime: number): string {
  const d = new Date(createTime)
  const pad = (n: number): string => n < 10 ? `0${n}` : `${n}`
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

@Builder
export function initSignStats(name: string) {
  SignStatsPage()
}

/**
 * 签到统计页：汇总（次数/成功/失败/成功率/签退）+ 签到类型分布 + 最近记录
 * 数据来自本地 SignRecord 表（SignerPage 每次签到/签退逐用户落库）；
 * 支持一键把本地记录补录到云端排行榜（LeaderboardReporter.syncHistoryToCloud）
 */
@Component
struct SignStatsPage {
  @State stats: SignStats | null = null;
  @State records: SignRecord[] = [];
  @State isLoading: boolean = true;
  @State isSyncing: boolean = false;
  @StorageProp('statusBarHeight') statusBarHeight: number = 0; // EntryAbility 实测的状态栏高度
  private pathInfos: NavPathStack = new NavPathStack();
  private listScroller: Scroller = new Scroller(); // 标题栏渐变模糊的滚动绑定源
  // 6.1(23) 起支持沉浸光感材质，低版本系统走默认样式（首页同款）
  private readonly supportFloatingBar: boolean = deviceInfo.sdkApiVersion >= 23

  /** 汇总成功率（无记录时显示占位符） */
  private successRate(): string {
    if (!this.stats || this.stats.signTotal === 0) {
      return '--'
    }
    return `${Math.round(this.stats.signSuccess * 100 / this.stats.signTotal)}%`
  }

  /** 类型分布条形图的最大值（做分母，避免除零） */
  private maxTypeCount(): number {
    let max = 1
    this.stats?.typeCounts.forEach((t: SignTypeCount) => {
      if (t.count > max) {
        max = t.count
      }
    })
    return max
  }

  /** 结果 kind → 展示颜色：成功绿 / 已签到琥珀 / 其余红 */
  private kindColor(kind: string): Resource {
    if (kind === 'success') {
      return $r('app.color.signed')
    } else if (kind === 'already') {
      return $r('app.color.beta_badge')
    }
    return $r('app.color.unsignable')
  }

  private async loadData() {
    this.isLoading = true
    try {
      const db = DatabaseManager.getInstance()
      this.stats = await db.getSignStats()
      this.records = await db.getSignRecords(HISTORY_LIMIT)
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Failed to load sign stats: ${(e as Error).message}`)
      promptAction.showToast({ message: '签到统计加载失败' })
    } finally {
      this.isLoading = false
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
            await DatabaseManager.getInstance().clearSignRecords()
            await this.loadData()
            promptAction.showToast({ message: '已清空签到统计' })
          } catch (e) {
            hilog.error(DOMAIN, TAG, `Failed to clear sign records: ${(e as Error).message}`)
            promptAction.showToast({ message: '清空失败' })
          }
        }
      }
    })
  }

  /** 本地记录补录到云端排行榜：按原始落库时间上报，计分由 Worker 唯一索引去重 */
  private async syncToCloud() {
    if (this.isSyncing) {
      return
    }
    this.isSyncing = true
    try {
      const outcome = await LeaderboardReporter.syncHistoryToCloud()
      promptAction.showToast({
        message: `云同步完成：成功 ${outcome.synced} 条，跳过 ${outcome.skipped} 条，失败 ${outcome.failed} 条`,
        duration: 3000
      })
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Cloud sync failed: ${(e as Error).message}`)
      promptAction.showToast({ message: `云同步失败：${(e as Error).message}` })
    } finally {
      this.isSyncing = false
    }
  }

  @Builder
  SummaryCard() {
    Column() {
      Text('汇总')
        .fontSize(16).fontWeight(FontWeight.Medium)
        .fontColor($r('app.color.primary_text')).width('100%')
      Row() {
        this.SummaryItem(`${this.stats?.signTotal ?? 0}`, '签到次数')
        this.SummaryItem(`${this.stats?.signSuccess ?? 0}`, '成功')
        this.SummaryItem(`${this.stats?.signFailed ?? 0}`, '失败')
        this.SummaryItem(this.successRate(), '成功率')
      }
      .width('100%').margin({ top: 12 })

      Text(`已签到(重复) ${this.stats?.signAlready ?? 0} 次 · 签退成功 ${this.stats?.signOutSuccess ?? 0} 次`)
        .fontSize(12).fontColor($r('app.color.secondary_text'))
        .width('100%').margin({ top: 10 })
    }
    .alignItems(HorizontalAlign.Start)
    .padding(14).width('100%')
    .backgroundColor($r('app.color.card_background'))
    .borderRadius(14)
  }

  @Builder
  SummaryItem(value: string, label: string) {
    Column() {
      Text(value)
        .fontSize(20).fontWeight(FontWeight.Bold)
        .fontColor($r('app.color.primary_text'))
        .maxLines(1)
      Text(label)
        .fontSize(12).fontColor($r('app.color.secondary_text'))
        .margin({ top: 4 })
    }
    .layoutWeight(1).alignItems(HorizontalAlign.Center)
  }

  @Builder
  TypeCard() {
    Column() {
      Text('签到类型分布')
        .fontSize(16).fontWeight(FontWeight.Medium)
        .fontColor($r('app.color.primary_text')).width('100%')
      ForEach(this.stats?.typeCounts ?? [], (t: SignTypeCount) => {
        Column() {
          Row() {
            Text(signTypeLabel(t.signType))
              .fontSize(13).fontColor($r('app.color.primary_text'))
            Blank()
            Text(`${t.count} 次`)
              .fontSize(12).fontColor($r('app.color.secondary_text'))
          }
          .width('100%')
          Progress({ value: t.count, total: this.maxTypeCount(), type: ProgressType.Linear })
            .width('100%').height(6).margin({ top: 6 })
            .color($r('app.color.selected'))
            .backgroundColor($r('app.color.class_icon_border'))
        }
        .margin({ top: 10 }).width('100%')
      }, (t: SignTypeCount) => t.signType)
    }
    .alignItems(HorizontalAlign.Start)
    .padding(14).width('100%')
    .backgroundColor($r('app.color.card_background'))
    .borderRadius(14)
  }

  @Builder
  HistoryCard() {
    Column() {
      Row() {
        Text('最近记录')
          .fontSize(16).fontWeight(FontWeight.Medium)
          .fontColor($r('app.color.primary_text')).layoutWeight(1)
        Text(`${this.records.length} 条`)
          .fontSize(12).fontColor($r('app.color.secondary_text'))
      }
      .width('100%')

      ForEach(this.records, (record: SignRecord, index: number) => {
        Column() {
          if (index > 0) {
            Divider()
              .color($r('app.color.class_icon_border'))
              .margin({ top: 8 })
          }
          this.RecordItem(record)
        }
        .width('100%').margin({ top: 8 })
      }, (record: SignRecord) => record.id.toString())
    }
    .alignItems(HorizontalAlign.Start)
    .padding(14).width('100%')
    .backgroundColor($r('app.color.card_background'))
    .borderRadius(14)
  }

  @Builder
  RecordItem(record: SignRecord) {
    Row() {
      Text('●')
        .fontSize(12).fontColor(this.kindColor(record.kind))
      Column() {
        Row() {
          Text(record.uname)
            .fontSize(15).fontWeight(FontWeight.Medium)
            .fontColor($r('app.color.primary_text'))
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
          if (record.action === 'signout') {
            Text('签退')
              .fontSize(10).fontColor($r('app.color.selected'))
              .padding({ left: 6, right: 6, top: 2, bottom: 2 })
              .backgroundColor($r('app.color.accent_soft_bg'))
              .borderRadius(8)
              .margin({ left: 6 })
          }
          Blank()
          Text(formatTime(record.createTime))
            .fontSize(11).fontColor($r('app.color.secondary_text'))
        }
        .width('100%')

        Text(`${signTypeLabel(record.signType)} · ${record.activityName !== '' ? record.activityName : '未知活动'}`)
          .fontSize(12).fontColor($r('app.color.secondary_text'))
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .margin({ top: 3 }).width('100%')

        Text(record.message)
          .fontSize(12).fontColor(this.kindColor(record.kind))
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .margin({ top: 3 }).width('100%')
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
      .margin({ left: 8 })
    }
    .width('100%')
    .alignItems(VerticalAlign.Top)
  }

  build() {
    // HdsNavDestination（首页/活动列表同款悬浮标题栏）：无级渐变模糊随列表滚动连续变化
    HdsNavDestination() {
      if (this.isLoading) {
        Column() {
          LoadingProgress()
            .width(44).height(44)
            .color($r('app.color.icon'))
        }
        .width('100%').height('100%')
        .justifyContent(FlexAlign.Center)
      } else if (!this.stats || (this.stats.signTotal === 0 && this.stats.signOutSuccess === 0 &&
        this.records.length === 0)) {
        Column() {
          Text('暂无签到统计')
            .fontSize(16).fontColor($r('app.color.primary_text'))
          Text('完成签到后，这里将展示签到成功率与历史记录')
            .fontSize(13).fontColor($r('app.color.secondary_text'))
            .margin({ top: 8 })
        }
        .width('100%').height('100%')
        .justifyContent(FlexAlign.Center)
      } else {
        List({ space: 0, scroller: this.listScroller }) {
          // 让位标题栏的空白做成列表首项（随内容滚动收起，保证标题栏渐变模糊生效，首页同款）
          ListItem() {
            Column().height(this.statusBarHeight + 56)
          }.width('100%')
          ListItem() {
            this.SummaryCard()
          }.width('100%').padding({ left: 16, right: 16 })
          if (this.stats && this.stats.typeCounts.length > 0) {
            ListItem() {
              this.TypeCard()
            }.width('100%').padding({ left: 16, right: 16 }).margin({ top: 10 })
          }
          if (this.records.length > 0) {
            ListItem() {
              this.HistoryCard()
            }.width('100%').padding({ left: 16, right: 16 }).margin({ top: 10 })
            ListItem() {
              Button(this.isSyncing ? '同步中...' : '同步记录到云端')
                .width('100%').height(46).borderRadius(23)
                .fontSize(16)
                .backgroundColor($r('app.color.card_background'))
                .fontColor($r('app.color.selected'))
                .enabled(!this.isSyncing)
                .onClick(() => {
                  this.syncToCloud()
                })
            }.width('100%').padding({ left: 16, right: 16 }).margin({ top: 16 })
            ListItem() {
              Button('清空统计记录')
                .width('100%').height(46).borderRadius(23)
                .fontSize(16)
                .backgroundColor($r('app.color.card_background'))
                .fontColor($r('app.color.unsignable'))
                .onClick(() => {
                  this.confirmClearRecords()
                })
            }.width('100%').padding({ left: 16, right: 16 }).margin({ top: 10 })
          }
          ListItem() {
            Column().height(24)
          }.width('100%')
        }
        .width('100%').height('100%')
        .scrollBar(BarState.Off)
      }
    }
    .height('100%')
    .width('100%')
    .backgroundColor($r('app.color.page_background'))
    .titleBar({
      content: {
        title: { mainTitle: '签到统计' },
        menu: { // 右上角清空入口（官方示例同款标题栏菜单）
          value: [{
            content: {
              icon: $r('app.media.ic_public_delete'),
              label: '清空签到统计',
              action: () => {
                this.confirmClearRecords();
              }
            }
          }]
        }
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
