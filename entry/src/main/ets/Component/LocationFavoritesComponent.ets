import { hilog } from '@kit.PerformanceAnalysisKit';
import { promptAction } from '@kit.ArkUI';
import { geoLocationManager } from '@kit.LocationKit';
import { abilityAccessCtrl, common, Permissions } from '@kit.AbilityKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { map, mapCommon, MapComponent } from '@kit.MapKit';
import { DatabaseManager, SavedLocation } from '../utils/DataBase';
import { ChaoxingUtils } from '../utils/utils';

const TAG = 'LocationFavorites';
const DOMAIN = 0x0008;

/** 地图初始中心（定位不可用时的默认视野） */
const DEFAULT_CENTER: mapCommon.LatLng = { latitude: 39.90923, longitude: 116.39743 };
/** 地图下方选点卡片的预留高度，保证地图视口不随选点状态变化跳动 */
const SELECTION_CARD_HEIGHT = 200;

/**
 * 收藏位置管理 sheet 内容，参考上游 Android 版（百度地图星标方案）的地图优先交互：
 * - 打开时自动定位到当前位置，所有收藏以定位针标记直接铺在地图上
 * - 点击空白地图 / POI 放置或移动红色选点针（可拖动），自动逆地理编码取地址
 * - 点击收藏针 = 选中该收藏（选点针移过去并填充备注），保存即修改
 * - 右下角纯图标按钮：管理收藏（弹出列表 sheet）、定位当前位置
 * 数据库存签到用的 BD-09 坐标（×1e6 整数）；MapKit（高德底图）为 GCJ-02，进出库时转换
 */
@Component
export struct LocationFavoritesComponent {
  /** 关闭收藏位置 sheet（由宿主页面控制 bindSheet 显隐） */
  onClose?: () => void
  @State locations: SavedLocation[] = []
  /** 正在编辑的位置 id；-1 表示新增 */
  @State editingId: number = -1
  @State noteInput: string = ''
  /** 当前选点坐标（GCJ-02，与地图一致） */
  @State gcjLat: number = DEFAULT_CENTER.latitude
  @State gcjLon: number = DEFAULT_CENTER.longitude
  @State hasPicked: boolean = false
  @State pickedAddress: string = ''
  @State gpsLocating: boolean = false
  @State manageVisible: boolean = false
  private dbManager: DatabaseManager = DatabaseManager.getInstance()
  private mapController: map.MapComponentController | undefined = undefined
  /** 选点标记（红色定位针，可拖动） */
  private marker: map.Marker | undefined = undefined
  /** 收藏针（琥珀色，不可拖动，tag 存位置 id） */
  private favoriteMarkers: map.Marker[] = []
  private geocodeTimer: number = -1
  private geocodeSeq: number = 0
  private mapOptions: mapCommon.MapOptions = {
    position: {
      target: { latitude: DEFAULT_CENTER.latitude, longitude: DEFAULT_CENTER.longitude },
      zoom: 11
    },
    zoomControlsEnabled: false,
    scaleControlsEnabled: false,
    language: 'zh'
  }

  // ---------- 数据 ----------

  async loadLocations() {
    try {
      this.locations = await this.dbManager.getAllSavedLocations()
      this.renderFavoriteMarkers()
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Failed to load saved locations: ${e.message}`);
      promptAction.showToast({ message: '加载收藏位置失败' })
    }
  }

  currentLocation(): SavedLocation | undefined {
    return this.locations.find((loc: SavedLocation) => loc.id === this.editingId)
  }

  locationTitle(loc: SavedLocation): string {
    return loc.note !== '' ? loc.note : loc.address
  }

  /** 当前选点对应的 BD-09 坐标（签到提交用） */
  bd09Display(): string {
    const bd = ChaoxingUtils.gcj02_to_bd09(this.gcjLat, this.gcjLon)
    return `经度 ${bd.lon.toFixed(6)}  纬度 ${bd.lat.toFixed(6)}`
  }

  // ---------- 地图 ----------

  private onMapCreated = (err: BusinessError<void>, controller: map.MapComponentController) => {
    if (err) {
      hilog.error(DOMAIN, TAG, `Map create failed: ${err.message}`);
      promptAction.showToast({ message: '地图初始化失败' })
      return
    }
    // 地图组件随 sheet 重建，旧实例上的标记引用一并失效
    this.marker = undefined
    this.favoriteMarkers = []
    this.mapController = controller
    controller.on('mapClick', (point: mapCommon.LatLng) => {
      this.pickPosition(point.latitude, point.longitude, false, '')
    })
    controller.on('poiClick', (poi: mapCommon.Poi) => {
      this.pickPosition(poi.position.latitude, poi.position.longitude, false, poi.name)
    })
    controller.on('markerClick', (clicked: map.Marker) => {
      const id = clicked.getTag() as number
      const loc = this.locations.find((l: SavedLocation) => l.id === id)
      if (loc) {
        this.selectFavorite(loc)
      }
    })
    controller.on('markerDragEnd', (dragged: map.Marker) => {
      const pos = dragged.getPosition()
      this.pickPosition(pos.latitude, pos.longitude, false, '')
    })
    this.renderFavoriteMarkers()
    if (this.hasPicked) {
      this.applySelectionToMap()
    } else {
      // 打开即定位到当前位置
      this.locateCurrent()
    }
  }

  /** 把收藏位置画成琥珀色定位针；任何收藏数据变化后重画 */
  private renderFavoriteMarkers() {
    const controller = this.mapController
    if (!controller) {
      return
    }
    for (const old of this.favoriteMarkers) {
      old.remove()
    }
    this.favoriteMarkers = []
    for (const loc of this.locations) {
      const gcj = ChaoxingUtils.bd09_to_gcj02(
        ChaoxingUtils.parseStoredCoord(loc.latitude),
        ChaoxingUtils.parseStoredCoord(loc.longitude))
      controller.addMarker({
        position: { latitude: gcj.lat, longitude: gcj.lon },
        icon: $r('app.media.map_pin'),
        anchorU: 0.5,
        anchorV: 1,
        draggable: false,
        title: this.locationTitle(loc)
      }).then((m: map.Marker) => {
        m.setTag(loc.id)
        this.favoriteMarkers.push(m)
      }).catch((e: BusinessError<void>) => {
        hilog.error(DOMAIN, TAG, `Add favorite marker failed: ${e.message}`);
      })
    }
  }

  /** 按当前选点状态同步选点针与镜头 */
  private applySelectionToMap() {
    if (!this.hasPicked) {
      return
    }
    this.ensureSelectionPin()
    if (this.mapController) {
      this.mapController.moveCamera(map.newLatLng({ latitude: this.gcjLat, longitude: this.gcjLon }, 16))
    }
  }

  /** 选点针（红色定位针），始终可拖动 */
  private async ensureSelectionPin() {
    const controller = this.mapController
    if (!controller) {
      return
    }
    if (!this.marker) {
      try {
        this.marker = await controller.addMarker({
          position: { latitude: this.gcjLat, longitude: this.gcjLon },
          icon: $r('app.media.map_pin_select'),
          anchorU: 0.5,
          anchorV: 1,
          draggable: true,
          title: '选点'
        })
      } catch (e) {
        hilog.error(DOMAIN, TAG, `Add selection marker failed: ${e.message}`);
      }
      return
    }
    this.marker.setPosition({ latitude: this.gcjLat, longitude: this.gcjLon })
  }

  /** 选点统一入口：地图点按、POI 点按、拖动针、定位按钮；addressOverride 非空时直接作为地址 */
  private pickPosition(lat: number, lon: number, flyTo: boolean, addressOverride: string) {
    this.gcjLat = lat
    this.gcjLon = lon
    this.hasPicked = true
    this.ensureSelectionPin()
    if (flyTo && this.mapController) {
      this.mapController.animateCamera(map.newLatLng({ latitude: lat, longitude: lon }, 16), 400)
    }
    if (addressOverride !== '') {
      this.pickedAddress = addressOverride
    } else {
      this.scheduleGeocode()
    }
  }

  /** 点击收藏针 = 选中该收藏（选点针移过去并填充备注，保存即修改） */
  private selectFavorite(loc: SavedLocation) {
    this.editingId = loc.id
    this.noteInput = loc.note
    this.pickedAddress = loc.address
    const gcj = ChaoxingUtils.bd09_to_gcj02(
      ChaoxingUtils.parseStoredCoord(loc.latitude),
      ChaoxingUtils.parseStoredCoord(loc.longitude))
    this.pickPosition(gcj.lat, gcj.lon, true, loc.address)
  }

  private async locateCurrent() {
    try {
      const atManager = abilityAccessCtrl.createAtManager()
      const permissions: Array<Permissions> =
        ['ohos.permission.APPROXIMATELY_LOCATION', 'ohos.permission.LOCATION']
      const context = getContext(this) as common.UIAbilityContext
      const result = await atManager.requestPermissionsFromUser(context, permissions)
      if (!result.authResults.every((r: number) => r === 0)) {
        promptAction.showToast({ message: '未获得定位权限，请在系统设置中开启', duration: 1500 })
        return
      }
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Request location permission failed: ${e.message}`);
      promptAction.showToast({ message: '定位权限请求失败' })
      return
    }
    this.gpsLocating = true
    try {
      const location = await geoLocationManager.getCurrentLocation()
      const gcj = ChaoxingUtils.wgs84_to_gcj02(location.latitude, location.longitude)
      this.pickPosition(gcj.lat, gcj.lon, true, '')
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Get current location failed: ${e.message}`);
      promptAction.showToast({ message: '定位失败，请检查定位服务' })
    } finally {
      this.gpsLocating = false
    }
  }

  // ---------- 逆地理编码 ----------

  private scheduleGeocode() {
    if (this.geocodeTimer >= 0) {
      clearTimeout(this.geocodeTimer)
    }
    this.geocodeSeq++
    const seq = this.geocodeSeq
    this.geocodeTimer = setTimeout(() => {
      this.geocodeTimer = -1
      this.reverseGeocode(seq)
    }, 500)
  }

  /** 选点后取地址；getAddressesFromLocation 中国境内按 GCJ-02 请求 */
  private async reverseGeocode(seq: number) {
    try {
      const addresses = await geoLocationManager.getAddressesFromLocation({
        latitude: this.gcjLat,
        longitude: this.gcjLon,
        maxItems: 1
      })
      if (seq !== this.geocodeSeq) {
        return
      }
      if (addresses.length > 0 && addresses[0].placeName) {
        this.pickedAddress = addresses[0].placeName
      } else {
        this.pickedAddress = `${this.gcjLat.toFixed(6)}, ${this.gcjLon.toFixed(6)}`
      }
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Reverse geocode failed: ${e.message}`);
      if (seq !== this.geocodeSeq) {
        return
      }
      this.pickedAddress = `${this.gcjLat.toFixed(6)}, ${this.gcjLon.toFixed(6)}`
    }
  }

  // ---------- 增删改 ----------

  clearSelection() {
    this.editingId = -1
    this.noteInput = ''
    this.hasPicked = false
    this.pickedAddress = ''
  }

  async saveLocation() {
    if (!this.hasPicked) {
      promptAction.showToast({ message: '请先在地图上点选位置' })
      return
    }
    const note = this.noteInput.trim()
    // 以针尖最终停留位置为准（拖动后状态可能未同步）
    let lat = this.gcjLat
    let lon = this.gcjLon
    if (this.marker) {
      const pos = this.marker.getPosition()
      lat = pos.latitude
      lon = pos.longitude
    }
    const bd = ChaoxingUtils.gcj02_to_bd09(lat, lon)
    const latitude = ChaoxingUtils.toLocationInt(bd.lat).toString()
    const longitude = ChaoxingUtils.toLocationInt(bd.lon).toString()
    const address = this.pickedAddress
    try {
      let result: number
      if (this.editingId === -1) {
        result = await this.dbManager.insertSavedLocation({ note, latitude, longitude, address })
      } else {
        result = await this.dbManager.updateSavedLocation(this.editingId, { note, latitude, longitude, address })
      }
      if (result !== 1) {
        promptAction.showToast({ message: '保存失败' })
        return
      }
      promptAction.showToast({ message: '已保存' })
      this.clearSelection()
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
        if (this.editingId === id) {
          this.clearSelection()
        }
        await this.loadLocations()
      }
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Failed to delete location: ${e.message}`);
      promptAction.showToast({ message: '删除失败' })
    }
  }

  // ---------- UI ----------

  @Builder
  MapPanel() {
    Stack({ alignContent: Alignment.TopStart }) {
      MapComponent({
        mapOptions: this.mapOptions,
        mapCallback: this.onMapCreated
      })
        .width('100%')
        .height('100%')

      // 悬浮层：顶部提示 + 右下角图标按钮（容器不拦截地图手势，仅按钮可点）
      Column() {
        Row() {
          Text(this.hasPicked ? this.pickedAddress : '点按地图选点，点按定位针选中收藏')
            .fontSize(12)
            .fontColor($r('app.color.primary_text'))
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .constraintSize({ maxWidth: '70%' })
            .padding({ left: 10, right: 10, top: 5, bottom: 5 })
            .borderRadius(12)
            .backgroundColor($r('app.color.text_field_bg'))
            .opacity(this.hasPicked && this.pickedAddress === '' ? 0 : 1)
        }
        .width('100%')
        .justifyContent(FlexAlign.End)
        .padding({ right: 12, top: 10 })

        Blank()

        Column({ space: 10 }) {
          Button() {
            Image($r('app.media.ic_map_manage'))
              .width(22).height(22)
              .fillColor($r('app.color.primary_text'))
          }
          .type(ButtonType.Circle)
          .width(42).height(42)
          .backgroundColor($r('app.color.card_background'))
          .shadow({ radius: 6, color: 'rgba(0,0,0,0.2)', offsetY: 2 })
          .onClick(() => {
            this.manageVisible = true
          })

          Button() {
            Image($r('app.media.ic_map_locate'))
              .width(22).height(22)
              .fillColor($r('app.color.primary_text'))
          }
          .type(ButtonType.Circle)
          .width(42).height(42)
          .backgroundColor($r('app.color.card_background'))
          .shadow({ radius: 6, color: 'rgba(0,0,0,0.2)', offsetY: 2 })
          .enabled(!this.gpsLocating)
          .opacity(this.gpsLocating ? 0.5 : 1)
          .onClick(() => {
            this.locateCurrent()
          })
        }
        .padding({ right: 12, bottom: 12 })
      }
      .width('100%')
      .height('100%')
      .alignItems(HorizontalAlign.End)
      .hitTestBehavior(HitTestMode.None)
    }
    .width('100%')
    .layoutWeight(1)
  }

  /** 底部选点卡（固定预留高度）：新增/编辑共用 */
  @Builder
  SelectionCard() {
    Column() {
      if (this.hasPicked) {
        Column({ space: 10 }) {
          Column() {
            Text(`已选: ${this.pickedAddress}`)
              .fontSize(13).fontColor($r('app.color.primary_text'))
              .maxLines(2)
              .textOverflow({ overflow: TextOverflow.Ellipsis })
            Text(this.bd09Display())
              .fontSize(11).fontColor($r('app.color.secondary_text')).margin({ top: 2 })
          }
          .alignItems(HorizontalAlign.Start)
          .width('100%')

          TextInput({ placeholder: '位置备注（如：第一教学楼），可留空', text: $$this.noteInput })
            .height(44)
            .borderRadius(10)
            .backgroundColor($r('app.color.text_field_bg'))
            .maxLength(30)

          Row({ space: 12 }) {
            Button('清空')
              .layoutWeight(1)
              .height(40)
              .borderRadius(20)
              .fontSize(15)
              .backgroundColor($r('app.color.text_field_bg'))
              .fontColor($r('app.color.secondary_text'))
              .onClick(() => {
                this.clearSelection()
              })
            Button(this.editingId === -1 ? '收藏此位置' : '保存修改')
              .layoutWeight(2)
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
        }
        .width('100%')
      } else {
        Column() {
          Text('在地图上点按选点')
            .fontSize(14).fontColor($r('app.color.secondary_text'))
          Text('选好位置后可填写备注收藏；已收藏的地点会以定位针固定在地图上')
            .fontSize(12).fontColor($r('app.color.text_placeholder'))
            .margin({ top: 6 })
            .textAlign(TextAlign.Center)
        }
        .width('100%')
        .height('100%')
        .justifyContent(FlexAlign.Center)
      }
    }
    .width('100%')
    .height(SELECTION_CARD_HEIGHT)
    .padding({ left: 20, right: 20, top: 10, bottom: 12 })
    .alignItems(HorizontalAlign.Start)
  }

  /** 管理收藏列表（独立半屏 sheet） */
  @Builder
  ManageSheet() {
    Column() {
      Column()
        .width(36).height(4).borderRadius(2)
        .margin({ top: 10 })

      Row() {
        Text('已收藏的位置')
          .fontSize(18).fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.primary_text'))
        Blank()
        Text(`${this.locations.length} 个`)
          .fontSize(13).fontColor($r('app.color.secondary_text'))
      }
      .width('100%')
      .padding({ left: 20, right: 20, top: 12, bottom: 12 })

      if (this.locations.length === 0) {
        Column() {
          Text('还没有收藏的地点')
            .fontSize(15).fontColor($r('app.color.secondary_text'))
          Text('关闭本页，在地图上点按选点后即可收藏')
            .fontSize(12).fontColor($r('app.color.text_placeholder'))
            .margin({ top: 6 })
        }
        .width('100%')
        .margin({ top: 50 })
      } else {
        List({ space: 8 }) {
          ForEach(this.locations, (loc: SavedLocation) => {
            ListItem() {
              Row() {
                Column() {
                  Text(this.locationTitle(loc))
                    .fontSize(15).fontWeight(FontWeight.Medium)
                    .fontColor($r('app.color.primary_text'))
                    .maxLines(1)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                  Text(loc.address)
                    .fontSize(12).fontColor($r('app.color.secondary_text'))
                    .maxLines(1)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                    .margin({ top: 3 })
                  Text(`经度 ${(ChaoxingUtils.parseStoredCoord(loc.longitude)).toFixed(6)}  纬度 ${(ChaoxingUtils.parseStoredCoord(loc.latitude)).toFixed(6)}`)
                    .fontSize(11).fontColor($r('app.color.icon'))
                    .margin({ top: 3 })
                }
                .alignItems(HorizontalAlign.Start)
                .layoutWeight(1)
                .onClick(() => {
                  this.selectFavorite(loc)
                  this.manageVisible = false
                })

                Button('编辑')
                  .fontSize(13).height(28).borderRadius(14)
                  .backgroundColor($r('app.color.text_field_bg'))
                  .fontColor($r('app.color.selected'))
                  .margin({ right: 8 })
                  .onClick(() => {
                    this.selectFavorite(loc)
                    this.manageVisible = false
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
    .width('100%')
    .height('100%')
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
        Text('✕')
          .fontSize(18)
          .fontColor($r('app.color.secondary_text'))
          .width(32).height(32)
          .textAlign(TextAlign.Center)
          .borderRadius(16)
          .backgroundColor($r('app.color.text_field_bg'))
          .onClick(() => {
            if (this.onClose) {
              this.onClose()
            }
          })
      }
      .width('100%')
      .padding({ left: 20, right: 20, top: 12, bottom: 12 })

      this.MapPanel()

      this.SelectionCard()

      // 管理收藏列表（嵌套半屏 sheet）
    }
    .width('100%').height('100%')
    .backgroundColor($r('sys.color.ohos_id_color_sub_background'))
    .borderRadius({ topLeft: 20, topRight: 20 })
    .bindSheet($$this.manageVisible, this.ManageSheet(), {
      height: 420,
      showClose: false,
      backgroundColor: $r('sys.color.ohos_id_color_sub_background')
    })
    .onAppear(() => {
      this.loadLocations()
    })
  }
}
