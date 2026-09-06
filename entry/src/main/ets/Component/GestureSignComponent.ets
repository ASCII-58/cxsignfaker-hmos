import { Sign } from '../utils/sign';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { promptAction } from '@kit.ArkUI';
import { LightButton } from './LightButton';

const TAG = 'GestureSignComponent';
const DOMAIN = 0x0009;
const GESTURE_GRID_SIZE = 9; // 手势网格大小（3x3）
const GESTURE_AREA_SIZE = 250; // 手势绘制区域边长（vp）
const CELL_PITCH = 90; // 相邻圆点中心距：250 = 3*70 + 2*20
const FIRST_CENTER = 35; // 首个圆点中心坐标
const HIT_RADIUS = 45; // 滑动时命中圆点的判定半径（vp）

/**
 * 手势签到输入组件（纯输入）：
 * 支持在 3x3 圆点上滑动绘制或逐点点击，校验通过后通过 onSignCode 回传手势码；
 * 签到执行由 SignerPage 统一编排，组件不发起签到请求。
 */
@Component
export struct GestureSignComponent {
  @Prop activityId: string;
  /** 主用户 Cookie，仅用于即时校验手势码 */
  @Prop hostCookies: string;
  /** 校验通过回传手势码，重置/失效回传 '' */
  onSignCode?: (code: string) => void

  @State gesturePattern: number[] = []; // 手势顺序（1~9）
  @State gesturePoints: boolean[] = Array(GESTURE_GRID_SIZE).fill(false);
  @State codeReady: boolean = false;
  @State resultMsg: string = '';
  @State isValidating: boolean = false;

  /** 圆点编号（1~9）对应的中心坐标（相对绘制区域） */
  private centerOf(pointNo: number): number[] {
    const idx = pointNo - 1;
    return [FIRST_CENTER + (idx % 3) * CELL_PITCH, FIRST_CENTER + Math.floor(idx / 3) * CELL_PITCH];
  }

  private polylinePoints(): Array<number[]> {
    return this.gesturePattern.map((n: number): number[] => this.centerOf(n));
  }

  /** 命中检测：返回坐标下的圆点编号（1~9），未命中返回 0 */
  private hitTest(x: number, y: number): number {
    const col = Math.round((x - FIRST_CENTER) / CELL_PITCH);
    const row = Math.round((y - FIRST_CENTER) / CELL_PITCH);
    if (col < 0 || col > 2 || row < 0 || row > 2) {
      return 0;
    }
    const cx = FIRST_CENTER + col * CELL_PITCH;
    const cy = FIRST_CENTER + row * CELL_PITCH;
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > HIT_RADIUS * HIT_RADIUS) {
      return 0;
    }
    return row * 3 + col + 1;
  }

  private addPoint(pointNo: number) {
    if (this.codeReady || pointNo <= 0 || pointNo > GESTURE_GRID_SIZE) {
      return;
    }
    if (!this.gesturePoints[pointNo - 1]) {
      this.gesturePoints[pointNo - 1] = true;
      this.gesturePattern.push(pointNo);
      hilog.debug(DOMAIN, TAG, `Gesture pattern: ${this.gesturePattern.join(',')}`);
    }
  }

  onGesturePointClick(index: number) {
    this.addPoint(index + 1);
  }

  /** 滑动/按下时按触摸点命中圆点；TouchObject.x/y 相对当前组件 */
  private onTouchPoint(event: TouchEvent) {
    if (event.type !== TouchType.Down && event.type !== TouchType.Move) {
      return;
    }
    if (event.touches.length === 0) {
      return;
    }
    const touch = event.touches[0];
    this.addPoint(this.hitTest(touch.x, touch.y));
  }

  resetGesture() {
    this.gesturePoints = Array(GESTURE_GRID_SIZE).fill(false);
    this.gesturePattern = [];
    this.resultMsg = '';
    if (this.codeReady) {
      this.codeReady = false;
      this.onSignCode?.('');
    }
  }

  async submitGesture() {
    if (this.gesturePattern.length === 0) {
      promptAction.showToast({ message: '请绘制手势' });
      return;
    }

    try {
      this.isValidating = true;
      const gestureCode = this.gesturePattern.join('');

      const isCorrect = await Sign.CheckSignCode(this.hostCookies, this.activityId, gestureCode);

      if (!isCorrect) {
        this.resultMsg = '手势错误，请重新绘制';
        this.resetGesture();
        return;
      }

      this.resultMsg = '手势校验通过，请点击下方按钮签到';
      this.codeReady = true;
      this.onSignCode?.(gestureCode);
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Gesture validate failed: ${(e as Error).message}`);
      this.resultMsg = `手势校验失败: ${(e as Error).message}`;
    } finally {
      this.isValidating = false;
    }
  }

  build() {
    Column() {
      Text('请在圆点上滑动绘制手势图案（为所有勾选用户代签）')
        .fontSize(14)
        .fontColor($r('app.color.secondary_text'))
        .margin({ bottom: 24 })

      // 手势绘制区域：滑动（PanGesture）+ 点击（onClick）两种输入方式
      Stack() {
        Grid() {
          ForEach(Array.from<number, number>({ length: GESTURE_GRID_SIZE }, (_, i: number) => i), (index: number) => {
            GridItem() {
              Circle({ width: 60, height: 60 })
                .fill(this.gesturePoints[index] ?
                  $r('app.color.selected') :
                  $r('app.color.text_field_bg'))
                .onClick(() => this.onGesturePointClick(index))
            }
          })
        }
        .columnsTemplate('1fr 1fr 1fr')
        .rowsTemplate('1fr 1fr 1fr')
        .width(GESTURE_AREA_SIZE)
        .height(GESTURE_AREA_SIZE)
        .columnsGap(20)
        .rowsGap(20)

        // 已选圆点连线
        if (this.gesturePattern.length > 1) {
          Polyline({ width: GESTURE_AREA_SIZE, height: GESTURE_AREA_SIZE })
            .points(this.polylinePoints())
            .stroke($r('app.color.selected'))
            .strokeWidth(4)
            .fillOpacity(0)
            .hitTestBehavior(HitTestMode.None)
        }
      }
      .width(GESTURE_AREA_SIZE)
      .height(GESTURE_AREA_SIZE)
      .onTouch((event: TouchEvent) => this.onTouchPoint(event))
      .margin({ bottom: 24 })

      // 手势顺序显示
      if (this.gesturePattern.length > 0) {
        Text(`手势顺序: ${this.gesturePattern.join(' → ')}`)
          .fontSize(14)
          .fontColor($r('app.color.primary_text'))
          .margin({ bottom: 16 })
      }

      // 校验结果信息
      if (this.resultMsg) {
        Text(this.resultMsg)
          .fontSize(14)
          .fontColor(this.codeReady ?
            $r('app.color.selected') :
            $r('app.color.beta_badge'))
          .margin({ bottom: 16 })
      }

      // 操作按钮
      Row() {
        LightButton({
          label: '重置',
          btnEnabled: true,
          onButton: () => {
            this.resetGesture()
          }
        })
          .width(100)
          .margin({ right: 10 })

        LightButton({
          label: this.isValidating ? '校验中...' : '校验手势',
          btnEnabled: !this.codeReady && this.gesturePattern.length > 0 && !this.isValidating,
          onButton: () => {
            this.submitGesture()
          }
        })
          .width(120)
      }
      .margin({ bottom: 8 })
    }
    .width('100%')
    .padding(20)
  }
}
