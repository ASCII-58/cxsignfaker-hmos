import { curves, promptAction } from '@kit.ArkUI';
import { bundleManager, common, Want, ConfigurationConstant } from '@kit.AbilityKit';
import { fileIo as fs, picker, fileUri } from '@kit.CoreFileKit';
import { BusinessError, deviceInfo } from '@kit.BasicServicesKit';
import { preferences, uniformTypeDescriptor as utd } from '@kit.ArkData';
import { util } from '@kit.ArkTS';
import { systemShare } from '@kit.ShareKit';
import { DatabaseManager } from '../utils/DataBase';
import { MsCaptchaDetector } from '../utils/detector/MsCaptchaDetector';
import { PREF_CUSTOM_SCAN_ENABLED, SETTINGS_PREF_NAME } from '../utils/settingsKeys';

const PREF_COLOR_MODE_KEY = 'app_color_mode';
const PREF_MODEL_CAPTCHA_KEY = 'model_captcha_enabled';
// 模型测试结果状态：0 未测试 / 1 通过 / 2 失败
const MODEL_TEST_IDLE = 0;
const MODEL_TEST_PASSED = 1;
const MODEL_TEST_FAILED = 2;
const COLOR_MODE_LABELS = ['自动', '浅色', '深色'];
// 沉浸光感材质档位（数值与 SDK 6.1 d.ts 一致，6.0 无 hdsMaterial 模块只能以常量书写）：
// EXQUISITE=0 强 / GENTLE=1 均衡 / SMOOTH=2 弱；6.1(23) 起对首页底部页签与标题栏生效
const HDS_LEVEL_EXQUISITE = 0;
const HDS_LEVEL_GENTLE = 1;
const HDS_LEVEL_SMOOTH = 2;
const PREF_HDS_LEVEL_KEY = 'hds_material_level';
const PREF_LB_SYNC_KEY = 'lb_sync_enabled';

interface MaterialLevelOption {
  level: number;
  label: string;
}

const HDS_MATERIAL_LEVEL_OPTIONS: MaterialLevelOption[] = [
  { level: HDS_LEVEL_EXQUISITE, label: '强' },
  { level: HDS_LEVEL_GENTLE, label: '均衡' },
  { level: HDS_LEVEL_SMOOTH, label: '弱' }
];
// 通用按压 Q 弹的按键标识(外观三档标签用 0/1/2，其余按钮用以下常量)
const KEY_MODEL_TEST = 10;
const KEY_CLEAR_CACHE = 11;
const KEY_EXPORT_DB = 12;
const KEY_IMPORT_DB = 13;
const KEY_CHANGELOG = 14;
const KEY_GITHUB = 15;
const KEY_MAP_STYLE = 16;

// 应用内更新日志数据结构（来源：rawfile/changelog.json，更新日志只需编辑该文件）
interface ChangelogSection {
  title: string;
  items: string[];
}

interface ChangelogRelease {
  version: string;
  date: string;
  sections: ChangelogSection[];
}

interface ChangelogFile {
  releases: ChangelogRelease[];
}
// 华为官方图标库(HarmonyOS Symbol)：自动=半圆、浅色=太阳、深色=月亮
const COLOR_MODE_SYMBOLS: Resource[] = [
  $r('sys.symbol.circle_lefthalf_inset_filled'),
  $r('sys.symbol.sun_max'),
  $r('sys.symbol.moon_fill')
];

// 更新日志卡片弹窗：版本徽标 + 分区条目列表 + 底部主按钮，内容超长时滚动
@CustomDialog
struct ChangelogDialog {
  controller?: CustomDialogController
  latest?: ChangelogRelease

  build() {
    Column() {
      Row({ space: 8 }) {
        Text('更新日志')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.primary_text'))
        Text(`v${this.latest?.version ?? ''}`)
          .fontSize(12)
          .fontColor($r('app.color.selected'))
          .backgroundColor($r('app.color.accent_soft_bg'))
          .padding({ left: 8, right: 8, top: 3, bottom: 3 })
          .borderRadius(10)
      }
      .width('100%')
      Text(this.latest?.date ?? '')
        .fontSize(13)
        .fontColor($r('app.color.secondary_text'))
        .width('100%')
        .margin({ top: 4 })

      Divider()
        .color($r('sys.color.comp_divider'))
        .margin({ top: 12, bottom: 4 })

      Scroll() {
        Column() {
          ForEach(this.latest?.sections ?? [], (section: ChangelogSection) => {
            Column() {
              Text(section.title)
                .fontSize(14)
                .fontWeight(FontWeight.Medium)
                .fontColor($r('app.color.selected'))
                .width('100%')
                .margin({ top: 10, bottom: 4 })
              ForEach(section.items, (item: string) => {
                Row() {
                  Text('•')
                    .fontSize(14)
                    .fontColor($r('app.color.selected'))
                    .margin({ right: 6 })
                  Text(item)
                    .fontSize(14)
                    .fontColor($r('app.color.primary_text'))
                    .lineHeight(20)
                    .layoutWeight(1)
                }
                .alignItems(VerticalAlign.Top)
                .width('100%')
                .margin({ bottom: 4 })
              }, (item: string) => item)
            }
            .width('100%')
          }, (section: ChangelogSection) => section.title)
        }
        .width('100%')
      }
      .width('100%')
      .constraintSize({ maxHeight: '56%' })
      .scrollBar(BarState.Off)
      .margin({ top: 8 })

      Button('知道了')
        .width('100%')
        .height(46)
        .borderRadius(23)
        .fontSize(16)
        .backgroundColor($r('app.color.class_button'))
        .fontColor($r('app.color.text_on_primary'))
        .margin({ top: 16 })
        .onClick(() => { this.controller?.close() })
    }
    .width('88%')
    .padding(20)
    .backgroundColor($r('app.color.dialog'))
    .borderRadius(24)
    .alignItems(HorizontalAlign.Start)
  }
}

@Component
export struct SettingsComponent {
  @State version: string = '';
  @State colorModeIndex: number = 0;
  @State thumbX: number = 0;
  @State trackWidth: number = 0;
  @State isDragging: boolean = false; // 横向拖动进行中：滑块关闭跟手动画，1:1 跟随手指
  private dragStartThumbX: number = 0; // Pan 起手时的滑块位置，onActionUpdate 以此累加偏移
  private sliderTouchMoved: boolean = false; // 按下后是否出现过移动：区分原地点击与转成滚动
  // 通用按压 Q 弹：当前按下的按钮标识，-1 表示无；按压态保持至抬手或移出按钮区域
  @State pressedKey: number = -1;
  // 各按压目标的尺寸缓存 key->[宽,高]：触控按下后 Move/Up 持续派发给该组件，
  // 移出判定需要组件自身尺寸(onAreaChange 采集)
  private pressAreas: Map<number, number[]> = new Map();
  @State modelCaptchaEnabled: boolean = false;
  @State modelTestRunning: boolean = false;
  @State modelTestState: number = MODEL_TEST_IDLE;
  @State hdsMaterialLevel: number = HDS_LEVEL_GENTLE;
  @State cloudSyncEnabled: boolean = true;
  /** 新版扫码器：默认关闭（旧版 = 系统扫码页逐人扫码） */
  @State customScanEnabled: boolean = false;
  // 沉浸光感为 6.1(23) 特性：低版本系统无该材质，设置项随之隐藏
  private readonly supportFloatingBar: boolean = deviceInfo.sdkApiVersion >= 23;
  onImportDone: () => void = () => {};
  private context = getContext(this) as common.UIAbilityContext;
  // 更新日志弹窗控制器：showChangelog 里按需重建（builder 参数在创建时捕获）
  private changelogDialog: CustomDialogController | undefined = undefined;

  async aboutToAppear() {
    this.getVersion();
    await this.loadColorMode();
    this.syncThumb();
    await this.loadModelCaptcha();
    await this.loadHdsMaterialLevel();
    await this.loadCloudSync();
    await this.loadCustomScan();
  }

  async getVersion() {
    try {
      let bundleInfo = await bundleManager.getBundleInfoForSelf(bundleManager.BundleFlag.GET_BUNDLE_INFO_WITH_APPLICATION);
      this.version = bundleInfo.versionName;
    } catch (error) {
      console.error('Failed to get bundle info', error);
      this.version = 'Unknown';
    }
  }

  async loadColorMode() {
    try {
      let pref = await preferences.getPreferences(this.context, 'settings');
      this.colorModeIndex = await pref.get(PREF_COLOR_MODE_KEY, 0) as number;
    } catch (e) {
      this.colorModeIndex = 0;
    }
  }

  /** 滑块位置与当前档位同步：偏好是异步读回的，首帧可能已用默认值 0 布局 */
  private syncThumb() {
    if (this.trackWidth > 0) {
      this.thumbX = this.colorModeIndex * this.getSegWidth();
    }
  }

  async loadModelCaptcha() {
    try {
      let pref = await preferences.getPreferences(this.context, 'settings');
      this.modelCaptchaEnabled = await pref.get(PREF_MODEL_CAPTCHA_KEY, false) as boolean;
    } catch (e) {
      this.modelCaptchaEnabled = false;
    }
  }

  async loadHdsMaterialLevel() {
    try {
      let pref = await preferences.getPreferences(this.context, 'settings');
      this.hdsMaterialLevel = await pref.get(PREF_HDS_LEVEL_KEY, HDS_LEVEL_GENTLE) as number;
    } catch (e) {
      this.hdsMaterialLevel = HDS_LEVEL_GENTLE;
    }
    // 同步到全局：首页页签/标题栏材质实时跟随（@StorageLink 消费同名 key）
    AppStorage.setOrCreate('hdsMaterialLevel', this.hdsMaterialLevel);
  }

  async setHdsMaterialLevel(level: number) {
    if (level === this.hdsMaterialLevel) {
      return;
    }
    this.hdsMaterialLevel = level;
    AppStorage.setOrCreate('hdsMaterialLevel', level);
    try {
      let pref = await preferences.getPreferences(this.context, 'settings');
      await pref.put(PREF_HDS_LEVEL_KEY, level);
      await pref.flush();
    } catch (e) {
      console.error('Failed to save hds material level', e);
    }
  }

  /** 云端排行榜同步开关：偏好持久化 + 经 AppStorage 下发给 LeaderboardReporter（默认开启） */
  async loadCloudSync() {
    try {
      let pref = await preferences.getPreferences(this.context, 'settings');
      this.cloudSyncEnabled = await pref.get(PREF_LB_SYNC_KEY, true) as boolean;
    } catch (e) {
      this.cloudSyncEnabled = true;
    }
    AppStorage.setOrCreate('lbSyncEnabled', this.cloudSyncEnabled);
  }

  async saveCloudSync(enabled: boolean) {
    this.cloudSyncEnabled = enabled;
    AppStorage.setOrCreate('lbSyncEnabled', enabled);
    try {
      let pref = await preferences.getPreferences(this.context, 'settings');
      await pref.put(PREF_LB_SYNC_KEY, enabled);
      await pref.flush();
    } catch (e) {
      console.error('Failed to save cloud sync switch', e);
    }
  }

  /** 新版扫码器开关：偏好持久化，SignerPage 在页面出现时读取（默认 false = 旧版） */
  async loadCustomScan() {
    try {
      let pref = await preferences.getPreferences(this.context, SETTINGS_PREF_NAME);
      this.customScanEnabled = await pref.get(PREF_CUSTOM_SCAN_ENABLED, false) as boolean;
    } catch (e) {
      this.customScanEnabled = false;
    }
  }

  async saveCustomScan(enabled: boolean) {
    this.customScanEnabled = enabled;
    try {
      let pref = await preferences.getPreferences(this.context, SETTINGS_PREF_NAME);
      await pref.put(PREF_CUSTOM_SCAN_ENABLED, enabled);
      await pref.flush();
    } catch (e) {
      console.error('Failed to save custom scan switch', e);
    }
  }

  async saveModelCaptcha(enabled: boolean) {
    this.modelCaptchaEnabled = enabled;
    if (!enabled) {
      this.modelTestState = MODEL_TEST_IDLE;
    }
    try {
      let pref = await preferences.getPreferences(this.context, 'settings');
      await pref.put(PREF_MODEL_CAPTCHA_KEY, enabled);
      await pref.flush();
    } catch (e) {
      console.error('Failed to save model captcha switch', e);
    }
  }

  /** Beta 开关：开启前警告；取消则回弹开关，关闭直接生效 */
  onModelCaptchaToggle(value: boolean) {
    if (!value) {
      this.saveModelCaptcha(false);
      return;
    }
    AlertDialog.show({
      title: '开启模型自动验证？',
      message: '该功能处于 Beta 阶段：遇到验证码时将调用本地模型自动完成滑块验证，可能失败或存在误判风险；' +
        '失败时会退回手动拖动验证。确定开启吗？',
      primaryButton: {
        value: '取消',
        action: () => {
          this.modelCaptchaEnabled = false;
        }
      },
      secondaryButton: {
        value: '开启',
        fontColor: $r('app.color.selected'),
        action: () => {
          this.saveModelCaptcha(true);
        }
      }
    });
  }

  /** 模型可用性测试：仅展示通过/失败，不展示检测细节 */
  async runModelTest() {
    if (this.modelTestRunning) {
      return;
    }
    this.modelTestRunning = true;
    this.modelTestState = MODEL_TEST_IDLE;
    try {
      const passed = await MsCaptchaDetector.selfTest(this.context);
      this.modelTestState = passed ? MODEL_TEST_PASSED : MODEL_TEST_FAILED;
    } finally {
      this.modelTestRunning = false;
    }
  }

  async setColorMode(index: number) {
    this.colorModeIndex = index;
    try {
      let pref = await preferences.getPreferences(this.context, 'settings');
      await pref.put(PREF_COLOR_MODE_KEY, index);
      await pref.flush();
    } catch (e) {
      console.error('Failed to save color mode', e);
    }

    const appContext = this.context.getApplicationContext();
    setTimeout(() => {
      let mode: ConfigurationConstant.ColorMode;
      if (index === 0) {
        mode = ConfigurationConstant.ColorMode.COLOR_MODE_NOT_SET;
      } else if (index === 1) {
        mode = ConfigurationConstant.ColorMode.COLOR_MODE_LIGHT;
      } else {
        mode = ConfigurationConstant.ColorMode.COLOR_MODE_DARK;
      }
      appContext.setColorMode(mode);
    }, 80);
  }

  async clearCache() {
    try {
      let cacheDir = this.context.cacheDir;
      let filenames = await fs.listFile(cacheDir);
      for (let filename of filenames) {
        let path = cacheDir + '/' + filename;
        try {
          let stat = await fs.stat(path);
          if (stat.isDirectory()) {
            await fs.rmdir(path);
          } else {
            await fs.unlink(path);
          }
        } catch (e) {
          // Ignore individual file errors
        }
      }
      promptAction.showToast({ message: '缓存已清除' });
    } catch (error) {
      console.error('Failed to clear cache', error);
      promptAction.showToast({ message: '清除缓存失败' });
    }
  }

  confirmClearCache() {
    AlertDialog.show({
      message: '确定清除缓存吗？临时文件与图片缓存将被删除。',
      primaryButton: {
        value: '取消',
        action: () => {}
      },
      secondaryButton: {
        value: '清除',
        fontColor: $r('app.color.unsignable'),
        action: () => {
          this.clearCache()
        }
      }
    });
  }

  /**
   * 清理地图相关缓存资源：
   * - filesDir/map-style：旧版内置底图样式（约 100MB；现已改用瓦片底图，仅清理历史残留）
   * - cacheDir/maptiles：瓦片磁盘缓存（上限 4MB，LRU 自动淘汰）
   * 删除后不影响功能：下次使用地图选点时按需重新下载。
   */
  async clearMapResources() {
    const mapStyleDir = this.context.filesDir + '/map-style';
    const tileCacheDir = this.context.cacheDir + '/maptiles';
    const mapSdkCache = this.context.cacheDir + '/rdb';
    try {
      let cleaned = 0;
      if (await fs.access(mapStyleDir)) {
        await fs.rmdir(mapStyleDir);
        cleaned++;
      }
      if (await fs.access(tileCacheDir)) {
        await fs.rmdir(tileCacheDir);
        cleaned++;
      }
      if (await fs.access(mapSdkCache)) {
        // 华为 MapKit 底图瓦片缓存（SateLlite.db）；现已弃用 MapKit，仅清理历史残留
        await fs.rmdir(mapSdkCache);
        cleaned++;
      }
      if (cleaned === 0) {
        promptAction.showToast({ message: '地图缓存为空，无需清理' });
      } else {
        promptAction.showToast({ message: '已清理，下次使用地图选点时会按需重新下载' });
      }
    } catch (error) {
      console.error('Failed to clear map resources', error);
      promptAction.showToast({ message: '清理地图资源失败' });
    }
  }

  confirmClearMapResources() {
    AlertDialog.show({
      message: '确定清理地图缓存资源吗？包括旧版底图样式（约 100MB）与瓦片缓存（上限 4MB）。清理后不影响功能，使用地图选点时会按需重新下载。',
      primaryButton: {
        value: '取消',
        action: () => {}
      },
      secondaryButton: {
        value: '清理',
        fontColor: $r('app.color.unsignable'),
        action: () => {
          this.clearMapResources()
        }
      }
    });
  }

  async exportDatabase() {
    try {
      const dbManager = DatabaseManager.getInstance();
      const jsonData = await dbManager.exportToJSON();

      const tempPath = this.context.cacheDir + '/chaoxing_backup.json';
      const encoder = new util.TextEncoder();
      const uint8 = encoder.encode(jsonData);
      const ff = await fs.open(tempPath, fs.OpenMode.CREATE | fs.OpenMode.WRITE_ONLY);
      await fs.write(ff.fd, uint8.buffer);
      await fs.close(ff);

      const uriObj = new fileUri.FileUri(tempPath);
      let shareData = new systemShare.SharedData({
        utd: utd.UniformDataType.PLAIN_TEXT,
        uri: uriObj.toString(),
        title: '导出数据库',
        description: '超星签到助手数据库备份',
        label: '数据库备份'
      });

      const ctx = this.getUIContext().getHostContext() as common.UIAbilityContext;
      let controller = new systemShare.ShareController(shareData);
      controller.show(ctx, {
        selectionMode: systemShare.SelectionMode.SINGLE,
        previewMode: systemShare.SharePreviewMode.DETAIL
      }).catch((error: BusinessError) => {
        console.error('Share error', JSON.stringify(error));
        promptAction.showToast({ message: '分享失败' });
      });

      promptAction.showToast({ message: '数据库已导出，请选择保存位置' });
    } catch (error) {
      const err = error as BusinessError;
      promptAction.showToast({ message: `导出失败: ${err.code} ${err.message}` });
    }
  }

  async importDatabase() {
    try {
      const selectOptions = new picker.DocumentSelectOptions();
      selectOptions.maxSelectNumber = 1;
      const documentPicker = new picker.DocumentViewPicker();
      const uris = await documentPicker.select(selectOptions);

      if (!uris || uris.length === 0) {
        return;
      }

      const uri = uris[0];
      const statInfo = await fs.stat(uri);
      const file = await fs.open(uri, fs.OpenMode.READ_ONLY);
      const arrayBuffer = new ArrayBuffer(statInfo.size);
      await fs.read(file.fd, arrayBuffer);
      await fs.close(file);

      const decoder = util.TextDecoder.create('utf-8', { ignoreBOM: true });
      const jsonData = decoder.decodeWithStream(new Uint8Array(arrayBuffer), { stream: false });

      const dbManager = DatabaseManager.getInstance();
      const result = await dbManager.importFromJSON(jsonData);

      if (result.success) {
        promptAction.showToast({ message: result.message });
        this.onImportDone();
      } else {
        promptAction.showToast({ message: result.message });
      }
    } catch (error) {
      console.error('Import failed', JSON.stringify(error));
      promptAction.showToast({ message: '导入失败：文件读取错误' });
    }
  }

  openUrl(url: string) {
    let want: Want = {
      action: 'ohos.want.action.viewData',
      entities: ['entity.system.browsable'],
      uri: url
    };
    this.context.startAbility(want).catch((err: BusinessError) => {
      console.error('Failed to open URL', err);
      promptAction.showToast({ message: '无法打开链接' });
    });
  }

  /**
   * 从 rawfile/changelog.json 加载更新日志并以卡片弹窗展示最新版本
   * 新增版本时只需在 changelog.json 的 releases 数组头部追加一条，无需改代码
   */
  async showChangelog() {
    try {
      const raw = await this.context.resourceManager.getRawFileContent('changelog.json');
      const text = util.TextDecoder.create('utf-8', { ignoreBOM: true })
        .decodeWithStream(raw, { stream: false });
      const file = JSON.parse(text) as ChangelogFile;
      if (!file.releases || file.releases.length === 0) {
        throw new Error('changelog.json has no releases');
      }
      const latest = file.releases[0];
      this.changelogDialog = new CustomDialogController({
        builder: ChangelogDialog({ latest: latest }),
        autoCancel: true,
        customStyle: true
      });
      this.changelogDialog.open();
    } catch (error) {
      console.error('Failed to load changelog', JSON.stringify(error));
      AlertDialog.show({
        title: '更新日志',
        message: '更新日志加载失败',
        confirm: { value: '知道了', action: () => {} }
      });
    }
  }

  @Builder
  SectionHeader(title: string) {
    Text(title)
      .fontSize(14)
      .fontColor($r('app.color.secondary_text'))
      .width('100%')
      .margin({ bottom: 8, left: 4 })
  }

  @Builder
  SettingsDivider() {
    Divider()
      .color($r('sys.color.comp_divider'))
      .margin({ left: 16, right: 16 })
  }

  /** 通用栏行文案:标题 + 可选副标题 */
  @Builder
  SettingTexts(title: string, subtitle: string) {
    Column() {
      Text(title)
        .fontSize(16)
        .fontColor($r('app.color.primary_text'))
      if (subtitle !== '') {
        Text(subtitle)
          .fontSize(12)
          .fontColor($r('app.color.secondary_text'))
          .margin({ top: 2 })
      }
    }
    .alignItems(HorizontalAlign.Start)
    .layoutWeight(1)
  }

  @Builder
  Chevron() {
    Image($r('app.media.arrow_right')) .draggable(false)
      .width(14).height(14)
      .fillColor($r('app.color.icon'))
  }

  private getSegWidth(): number {
    return this.trackWidth / 3;
  }

  /** 拖动中滑块的横向范围：0 ~ 末档起点 */
  private clampThumbX(x: number): number {
    return Math.min(Math.max(x, 0), this.getSegWidth() * 2);
  }

  /** 由滑块当前位置换算档位（四舍五入到最近档） */
  private indexFromThumb(): number {
    return Math.min(2, Math.max(0, Math.round(this.thumbX / this.getSegWidth())));
  }

  /** 悬浮页签式交互：按下滑块即弹至手指处（滑块中心对准手指），后续拖动从该位置继续；
   *  原地点击交给文字 onClick 提交；起手后转成列表滚动等未构成点击的，滑块弹回生效档位 */
  private onSliderTouch(event: TouchEvent) {
    const segW = this.getSegWidth();
    if (segW <= 0) {
      return;
    }
    if (event.type === TouchType.Down) {
      this.sliderTouchMoved = false;
      this.thumbX = this.clampThumbX(event.touches[0].x - segW / 2);
    } else if (event.type === TouchType.Move) {
      this.sliderTouchMoved = true;
    } else if ((event.type === TouchType.Up || event.type === TouchType.Cancel) && !this.isDragging) {
      if (this.sliderTouchMoved) {
        this.syncThumb();
      }
    }
  }

  /** 点选提交：滑块直接落位，必要时应用颜色模式 */
  private commitIndex(index: number) {
    if (index === this.colorModeIndex) {
      this.syncThumb();
      return;
    }
    this.setColorMode(index);
    this.syncThumb();
  }

  /** 采集按压目标自身尺寸，供"移出按钮区域"命中检测 */
  private pressAreaHandler(key: number): (_old: Area, area: Area) => void {
    return (_old: Area, area: Area) => {
      this.pressAreas.set(key, [area.width as number, area.height as number]);
    };
  }

  /** 通用按压触控(与用户中心图钉按钮同机制)：按下进入按压态并保持到抬手/移出
   *  按钮边界。不能用"非 Down 即定时复位"的写法：按住时手指微抖会持续产生
   *  Move 事件被误判成抬手，按压动画刚播完就被复位，看起来"一按完就弹回" */
  private pressTouchHandler(key: number): (event: TouchEvent) => void {
    return (event: TouchEvent) => {
      if (event.type === TouchType.Down) {
        this.pressedKey = key;
      } else if (event.type === TouchType.Up || event.type === TouchType.Cancel) {
        this.pressedKey = -1;
      } else if (event.type === TouchType.Move && this.pressedKey === key) {
        const size = this.pressAreas.get(key);
        if (!size) {
          return;
        }
        const t = event.touches[0];
        if (t.x < 0 || t.y < 0 || t.x > size[0] || t.y > size[1]) {
          this.pressedKey = -1;
        }
      }
    };
  }

  /** 模式图标(官方 Symbol)：切换时非选中图标旋转±90°并缩放淡出，选中图标从对应方向旋入 */
  @Builder
  ThemeModeIcon(idx: number) {
    SymbolGlyph(COLOR_MODE_SYMBOLS[idx])
      .fontSize(24)
      .fontColor([$r('app.color.selected')])
      .opacity(this.colorModeIndex === idx ? 1 : 0)
      .scale({
        x: this.colorModeIndex === idx ? 1 : 0.4,
        y: this.colorModeIndex === idx ? 1 : 0.4
      })
      .rotate({
        z: 1,
        angle: this.colorModeIndex === idx ? 0 : (idx < this.colorModeIndex ? -90 : 90)
      })
      .animation({ curve: curves.springMotion(0.3, 0.75) })
  }

  build() {
    Column() {
      // 半屏弹层拖拽指示条
      Column()
        .width(36).height(4).borderRadius(2)
        .margin({ top: 10 })

      Text('设置')
        .fontSize(24).fontWeight(FontWeight.Bold)
        .fontColor($r('app.color.primary_text'))
        .width('100%').textAlign(TextAlign.Start)
        .padding({ left: 20, top: 12, bottom: 16 })

      List({ space: 16 }) {
        // 外观：模式图标 + 三段滑块(点选切换 自动/浅色/深色)
        ListItem() {
          Column() {
            this.SectionHeader('外观')
            Row() {
              Stack() {
                Row()
                  .width(46).height(46)
                  .borderRadius(23)
                  .backgroundColor($r('app.color.glass_track_fill'))
                  .border({ width: 0.8, color: $r('app.color.glass_border') })
                  .shadow({ radius: 8, color: $r('app.color.glass_shadow'), offsetY: 2 })
                this.ThemeModeIcon(0)
                this.ThemeModeIcon(1)
                this.ThemeModeIcon(2)
              }

              Stack({ alignContent: Alignment.Start }) {
                // 滑轨：胶囊形底
                Row()
                  .width('100%').height(40)
                  .borderRadius(20)
                  .backgroundColor($r('app.color.glass_track_fill'))
                  .border({ width: 0.8, color: $r('app.color.glass_border') })
                // 滑块：选中档位的底色胶囊，落位带 200ms 缓动
                Row()
                  .width(this.trackWidth > 0 ? this.getSegWidth() - 6 : 0)
                  .height(34)
                  .borderRadius(17)
                  .backgroundColor($r('app.color.glass_thumb_fill'))
                  .border({ width: 0.8, color: $r('app.color.glass_border') })
                  .margin({ left: 3 })
                  .translate({ x: this.thumbX })
                  .animation({ duration: this.isDragging ? 0 : 200, curve: Curve.EaseOut })
                Row() {
                  ForEach([0, 1, 2], (idx: number) => {
                    Text(COLOR_MODE_LABELS[idx])
                      .fontSize(14)
                      .fontWeight(this.colorModeIndex === idx ? FontWeight.Medium : FontWeight.Normal)
                      .fontColor(this.colorModeIndex === idx
                        ? $r('app.color.selected') : $r('app.color.secondary_text'))
                      .textAlign(TextAlign.Center)
                      .layoutWeight(1)
                      .height('100%')
                      .onClick(() => {
                        this.commitIndex(idx);
                      })
                  }, (idx: number) => idx.toString())
                }
                .width('100%').height(40)
              }
              .layoutWeight(1)
              .margin({ left: 12 })
              .onAreaChange((_oldArea: Area, newArea: Area) => {
                this.trackWidth = newArea.width as number;
                this.syncThumb();
              })
              .onTouch((event: TouchEvent) => this.onSliderTouch(event))
              .gesture(
                // 横向 Pan 与 List 纵向滚动按轴向竞争：横向拖动独占触控，纵向漂移由列表滚动；
                // 起手位移 < distance 的点按不会触发 Pan，文字 onClick 点选不受影响
                PanGesture({ fingers: 1, direction: PanDirection.Horizontal, distance: 5 })
                  .onActionStart(() => {
                    this.isDragging = true;
                    this.dragStartThumbX = this.thumbX;
                  })
                  .onActionUpdate((event: GestureEvent) => {
                    this.thumbX = this.clampThumbX(this.dragStartThumbX + event.offsetX);
                  })
                  .onActionEnd(() => {
                    this.isDragging = false;
                    this.commitIndex(this.indexFromThumb());
                  })
                  .onActionCancel(() => {
                    this.isDragging = false;
                    this.commitIndex(this.indexFromThumb());
                  })
              )
            }
            .width('100%')
            .alignItems(VerticalAlign.Center)
            .padding({ left: 12, right: 12, top: 10, bottom: 10 })
            .backgroundColor($r('app.color.card_background'))
            .borderRadius(16)

            if (this.supportFloatingBar) {
              // 沉浸光感（官方 Spatialization 示例同款）：档位经 AppStorage 实时下发到首页页签与标题栏
              Column() {
                Row() {
                  this.SettingTexts('沉浸光感', '页签与标题栏的光感材质强弱')
                  Row({ space: 6 }) {
                    ForEach(HDS_MATERIAL_LEVEL_OPTIONS, (item: MaterialLevelOption) => {
                      Text(item.label)
                        .fontSize(13)
                        .fontColor(this.hdsMaterialLevel === item.level
                          ? $r('app.color.text_on_primary') : $r('app.color.secondary_text'))
                        .backgroundColor(this.hdsMaterialLevel === item.level
                          ? $r('app.color.selected') : $r('app.color.text_field_bg'))
                        .padding({ left: 12, right: 12, top: 6, bottom: 6 })
                        .borderRadius(15)
                        .animation({ duration: 150, curve: Curve.EaseOut })
                        .onClick(() => {
                          this.setHdsMaterialLevel(item.level);
                        })
                    }, (item: MaterialLevelOption) => item.level.toString())
                  }
                }
                .width('100%')
                .padding({ left: 16, right: 16, top: 13, bottom: 13 })
              }
              .width('100%').margin({ top: 12 })
              .backgroundColor($r('app.color.card_background'))
              .borderRadius(16)
            }
          }
        }

        // 签到：扫码器版本切换（默认旧版 = 系统扫码页）
        ListItem() {
          Column() {
            this.SectionHeader('签到')
            Column() {
              Row() {
                this.SettingTexts('新版扫码器', '应用内相机连续扫码，一次扫完全部用户的码；关闭则沿用系统扫码页逐人扫码')
                Toggle({ type: ToggleType.Switch, isOn: this.customScanEnabled })
                  .selectedColor($r('app.color.selected'))
                  .onChange((value: boolean) => {
                    // sheet 每次打开都会重建本组件，程序化回填同样触发 onChange；
                    // 回填值必然与当前状态一致，用户真实拨动才会相异
                    if (value === this.customScanEnabled) {
                      return;
                    }
                    this.saveCustomScan(value)
                  })
              }
              .width('100%').padding({ left: 16, right: 16, top: 13, bottom: 13 })
            }
            .backgroundColor($r('app.color.card_background'))
            .borderRadius(16)
          }
        }

        // 验证码：模型自动验证（Beta）
        ListItem() {
          Column() {
            this.SectionHeader('验证码')
            Column() {
              Row() {
                this.SettingTexts('模型自动验证', '使用本地模型自动完成滑块验证码')
                Text('Beta')
                  .fontSize(10)
                  .fontColor(Color.White)
                  .padding({ left: 6, right: 6, top: 2, bottom: 2 })
                  .borderRadius(6)
                  .backgroundColor($r('app.color.beta_badge'))
                  .margin({ right: 10 })
                Toggle({ type: ToggleType.Switch, isOn: this.modelCaptchaEnabled })
                  .selectedColor($r('app.color.selected'))
                  .onChange((value: boolean) => {
                    // sheet 每次打开都会重建本组件，异步读偏好会把 isOn 由 false 回填为 true，
                    // 程序化回填同样触发 onChange；回填值必然与当前状态一致，用户真实拨动才会相异
                    if (value === this.modelCaptchaEnabled) {
                      return;
                    }
                    this.onModelCaptchaToggle(value)
                  })
              }
              .width('100%').padding({ left: 16, right: 16, top: 13, bottom: 13 })

              if (this.modelCaptchaEnabled) {
                this.SettingsDivider()

                Row() {
                  this.SettingTexts('模型测试', '验证模型可用性与准确度')
                  Button(this.modelTestRunning ? '测试中...' : '测试')
                    .fontSize(14)
                    .height(32)
                    .padding({ left: 16, right: 16 })
                    .enabled(!this.modelTestRunning)
                    .scale({
                      x: this.pressedKey === KEY_MODEL_TEST ? 0.95 : 1,
                      y: this.pressedKey === KEY_MODEL_TEST ? 0.95 : 1
                    })
                    .animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) })
                    .onAreaChange(this.pressAreaHandler(KEY_MODEL_TEST))
                    .onTouch(this.pressTouchHandler(KEY_MODEL_TEST))
                    .onClick(() => {
                      this.runModelTest()
                    })
                }
                .width('100%').padding({ left: 16, right: 16, top: 13, bottom: 13 })

                if (this.modelTestState !== MODEL_TEST_IDLE && !this.modelTestRunning) {
                  Text(this.modelTestState === MODEL_TEST_PASSED ? '模型可用，准确度正常' : '模型不可用或准确度异常')
                    .fontSize(12)
                    .fontColor(this.modelTestState === MODEL_TEST_PASSED
                      ? $r('app.color.signed') : $r('app.color.unsignable'))
                    .width('100%')
                    .padding({ left: 16, right: 16, bottom: 12 })
                }
              }
            }
            .backgroundColor($r('app.color.card_background'))
            .borderRadius(16)
          }
        }

        // 排行榜：签到记录云端同步开关（实时上报 + 启动自动补录）
        ListItem() {
          Column() {
            this.SectionHeader('排行榜')
            Column() {
              Row() {
                this.SettingTexts('云端同步', '签到记录自动同步到排行榜，历史记录启动时自动补录')
                Toggle({ type: ToggleType.Switch, isOn: this.cloudSyncEnabled })
                  .selectedColor($r('app.color.selected'))
                  .onChange((value: boolean) => {
                    // sheet 每次打开都会重建本组件，程序化回填同样触发 onChange；
                    // 回填值必然与当前状态一致，用户真实拨动才会相异
                    if (value === this.cloudSyncEnabled) {
                      return;
                    }
                    this.saveCloudSync(value)
                  })
              }
              .width('100%').padding({ left: 16, right: 16, top: 13, bottom: 13 })
            }
            .backgroundColor($r('app.color.card_background'))
            .borderRadius(16)
          }
        }

        // 通用：两行式设置行(标题 + 说明)
        ListItem() {
          Column() {
            this.SectionHeader('通用')
            Column() {
              Row() {
                this.SettingTexts('版本', '当前应用版本')
                Text(this.version)
                  .fontSize(14)
                  .fontColor($r('app.color.secondary_text'))
              }
              .width('100%').padding({ left: 16, right: 16, top: 13, bottom: 13 })

              this.SettingsDivider()

              Row() {
                this.SettingTexts('清除缓存', '清理临时文件与图片缓存')
                this.Chevron()
              }
              .width('100%').padding({ left: 16, right: 16, top: 13, bottom: 13 })
              .scale({
                x: this.pressedKey === KEY_CLEAR_CACHE ? 0.97 : 1,
                y: this.pressedKey === KEY_CLEAR_CACHE ? 0.97 : 1
              })
              .animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) })
              .onAreaChange(this.pressAreaHandler(KEY_CLEAR_CACHE))
              .onTouch(this.pressTouchHandler(KEY_CLEAR_CACHE))
              .onClick(() => {
                this.confirmClearCache()
              })

              this.SettingsDivider()

              Row() {
                this.SettingTexts('清理地图资源', '清理旧版底图样式与瓦片缓存（地图选点按需重新下载）')
                this.Chevron()
              }
              .width('100%').padding({ left: 16, right: 16, top: 13, bottom: 13 })
              .scale({
                x: this.pressedKey === KEY_MAP_STYLE ? 0.97 : 1,
                y: this.pressedKey === KEY_MAP_STYLE ? 0.97 : 1
              })
              .animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) })
              .onAreaChange(this.pressAreaHandler(KEY_MAP_STYLE))
              .onTouch(this.pressTouchHandler(KEY_MAP_STYLE))
              .onClick(() => {
                this.confirmClearMapResources()
              })

              this.SettingsDivider()

              Row() {
                this.SettingTexts('导出数据库', '备份用户数据为 JSON 文件')
                this.Chevron()
              }
              .width('100%').padding({ left: 16, right: 16, top: 13, bottom: 13 })
              .scale({
                x: this.pressedKey === KEY_EXPORT_DB ? 0.97 : 1,
                y: this.pressedKey === KEY_EXPORT_DB ? 0.97 : 1
              })
              .animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) })
              .onAreaChange(this.pressAreaHandler(KEY_EXPORT_DB))
              .onTouch(this.pressTouchHandler(KEY_EXPORT_DB))
              .onClick(() => {
                this.exportDatabase()
              })

              this.SettingsDivider()

              Row() {
                this.SettingTexts('导入数据库', '从 JSON 备份文件恢复数据')
                this.Chevron()
              }
              .width('100%').padding({ left: 16, right: 16, top: 13, bottom: 13 })
              .scale({
                x: this.pressedKey === KEY_IMPORT_DB ? 0.97 : 1,
                y: this.pressedKey === KEY_IMPORT_DB ? 0.97 : 1
              })
              .animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) })
              .onAreaChange(this.pressAreaHandler(KEY_IMPORT_DB))
              .onTouch(this.pressTouchHandler(KEY_IMPORT_DB))
              .onClick(() => {
                this.importDatabase()
              })

              this.SettingsDivider()

              Row() {
                this.SettingTexts('更新日志', '查看最近的更新内容')
                this.Chevron()
              }
              .width('100%').padding({ left: 16, right: 16, top: 13, bottom: 13 })
              .scale({
                x: this.pressedKey === KEY_CHANGELOG ? 0.97 : 1,
                y: this.pressedKey === KEY_CHANGELOG ? 0.97 : 1
              })
              .animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) })
              .onAreaChange(this.pressAreaHandler(KEY_CHANGELOG))
              .onTouch(this.pressTouchHandler(KEY_CHANGELOG))
              .onClick(() => {
                this.showChangelog()
              })

              this.SettingsDivider()

              Row() {
                Image($r('app.media.github')) .draggable(false)
                  .width(20).height(20).margin({ right: 10 })
                  .fillColor($r('app.color.primary_text'))
                this.SettingTexts('项目地址', '在 GitHub 上查看源码')
                this.Chevron()
              }
              .width('100%').padding({ left: 16, right: 16, top: 13, bottom: 13 })
              .scale({
                x: this.pressedKey === KEY_GITHUB ? 0.97 : 1,
                y: this.pressedKey === KEY_GITHUB ? 0.97 : 1
              })
              .animation({ duration: 300, curve: curves.interpolatingSpring(0, 1, 328, 28) })
              .onAreaChange(this.pressAreaHandler(KEY_GITHUB))
              .onTouch(this.pressTouchHandler(KEY_GITHUB))
              .onClick(() => {
                this.openUrl('https://github.com/ASCII-58/chaoxingsignfacker')
              })
            }
            .backgroundColor($r('app.color.card_background'))
            .borderRadius(16)
          }
        }
      }
      .width('100%').layoutWeight(1)
      .padding({ left: 16, right: 16})
      .scrollBar(BarState.Off)
      .edgeEffect(EdgeEffect.Spring)
    }
    .width('100%').height('100%')
    .backgroundColor(Color.Transparent)
  }
}
