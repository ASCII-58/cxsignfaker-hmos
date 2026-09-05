import { DatabaseManager, UserDataAndId } from '../utils/DataBase';
import { loginFunction } from '../utils/Login';
import image from '@ohos.multimedia.image';
import { ClassInfo, CourseAndActivity } from '../utils/classFun';
import { scanBarcode, scanCore } from '@kit.ScanKit';
import { curves, LengthMetrics, UIContext } from '@kit.ArkUI';
import { hdsEffect, HideMode, HdsNavDestination, HdsTabs, HdsTabsController, HdsTabsBackgroundStyle, HdsTabsFloatingStyle, ScrollEffectType } from '@kit.UIDesignKit';
// hdsMaterial 是 6.1(23) 新 API：API22 及以下系统的 @hms:hds.hdsMaterial 模块没有该导出，
// 静态 import 会在页面加载期直接 SyntaxError 崩溃（6.0 模拟器实测）。因此只做类型导入（编译期擦除、
// 运行时不产生 import），枚举值以常量书写，运行时只是普通数字，由系统按版本决定是否生效
import type { hdsMaterial } from '@kit.UIDesignKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { BusinessError, deviceInfo } from '@kit.BasicServicesKit';
import promptAction from '@ohos.promptAction';
import { loginByCommon, loginByURL } from '../Component/LoginCom';
import { OtherUserItem } from '../Component/OtherUserCom';
import { CloneSessionBanner } from '../Component/CloneSessionBanner';
import ShareUtils from '../utils/shareUtils';
import { systemShare } from '@kit.ShareKit';
import { preferences, uniformTypeDescriptor as utd } from '@kit.ArkData';
import { common, Want } from '@kit.AbilityKit';
import { SettingsComponent } from '../Component/SettingsComponent';
import { LocationFavoritesComponent } from '../Component/LocationFavoritesComponent';

const TAG = 'IndexPage';
const DOMAIN = 0x0004;
// 沉浸光感枚举值别名（与 SDK 6.1 d.ts 一致）：MaterialType.ADAPTIVE=100（跟随系统材质策略）、
// MaterialLevel.GENTLE=1（轻柔，官方 Spatialization 示例默认档位）
const HDS_MATERIAL_TYPE_ADAPTIVE = 100;
const HDS_MATERIAL_LEVEL_GENTLE = 1;

AppStorage.setOrCreate('userHostName', $r('app.string.defaultUname'))
AppStorage.setOrCreate('userHostPhone', $r('app.string.defaultPhone'))
AppStorage.setOrCreate('userUrl', '')
AppStorage.setOrCreate('userQRValue', '')
// 克隆登录会话（对齐上游 cloneInstance：仅内存有效，重启即失效；cookies 为空串表示不在克隆状态）
AppStorage.setOrCreate('cloneSessionCookies', '')
AppStorage.setOrCreate('cloneSessionName', '')
AppStorage.setOrCreate('cloneSessionPhone', '')

interface UserInfoComponentInterface {
  hostName: Resource | string
  hostPhone: Resource | string
  QRvalue: string
  url: string
  onLogout: () => void
}

@Reusable
@Component
struct ClassListItem {
  @Prop classInfo: ClassInfo;
  @Consume('pathInfos') pathInfos: NavPathStack;
  @State isPressed: boolean = false;

  build() {
    Row() {
      ClassIcon({ imageurl: this.classInfo.imageURL })
      Column() {
        Text(this.classInfo.name)
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('app.color.primary_text'))
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
        Text(this.classInfo.teacherfactor)
          .fontSize(13)
          .fontColor($r('app.color.secondary_text'))
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
      .margin({ left: 12 })
      Image($r('sys.media.ohos_ic_public_arrow_right'))
        .width(14).height(14)
        .fillColor($r('app.color.secondary_text'))
    }
    .width('100%')
    .height(68)
    .backgroundColor($r('app.color.card_background'))
    .padding({ left: 16, right: 16 })
    .scale({ x: this.isPressed ? 0.98 : 1, y: this.isPressed ? 0.98 : 1 })
    .animation({ duration: 150, curve: Curve.EaseInOut })
    .onTouch((event: TouchEvent) => {
      if (event.type === TouchType.Down) this.isPressed = true
      else if (event.type === TouchType.Up || event.type === TouchType.Cancel) this.isPressed = false
    })
  }
}

@Reusable
@Component
struct ClassIcon {
  @Prop imageurl: string;
  @State ImageData: image.PixelMap | null = null;
  @State isLoaded: boolean = false;

  build() {
    Column() {
      Image(this.ImageData)
        .width(44).height(44)
        .borderColor($r('app.color.class_icon_border'))
        .borderWidth(2).borderRadius(12)
        .alt($r('app.media.foreground'))
    }
    .width(44).height(44).borderRadius(12).clip(true)
    .onAppear(async () => {
      if (!this.isLoaded) {
        this.ImageData = await loginFunction.GetPic(this.imageurl)
        this.isLoaded = true
      }
    })
  }
}

@Builder
export function init(name: string) {
  HomePage()
}

@Component
struct UserInfoComponent {
  @Consume('pathInfos') pathInfos: NavPathStack;
  @State HostImageData: image.PixelMap | Resource = $r('app.media.foreground')
  @Prop url: string
  @Prop hostName: Resource | string
  @Prop hostPhone: Resource | string
  @Prop QRvalue: string
  onLogout: () => void = () => {}
  @State activeSheet: number = -1
  @State sheetVisible: boolean = false
  @State iconPressed: number = -1
  @State shareLoading: boolean = false
  @State isReady: boolean = false
  @State avatarTapCount: number = 0
  private avatarTapTimer: number = -1
  private uiContext: UIContext = this.getUIContext();
  private context: Context = this.uiContext.getHostContext() as Context;

  aboutToAppear() {
    animateTo({ duration: 400, curve: curves.interpolatingSpring(0, 1, 300, 28) }, () => {
      this.isReady = true
    })
  }

  // 头像连点/长按 → 直接进入 Debug 路由页（密码校验在面板页内完成，
  // 不再经过 bindSheet，避免全屏 sheet 遮挡其内 pushPath 的子页面）
  openDebugPanel() {
    this.avatarTapCount = 0
    this.pathInfos.pushPath({ name: 'DebugPanel' })
  }

  @Builder UnifiedSheet() {
    if (this.activeSheet === 0) {
      SettingsComponent()
    } else if (this.activeSheet === 1) {
      Column() {
        // 半屏弹层拖拽指示条
        Column()
          .width(36).height(4).borderRadius(2)
          .margin({ top: 10 })
        Text('二维码名片').fontSize(24).fontWeight(FontWeight.Bold)
          .width('100%').textAlign(TextAlign.Start).padding({ left: 20, bottom: 20 })
        if (this.QRvalue) {
          Column() {
            Column() { QRCode(this.QRvalue).width(200).height(200) }
            .padding(20).backgroundColor($r('app.color.card_background'))
            .borderRadius(16).shadow({ radius: 12, color: '#00000010', offsetY: 4 })
            Text(this.hostName).fontSize(20).fontWeight(FontWeight.Medium)
              .margin({ top: 20 }).fontColor($r('sys.color.ohos_id_color_text_primary'))
          }
          .width('100%').alignItems(HorizontalAlign.Center).margin({ bottom: 40 })
          Button(this.shareLoading ? '准备中...' : '分享名片').width('90%').height(50)
            .fontColor($r('app.color.text_on_primary'))
            .backgroundColor($r('app.color.class_button')).borderRadius(25)
            .enabled(!this.shareLoading)
            .onClick(async () => {
              this.shareLoading = true
              const shareUtils = new ShareUtils(this.context, this.QRvalue)
              const ok = await shareUtils.prepare()
              if (ok) {
                this.doShare(shareUtils.FileUri, this.QRvalue)
              } else {
                promptAction.showToast({ message: '生成分享图片失败' })
              }
              this.shareLoading = false
            })
        } else {
          Column() {
            LoadingProgress().width(60).height(60).color($r('sys.color.ohos_id_color_text_secondary'))
            Text('正在加载用户信息...').fontSize(16)
              .fontColor($r('sys.color.ohos_id_color_text_secondary')).margin({ top: 20 })
          }
          .height(300).justifyContent(FlexAlign.Center)
        }
      }
      .width('100%').height('100%')
      .backgroundColor($r('app.color.page_background'))
      .borderRadius({ topLeft: 20, topRight: 20 })
    }
  }

  build() {
    Row() {
      Image(this.HostImageData)
        .width(60).height(60).borderRadius(30)
        .objectFit(ImageFit.Cover).alt($r('app.media.foreground'))
        .onAppear(async () => {
          if (this.url !== '') this.HostImageData = await loginFunction.GetPic(this.url) as PixelMap
        })
        .onClick(() => {
          this.avatarTapCount++;
          clearTimeout(this.avatarTapTimer);
          if (this.avatarTapCount >= 5) {
            this.openDebugPanel();
          } else {
            this.avatarTapTimer = setTimeout(() => { this.avatarTapCount = 0; }, 1500);
          }
        })
        .gesture(LongPressGesture({ repeat: false, duration: 800 })
          .onAction(() => { this.openDebugPanel(); }))
      Column() {
        Text(this.hostName).fontSize(18).fontWeight(FontWeight.Medium)
          .fontColor($r('app.color.primary_text')).maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
        Text(this.hostPhone).fontSize(13).fontColor($r('app.color.secondary_text'))
      }
      .layoutWeight(1).alignItems(HorizontalAlign.Start).margin({ left: 12 })
      Row({ space: 4 }) {
        Column() {
          Image($r('app.media.settings')).width(22).height(22)
            .fillColor($r('app.color.icon'))
        }
        .width(40).height(40).borderRadius(20)
        .justifyContent(FlexAlign.Center)
        .backgroundColor($r('sys.color.ohos_id_color_button_normal'))
        .scale({ x: this.iconPressed === 0 ? 0.85 : 1, y: this.iconPressed === 0 ? 0.85 : 1 })
        .animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) })
        .visualEffect(new hdsEffect.HdsEffectBuilder()
          .pointLight({
            sourceType: this.iconPressed === 0 ? hdsEffect.PointLightSourceType.BRIGHT
              : hdsEffect.PointLightSourceType.NONE,
            illuminatedType: hdsEffect.PointLightIlluminatedType.BORDER
          })
          .buildEffect())
        .onTouch((event: TouchEvent) => {
          if (event.type === TouchType.Down) {
            this.iconPressed = 0
          } else {
            setTimeout(() => { this.iconPressed = -1 }, 200)
          }
        })
        .onClick(() => {
          this.activeSheet = 0
          this.sheetVisible = true
        })

        Column() {
          Image($r('app.media.share')).width(22).height(22)
            .fillColor($r('app.color.icon'))
        }
        .width(40).height(40).borderRadius(20)
        .justifyContent(FlexAlign.Center)
        .backgroundColor($r('sys.color.ohos_id_color_button_normal'))
        .scale({ x: this.iconPressed === 1 ? 0.85 : 1, y: this.iconPressed === 1 ? 0.85 : 1 })
        .animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) })
        .visualEffect(new hdsEffect.HdsEffectBuilder()
          .pointLight({
            sourceType: this.iconPressed === 1 ? hdsEffect.PointLightSourceType.BRIGHT
              : hdsEffect.PointLightSourceType.NONE,
            illuminatedType: hdsEffect.PointLightIlluminatedType.BORDER
          })
          .buildEffect())
        .onTouch((event: TouchEvent) => {
          if (event.type === TouchType.Down) {
            this.iconPressed = 1
          } else {
            setTimeout(() => { this.iconPressed = -1 }, 200)
          }
        })
        .onClick(() => {
          this.activeSheet = 1
          this.sheetVisible = true
        })

        Column() {
          Image($r('app.media.ic_public_quit')).width(22).height(22)
            .fillColor($r('app.color.unsignable'))
        }
        .width(40).height(40).borderRadius(20)
        .justifyContent(FlexAlign.Center)
        .backgroundColor($r('sys.color.ohos_id_color_button_normal'))
        .scale({ x: this.iconPressed === 2 ? 0.85 : 1, y: this.iconPressed === 2 ? 0.85 : 1 })
        .animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) })
        .visualEffect(new hdsEffect.HdsEffectBuilder()
          .pointLight({
            sourceType: this.iconPressed === 2 ? hdsEffect.PointLightSourceType.BRIGHT
              : hdsEffect.PointLightSourceType.NONE,
            illuminatedType: hdsEffect.PointLightIlluminatedType.BORDER
          })
          .buildEffect())
        .onTouch((event: TouchEvent) => {
          if (event.type === TouchType.Down) {
            this.iconPressed = 2
          } else {
            setTimeout(() => { this.iconPressed = -1 }, 200)
          }
        })
        .onClick(() => { this.onLogout() })
      }
    }
    .width('100%').padding(16).backgroundColor($r('app.color.card_background'))
    .opacity(this.isReady ? 1 : 0)
    .translate({ y: this.isReady ? 0 : -16 })
    .bindSheet($$this.sheetVisible, this.UnifiedSheet, {
      height: 'auto', detents: [SheetSize.MEDIUM, SheetSize.LARGE],
      // 与 SettingsComponent 根容器同色：sheet 表面延伸进小白条避让区，双色会形成断层
      backgroundColor: $r('app.color.page_background')
    })
  }

  private async doShare(ShareUri: string, ShareStr: string) {
    const ctx = this.uiContext.getHostContext() as common.UIAbilityContext;
    let shareData: systemShare.SharedData = new systemShare.SharedData({
      utd: utd.UniformDataType.IMAGE, uri: ShareUri,
      title: '分享二维码', description: '分享二维码', label: '二维码'
    });
    try {
      shareData.addRecord({
        utd: utd.UniformDataType.PLAIN_TEXT, content: ShareStr,
        title: '分享url', description: '可通过分享的url添加账号', label: 'url'
      });
    } catch (e) { console.error(`addRecord: ${e?.message}`); }
    let controller: systemShare.ShareController = new systemShare.ShareController(shareData);
    controller.show(ctx, {
      selectionMode: systemShare.SelectionMode.SINGLE,
      previewMode: systemShare.SharePreviewMode.DETAIL
    }).catch((error: BusinessError) => { console.error(`Share error: ${error?.message}`); });
  }
}

@Component
export default struct HomePage {
  @State currentIndex: number = 0;
  @State titleName: string = '首页';
  @State classList: ClassInfo[] | null = null;
  @State isClassListRefreshing: boolean = false;
  @State otherUserList: UserDataAndId[] = [];
  @State expandedSection: number = -1;
  @State loginSheetVisible: boolean = false;
  @State loginSheetType: number = -1;
  @State locationsSheetVisible: boolean = false;
  @State btnAddPressed: boolean = false;
  @State actionPressed: string = '';
  @State installInfo: string = '';
  @State tabLabelScale: number[] = [1, 1];
  @StorageLink('userHostName') userHostName: Resource | string = $r('app.string.defaultUname')
  @StorageLink('userHostPhone') userHostPhone: Resource | string = $r('app.string.defaultPhone')
  @StorageLink('userUrl') userUrl: string = ''
  @StorageLink('userQRValue') userQRValue: string = ''
  @StorageLink('cloneSessionCookies') cloneSessionCookies: string = ''
  @StorageLink('cloneSessionName') cloneSessionName: string = ''
  private pageInfos: NavPathStack = new NavPathStack();
  private classListLoading: boolean = false;
  private controller: HdsTabsController = new HdsTabsController();
  // 悬浮页签（barFloatingStyle）为 6.1.0(23) 新特性：按系统 API 版本运行时判断，
  // 低版本系统自动退化为沉浸式页签（build 内两条分支共用 HdsTabContents 构建器）。
  // 注意：不能用 canIUse('apis: 23')——实测 6.1(API 24) 真机返回 false，与文档不符
  private readonly supportFloatingBar: boolean = deviceInfo.sdkApiVersion >= 23;
  @StorageLink('naviIndicatorHeight') naviIndicatorHeight: number = 0; // EntryAbility 实测的系统手势条高度
  @StorageLink('statusBarHeight') statusBarHeight: number = 0; // EntryAbility 实测的状态栏高度
  private listScroller: Scroller = new Scroller(); // 标题栏渐变模糊的滚动绑定源
  private readonly tabBarMask: HdsTabsBackgroundStyle = { maskColor: $r('app.color.page_background') };
  // 沉浸光感悬浮页签（官方 Spatialization 示例同款）：材质类型跟随系统策略（ADAPTIVE，随壁纸/深浅色自适应光感），
  // 等级用示例默认 GENTLE（轻柔），与标题栏材质强弱保持一致；adaptToHandedness 让胶囊按持机手自动左右换位。
  // barBottomMargin 取实测手势条高度：胶囊落在手势条区域内
  // 而非其上方，不额外避让；无实测值时退回系统级 8vp 内边距（示例同款兜底）。
  // 注意 gradientMask 必须显式置透明：默认值自带黑色渐变遮罩，会在胶囊下方糊出一条黑边
  private readonly floatingBarStyle: HdsTabsFloatingStyle = {
    barWidth: { smallWidth: 280, mediumWidth: 400, largeWidth: 560 },
    barBottomMargin: this.naviIndicatorHeight > 0 ? this.naviIndicatorHeight : $r('sys.float.padding_level8'),
    gradientMask: { maskColor: Color.Transparent },
    adaptToHandedness: true,
    systemMaterialEffect: {
      materialType: HDS_MATERIAL_TYPE_ADAPTIVE as hdsMaterial.MaterialType,
      materialLevel: HDS_MATERIAL_LEVEL_GENTLE as hdsMaterial.MaterialLevel
    }
  };
  private openLinkContext = this.getUIContext().getHostContext() as common.UIAbilityContext;

  // 页签项：图标+文字（应用市场风格），选中态主题蓝
  @Builder
  TabBarItem(targetIndex: number, title: Resource, symbol: Resource) {
    Column() {
      SymbolGlyph(symbol)
        .fontSize(22)
        .fontColor([this.currentIndex === targetIndex ? $r('app.color.selected') : $r('app.color.unselected')])
      Text(title)
        .fontSize(12)
        .margin({ top: 2 })
        .fontWeight(this.currentIndex === targetIndex ? FontWeight.Medium : FontWeight.Regular)
        .fontColor(this.currentIndex === targetIndex ? $r('app.color.selected') : $r('app.color.unselected'))
        .maxLines(1)
    }
    .width('100%').height('100%').justifyContent(FlexAlign.Center)
    .scale({
      x: this.tabLabelScale[targetIndex] ?? 1,
      y: this.tabLabelScale[targetIndex] ?? 1
    })
    .onClick(() => { this.switchTab(targetIndex); })
  }

  @Builder loginSheetContent() {
    if (this.loginSheetType === 0) {
      loginByCommon({ isShow: $loginSheetVisible, otherUserList: $otherUserList })
    } else if (this.loginSheetType === 1) {
      loginByURL({ isShow: $loginSheetVisible, otherUserList: $otherUserList })
    }
  }

  // 收藏位置管理 sheet（独立于 UnifiedSheet/设置 sheet）
  @Builder LocationsSheetBuilder() {
    LocationFavoritesComponent()
  }

  @Builder AddUserMenu() {
    Menu() {
      MenuItem({ content: '扫码添加', startIcon: $r('app.media.qrcode') })
        .onClick(() => this.startScan())
      MenuItem({ content: '账号登录', startIcon: $r('app.media.selector') })
        .onClick(() => { this.loginSheetType = 0; this.loginSheetVisible = true })
      MenuItem({ content: '链接登录', startIcon: $r('app.media.paperclip') })
        .onClick(() => { this.loginSheetType = 1; this.loginSheetVisible = true })
    }
  }

  @Builder ActionItem(icon: Resource, label: string, onClickAction: () => void, iconColor?: ResourceColor) {
    Row() {
      Image(icon).width(24).height(24).fillColor(iconColor ?? $r('app.color.icon'))
      Text(label).fontSize(16).fontColor($r('app.color.primary_text')).margin({ left: 12 })
      Blank()
      Image($r('sys.media.ohos_ic_public_arrow_right')).width(14).height(14)
        .fillColor($r('app.color.secondary_text'))
    }
    .width('100%').height(52).padding({ left: 16, right: 16 })
    .backgroundColor($r('app.color.card_background'))
    .scale({ x: this.actionPressed === label ? 0.97 : 1, y: this.actionPressed === label ? 0.97 : 1 })
    .animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) })
    .onTouch((event: TouchEvent) => {
      if (event.type === TouchType.Down) {
        this.actionPressed = label
      } else {
        setTimeout(() => { this.actionPressed = '' }, 200)
      }
    })
    .onClick(() => onClickAction())
  }

  @Builder SectionHeader(title: string, count: number, sectionIndex: number, showAdd: boolean = false) {
    Row() {
      Image($r('app.media.arrow_right'))
        .width(14).height(14)
        .fillColor($r('app.color.secondary_text'))
        .rotate({ angle: this.expandedSection === sectionIndex ? 90 : 0 })
        .animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 280, 26) })
      Text(title)
        .fontSize(16)
        .fontColor($r('app.color.primary_text'))
        .margin({ left: 8 })
        .layoutWeight(1)
      if (count > 0) {
        Text(`(${count})`)
          .fontSize(13)
          .fontColor($r('app.color.secondary_text'))
          .margin({ right: 4 })
      }
      if (showAdd) {
        Column() {
          Image($r('app.media.ic_contacts_addcontact'))
            .width(18).height(18)
            .fillColor($r('app.color.text_on_primary'))
        }
        .width(32).height(32).borderRadius(16)
        .justifyContent(FlexAlign.Center)
        .backgroundColor($r('app.color.class_button'))
        .margin({ left: 8 })
        .scale({ x: this.btnAddPressed ? 0.85 : 1, y: this.btnAddPressed ? 0.85 : 1 })
        .animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) })
        .visualEffect(new hdsEffect.HdsEffectBuilder()
          .pointLight({
            sourceType: this.btnAddPressed ? hdsEffect.PointLightSourceType.BRIGHT
              : hdsEffect.PointLightSourceType.NONE,
            illuminatedType: hdsEffect.PointLightIlluminatedType.BORDER
          })
          .buildEffect())
        .onTouch((event: TouchEvent) => {
          if (event.type === TouchType.Down) {
            this.btnAddPressed = true
          } else {
            setTimeout(() => { this.btnAddPressed = false }, 200)
          }
        })
        .bindMenu(this.AddUserMenu)
      }
    }
    .width('100%').height(52).padding({ left: 16, right: 16 })
    .backgroundColor($r('app.color.card_background'))
    .onClick(() => {
      animateTo({ duration: 400, curve: curves.interpolatingSpring(0, 1, 280, 26) }, () => {
        this.expandedSection = this.expandedSection === sectionIndex ? -1 : sectionIndex
      })
    })
  }

  build() {
    // HdsNavDestination（官方 Spatialization 示例同款）：ignoreLayoutSafeArea 让内容铺满状态栏和
    // 手势条之下；titleBar 的 scrollEffect 由系统渲染无级渐变模糊，随滚动量连续变化
    HdsNavDestination() {
      // 6.1(23) 起支持悬浮页签：底栏胶囊化悬浮于内容之上；低版本系统退化为沉浸式页签
      if (this.supportFloatingBar) {
        HdsTabs({ barPosition: BarPosition.End, index: this.currentIndex, controller: this.controller }) {
          this.HdsTabContents()
        }
        .height('100%').vertical(false)
        .barMode(BarMode.Fixed)
        .animationDuration(350) // 平滑内容过渡
        .barOverlap(true) // 内容穿透：列表从悬浮胶囊下方滚动穿过
        .barFloatingStyle(this.floatingBarStyle) // 6.1(23) 悬浮页签：沉浸材质 + 贴实测手势条高度
        .onTabBarClick(() => {
          this.popCurrentTabLabel();
        })
        .backgroundColor($r('app.color.page_background'))
        .scrollable(false)
        .onChange((index) => {
          this.titleName = index === 0 ? '首页' : '用户中心'
          this.currentIndex = index
        })
      } else {
        HdsTabs({ barPosition: BarPosition.End, index: this.currentIndex, controller: this.controller }) {
          this.HdsTabContents()
        }
        .height('100%').vertical(false)
        .barMode(BarMode.Fixed)
        .animationDuration(350) // 平滑内容过渡
        .barOverlap(true) // 内容穿透：列表从页签栏下滚动穿过
        .barBackgroundStyle(this.tabBarMask) // 页签栏下渐隐遮罩
        .onTabBarClick(() => {
          this.popCurrentTabLabel();
        })
        .backgroundColor($r('app.color.page_background'))
        .scrollable(false)
        .onChange((index) => {
          this.titleName = index === 0 ? '首页' : '用户中心'
          this.currentIndex = index
        })
      }
    }
    .backgroundColor($r('app.color.page_background'))
    .titleBar({
      content: {
        // 标题+搜索框走 stackBuilder 自定义：搜索框带 geometryTransition，点击时与搜索页输入框
        // 做一镜到底转场；用户中心 Tab 不渲染搜索框。系统 menu 按钮是系统渲染的，挂不上
        // geometryTransition，做不了一镜到底，故搜索入口用自绘搜索框
        stackBuilder: () => { this.HomeTitle() }
      },
      style: {
        scrollEffectOpts: { // 系统级无级渐变模糊：模糊量随列表滚动连续变化（6.0 起支持）。
          // 用示例同款 GRADIENT_BLUR：6.1 的 IMMERSIVE_GRADIENT_BLUR 模糊区域更大、默认背板更实，
          // 沉浸光感材质下静止时显成一条色带，失去示例的透明观感
          enableScrollEffect: true,
          scrollEffectType: ScrollEffectType.GRADIENT_BLUR,
          // 渐变模糊终止线对齐标题栏底边（状态栏+56，示例同款）：模糊量铺满整个标题区高度连续过渡，
          // 而非默认 vp(8) 就饱和；6.0(20) 起支持
          blurEffectiveEndOffset: LengthMetrics.vp(this.statusBarHeight + 56)
        },
        systemMaterialEffect: this.supportFloatingBar ? { // 沉浸光感材质（示例同款）。等级取示例默认 GENTLE（轻柔）：
          // ADAPTIVE 跟随系统策略，真机常解析为强材质，静止时材质面板压在纯色页面背景上就不是透明的了
          materialType: HDS_MATERIAL_TYPE_ADAPTIVE as hdsMaterial.MaterialType,
          materialLevel: HDS_MATERIAL_LEVEL_GENTLE as hdsMaterial.MaterialLevel
        } : undefined
      },
      // 官方示例同款显式声明（沉浸一体化的关键）：关闭内容对标题栏的组件级避让，
      // 否则内容被整体下移到栏底、永远无法穿透到栏下（模拟器实测表现为栏区一块不透明色块）
      avoidLayoutSafeArea: false,
      enableComponentSafeArea: false
    })
    // 上滑隐没标题区与状态栏文字、下滑回顶恢复（官方沉浸光感场景同款，内容获得全屏沉浸）；
    // 仅响应 bindToScrollable 绑定的课程列表，用户中心 Tab 不受影响。6.0(20) 起支持
    .dynamicHideTitleBar({
      hideTitleArea: true,
      hideStatusBar: true,
      mode: HideMode.SCROLL_UP_TO
    })
    .ignoreLayoutSafeArea([LayoutSafeAreaType.SYSTEM], [LayoutSafeAreaEdge.TOP, LayoutSafeAreaEdge.BOTTOM]) // 内容铺满状态栏和手势条之下
    .bindToScrollable([this.listScroller]) // 标题栏模糊绑定课程列表滚动
    .hideBackButton(true).backgroundImageSize({ width: '100%', height: '100%' })
    .borderRadius($r('sys.float.corner_radius_level8')).height('100%').width('100%')
    .onReady((ctx: NavDestinationContext) => {
      this.pageInfos = ctx.pathStack;
      this.initPageData(); // HdsNavDestination 无 onAppear，初始化挂在 onReady
    })
    .onBackPressed(() => {
      if (this.currentIndex === 1) { this.currentIndex = 0; this.controller.changeIndex(0); return true; }
      this.openLinkContext.moveAbilityToBackground(); // 首页返回：退回桌面（应用移至后台）
      return true;
    })
  }

  /**
   * 页面数据初始化（由 onReady 触发）：校验主用户登录态，拉取其他用户与使用时长
   */
  private async initPageData(): Promise<void> {
    try {
      const dbManager = DatabaseManager.getInstance()
      const hostUser = await this.getHostUser()
      const HostUser = await loginFunction.getUserInfo(hostUser.cookies)
      if (HostUser.msg !== 'successful') {
        hilog.error(DOMAIN, TAG, `Failed to fetch host user info: ${HostUser.msg}`);
        this.pageInfos.replacePath({ name: "LoginPage" }, false); return;
      }
      this.otherUserList = await dbManager.getAllUsers()
      this.userHostName = HostUser.uname
      this.userHostPhone = hostUser.phone
      this.userUrl = HostUser.pic
      this.userQRValue = `http://cdn.aquamarine5.fun/?phone=${hostUser.phone}&pwd=${encodeURIComponent(hostUser.pwd)}&name=${encodeURIComponent(HostUser.uname)}`
    } catch (e) { hilog.error(DOMAIN, TAG, `Error in initPageData: ${e.message}`); }
    await this.loadInstallInfo();
  }

  // 标题栏 stackBuilder：标题 + 搜索框。搜索框带 geometryTransition，
  // 点击时与搜索页输入框做一镜到底转场；用户中心 Tab 不渲染搜索框
  @Builder
  HomeTitle() {
    Row() {
      Text(this.titleName)
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .fontColor($r('app.color.primary_text'))
      if (this.currentIndex === 0) {
        Search({ placeholder: '搜索课程...' })
          .layoutWeight(1).height(40).margin({ left: 16 }).borderRadius(20)
          .backgroundColor($r('sys.color.ohos_id_color_component_normal'))
          .placeholderColor($r('sys.color.ohos_id_color_text_secondary'))
          .geometryTransition('SEARCH_ONE_SHOT_DEMO_TRANSITION_ID', { follow: true })
          .shadow({ radius: 6, color: '#00000020', offsetX: 0, offsetY: 2 })
          .onTouch((event: TouchEvent) => { if (event.type === TouchType.Up) this.showSearchPage(); })
      }
    }
    // stackBuilder 内容被系统锚定在状态栏下方（真机实测 37vp 起），不要再加 statusBarHeight
    // 的 padding——双重偏移会让标题和搜索框溢出标题栏、压住列表首行（真机实测遮挡约 10vp）
    .width('100%').height(56)
    .alignItems(VerticalAlign.Center)
    .padding({ left: 16, right: 16 })
  }

  // 一镜到底跳搜索页：关闭系统默认转场（pushPath 第二参 false），由 geometryTransition 弹簧动画接管
  private showSearchPage(): void {
    this.getUIContext().animateTo({
      curve: curves.interpolatingSpring(0, 1, 342, 38)
    }, () => { this.pageInfos.pushPath({ name: 'SearchCoursePage' }, false); })
  }

  // 课程/用户中心两个 TabContent：悬浮页签与退化分支共用，保证内容只有一份
  @Builder
  HdsTabContents() {
    TabContent() {
      Refresh({ refreshing: $$this.isClassListRefreshing }) {
        List({ space: 0, scroller: this.listScroller }) {
          // 让位标题栏的空白必须做成列表首项（随内容滚动收起）：List 的 .padding 是固定视口内缩，
          // 内容会被永远裁剪在标题栏底边之下，无法产生示例那种内容穿透标题栏的渐变模糊（模拟器实测）
          ListItem() {
            Column().height(this.statusBarHeight + 56)
          }.width('100%')
          if (this.cloneSessionCookies !== '') {
            ListItem() {
              CloneSessionBanner({ onExit: () => { this.exitCloneSession() } })
            }.width('100%').padding({ left: 16, right: 16, bottom: 8 })
          }

          ForEach(this.classList, (classInfo: ClassInfo, index: number) => {
            ListItem() { ClassListItem({ classInfo: classInfo }) }.width('100%')
            .onClick(() => { this.pageInfos.pushPath({ name: 'ActivityListPage', param: classInfo }); })
          }, (classInfo: ClassInfo) => classInfo.id)
        }
        .divider({ strokeWidth: 0.5, color: $r('sys.color.comp_divider'), startMargin: 72, endMargin: 16 })
        .width('100%').height('100%').scrollBar(BarState.Off) // 高度占满:课程未加载/数量过少时列表不收缩居中
      }
      .width('100%').height('100%')
      .onRefreshing(async () => { await this.loadClassList(); }) // 仅下滑刷新：下拉触发课程列表重新拉取
    }
    .height('100%').width('100%')
    .tabBar(this.TabBarItem(0, $r('app.string.class_list'), $r('sys.symbol.book')))
    .onAppear(async () => {
      await this.loadClassList();
    })

    TabContent() {
      Column() {
        UserInfoComponent({
          hostName: this.userHostName,
          hostPhone: this.userHostPhone,
          url: this.userUrl,
          QRvalue: this.userQRValue,
          onLogout: () => { this.showLogoutDialog() }
        })
          .margin({ top: this.statusBarHeight + 56 }) // 卡片让出「状态栏+标题栏」整块高度（官方示例同款），不再压在悬浮标题栏之下

        Row().height(10).width('100%').backgroundColor($r('app.color.page_background'))

        Column() {
          this.SectionHeader('其他用户', this.otherUserList.length, 0, true)
          if (this.expandedSection === 0 && this.otherUserList.length > 0) {
            Column() {
              List({ space: 0 }) {
                ForEach(this.otherUserList, (item: UserDataAndId, index) => {
                  ListItem() {
                    OtherUserItem({
                      userData: item, otherUserList: this.otherUserList, index: index,
                      onCloneLogin: () => { this.enterCloneSession() }
                    })
                  }.width('100%')
                }, (item: UserDataAndId) => item.id.toString())
              }
              .divider({ strokeWidth: 0.5, color: $r('sys.color.comp_divider'), startMargin: 72, endMargin: 16 })
              .scrollBar(BarState.Off)
              .constraintSize({ maxHeight: 360 })
            }
            .transition(TransitionEffect.OPACITY
              .combine(TransitionEffect.translate({ y: -10 }))
              .animation({ duration: 400, curve: curves.interpolatingSpring(0, 1, 280, 26) }))
          }
        }
        .backgroundColor($r('app.color.card_background'))

        Row().height(10).width('100%').backgroundColor($r('app.color.page_background'))
        Column() {
          this.ActionItem($r('app.media.map_badge_local'), '管理收藏的位置', () => {
            this.locationsSheetVisible = true
          })
          this.ActionItem($r('app.media.github'), '反馈问题', () => {
            this.openLinkContext.openLink('https://github.com/ASCII-58/chaoxingsignfaker-for-harmony-OS-NEXT/issues/new')
              .catch((e: BusinessError<void>) => { hilog.error(0x0000, 'Link', `${e.code}`); });
          })
          this.ActionItem($r('app.media.envelope'), '联系我们', () => {
            let want: Want = { action: 'ohos.want.action.viewData', uri: 'mailto:xyxy1029@petalmail.com' };
            this.openLinkContext.startAbility(want)
              .catch((e: BusinessError) => { hilog.error(0x0000, 'Mail', `${e.code}`); });
          })
        }
        .backgroundColor($r('app.color.card_background'))
        .bindSheet($$this.locationsSheetVisible, this.LocationsSheetBuilder, {
          height: 'auto', detents: [SheetSize.MEDIUM, SheetSize.LARGE],
          backgroundColor: $r('sys.color.ohos_id_color_sub_background'),
          // 系统右上角 ✕ 会压住组件自绘的「添加」按钮，改用下拉/点蒙层关闭
          showClose: false
        })

        Row().height(10).width('100%').backgroundColor($r('app.color.page_background'))

        if (this.installInfo !== '') {
          Column() {
            Row() {
              Text('使用时长')
                .fontSize(16)
                .fontColor($r('sys.color.ohos_id_color_text_primary'))
              Blank()
              Text(this.installInfo)
                .fontSize(14)
                .fontColor($r('sys.color.ohos_id_color_text_secondary'))
            }
            .width('100%').padding(12)
          }
          .width('100%')
          .backgroundColor($r('app.color.card_background'))
          .borderRadius(16)
          .padding({ left: 4, right: 4 })
        }
        // 底部不再留避让垫条：内容一贯到底，末项随滚动沉入悬浮胶囊之下（应用市场同款沉浸）
      }
      .width('100%').height('100%')
      .bindSheet($$this.loginSheetVisible, this.loginSheetContent, {
        height: 'auto', detents: [SheetSize.MEDIUM, SheetSize.LARGE],
        backgroundColor: $r('sys.color.ohos_id_color_sub_background')
      })
    }
    .tabBar(this.TabBarItem(1, $r('app.string.user'), $r('sys.symbol.person')))
  }

  /**
   * 切换标签页：弹性缩放反馈 + 平滑内容过渡
   */
  private switchTab(targetIndex: number) {
    if (this.currentIndex === targetIndex) {
      return;
    }
    animateTo({ curve: curves.springMotion(0.32, 0.85) }, () => {
      this.currentIndex = targetIndex;
      this.controller.changeIndex(targetIndex);
    });
    this.popCurrentTabLabel();
  }

  /**
   * 当前选中页签文字的弹性回弹动效
   */
  private popCurrentTabLabel() {
    const idx = this.currentIndex;
    this.tabLabelScale[idx] = 1.15;
    animateTo({ curve: curves.springMotion(0.32, 0.85) }, () => {
      this.tabLabelScale[idx] = 1;
    });
  }

  /**
   * 拉取课程列表(首载与下拉刷新共用)；下拉刷新失败时给出提示并保留原列表
   */
  private async loadClassList(): Promise<void> {
    if (this.classListLoading) {
      this.isClassListRefreshing = false // 已有拉取在进行，直接收起下拉指示器
      return
    }
    this.classListLoading = true
    try {
      // 克隆登录时浏览的是克隆用户的课程，课程列表请求走克隆会话
      const cookies = this.cloneSessionCookies !== ''
        ? this.cloneSessionCookies
        : (await this.getHostUser()).cookies
      const result = await CourseAndActivity.getClassList(cookies)
      if (result.msg) {
        this.classList = result.classList
      } else if (this.isClassListRefreshing) {
        promptAction.showToast({ message: '课程列表刷新失败' })
      }
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Failed to load class list: ${(e as Error).message}`)
      if (this.isClassListRefreshing) {
        promptAction.showToast({ message: '课程列表刷新失败' })
      }
    } finally {
      this.classListLoading = false
      this.isClassListRefreshing = false
    }
  }

  private async loadInstallInfo() {
    try {
      const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      let pref = await preferences.getPreferences(context, 'settings');
      const firstInstall = await pref.get('first_install_time', 0) as number;
      if (firstInstall > 0) {
        const days = Math.floor((Date.now() - firstInstall) / (24 * 60 * 60 * 1000));
        if (days < 1) {
          this.installInfo = '已使用不到1天';
        } else if (days < 30) {
          this.installInfo = `已使用 ${days} 天`;
        } else if (days < 365) {
          const months = Math.floor(days / 30);
          this.installInfo = `已使用 ${months} 个月`;
        } else {
          const years = Math.floor(days / 365);
          const remainMonths = Math.floor((days % 365) / 30);
          if (remainMonths > 0) {
            this.installInfo = `已使用 ${years} 年 ${remainMonths} 个月`;
          } else {
            this.installInfo = `已使用 ${years} 年`;
          }
        }
      }
    } catch (e) {
      console.error('Failed to load install info', e);
    }
  }

  private showLogoutDialog() {
    AlertDialog.show({
      title: '退出登录', message: '确认退出登录吗？',
      primaryButton: { value: '取消', action: () => {} },
      secondaryButton: {
        value: '退出',
        action: async () => {
          try { await DatabaseManager.getInstance().clearHostUserTable() }
          catch (e) { hilog.error(DOMAIN, TAG, `Failed to clear host user: ${e.message}`); }
          this.pageInfos.replacePath({ name: "LoginPage" }, false)
        }
      }
    })
  }

  /**
   * 克隆登录：切到克隆会话后清空旧课程列表再按克隆用户拉取，避免残留主用户课程
   */
  private async enterCloneSession(): Promise<void> {
    this.classList = null
    await this.loadClassList()
    this.switchTab(0)
    promptAction.showToast({ message: `已克隆登录：${this.cloneSessionName}`, duration: 2000 })
  }

  /**
   * 退出克隆：清空克隆会话并恢复主用户课程列表
   */
  private async exitCloneSession(): Promise<void> {
    AppStorage.setOrCreate('cloneSessionCookies', '')
    AppStorage.setOrCreate('cloneSessionName', '')
    AppStorage.setOrCreate('cloneSessionPhone', '')
    this.classList = null
    await this.loadClassList()
    promptAction.showToast({ message: '已退出克隆登录', duration: 2000 })
  }

  private async getHostUser(): Promise<UserDataAndId> {
    return await DatabaseManager.getInstance().getUserByPosition(1, true) as UserDataAndId
  }

  private startScan(): void {
    let options: scanBarcode.ScanOptions = {
      scanTypes: [scanCore.ScanType.ALL], enableMultiMode: true, enableAlbum: true
    };
    try {
      if (canIUse("SystemCapability.Multimedia.Scan.ScanBarcode")) {
        scanBarcode.startScanForResult(this.getUIContext().getHostContext(), options)
          .then(async (r: scanBarcode.ScanResult) => {
            let msg = await loginFunction.LoginByURL(r.originalValue)
            promptAction.showToast({ message: msg })
            this.otherUserList = await DatabaseManager.getInstance().getAllUsers()
          }).catch((e: BusinessError) => { hilog.error(0x0001, 'Scan', `${e.code}`); });
      }
    } catch (e) { hilog.error(0x0001, 'Scan', 'Scan error'); }
  }
}
