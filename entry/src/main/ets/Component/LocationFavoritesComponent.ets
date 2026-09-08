import { hilog } from '@kit.PerformanceAnalysisKit';
import { promptAction } from '@kit.ArkUI';
import { geoLocationManager } from '@kit.LocationKit';
import { abilityAccessCtrl, common, Permissions } from '@kit.AbilityKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { fileIo as fs } from '@kit.CoreFileKit';
import { webview } from '@kit.ArkWeb';
import { http } from '@kit.NetworkKit';
import { DatabaseManager, SavedLocation } from '../utils/DataBase';
import { ChaoxingUtils } from '../utils/utils';

const TAG = 'LocationFavorites';
const DOMAIN = 0x0008;

/** 地图初始中心（定位不可用时的默认视野） */
const DEFAULT_CENTER: MapLatLng = { latitude: 39.90923, longitude: 116.39743 };
/** 地图下方选点卡片的预留高度，保证地图视口不随选点状态变化跳动 */
const SELECTION_CARD_HEIGHT = 200;
/** 高德在线瓦片（GCJ-02，与本项目坐标换算一致）；style=7 为带注记路网图 */
const TILE_URL = 'https://wprd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x={x}&y={y}&z={z}';
/** 瓦片磁盘缓存上限（字节）：按文件字节 LRU 淘汰；1.5MB 时连文件系统块对齐开销也计入后，
 *  系统设置里显示的"用户数据"仍稳定低于 5MB 占用预算 */
const TILE_DISK_CACHE_BYTES = 1536 * 1024;

/** Leaflet 地图坐标 */
interface MapLatLng {
  latitude: number
  longitude: number
}

/** 推给 H5 的收藏针数据 */
interface FavoritePin {
  id: number
  lat: number
  lng: number
  label: string
}

/** 瓦片缓存文件元信息（LRU 用） */
interface TileStat {
  name: string
  mtime: number
  size: number
}

/**
 * 收藏位置管理 sheet 内容（地图优先交互）：
 * - 底图：ArkWeb + Leaflet + 高德在线瓦片（GCJ-02）。华为 MapKit 底图引擎无论 mapType 都会
 *   下载约 118MB 样式资源（filesDir/map-style），为把占用控制在 5MB 内改用瓦片自实现。
 * - 瓦片磁盘缓存（Map Kit 瓦片数据缓存管理的自管版）：
 *   onInterceptRequest 拦截瓦片请求，命中 cacheDir/maptiles 直接回本地；
 *   未命中放行网络并异步落盘，总量超 4MB 按 mtime LRU 淘汰，可在设置页一键清空。
 * - 交互：点按地图/拖动红针选点（自动逆地理编码），点琥珀星针选中收藏，右下角管理/定位
 * - 数据库存签到用的 BD-09 坐标（×1e6 整数）；Web 瓦片为 GCJ-02，进出库时转换
 */
@Component
export struct LocationFavoritesComponent {
  /** 关闭收藏位置 sheet（由宿主页面控制 bindSheet 显隐） */
  onClose?: () => void
  @State locations: SavedLocation[] = []
  /** 正在编辑的位置 id；-1 表示新增 */
  @State editingId: number = -1
  @State noteInput: string = ''
  /** 当前选点坐标（GCJ-02，与瓦片投影一致） */
  @State gcjLat: number = DEFAULT_CENTER.latitude
  @State gcjLon: number = DEFAULT_CENTER.longitude
  @State hasPicked: boolean = false
  @State pickedAddress: string = ''
  @State gpsLocating: boolean = false
  @State manageVisible: boolean = false
  private dbManager: DatabaseManager = DatabaseManager.getInstance()
  private webController: webview.WebviewController = new webview.WebviewController()
  /** H5 地图就绪握手；就绪后才允许 runJavaScript 推送状态 */
  private webReady: boolean = false
  /** 瓦片磁盘缓存目录（cacheDir/maptiles，卸载/清理缓存时随系统回收） */
  private tileCacheDir: string = ''
  /** 在途瓦片下载去重 */
  private tileInflight: Set<string> = new Set()
  private geocodeTimer: number = -1
  private geocodeSeq: number = 0

  aboutToAppear(): void {
    const context = getContext(this) as common.UIAbilityContext
    this.tileCacheDir = `${context.cacheDir}/maptiles`
    try {
      if (!fs.accessSync(this.tileCacheDir)) {
        fs.mkdirSync(this.tileCacheDir, true)
      }
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Prepare tile cache dir failed: ${e.message}`);
    }
  }

  // ---------- 数据 ----------

  async loadLocations() {
    try {
      this.locations = await this.dbManager.getAllSavedLocations()
      this.syncFavorites()
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

  // ---------- H5 地图状态同步 ----------

  /** H5 地图加载完成：补推当前收藏与选点状态，未选点则自动定位 */
  onMapReady() {
    this.webReady = true
    this.syncFavorites()
    if (this.hasPicked) {
      this.syncPin()
      this.flyTo(this.gcjLat, this.gcjLon, 16)
    } else {
      this.locateCurrent()
    }
  }

  /** 点按地图选点 */
  onMapClick(lat: number, lon: number) {
    this.pickPosition(lat, lon, false, '')
  }

  /** 拖动/点按选点针后同步位置 */
  onPinDragEnd(lat: number, lon: number) {
    this.gcjLat = lat
    this.gcjLon = lon
    this.hasPicked = true
    this.scheduleGeocode()
  }

  /** 点击收藏针 = 选中该收藏（选点针移过去并填充备注，保存即修改） */
  onFavoriteClick(id: number) {
    const loc = this.locations.find((l: SavedLocation) => l.id === id)
    if (loc) {
      this.selectFavorite(loc)
    }
  }

  /** 取消选点：同步移除地图上的选点针 */
  clearSelection() {
    this.editingId = -1
    this.noteInput = ''
    this.hasPicked = false
    this.pickedAddress = ''
    this.syncPin()
  }

  // ---------- H5 → ArkTS 回调（registerJavaScriptProxy 注册） ----------

  async saveLocation() {
    if (!this.hasPicked) {
      promptAction.showToast({ message: '请先在地图上点选位置' })
      return
    }
    const note = this.noteInput.trim()
    // 选点针拖动结束时坐标已同步到 gcjLat/gcjLon
    const bd = ChaoxingUtils.gcj02_to_bd09(this.gcjLat, this.gcjLon)
    const latitude = ChaoxingUtils.toLocationInt(bd.lat).toString()
    const longitude = ChaoxingUtils.toLocationInt(bd.lon).toString()
    const address = this.pickedAddress
    try {
      let result: number
      if (this.editingId === -1) {
        result = await this.dbManager.insertSavedLocation({
          note,
          latitude,
          longitude,
          address
        })
      } else {
        result = await this.dbManager.updateSavedLocation(this.editingId, {
          note,
          latitude,
          longitude,
          address
        })
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

  @Builder
  MapPanel() {
    Stack({ alignContent: Alignment.TopStart }) {
      Web({ src: $rawfile('map/map.html'), controller: this.webController })
        .javaScriptAccess(true)
        .zoomAccess(false)
        .backgroundColor('#E9EDF0')
        .onControllerAttached(() => {
          this.webController.registerJavaScriptProxy(this, 'arkBridge',
            ['onMapReady', 'onMapClick', 'onPinDragEnd', 'onFavoriteClick'])
          this.webController.refresh()
        })
        .onInterceptRequest((event?: OnInterceptRequestEvent): ESObject => {
          // 未拦截时返回 undefined（运行时等价 null）：Web 继续走默认网络加载
          return this.onInterceptTile(event) as ESObject
        })
        .width('100%')
        .height('100%')

      // 悬浮层：顶部提示 + 右下角图标按钮
      // 容器与所有非交互子元素必须 hitTestBehavior(None)，否则会挡住地图的触摸
      Column() {
        Row() {
          Text(this.hasPicked ? this.pickedAddress : '点按地图选点，点按定位针选中收藏')
            .fontSize(12)
            .fontColor($r('app.color.primary_text'))
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .constraintSize({ maxWidth: '70%' })
            .padding({
              left: 10,
              right: 10,
              top: 5,
              bottom: 5
            })
            .borderRadius(12)
            .backgroundColor($r('app.color.text_field_bg'))
            .opacity(this.hasPicked && this.pickedAddress === '' ? 0 : 1)
        }.justifyContent(FlexAlign.End)
        .padding({ right: 12, top: 10 })
        .hitTestBehavior(HitTestMode.None)

        Blank()
          .hitTestBehavior(HitTestMode.None)

        Column({ space: 10 }) {
          Button() {
            SymbolGlyph($r('sys.symbol.star_badge_list'))
              .fontSize(20)
              .fontColor([$r('app.color.primary_text')])
          }
          .type(ButtonType.Circle)
          .width(42)
          .height(42)
          .backgroundColor($r('app.color.card_background'))
          .shadow({ radius: 6, color: 'rgba(0,0,0,0.2)', offsetY: 2 })
          .onClick(() => {
            this.manageVisible = true
          })

          Button() {
            SymbolGlyph($r('sys.symbol.scope'))
              .fontSize(20)
              .fontColor([$r('app.color.primary_text')])
          }
          .type(ButtonType.Circle)
          .width(42)
          .height(42)
          .backgroundColor($r('app.color.card_background'))
          .shadow({ radius: 6, color: 'rgba(0,0,0,0.2)', offsetY: 2 })
          .enabled(!this.gpsLocating)
          .opacity(this.gpsLocating ? 0.5 : 1)
          .onClick(() => {
            this.locateCurrent()
          })
        }
        .padding({ right: 12, bottom: 12 })
        .hitTestBehavior(HitTestMode.None)
      }
      .width('100%')
      .height('100%')
      .alignItems(HorizontalAlign.End)
      .hitTestBehavior(HitTestMode.None)
    }
    .width('100%')
    .layoutWeight(1)
  }

  // ---------- 瓦片磁盘缓存（LRU） ----------

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
            Button('取消')
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
    .padding({
      left: 20,
      right: 20,
      top: 10,
      bottom: 12
    })
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
      .padding({
        left: 20,
        right: 20,
        top: 12,
        bottom: 12
      })

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
                    .fontSize(15)
                    .fontWeight(FontWeight.Medium)
                    .fontColor($r('app.color.primary_text'))
                    .maxLines(1)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                  Text(loc.address)
                    .fontSize(12)
                    .fontColor($r('app.color.secondary_text'))
                    .maxLines(1)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                    .margin({ top: 3 })
                  Text(`经度 ${(ChaoxingUtils.parseStoredCoord(loc.longitude)).toFixed(
                    6)}  纬度 ${(ChaoxingUtils.parseStoredCoord(loc.latitude)).toFixed(6)}`)
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
                  .fontSize(13)
                  .height(28)
                  .borderRadius(14)
                  .backgroundColor($r('app.color.text_field_bg'))
                  .fontColor($r('app.color.selected'))
                  .margin({ right: 8 })
                  .onClick(() => {
                    this.selectFavorite(loc)
                    this.manageVisible = false
                  })
                Button('删除')
                  .fontSize(13)
                  .height(28)
                  .borderRadius(14)
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
          .width(32)
          .height(32)
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
      .padding({
        left: 20,
        right: 20,
        top: 12,
        bottom: 12
      })

      this.MapPanel()

      this.SelectionCard()

      // 管理收藏列表（嵌套半屏 sheet）
    }
    .width('100%')
    .height('100%')
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

  // ---------- 选点 ----------

  /** 安全执行 H5 脚本；页面未就绪或执行失败时静默（状态会在 onMapReady 握手时补推） */
  private runJs(expr: string) {
    if (!this.webReady) {
      return
    }
    try {
      this.webController.runJavaScript(expr)
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Run JS failed: ${e.message}`);
    }
  }

  /** 收藏针全量重画（琥珀色星形针 + 备注标签） */
  private syncFavorites() {
    const pins: FavoritePin[] = this.locations.map((loc: SavedLocation): FavoritePin => {
      const gcj = ChaoxingUtils.bd09_to_gcj02(
        ChaoxingUtils.parseStoredCoord(loc.latitude),
        ChaoxingUtils.parseStoredCoord(loc.longitude))
      return {
        id: loc.id,
        lat: gcj.lat,
        lng: gcj.lon,
        label: this.markerLabel(loc)
      }
    })
    this.runJs(`window.setFavorites(${JSON.stringify(JSON.stringify(pins))})`)
  }

  /** 收藏针上方的标签文案：有备注时"备注 · 地点"，否则只显示地点 */
  private markerLabel(loc: SavedLocation): string {
    return loc.note !== '' ? `${loc.note} · ${loc.address}` : loc.address
  }

  /** 选点针（红色水滴针 + 地址标签）；位置或标签变化时同步 */
  private syncPin() {
    if (this.hasPicked) {
      const label = this.pickedAddress !== '' ? this.pickedAddress : '选点'
      this.runJs(`window.setPin(${this.gcjLat},${this.gcjLon},${JSON.stringify(label)},true)`)
    } else {
      this.runJs('window.clearPin()')
    }
  }

  // ---------- 逆地理编码 ----------

  /** 镜头飞行到指定点 */
  private flyTo(lat: number, lon: number, zoom: number) {
    this.runJs(`window.flyTo(${lat},${lon},${zoom})`)
  }

  /**
   * 拦截瓦片请求：命中缓存直接回本地文件；未命中放行网络并异步落盘。
   * 对应 Map Kit 瓦片缓存管理中 diskCacheEnabled/diskCachePath 的自管实现。
   */
  private onInterceptTile(event?: OnInterceptRequestEvent): WebResourceResponse | undefined {
    if (!event) {
      return undefined
    }
    const url = event.request.getRequestUrl()
    if (!url.includes('appmaptile')) {
      return undefined
    }
    const m = url.match(/[?&]x=(\d+)&y=(\d+)&z=(\d+)/)
    if (!m || this.tileCacheDir === '') {
      return undefined
    }
    const key = `${m[3]}_${m[1]}_${m[2]}.png`
    const filePath = `${this.tileCacheDir}/${key}`
    try {
      if (fs.accessSync(filePath)) {
        const file = fs.openSync(filePath, fs.OpenMode.READ_ONLY)
        const resp = new WebResourceResponse()
        resp.setResponseData(file.fd)
        resp.setResponseEncoding('utf-8')
        resp.setResponseMimeType('image/png')
        return resp
      }
    } catch (e) {
      // 缓存读取失败则走网络
    }
    this.cacheTileAsync(url, filePath, key)
    return undefined
  }

  // ---------- 增删改 ----------

  /** 未命中的瓦片异步拉取落盘；完成后做 LRU 容量检查（上限 4MB） */
  private cacheTileAsync(url: string, filePath: string, key: string) {
    if (this.tileInflight.has(key)) {
      return
    }
    this.tileInflight.add(key)
    const req = http.createHttp()
    req.request(url, {
      method: http.RequestMethod.GET,
      expectDataType: http.HttpDataType.ARRAY_BUFFER,
      connectTimeout: 8000,
      readTimeout: 8000
    }).then((res: http.HttpResponse) => {
      if (res.responseCode === 200) {
        const ab = res.result as ArrayBuffer
        if (ab.byteLength > 0) {
          const file = fs.openSync(filePath, fs.OpenMode.READ_WRITE | fs.OpenMode.CREATE | fs.OpenMode.TRUNC)
          fs.writeSync(file.fd, ab)
          fs.closeSync(file.fd)
          this.evictTileCache()
        }
      }
    }).catch((e: BusinessError<void>) => {
      hilog.error(DOMAIN, TAG, `Fetch tile failed: ${e.message}`);
    }).finally(() => {
      req.destroy()
      this.tileInflight.delete(key)
    })
  }

  /** 缓存总量超上限时按修改时间从旧到新淘汰 */
  private evictTileCache() {
    try {
      const names: string[] = fs.listFileSync(this.tileCacheDir)
      const stats: TileStat[] = []
      let total = 0
      for (const name of names) {
        const st = fs.statSync(`${this.tileCacheDir}/${name}`)
        total += st.size
        stats.push({ name, mtime: st.mtime, size: st.size })
      }
      if (total <= TILE_DISK_CACHE_BYTES) {
        return
      }
      stats.sort((a: TileStat, b: TileStat) => a.mtime - b.mtime)
      for (const st of stats) {
        if (total <= TILE_DISK_CACHE_BYTES) {
          break
        }
        fs.unlinkSync(`${this.tileCacheDir}/${st.name}`)
        total -= st.size
      }
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Evict tile cache failed: ${e.message}`);
    }
  }

  /** 选点统一入口：地图点按、拖动针、定位；addressOverride 非空时直接作为地址 */
  private pickPosition(lat: number, lon: number, fly: boolean, addressOverride: string) {
    this.gcjLat = lat
    this.gcjLon = lon
    this.hasPicked = true
    this.syncPin()
    if (fly) {
      this.flyTo(lat, lon, 16)
    }
    if (addressOverride !== '') {
      this.pickedAddress = addressOverride
    } else {
      this.scheduleGeocode()
    }
  }

  /** 按当前选点状态同步针与镜头 */
  private applySelectionToMap() {
    if (!this.hasPicked) {
      return
    }
    this.syncPin()
    this.flyTo(this.gcjLat, this.gcjLon, 16)
  }

  // ---------- UI ----------

  /** 点击收藏针/列表项 = 选中该收藏 */
  private selectFavorite(loc: SavedLocation) {
    this.editingId = loc.id
    this.noteInput = loc.note
    this.pickedAddress = loc.address
    const gcj = ChaoxingUtils.bd09_to_gcj02(
      ChaoxingUtils.parseStoredCoord(loc.latitude),
      ChaoxingUtils.parseStoredCoord(loc.longitude))
    this.pickPosition(gcj.lat, gcj.lon, true, loc.address)
  }

  /** 定位到当前位置：仅移动镜头，不打标记、不选点 */
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
      this.flyTo(gcj.lat, gcj.lon, 16)
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Get current location failed: ${e.message}`);
      promptAction.showToast({ message: '定位失败，请检查定位服务' })
    } finally {
      this.gpsLocating = false
    }
  }

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
      // 地址回填后刷新选点针上方的标签
      this.syncPin()
    } catch (e) {
      hilog.error(DOMAIN, TAG, `Reverse geocode failed: ${e.message}`);
      if (seq !== this.geocodeSeq) {
        return
      }
      this.pickedAddress = `${this.gcjLat.toFixed(6)}, ${this.gcjLon.toFixed(6)}`
    }
  }
}
