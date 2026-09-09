import { Icon, userMenu } from './SignerUsers';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { DatabaseManager } from '../utils/DataBase';
import { loginFunction } from '../utils/Login';
import { Context } from '@kit.AbilityKit';
import { promptAction } from '@kit.ArkUI';
import { picker } from '@kit.CoreFileKit';
import { JSON } from '@kit.ArkTS';
import { uploadImageForObject } from '../utils/upload';

const TAG = 'PhotoPicker';
const DOMAIN = 0x0013;

/** 单个用户的上传状态（@Observed 供行组件 @ObjectLink 原地刷新） */
@Observed
class UserUploadState {
  signId: number;
  percent: number = 0;
  done: boolean = false;
  failed: boolean = false;
  active: boolean = false; // 本轮上传中（用于行内进度条常显）

  constructor(signId: number) {
    this.signId = signId;
  }
}

/** 按用户的上传进度行 */
@Component
struct UserUploadRow {
  @ObjectLink state: UserUploadState;
  @Prop uname: string = '';

  build() {
    Row({ space: 10 }) {
      Icon({ UserId: this.state.signId })

      Column({ space: 5 }) {
        Text(this.uname)
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('app.color.primary_text'))
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
        if (this.state.active && !this.state.failed && !this.state.done) {
          Progress({ value: this.state.percent, total: 100, type: ProgressType.Linear })
            .style({ strokeWidth: 4 })
            .color($r('app.color.selected'))
            .width('100%')
        }
      }
      .alignItems(HorizontalAlign.Start)
      .layoutWeight(1)

      if (this.state.failed) {
        Text('上传失败')
          .fontSize(12)
          .fontColor($r('app.color.unsignable'))
      } else if (this.state.done) {
        Text('✓ 上传完成')
          .fontSize(12)
          .fontColor($r('app.color.signed'))
      } else if (this.state.active && this.state.percent > 0) {
        Text(`${this.state.percent}%`)
          .fontSize(12)
          .fontColor($r('app.color.secondary_text'))
      } else if (this.state.active) {
        Text('上传中...')
          .fontSize(12)
          .fontColor($r('app.color.secondary_text'))
      } else {
        Text('待上传')
          .fontSize(12)
          .fontColor($r('app.color.text_placeholder'))
      }
    }
    .width('100%')
    .padding(10)
    .backgroundColor($r('app.color.list_item_bg'))
    .borderRadius(12)
  }
}

/**
 * 拍照签到图片选择器：为每个勾选用户并发上传一张签到图片
 * 顶部显示总进度条，下方按用户显示头像与各自的上传进度
 */
@Reusable
@Component
export struct photoPicker {
  @Link signIdArray: Array<number>
  @Link objectidArray: string[]
  @Link otherUserDialogIsShow: boolean
  @Prop otherUser: Array<userMenu>
  @State isUploading: boolean = false
  @State totalPercentValue: number = 0
  @State doneCountValue: number = 0
  private states: Map<number, UserUploadState> = new Map()

  private userNameOf(signId: number): string {
    const found = this.otherUser.find(u => u.id === signId)
    return found ? found.uname : `用户 ${signId}`
  }

  private stateOf(signId: number): UserUploadState {
    let st = this.states.get(signId)
    if (!st) {
      st = new UserUploadState(signId)
      this.states.set(signId, st)
    }
    return st
  }

  private resetStates() {
    this.states.forEach(st => {
      st.percent = 0
      st.done = false
      st.failed = false
      st.active = false
    })
  }

  private recalcTotal() {
    if (this.states.size === 0) {
      this.totalPercentValue = 0
      this.doneCountValue = 0
      return
    }
    let sum = 0
    let done = 0
    this.states.forEach(st => {
      sum += Math.max(st.percent, 0)
      if (st.done) {
        done++
      }
    })
    this.totalPercentValue = Math.min(100, Math.round(sum / this.states.size))
    this.doneCountValue = done
  }

  /** 整体替换数组以触发父组件（@Link）同步 */
  private setObjectId(index: number, objectId: string) {
    const next = this.objectidArray.slice()
    next[index] = objectId
    this.objectidArray = next
  }

  // 显示图片选择确认对话框
  private showPhotoConfirmDialog() {
    if (this.signIdArray.length === 0) {
      AlertDialog.show({
        title: '提示',
        message: '请先选择至少一个用户',
        confirm: {
          value: '知道了',
          action: () => {
            this.otherUserDialogIsShow = true
          }
        }
      })
      return
    }

    const selectedUsers = this.otherUser.filter(u => this.signIdArray.includes(u.id));
    const userNames = selectedUsers.map(u => u.uname).join('、');

    AlertDialog.show({
      title: '确认上传图片',
      message: `将为以下用户上传图片：\n${userNames}\n\n是否继续？`,
      primaryButton: {
        value: '修改用户',
        action: () => {
          this.otherUserDialogIsShow = true
        }
      },
      secondaryButton: {
        value: '确认上传',
        action: () => {
          this.handlePhotoSelect()
        }
      }
    })
  }

  /** 上传单个用户的图片（并发执行） */
  private async uploadOne(state: UserUploadState, index: number, uri: string,
    context: Context, dbManager: DatabaseManager): Promise<void> {
    try {
      const userInfo = await dbManager.getUserById(state.signId)
      if (!userInfo) {
        throw new Error('用户不存在')
      }
      const puid = String((await loginFunction.getUserInfo(userInfo.cookies)).puid)
      const objectId = await uploadImageForObject(context, userInfo.cookies, puid, uri,
        (percent: number): void => {
          state.percent = percent
          this.recalcTotal()
        })
      this.setObjectId(index, objectId)
      state.done = true
      state.percent = 100
    } catch (error) {
      hilog.error(DOMAIN, TAG, 'Photo upload failed for user %d: %{public}s',
        state.signId, JSON.stringify(error))
      state.failed = true
    } finally {
      this.recalcTotal()
    }
  }

  // 并发为每个用户上传签到图片
  private async handlePhotoSelect() {
    this.objectidArray = new Array(this.signIdArray.length).fill('')
    this.resetStates()
    this.recalcTotal()
    this.isUploading = true
    const dbManager = DatabaseManager.getInstance()

    try {
      const photoSelectOptions = new picker.PhotoSelectOptions();
      photoSelectOptions.MIMEType = picker.PhotoViewMIMETypes.IMAGE_TYPE;
      photoSelectOptions.maxSelectNumber = this.signIdArray.length;
      const photoViewPicker = new picker.PhotoViewPicker();
      const context = this.getUIContext().getHostContext() as Context

      const res = await photoViewPicker.select(photoSelectOptions)
      const uriArr = res.photoUris
      if (!uriArr || uriArr.length === 0) {
        return
      }
      promptAction.showToast({ message: '开始上传图片', duration: 1500 })

      this.states.forEach(st => {
        st.active = true
      })
      const tasks = this.signIdArray.map((signId: number, index: number): Promise<void> =>
        this.uploadOne(this.stateOf(signId), index, uriArr[index % uriArr.length], context, dbManager))
      await Promise.allSettled(tasks)

      promptAction.showToast({
        message: this.doneCountValue === this.signIdArray.length ?
        '所有图片上传成功' : `${this.doneCountValue}/${this.signIdArray.length} 张上传成功`,
        duration: 2000
      })
    } catch (error) {
      hilog.error(DOMAIN, TAG, 'Photo selection failed: %{public}s', JSON.stringify(error))
      promptAction.showToast({ message: '图片选择失败', duration: 2000 })
    } finally {
      this.states.forEach(st => {
        st.active = false
      })
      this.isUploading = false
    }
  }

  build() {
    Column({ space: 12 }) {
      if (this.signIdArray.length === 0) {
        Text('请先选择要代签的用户')
          .fontSize(14)
          .fontColor($r('app.color.text_placeholder'))
          .width('100%')
      } else {
        // 顶部总进度
        Row() {
          Text(this.isUploading ? '正在上传图片' : '上传进度')
            .fontSize(14)
            .fontColor($r('app.color.secondary_text'))
          Blank()
          Text(`${this.doneCountValue}/${this.signIdArray.length}`)
            .fontSize(13)
            .fontColor($r('app.color.secondary_text'))
        }
        .width('100%')

        Progress({ value: this.totalPercentValue, total: 100, type: ProgressType.Linear })
          .style({ strokeWidth: 8 })
          .color($r('app.color.selected'))
          .width('100%')

        // 按用户的头像与进度行（内部滚动，避免用户过多时按钮被顶出屏幕）
        Scroll() {
          Column({ space: 8 }) {
            ForEach(this.signIdArray, (signId: number, index: number) => {
              UserUploadRow({ state: this.stateOf(signId), uname: this.userNameOf(signId) })
            }, (signId: number): string => `row_${signId}`)
          }
          .width('100%')
        }
        .constraintSize({ maxHeight: 264 })
        .scrollBar(BarState.Auto)
        .align(Alignment.Top)
        .width('100%')
      }

      Button(this.isUploading ? '上传中...' : '选择图片 / 拍照')
        .fontSize(16)
        .fontWeight(FontWeight.Medium)
        .fontColor($r('app.color.text_on_primary'))
        .type(ButtonType.Capsule)
        .backgroundColor(this.isUploading ? $r('app.color.class_button_disabled') :
        $r('app.color.primary_button'))
        .width('60%')
        .enabled(!this.isUploading)
        .onClick(() => {
          this.showPhotoConfirmDialog()
        })
    }
    .width('100%')
    .padding(16)
    .backgroundColor($r('app.color.card_background'))
    .borderRadius(16)
  }
}
