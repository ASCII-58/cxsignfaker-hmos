/**
 * 克隆登录会话横幅：课程 Tab 与签到活动列表共用
 * 克隆状态读 AppStorage（cloneSessionName / cloneSessionPhone），
 * 传入 onExit 时显示"退出克隆"胶囊按钮（活动列表页为只读展示）
 */
@Component
export struct CloneSessionBanner {
  @StorageProp('cloneSessionName') cloneSessionName: string = ''
  @StorageProp('cloneSessionPhone') cloneSessionPhone: string = ''
  onExit?: () => void

  build() {
    Row() {
      Column() {
        Image($r('app.media.person_2')) .draggable(false)
          .width(20).height(20)
          .fillColor($r('app.color.selected'))
      }
      .width(40).height(40).borderRadius(13)
      .justifyContent(FlexAlign.Center)
      .backgroundColor($r('app.color.clone_banner_icon_bg'))

      Column() {
        Text('克隆登录中')
          .fontSize(11)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('app.color.selected'))
        Text(this.cloneSessionName)
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('app.color.primary_text'))
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
      .margin({ left: 10 })

      if (this.onExit) {
        Text('退出克隆')
          .fontSize(13)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('app.color.selected'))
          .padding({ left: 14, right: 14, top: 7, bottom: 7 })
          .backgroundColor($r('app.color.clone_banner_icon_bg'))
          .borderRadius(999)
          .onClick(() => {
            if (this.onExit) {
              this.onExit()
            }
          })
      }
    }
    .width('100%')
    .padding({ left: 12, right: 10, top: 10, bottom: 10 })
    .backgroundColor($r('app.color.clone_banner_bg'))
    .border({ width: 1, color: $r('app.color.clone_banner_border') })
    .borderRadius(16)
  }
}
