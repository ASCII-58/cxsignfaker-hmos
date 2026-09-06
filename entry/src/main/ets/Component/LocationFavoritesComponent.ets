import { FunctionalButton, functionalButtonComponentManager } from '@kit.ScenarioFusionKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { promptAction } from '@kit.ArkUI';
import { DatabaseManager, SavedLocation } from '../utils/DataBase';
import { ChaoxingUtils } from '../utils/utils';
import { staticMap } from '@kit.MapKit';
const TAG = 'LocationFavorites';
const DOMAIN = 0x0008;

@Component
export struct LocationFavoritesComponent {
  @State locations: SavedLocation[] = []
  @State formVisible: boolean = false
  /** 正在编辑的位置 id；-1 表示新增 */
  @State editingId: number = -1
  @State noteInput: string = ''
  @State pickedLat: string = ''
  @State pickedLon: string = ''
  @State pickedAddress: string = ''
  private dbManager: DatabaseManager = DatabaseManager.getInstance()

  async loadLocations() {
    try {
      this.locations = await this.dbManager.getAllSavedLocations()
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Failed to load saved locations: ${e.message}`);
      promptAction.showToast({ message: '加载收藏位置失败' })
    }
  }

  resetForm() {
    this.editingId = -1
    this.noteInput = ''
    this.pickedLat = ''
    this.pickedLon = ''
    this.pickedAddress = ''
  }

  openAddForm() {
    this.resetForm()
    this.formVisible = true
  }

  openEditForm(loc: SavedLocation) {
    this.editingId = loc.id
    this.noteInput = loc.note
    this.pickedLat = loc.latitude
    this.pickedLon = loc.longitude
    this.pickedAddress = loc.address
    this.formVisible = true
  }

  async saveLocation() {
    if (!this.pickedLat || !this.pickedLon) {
      promptAction.showToast({ message: '请先通过地图选择位置' })
      return
    }
    const note = this.noteInput.trim()
    try {
      let result: number
      if (this.editingId === -1) {
        result = await this.dbManager.insertSavedLocation({
          note: note,
          latitude: this.pickedLat,
          longitude: this.pickedLon,
          address: this.pickedAddress
        })
      } else {
        result = await this.dbManager.updateSavedLocation(this.editingId, {
          note: note,
          latitude: this.pickedLat,
          longitude: this.pickedLon,
          address: this.pickedAddress
        })
      }
      if (result !== 1) {
        promptAction.showToast({ message: '保存失败' })
        return
      }
      promptAction.showToast({ message: '已保存' })
      this.formVisible = false
      await this.loadLocations()
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Failed to save location: ${e.message}`);
      promptAction.showToast({ message: '保存失败' })
    }
  }

  confirmDelete(loc: SavedLocation) {
    AlertDialog.show({
      title: '删除收藏位置',
      message: `确定删除「${this.locationTitle(loc)}」吗？`,
      primaryButton: {
        value: '取消',
        action: () => {
        }
      },
      secondaryButton: {
        value: '删除',
        action: () => {
          this.deleteLocation(loc.id)
        }
      }
    })
  }

  async deleteLocation(id: number) {
    try {
      const result = await this.dbManager.deleteSavedLocation(id)
      promptAction.showToast({ message: result === 1 ? '已删除' : '删除失败' })
      if (result === 1) {
        await this.loadLocations()
      }
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Failed to delete location: ${e.message}`);
      promptAction.showToast({ message: '删除失败' })
    }
  }

  locationTitle(loc: SavedLocation): string {
    return loc.note !== '' ? loc.note : loc.address
  }

  @Builder
  EditForm() {
    Column({ space: 12 }) {
      TextInput({ placeholder: '位置备注（如：第一教学楼），可留空', text: $$this.noteInput })
        .height(44)
        .borderRadius(10)
        .backgroundColor($r('app.color.text_field_bg'))
        .maxLength(30)

      Column() {
        FunctionalButton({
          params: {
            openType: functionalButtonComponentManager.OpenType.CHOOSE_LOCATION,
            label: this.pickedLat ? '重新地图选点' : '打开地图选点',
            styleOption: {
              bgColor: functionalButtonComponentManager.ColorType.DEFAULT,
              size: functionalButtonComponentManager.SizeType.DEFAULT,
              plain: false,
              disabled: false,
              loading: false,
              hoverClass: functionalButtonComponentManager.HoverClassType.HOVER_CLASS,
              hoverStartTime: 0,
              hoverStayTime: 0,
              styleConfig: new functionalButtonComponentManager.ButtonConfig().fontSize(15)
            },
          },
          controller: new functionalButtonComponentManager.FunctionalButtonController()
            .onChooseLocation((err, data) => {
              if (err) {
                hilog.error(DOMAIN, TAG, `Location Error: ${err.message}`);
                return;
              }
              const LoginLocation = ChaoxingUtils.gcj02_to_bd09(data.latitude, data.longitude)
              this.pickedLat = LoginLocation.lat.toString()
              this.pickedLon = LoginLocation.lon.toString()
              this.pickedAddress = data.name as string
            })
        })
      }
      .width('100%')

      if (this.pickedLat) {
        Column() {
          Text(`已选: ${this.pickedAddress}`)
            .fontSize(13).fontColor($r('app.color.primary_text'))
          Text(`经度 ${this.pickedLon.substring(0, 10)}  纬度 ${this.pickedLat.substring(0, 10)}`)
            .fontSize(11).fontColor($r('app.color.secondary_text')).margin({ top: 2 })
        }.alignItems(HorizontalAlign.Start).width('100%')
      } else {
        Text('尚未选择位置')
          .fontSize(13).fontColor($r('app.color.text_placeholder'))
          .width('100%')
      }

      Row({ space: 12 }) {
        Button('取消')
          .layoutWeight(1)
          .height(40)
          .borderRadius(20)
          .fontSize(15)
          .backgroundColor($r('sys.color.ohos_id_color_button_normal'))
          .fontColor($r('app.color.secondary_text'))
          .onClick(() => {
            this.formVisible = false
          })
        Button('保存')
          .layoutWeight(1)
          .height(40)
          .borderRadius(20)
          .fontSize(15)
          .backgroundColor($r('app.color.class_button'))
          .fontColor($r('app.color.text_on_primary'))
          .onClick(() => {
            this.saveLocation()
          })
      }
      .width('100%')
      .margin({ top: 4 })
    }
    .width('100%')
    .padding({ left: 20, right: 20, bottom: 20 })
  }

  build() {
    Column() {
      // 半屏弹层拖拽指示条
      Column()
        .width(36).height(4).borderRadius(2)
        .margin({ top: 10 })

      Row() {
        Text('收藏的位置')
          .fontSize(24).fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.primary_text'))
          .layoutWeight(1)
        if (!this.formVisible) {
          Button('添加')
            .fontSize(13).height(32)
            .borderRadius(16)
            .backgroundColor($r('app.color.class_button'))
            .fontColor($r('app.color.text_on_primary'))
            .onClick(() => {
              this.openAddForm()
            })
        }
      }
      .width('100%')
      .padding({ left: 20, right: 20, top: 12, bottom: 12 })

      if (this.formVisible) {
        this.EditForm()
      } else {
        if (this.locations.length === 0) {
          Column() {
            Text('暂无收藏位置')
              .fontSize(16).fontColor($r('app.color.secondary_text'))
            Text('点击右上角「添加」保存常用的签到地点')
              .fontSize(13).fontColor($r('app.color.text_placeholder'))
              .margin({ top: 8 })
          }
          .width('100%')
          .margin({ top: 60, bottom: 60 })
        } else {
          List({ space: 8 }) {
            ForEach(this.locations, (loc: SavedLocation) => {
              ListItem() {
                Row() {
                  Column() {
                    Text(this.locationTitle(loc))
                      .fontSize(16).fontWeight(FontWeight.Medium)
                      .fontColor($r('app.color.primary_text'))
                      .maxLines(1)
                      .textOverflow({ overflow: TextOverflow.Ellipsis })
                    Text(loc.address)
                      .fontSize(12).fontColor($r('app.color.secondary_text'))
                      .maxLines(2)
                      .textOverflow({ overflow: TextOverflow.Ellipsis })
                      .margin({ top: 3 })
                    Text(`经度 ${loc.longitude.substring(0, 10)}  纬度 ${loc.latitude.substring(0, 10)}`)
                      .fontSize(11).fontColor($r('app.color.icon'))
                      .margin({ top: 3 })
                  }
                  .alignItems(HorizontalAlign.Start)
                  .layoutWeight(1)

                  Button('编辑')
                    .fontSize(13).height(28).borderRadius(14)
                    .backgroundColor($r('app.color.text_field_bg'))
                    .fontColor($r('app.color.selected'))
                    .margin({ right: 8 })
                    .onClick(() => {
                      this.openEditForm(loc)
                    })
                  Button('删除')
                    .fontSize(13).height(28).borderRadius(14)
                    .backgroundColor($r('app.color.text_field_bg'))
                    .fontColor($r('app.color.unsignable'))
                    .onClick(() => {
                      this.confirmDelete(loc)
                    })
                }
                .width('100%')
                .padding(12)
                .backgroundColor($r('app.color.card_background'))
                .borderRadius(12)
              }
            }, (loc: SavedLocation) => loc.id.toString())
          }
          .width('100%')
          .layoutWeight(1)
          .padding({ left: 16, right: 16 })
          .scrollBar(BarState.Off)
        }
      }
    }
    .width('100%').height('100%')
    .backgroundColor($r('sys.color.ohos_id_color_sub_background'))
    .borderRadius({ topLeft: 20, topRight: 20 })
    .onAppear(() => {
      this.loadLocations()
    })
  }
}
