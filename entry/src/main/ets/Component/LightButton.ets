/**
 * 带按压光效的按钮：统一收敛按压反馈样板
 * 光效用 shadow 实现而不用 hdsEffect 点光源：点光源亮度跟随指针、由 HDS 内部管理生命周期，
 * 按住静止时会自行衰减，无法维持长按光效；shadow/scale 完全由按压状态驱动，状态不丢光效就不丢
 */
@Component
export struct LightButton {
  @Prop label: string = '';
  @Prop btnEnabled: boolean = true;
  @Prop bgColor: Resource = $r('sys.color.ohos_id_color_button_normal');
  @Prop btnFontSize: number = 14;
  @Prop btnHeight: number = 40;
  onButton: () => void = () => {};
  @State pressed: boolean = false;

  private setPressed(on: boolean) {
    if (this.pressed === on) {
      return
    }
    animateTo({ duration: on ? 120 : 200, curve: on ? Curve.EaseOut : Curve.EaseInOut }, () => {
      this.pressed = on
    })
  }

  build() {
    Button(this.label)
      .width('100%')
      .height(this.btnHeight)
      .fontSize(this.btnFontSize)
      .fontColor($r('app.color.text_on_primary'))
      .backgroundColor(this.bgColor)
      .enabled(this.btnEnabled)
      .scale({ x: this.pressed ? 0.96 : 1, y: this.pressed ? 0.96 : 1 })
      .shadow({
        radius: this.pressed ? 16 : 0,
        color: this.pressed ? $r('app.color.press_halo') : Color.Transparent,
        offsetY: 0
      })
      .onTouch((event: TouchEvent) => {
        // Down/Move 都重申按压态（幂等）：手指微动产生 Move 时不会丢状态
        this.setPressed(event.type === TouchType.Down || event.type === TouchType.Move)
      })
      .onClick(() => {
        this.onButton()
      })
  }
}
