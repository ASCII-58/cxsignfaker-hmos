import { hdsEffect } from '@kit.UIDesignKit';

/**
 * 带按压光效的按钮：统一收敛 visualEffect/onTouch 样板
 */
@Component
export struct LightButton {
  @Prop label: string = '';
  @Prop btnEnabled: boolean = true;
  @Prop bgColor: Resource = $r('sys.color.ohos_id_color_button_normal');
  @Prop btnFontSize: number = 14;
  @Prop btnHeight: number = 40;
  onButton: () => void = () => {};
  @State btnLight: hdsEffect.PointLightSourceType = hdsEffect.PointLightSourceType.NONE;
  /** 按压时轻微缩小，与点光一起构成按下手感 */
  @State pressScale: number = 1;

  build() {
    Button(this.label)
      .width('100%')
      .height(this.btnHeight)
      .fontSize(this.btnFontSize)
      .fontColor($r('app.color.text_on_primary'))
      .backgroundColor(this.bgColor)
      .enabled(this.btnEnabled)
      .scale({ x: this.pressScale, y: this.pressScale })
      .visualEffect(new hdsEffect.HdsEffectBuilder()
        .pointLight({
          sourceType: this.btnLight,
          illuminatedType: hdsEffect.PointLightIlluminatedType.BORDER_CONTENT,
          options: {
            color: $r('app.color.light_glow'),
            intensity: 0.9,
            bloom: 0.5
          }
        })
        .pressShadow(hdsEffect.PressShadowType.BLEND_WHITE)
        .buildEffect())
      .onTouch((event: TouchEvent) => {
        if (event.type === TouchType.Down) {
          animateTo({ duration: 120, curve: Curve.EaseOut }, () => {
            this.btnLight = hdsEffect.PointLightSourceType.BRIGHT;
            this.pressScale = 0.96;
          })
        } else if (event.type === TouchType.Up || event.type === TouchType.Cancel) {
          animateTo({ duration: 200, curve: Curve.EaseInOut }, () => {
            this.btnLight = hdsEffect.PointLightSourceType.NONE;
            this.pressScale = 1;
          })
        }
      })
      .onClick(() => {
        this.onButton()
      })
  }
}
