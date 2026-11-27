import { LatestRelease } from '../utils/updateChecker';

/** 更新提示弹窗：仅在有新版本时打开，按钮为取消 + 复制下载链接/打开链接 */
@CustomDialog
export struct UpdateDialog {
  controller?: CustomDialogController
  release?: LatestRelease
  openLink: boolean = false
  onAction?: () => void

  build() {
    Column() {
      Text('发现新版本')
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .fontColor($r('app.color.primary_text'))
        .width('100%')

      Text(`v${this.release?.version ?? ''} 已发布，是否获取安装包？`)
        .fontSize(14)
        .fontColor($r('app.color.secondary_text'))
        .width('100%')
        .margin({ top: 10 })

      Row({ space: 12 }) {
        Button('取消')
          .layoutWeight(1)
          .height(44)
          .borderRadius(22)
          .backgroundColor($r('app.color.text_field_bg'))
          .fontColor($r('app.color.primary_text'))
          .onClick(() => { this.controller?.close() })

        Button(this.openLink ? '打开下载链接' : '复制下载链接')
          .layoutWeight(1)
          .height(44)
          .borderRadius(22)
          .backgroundColor($r('app.color.class_button'))
          .fontColor($r('app.color.text_on_primary'))
          .onClick(() => {
            this.onAction?.()
            this.controller?.close()
          })
      }
      .width('100%')
      .margin({ top: 20 })
    }
    .width('88%')
    .padding(20)
    .backgroundColor($r('app.color.dialog'))
    .borderRadius(24)
    .alignItems(HorizontalAlign.Start)
  }
}
