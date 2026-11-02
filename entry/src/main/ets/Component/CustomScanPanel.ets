import { customScan, scanBarcode, scanCore } from '@kit.ScanKit';
import { abilityAccessCtrl, common, Permissions } from '@kit.AbilityKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import UrlTools from '../utils/urlTools';

const TAG = 'CustomScanPanel';
const DOMAIN = 0x0016;

/** 成功记录一个码后延时恢复识别：留出移开手机/换码的时间，避免同一帧被重复计入 */
const AUTO_RESUME_MS = 1800;
/** 识别到无效码后的重试间隔，避免对同一无效码高频自旋 */
const INVALID_RESUME_MS = 1200;
const CAMERA_PERMISSION: Permissions = 'ohos.permission.CAMERA';

/**
 * 新版扫码器：自定义界面扫码（customScan）+ rescan 连续扫码
 *
 * 与默认界面扫码的差异：
 * - 相机流渲染在组件内的 XComponent surface 上，扫码界面不关闭即可连续识别；
 * - 每次识别成功后调用 rescan() 重新触发识别（rescan 返回 void，结果仍从 start 的 callback 回来，
 *   因此必须使用 callback 版 start，Promise 版没有结果回传通道）；
 * - 需要自行申请 ohos.permission.CAMERA（默认界面扫码由系统页代持权限，无需申请）。
 *
 * 生命周期：init → start → (rescan 循环) → stop → release，缺 release 会泄漏相机流。
 */
@Component
export struct CustomScanPanel {
  /** 本轮需要收集的码值数量（= 勾选用户数） */
  @Prop expectedCount: number = 1;
  /** 每识别到一个新的有效 enc 回调一次 */
  onEnc?: (enc: string) => void
  /** 收满 expectedCount 个码值 */
  onComplete?: () => void
  /** 用户主动关闭 */
  onCancel?: () => void

  @State scannedCount: number = 0;
  @State statusText: string = '正在准备相机…';
  @State flashlightOn: boolean = false;
  @State fatalError: boolean = false;

  private xComponentController: XComponentController = new XComponentController();
  private surfaceId: string = '';
  private areaWidth: number = 0;
  private areaHeight: number = 0;
  private started: boolean = false;
  private released: boolean = false;
  /** 最近一次成功识别的码值，仅用于排查 */
  private lastEnc: string = '';
  /** 待执行的自动恢复定时器句柄，-1 表示无 */
  private resumeTimer: number = -1;

  aboutToDisappear() {
    this.teardown();
  }

  private async ensureCameraPermission(): Promise<boolean> {
    try {
      const atManager = abilityAccessCtrl.createAtManager();
      const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      const result = await atManager.requestPermissionsFromUser(context, [CAMERA_PERMISSION]);
      return result.authResults.every((r: number) => r === 0);
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Request camera permission failed: ${(e as Error).message}`);
      return false;
    }
  }

  /** surface 与尺寸都就绪后只启动一次 */
  private async tryStart() {
    if (this.started || this.released || !this.surfaceId || this.areaWidth <= 0 || this.areaHeight <= 0) {
      return;
    }
    this.started = true;
    this.statusText = '正在申请相机权限…';
    const granted = await this.ensureCameraPermission();
    if (!granted) {
      this.fatalError = true;
      this.statusText = '未获得相机权限，请到系统设置开启后重试';
      return;
    }
    try {
      const options: scanBarcode.ScanOptions = {
        scanTypes: [scanCore.ScanType.ALL],
        // 连续单人扫码：关闭多码识别，避免一屏多码时返回值不确定
        enableMultiMode: false,
        // 自定义界面不支持相册识码
        enableAlbum: false
      };
      customScan.init(options);
      const viewControl: customScan.ViewControl = {
        width: this.areaWidth,
        height: this.areaHeight,
        surfaceId: this.surfaceId
      };
      customScan.start(viewControl, (err: BusinessError, data: Array<scanBarcode.ScanResult>) => {
        if (err) {
          hilog.error(DOMAIN, TAG, `Custom scan callback error. Code:${err.code}, message: ${err.message}`);
          this.statusText = '扫码异常，请关闭后重试';
          this.fatalError = true;
          return;
        }
        this.handleScanResult(data);
      });
      this.statusText = `请扫描第 ${this.scannedCount + 1} 个签到码`;
      hilog.info(DOMAIN, TAG, 'Custom scan started');
    } catch (e) {
      const err = e as BusinessError;
      hilog.error(DOMAIN, TAG, `Start custom scan failed. Code:${err.code}, message: ${err.message}`);
      this.fatalError = true;
      this.statusText = err.code === 201 ? '相机权限被拒绝，无法启动扫码' : '启动扫码失败，请关闭后重试';
    }
  }

  private handleScanResult(data: Array<scanBarcode.ScanResult>) {
    if (this.released) {
      return;
    }
    if (!data || data.length === 0) {
      this.scheduleRescan(INVALID_RESUME_MS);
      return;
    }
    const parse = UrlTools.parseUrlParams(data[0].originalValue);
    const enc: string = parse && parse['enc'] ? parse['enc'] : '';
    if (!enc) {
      this.statusText = '该二维码不含签到凭据 enc，请换一个码';
      this.scheduleRescan(INVALID_RESUME_MS);
      return;
    }
    this.lastEnc = enc;
    this.scannedCount++;
    this.onEnc?.(enc);
    hilog.info(DOMAIN, TAG, `Collected enc ${this.scannedCount}/${this.expectedCount}`);

    if (this.scannedCount >= this.expectedCount) {
      this.statusText = '已收满全部签到码，正在签到…';
      this.cancelScheduledRescan();
      this.onComplete?.();
      this.teardown();
      return;
    }
    // 关键：不在此处立即 rescan。相机会对同一张码连续回调，
    // 立即恢复会把同一帧计成下一位用户；改为延时恢复，给用户换码/移开的时间。
    this.statusText = `已记录 ${this.scannedCount}/${this.expectedCount}，请换下一个码`;
    this.scheduleRescan(AUTO_RESUME_MS);
  }

  /** 延时恢复识别；重复调用以最后一次为准 */
  private scheduleRescan(delayMs: number) {
    if (this.released) {
      return;
    }
    this.cancelScheduledRescan();
    this.resumeTimer = setTimeout(() => {
      this.resumeTimer = -1;
      this.rescan();
    }, delayMs);
  }

  private cancelScheduledRescan() {
    if (this.resumeTimer !== -1) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = -1;
    }
  }

  /** rescan 返回 void，识别结果继续走 start 的 callback */
  private rescan() {
    if (this.released) {
      return;
    }
    try {
      customScan.rescan();
    } catch (e) {
      hilog.warn(DOMAIN, TAG, `Rescan failed: ${(e as Error).message}`);
    }
  }

  /** 用户点「继续扫描」：跳过等待，立即恢复识别 */
  private resumeNow() {
    if (this.released || this.scannedCount >= this.expectedCount) {
      return;
    }
    this.cancelScheduledRescan();
    this.statusText = `请扫描第 ${this.scannedCount + 1} 个签到码`;
    this.rescan();
  }

  private toggleFlashlight() {
    if (this.released || !this.started || this.fatalError) {
      return;
    }
    try {
      if (this.flashlightOn) {
        customScan.closeFlashLight();
      } else {
        customScan.openFlashLight();
      }
      this.flashlightOn = !this.flashlightOn;
    } catch (e) {
      hilog.warn(DOMAIN, TAG, `Toggle flashlight failed: ${(e as Error).message}`);
    }
  }

  /** 幂等释放：stop 暂停相机流，release 回收资源 */
  private async teardown() {
    if (this.released) {
      return;
    }
    this.released = true;
    this.cancelScheduledRescan();
    try {
      await customScan.stop();
    } catch (e) {
      hilog.warn(DOMAIN, TAG, `Stop custom scan failed: ${(e as Error).message}`);
    }
    try {
      await customScan.release();
    } catch (e) {
      hilog.warn(DOMAIN, TAG, `Release custom scan failed: ${(e as Error).message}`);
    }
  }

  build() {
    Stack({ alignContent: Alignment.Center }) {
      XComponent({
        id: 'cxCustomScanSurface',
        type: XComponentType.SURFACE,
        controller: this.xComponentController
      })
        .width('100%')
        .height('100%')
        .onLoad(() => {
          this.surfaceId = this.xComponentController.getXComponentSurfaceId();
          this.tryStart();
        })
        .onAreaChange((_oldArea: Area, newArea: Area) => {
          // Area 的尺寸为 Length（number | string | Resource），相机流只接受 number（vp）
          const w = newArea.width;
          const h = newArea.height;
          this.areaWidth = typeof w === 'number' ? w : 0;
          this.areaHeight = typeof h === 'number' ? h : 0;
          this.tryStart();
        })
        .onDestroy(() => {
          this.teardown();
        })

      // 扫描取景框
      Column()
        .width(240)
        .height(240)
        .borderRadius(16)
        .border({ width: 2, color: $r('app.color.selected') })

      // 顶部进度与状态
      Column({ space: 8 }) {
        Text(`连续扫码 ${this.scannedCount}/${this.expectedCount}`)
          .fontSize(20)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('app.color.text_on_primary'))
        Text(this.statusText)
          .fontSize(14)
          .fontColor($r('app.color.text_on_primary'))
          .opacity(0.86)
          .textAlign(TextAlign.Center)
          .padding({ left: 24, right: 24 })
          .maxLines(3)
        Button(this.flashlightOn ? '关闭补光' : '开启补光')
          .fontSize(13)
          .fontColor($r('app.color.text_on_primary'))
          .backgroundColor($r('app.color.class_button'))
          .height(34)
          .padding({ left: 14, right: 14 })
          .enabled(!this.fatalError)
          .onClick(() => {
            this.toggleFlashlight();
          })
      }
      .alignItems(HorizontalAlign.Center)
      .offset({ y: -220 })

      // 底部操作区
      Row({ space: 16 }) {
        Button('继续扫描')
          .fontSize(15)
          .fontColor($r('app.color.text_on_primary'))
          .backgroundColor($r('app.color.class_button'))
          .height(44)
          .layoutWeight(1)
          .enabled(this.scannedCount < this.expectedCount && !this.fatalError)
          .onClick(() => {
            this.resumeNow();
          })
        Button('完成 / 退出')
          .fontSize(15)
          .fontColor($r('app.color.text_on_primary'))
          .backgroundColor($r('app.color.unsignable'))
          .height(44)
          .layoutWeight(1)
          .onClick(() => {
            this.teardown();
            this.onCancel?.();
          })
      }
      .width('100%')
      .padding({ left: 24, right: 24 })
      .offset({ y: 260 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Color.Black)
  }
}
