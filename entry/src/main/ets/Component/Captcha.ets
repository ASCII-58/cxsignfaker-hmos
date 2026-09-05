import { CaptchaPhotosParam, CaptchaPhotosResult, CaptchaApi } from '../utils/captchaApi'
import { Http } from '../utils/httpClient'
import { MsCaptchaDetector } from '../utils/detector/MsCaptchaDetector'
import { preferences } from '@kit.ArkData'
import { common } from '@kit.AbilityKit'
import { promptAction } from '@kit.ArkUI'
import { image } from '@kit.ImageKit'
import { hilog } from '@kit.PerformanceAnalysisKit'

const TAG = 'CaptchaComponent';
const DOMAIN = 0x000B;
const CAPTCHA_MEMORY_PREF = 'captcha_memory'
const SETTINGS_PREF = 'settings'
const MODEL_CAPTCHA_ENABLED_KEY = 'model_captcha_enabled'
// 与上游一致的滑块归一化：x = slider / sliderMax * 280 - 8
const CAPTCHA_NORMALIZED_MAX = 280
const CAPTCHA_NORMALIZED_OFFSET = -8

/**
 * 发起验证码的用户上下文
 */
export interface CaptchaUserParam {
  cookies: string
  uname: string
  /** preSign 引用参数：courseId/classId/activePrimaryId/uid(puid) */
  refererParams: CaptchaPhotosParam
}

@Component
export struct CaptchaComponent {
  captchaUser: CaptchaUserParam | null = null
  onValidated?: (validate: string) => void
  onSkip?: () => void
  /** Debug 演示模式：全流程本地模拟，不访问网络、不读写偏好 */
  demoMode: boolean = false
  /** 弹层跨用户复用的会话号：父页面每次 requestCaptcha 自增，@Watch 原地换内容（首次挂载不触发） */
  @Prop @Watch('onCaptchaSessionChanged') captchaSession: number = 0
  @State info: CaptchaPhotosResult = {
    token: '',
    imageVerificationVo: {
      shadeImage: '',
      cutoutImage: ''
    },
    captchaId: '',
    type: '',
    version: '',
    captchaKey: '',
    iv: ''
  }
  @State sliderValue: number = 0
  @State containerWidth: number = 0
  @State isLoading: boolean = false
  @State isChecking: boolean = false
  @State errMsg: string = ''
  /** 自动校验进行中的阶段文案（迷你转圈 + 文字），空串隐藏 */
  @State autoStatus: string = ''
  /** 自动校验结束后的结果文案：成功绿 / 失败红，空串隐藏 */
  @State resultHint: string = ''
  @State resultOk: boolean = false
  /** 换用户切换动画：内容区淡出/淡入 */
  @State contentOpacity: number = 1
  /** 设置页 Beta 开关：启用后拉取验证码时直接用本地模型完成滑块验证 */
  private modelCaptchaEnabled: boolean = false
  /** 模型每次弹出验证码只自动尝试一次，失败后回退手动，避免失败循环 */
  private modelTried: boolean = false
  private readonly sliderMax: number = 280

  async aboutToAppear(): Promise<void> {
    await this.loadModelCaptchaPref()
    this.refresh()
  }

  private delay(ms: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, ms))
  }

  /** 弹层复用换用户：重置一次性状态后按新用户重新拉取；首次挂载走 aboutToAppear，不会触发本回调 */
  onCaptchaSessionChanged() {
    this.modelTried = false
    this.loadModelCaptchaPref().then(() => {
      this.refresh()
    })
  }

  private async loadModelCaptchaPref() {
    try {
      const context = getContext(this) as common.UIAbilityContext
      const pref = await preferences.getPreferences(context, SETTINGS_PREF)
      this.modelCaptchaEnabled = await pref.get(MODEL_CAPTCHA_ENABLED_KEY, false) as boolean
    } catch (e) {
      this.modelCaptchaEnabled = false
    }
  }

  async refresh() {
    if (!this.captchaUser) {
      this.errMsg = '缺少验证码用户信息'
      return
    }
    this.isLoading = true
    this.errMsg = ''
    this.sliderValue = 0
    this.autoStatus = ''
    this.resultHint = ''
    this.resultOk = false
    this.info.token = '' // 立即清空旧图：切换用户/刷新时不闪现上一位的验证码
    this.contentOpacity = 0 // 淡出旧内容
    await this.delay(220)
    try {
      if (this.demoMode) {
        await this.runDemoFlow()
        return
      }
      this.info = await CaptchaApi.getCaptchaPhotos(this.captchaUser.refererParams, this.captchaUser.cookies)
      this.contentOpacity = 1 // 图片就绪即淡入，模型识别期间保持可见
      this.autoStatus = '正在自动校验…'
      const memoryFinished = await this.tryMemoryCheck()
      const useModel = !memoryFinished && this.modelCaptchaEnabled && !this.modelTried
      if (useModel) {
        await this.tryModelCheck()
      } else {
        this.autoStatus = ''
      }
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Load captcha failed: ${(e as Error).message}`)
      this.errMsg = '获取验证码失败，请刷新重试'
    } finally {
      this.isLoading = false
      this.contentOpacity = 1
    }
  }

  /** 记忆 key:背景图 URL 文件名(对齐上游 imageFilename;图片池内固定,同一张图正确 x 恒定) */
  private getImageMemoryKey(): string {
    const url = this.info.imageVerificationVo.shadeImage
    const fileName = url.substring(url.lastIndexOf('/') + 1).split('?')[0]
    const dotIndex = fileName.lastIndexOf('.')
    return dotIndex >= 0 ? fileName.substring(0, dotIndex) : fileName
  }

  /** 本地验证码记忆：命中则自动校验一次（对齐上游 captchaMemories），返回是否已通过 */
  private async tryMemoryCheck(): Promise<boolean> {
    if (!this.captchaUser || !this.info.token) {
      return false
    }
    const memoryKey = this.getImageMemoryKey()
    if (!memoryKey) {
      return false
    }
    try {
      const context = getContext(this) as common.UIAbilityContext
      const pref = await preferences.getPreferences(context, CAPTCHA_MEMORY_PREF)
      const memoryX = await pref.get(memoryKey, -1) as number
      if (memoryX >= 0) {
        const validate = await this.checkPosition(memoryX)
        if (validate) {
          this.finish(validate)
          return true
        }
        await pref.delete(memoryKey)
        await pref.flush()
      }
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Captcha memory check failed: ${(e as Error).message}`)
    }
    return false
  }

  /**
   * Beta：用本地模型识别滑块位置并直接校验（模型输出语义即校验接口的 x，
   * 与上游 captcha.py 一致）。任一环节失败都不刷新、不重试，
   * 保留当前验证码回退为手动拖动，避免失败循环。
   */
  private async tryModelCheck() {
    this.modelTried = true
    let pixelMap: image.PixelMap | undefined = undefined
    try {
      const context = getContext(this) as common.UIAbilityContext
      this.autoStatus = '正在加载本地模型…'
      await MsCaptchaDetector.load(context)
      this.autoStatus = '正在获取验证码图片…'
      const buf = await Http.getBuffer(this.info.imageVerificationVo.shadeImage)
      const source = image.createImageSource(buf)
      let created: image.PixelMap | undefined = undefined
      try {
        created = await source.createPixelMap({ desiredPixelFormat: image.PixelMapFormat.RGBA_8888 })
      } finally {
        source.release()
      }
      if (created === undefined) {
        this.notifyModelFallback()
        return
      }
      pixelMap = created
      this.autoStatus = '模型识别中…'
      const xOffset = await MsCaptchaDetector.detect(created)
      if (xOffset < 0) {
        this.notifyModelFallback()
        return
      }
      this.autoStatus = `识别位置 x=${xOffset}，正在提交校验…`
      const validate = await this.checkPosition(xOffset)
      if (validate) {
        await this.saveMemory(xOffset)
        this.finish(validate)
      } else {
        this.notifyModelFallback()
      }
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Model captcha check failed: ${(e as Error).message}`)
      this.notifyModelFallback()
    } finally {
      pixelMap?.release()
    }
  }

  private notifyModelFallback() {
    // 失败提示直接展示在弹窗内（红色文案），替代原先的 toast
    this.autoStatus = ''
    this.resultHint = '模型自动验证失败，请手动完成验证'
    this.resultOk = false
  }

  /** Debug 演示：本地模拟自动校验全流程；captchaSession 奇数轮演示成功、偶数轮演示失败回退 */
  private async runDemoFlow() {
    await this.delay(500) // 模拟拉取验证码
    this.info = {
      token: 'demo-token',
      imageVerificationVo: {
        shadeImage: '',
        cutoutImage: ''
      },
      captchaId: 'demo',
      type: 'demo',
      version: 'demo',
      captchaKey: 'demo',
      iv: 'demo'
    }
    this.contentOpacity = 1
    this.autoStatus = '正在自动校验…'
    await this.delay(600)
    this.autoStatus = '正在加载本地模型…'
    await this.delay(700)
    this.autoStatus = '模型识别中…'
    await this.delay(900)
    if (this.captchaSession % 2 === 1) {
      this.autoStatus = `识别位置 x=${180 + (this.captchaSession * 37) % 60}，正在提交校验…`
      await this.delay(700)
      this.finish('demo-validate')
    } else {
      this.notifyModelFallback()
    }
  }

  private async checkPosition(normalizedX: number): Promise<string | null> {
    if (!this.captchaUser) {
      return null
    }
    this.isChecking = true
    try {
      return await CaptchaApi.checkCaptchaResult(this.info, normalizedX, this.captchaUser.refererParams,
        this.captchaUser.cookies)
    } finally {
      this.isChecking = false
    }
  }

  private async saveMemory(normalizedX: number) {
    try {
      const context = getContext(this) as common.UIAbilityContext
      const pref = await preferences.getPreferences(context, CAPTCHA_MEMORY_PREF)
      const memoryKey = this.getImageMemoryKey()
      if (!memoryKey) {
        return
      }
      await pref.put(memoryKey, normalizedX)
      await pref.flush()
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Save captcha memory failed: ${(e as Error).message}`)
    }
  }

  private finish(validate: string) {
    this.autoStatus = ''
    this.resultHint = '校验通过，正在继续签到…'
    this.resultOk = true
    this.onValidated?.(validate)
  }

  private skip() {
    this.onSkip?.()
  }

  private async onSliderEnd(value: number) {
    if (this.demoMode) {
      this.autoStatus = '正在提交校验…'
      await this.delay(700)
      this.finish('demo-validate')
      return
    }
    const normalizedX = Math.round(value / this.sliderMax * CAPTCHA_NORMALIZED_MAX + CAPTCHA_NORMALIZED_OFFSET)
    const validate = await this.checkPosition(normalizedX)
    if (validate) {
      await this.saveMemory(normalizedX)
      this.finish(validate)
    } else {
      promptAction.showToast({ message: '验证码校验失败，请重试', duration: 1500 })
      // 对齐上游:校验失败后换新图(token 可能已失效,同一张图重试意义有限)
      await this.refresh()
    }
  }

  build() {
    Column() {
      Text(this.captchaUser ? `为 ${this.captchaUser.uname} 完成验证` : '验证码')
        .fontSize(16)
        .fontWeight(FontWeight.Medium)
        .fontColor($r('sys.color.ohos_id_color_text_primary'))
        .margin({ bottom: 12 })

      if (this.isLoading && !this.info.token) {
        Column() {
          LoadingProgress()
            .width(48)
            .height(48)
        }
        .width('100%')
        .aspectRatio(2)
        .justifyContent(FlexAlign.Center)
      } else if (this.errMsg) {
        Column() {
          Text(this.errMsg)
            .fontSize(14)
            .fontColor($r('sys.color.ohos_id_color_warning'))
        }
        .width('100%')
        .aspectRatio(2)
        .justifyContent(FlexAlign.Center)
      } else {
        Stack({ alignContent: Alignment.Start }) {
          Image(this.demoMode ? $r('app.media.captcha_demo_shade') : this.info.imageVerificationVo.shadeImage) .draggable(false)
            .width('100%')
            .height('100%')
            .objectFit(ImageFit.Fill)
          Image(this.demoMode ? $r('app.media.captcha_demo_cutout') : this.info.imageVerificationVo.cutoutImage) .draggable(false)
            .position({
              x: this.sliderValue / this.sliderMax * (this.containerWidth - 56)
            })
            .height('100%')
            .aspectRatio(0.35)
            .objectFit(ImageFit.Fill)
        }
        .width('100%')
        .aspectRatio(2)
        .onAreaChange((_oldValue: Area, newValue: Area) => {
          this.containerWidth = newValue.width as number
        })
      }

      // 自动校验状态行：进行中 = 迷你转圈 + 阶段文案；结束后 = 成功绿/失败红
      if (this.autoStatus !== '') {
        Row({ space: 8 }) {
          LoadingProgress()
            .width(18)
            .height(18)
            .color($r('sys.color.ohos_id_color_emphasize'))
          Text(this.autoStatus)
            .fontSize(13)
            .fontColor($r('app.color.captcha_status_text'))
        }
        .width('100%')
        .justifyContent(FlexAlign.Center)
        .margin({ top: 10 })
        .transition(TransitionEffect.OPACITY.combine(TransitionEffect.translate({ y: 8 }))
          .animation({ duration: 200, curve: Curve.EaseOut }))
      } else if (this.resultHint !== '') {
        Text(this.resultHint)
          .fontSize(13)
          .fontColor(this.resultOk ? $r('app.color.signed') : $r('app.color.unsignable'))
          .width('100%')
          .textAlign(TextAlign.Center)
          .margin({ top: 10 })
          .transition(TransitionEffect.OPACITY.combine(TransitionEffect.translate({ y: 8 }))
            .animation({ duration: 200, curve: Curve.EaseOut }))
      }

      Slider({ value: $$this.sliderValue, max: this.sliderMax })
        .blockColor($r('sys.color.ohos_id_color_emphasize'))
        .trackColor($r('sys.color.comp_divider'))
        .selectedColor($r('sys.color.ohos_id_color_emphasize'))
        .enabled(!this.isLoading && !this.errMsg && !this.isChecking)
        .onChange((value: number, mode: SliderChangeMode) => {
          if (mode === SliderChangeMode.End) {
            this.onSliderEnd(value)
          }
        })

      Row({ space: 12 }) {
        Button('刷新')
          .layoutWeight(1)
          .fontSize(14)
          .backgroundColor($r('sys.color.ohos_id_color_button_normal'))
          .fontColor($r('sys.color.ohos_id_color_text_primary'))
          .enabled(!this.isLoading && !this.isChecking)
          .onClick(() => {
            this.refresh()
          })
        Button('跳过该用户')
          .layoutWeight(1)
          .fontSize(14)
          .backgroundColor($r('sys.color.ohos_id_color_warning'))
          .fontColor($r('sys.color.ohos_id_color_text_primary'))
          .enabled(!this.isChecking)
          .onClick(() => {
            this.skip()
          })
      }
      .width('100%')
      .margin({ top: 16 })
    }
    .width('100%')
    .padding({ left: 16, right: 16, top: 16, bottom: 24 })
    .opacity(this.contentOpacity)
    .animation({ duration: 220, curve: Curve.EaseInOut })
  }
}
