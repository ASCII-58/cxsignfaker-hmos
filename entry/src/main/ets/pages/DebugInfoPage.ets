import { CaptchaComponent, CaptchaUserParam } from '../Component/Captcha';
import { GestureSignComponent } from '../Component/GestureSignComponent';
import { PasswordSignComponent } from '../Component/PasswordSignComponent';
import { QRCodeLocation, QRCodePosition } from '../Component/QRCodeLocationCard';
import { DatabaseManager } from '../utils/DataBase';

// 验证组件操作测试页（Debug 详情页，长按/连点头像 → 密码 → 「打开Debug详情页」进入）：
// 以 Tabs 分组件交互测试——滑块验证码（本地模拟）、手势、签到码、位置选点，
// 各组件的回调统一记入底部操作日志。手势/签到码/位置组件的"校验"依赖真实活动ID与登录态，
// 未填活动ID时仅可操作 UI（绘制/输入/选点），校验按钮会返回失败提示，属预期行为。
@Builder
export function init() {
  debug()
}

@Component
export default struct debug {

  @Consume('pathInfos') pageInfos: NavPathStack;
  @State activityId: string = '';
  @State hostCookies: string = '';
  @State opLog: string = '尚未触发组件回调';
  @State captchaSession: number = 1;

  aboutToAppear(): void {
    this.loadHostCookies();
  }

  /** 主用户 cookies：手势/签到码组件的即时校验用（本地 DB 读取，不发网络请求） */
  private async loadHostCookies(): Promise<void> {
    try {
      const host = await DatabaseManager.getInstance().getUserByPosition(1, true);
      this.hostCookies = host?.cookies ?? '';
    } catch (e) {
      this.hostCookies = '';
    }
  }

  private log(line: string): void {
    const time = new Date().toTimeString().substring(0, 8);
    this.opLog = `${time} ${line}\n${this.opLog}`;
  }

  /** 验证码演示用用户上下文：demoMode 全程本地模拟，不访问网络 */
  private captchaDemoUser(): CaptchaUserParam {
    return {
      cookies: 'demo',
      uname: '组件演示用户',
      refererParams: {
        courseId: 'demo',
        classId: 'demo',
        activePrimaryId: this.activityId || 'demo',
        uid: 'demo'
      }
    };
  }

  @Builder
  CaptchaTab() {
    Scroll() {
      Column({ space: 12 }) {
        Text('滑块验证码组件（demoMode 本地模拟：奇数轮演示校验成功，偶数轮演示失败回退手动）')
          .fontSize(12)
          .fontColor($r('sys.color.ohos_id_color_text_tertiary'))
          .width('100%')

        CaptchaComponent({
          demoMode: true,
          captchaUser: this.captchaDemoUser(),
          captchaSession: this.captchaSession,
          onValidated: (validate: string) => {
            this.log(`[滑块验证码] onValidated(validate=${validate.substring(0, 24)}...)`)
          },
          onSkip: () => {
            this.log('[滑块验证码] onSkip() 手动跳过')
          }
        })

        Button('重跑演示（会话号+1）')
          .fontSize(13)
          .height(36)
          .onClick(() => {
            this.captchaSession++;
            this.log(`[滑块验证码] 重跑演示，会话号=${this.captchaSession}`)
          })
      }
      .width('100%')
      .padding(12)
    }
    .align(Alignment.Top)
    .width('100%')
    .height('100%')
  }

  @Builder
  GestureTab() {
    Scroll() {
      Column() {
        Text('手势签到组件（3x3 绘制 → 校验 → onSignCode 回传手势码；校验需真实活动ID）')
          .fontSize(12)
          .fontColor($r('sys.color.ohos_id_color_text_tertiary'))
          .width('100%')
          .margin({ bottom: 12 })

        GestureSignComponent({
          activityId: this.activityId || 'debug',
          hostCookies: this.hostCookies,
          onSignCode: (code: string) => {
            this.log(code ? `[手势签到] onSignCode(${code})` : '[手势签到] onSignCode(\'\') 已重置/失效')
          }
        })
      }
      .width('100%')
      .padding(12)
    }
    .align(Alignment.Top)
    .width('100%')
    .height('100%')
  }

  @Builder
  PasswordTab() {
    Scroll() {
      Column() {
        Text('签到码组件（4-8 位数字输入 → 校验 → onSignCode 回传；校验需真实活动ID）')
          .fontSize(12)
          .fontColor($r('sys.color.ohos_id_color_text_tertiary'))
          .width('100%')
          .margin({ bottom: 12 })

        PasswordSignComponent({
          activityId: this.activityId || 'debug',
          hostCookies: this.hostCookies,
          onSignCode: (code: string) => {
            this.log(code ? `[签到码] onSignCode(${code})` : '[签到码] onSignCode(\'\') 已重置/失效')
          }
        })
      }
      .width('100%')
      .padding(12)
    }
    .align(Alignment.Top)
    .width('100%')
    .height('100%')
  }

  @Builder
  LocationTab() {
    Scroll() {
      Column() {
        Text('二维码位置选点卡片（读取要求位置 → 地图选点 → onPositionChange 回传 BD-09 坐标）')
          .fontSize(12)
          .fontColor($r('sys.color.ohos_id_color_text_tertiary'))
          .width('100%')
          .margin({ bottom: 12 })

        QRCodeLocation({
          ActivityId: this.activityId,
          positionRequired: true,
          onPositionChange: (position: QRCodePosition) => {
            this.log(`[位置选点] onPositionChange(${position.address}) ` +
              `lat=${position.latitude} lng=${position.longitude}`)
          }
        })
      }
      .width('100%')
      .padding(12)
    }
    .align(Alignment.Top)
    .width('100%')
    .height('100%')
  }

  build() {
    NavDestination() {
      Column() {
        Row({ space: 12 }) {
          Button('返回')
            .fontSize(13)
            .height(32)
            .onClick(() => { this.pageInfos.pop() })
          Text('验证组件操作测试')
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
          Blank()
        }
        .width('100%')
        .padding({ left: 16, right: 16, top: 12, bottom: 8 })

        TextInput({ placeholder: '活动ID activeId（手势/签到码/位置校验用，可留空）', text: this.activityId })
          .width('100%')
          .height(40)
          .fontSize(13)
          .backgroundColor($r('sys.color.ohos_id_color_text_field_sub_bg'))
          .padding({ left: 16, right: 16 })
          .onChange((value: string) => {
            this.activityId = value;
          })

        Tabs() {
          TabContent() {
            this.CaptchaTab()
          }
          .tabBar('滑块验证码')

          TabContent() {
            this.GestureTab()
          }
          .tabBar('手势签到')

          TabContent() {
            this.PasswordTab()
          }
          .tabBar('签到码')

          TabContent() {
            this.LocationTab()
          }
          .tabBar('位置选点')
        }
        .layoutWeight(1)
        .barPosition(BarPosition.End)
        .width('100%')

        Column() {
          Text('操作日志')
            .fontSize(12)
            .fontColor($r('sys.color.ohos_id_color_text_tertiary'))
            .width('100%')
            .margin({ bottom: 4 })
          Scroll() {
            Text(this.opLog)
              .fontSize(12)
              .fontColor($r('sys.color.ohos_id_color_text_secondary'))
              .width('100%')
          }
          .constraintSize({ maxHeight: 120 })
          .align(Alignment.TopStart)
        }
        .alignItems(HorizontalAlign.Start)
        .width('100%')
        .padding({ left: 16, right: 16, top: 8, bottom: 12 })
      }
      .width('100%')
      .height('100%')
      .backgroundColor($r('sys.color.ohos_id_color_sub_background'))
    }
    .height('100%')
    .width('100%')
  }
}
