import { promptAction } from '@kit.ArkUI';
import { common } from '@kit.AbilityKit';
import { preferences } from '@kit.ArkData';
import { image } from '@kit.ImageKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { DatabaseManager, UserDataAndId } from '../utils/DataBase';
import { MsCaptchaDetector } from '../utils/detector/MsCaptchaDetector';
import { CaptchaComponent, CaptchaUserParam } from './Captcha';
import { Sign } from '../utils/sign';
import { CaptchaApi, CaptchaPhotosParam } from '../utils/captchaApi';
import { FaceApi } from '../utils/faceApi';
import { uploadImageForObject } from '../utils/upload';
import { Http, writeBufferToFile } from '../utils/httpClient';
import { loginFunction } from '../utils/Login';
import fs from '@ohos.file.fs';

const ONNX_TEST_TAG = 'OnnxTest';

const SIGN_TIME = 'sign_time';
const VERSION = 'version';
const SIGN_EXPIRY_MS = 12 * 30 * 24 * 60 * 60 * 1000;
const BACKUP_REMINDER_MS = 11 * 30 * 24 * 60 * 60 * 1000;

const IMAGE_RAWFILE = 'models/test.jpg';

@Component
export struct DebugPage {
  private context = getContext(this) as common.UIAbilityContext;
  @State dbInfo: string = '';
  @State onnxStatus: string = '';
  @State onnxResult: string = '';
  @State onnxRunning: boolean = false;
  @Consume('pathInfos') pathInfos: NavPathStack;
  // 验证码弹窗演示（全本地模拟，不访问网络）
  @State captchaDemoShow: boolean = false;
  @State demoSession: number = 1;
  @State demoLog: string = '尚未触发回调';
  // 签到验证链路测试（真实网络，走主用户登录态）
  @State testActiveId: string = '';
  @State testCourseId: string = '';
  @State testClassId: string = '';
  @State testSignCode: string = '1234';
  @State testLog: string = '尚未运行任何测试';
  @State testRunning: boolean = false;

  async aboutToAppear() {
    await this.loadInfo();
  }

  aboutToDisappear() {
    // MindSpore Lite 模型进程级常驻（MsCaptchaDetector.load 缓存），不在此处关闭
  }

  async loadInfo() {
    try {
      const dbManager = DatabaseManager.getInstance();
      const hostCount = await dbManager.getTableCount('HostUser');
      const otherCount = await dbManager.getTableCount('OtherUser');
      const signInfo = await this.getSignInfo();
      this.dbInfo = `HostUser: ${hostCount} 条, OtherUser: ${otherCount} 条\n\n${signInfo}`;
    } catch (e) {
      this.dbInfo = '加载失败';
    }
  }

  async getSignInfo(): Promise<string> {
    let pref = await preferences.getPreferences(this.context, 'settings');
    const signTime = await pref.get(SIGN_TIME, 0) as number;
    const ver = await pref.get(VERSION, '') as string;
    if (signTime === 0) {
      return '签名时间: 未记录\n版本: 未记录';
    }
    const date = new Date(signTime);
    const elapsed = Date.now() - signTime;
    const days = Math.floor(elapsed / (24 * 60 * 60 * 1000));
    let statusLine: string;
    if (elapsed >= SIGN_EXPIRY_MS) {
      statusLine = '状态: 已过期';
    } else if (elapsed >= BACKUP_REMINDER_MS) {
      const remain = Math.ceil((SIGN_EXPIRY_MS - elapsed) / (24 * 60 * 60 * 1000));
      statusLine = `状态: 即将过期 (剩余约${remain}天)`;
    } else {
      statusLine = '状态: 有效';
    }
    return `签名时间: ${date.toISOString().substring(0, 10)}\n版本: ${ver}\n${statusLine}\n已过 ${days} 天`;
  }

  async resetSignState() {
    try {
      let pref = await preferences.getPreferences(this.context, 'settings');
      await pref.delete(SIGN_TIME);
      await pref.delete(VERSION);
      await pref.flush();
      this.dbInfo = '';
      promptAction.showToast({ message: '签名状态已重置' });
    } catch (e) {
      promptAction.showToast({ message: '重置失败' });
    }
  }

  async setSignTimeToTriggerReminder() {
    try {
      const target = Date.now() - BACKUP_REMINDER_MS - 60 * 1000;
      let pref = await preferences.getPreferences(this.context, 'settings');
      await pref.put(SIGN_TIME, target);
      await pref.put(VERSION, '1.0.0-debug');
      await pref.flush();
      this.dbInfo = '';
      promptAction.showToast({ message: '签名时间已设为11个月前，下次启动将触发备份提醒' });
    } catch (e) {
      promptAction.showToast({ message: '设置失败' });
    }
  }

  async setSignTimeExpired() {
    try {
      const target = Date.now() - SIGN_EXPIRY_MS - 60 * 1000;
      let pref = await preferences.getPreferences(this.context, 'settings');
      await pref.put(SIGN_TIME, target);
      await pref.put(VERSION, '1.0.0-debug');
      await pref.flush();
      this.dbInfo = '';
      promptAction.showToast({ message: '签名时间已设为过期' });
    } catch (e) {
      promptAction.showToast({ message: '设置失败' });
    }
  }

  async setSignDaysAgo(days: number) {
    try {
      const target = Date.now() - days * 24 * 60 * 60 * 1000;
      let pref = await preferences.getPreferences(this.context, 'settings');
      await pref.put(SIGN_TIME, target);
      await pref.put(VERSION, '1.0.0-debug');
      await pref.flush();
      this.dbInfo = '';
      promptAction.showToast({ message: `签名时间已设为 ${days} 天前` });
    } catch (e) {
      promptAction.showToast({ message: '设置失败' });
    }
  }

  async runOnnxTest() {
    hilog.info(0x0000, ONNX_TEST_TAG, 'runOnnxTest invoked, running=%{public}s', String(this.onnxRunning));
    if (this.onnxRunning) {
      return;
    }
    this.onnxRunning = true;
    this.onnxResult = '';
    let pixelMap: image.PixelMap | undefined = undefined;
    try {
      const start = Date.now();
      const loadMs = await MsCaptchaDetector.load(this.context);
      pixelMap = await this.loadTestImage();
      // 封装后的完整调用：输入一张图片，输出一个数值（滑块 x 偏移）
      const xOffset = await MsCaptchaDetector.detect(pixelMap);
      hilog.info(0x0000, ONNX_TEST_TAG, 'detect done, %{public}d ms', Date.now() - start);
      this.onnxStatus = `MindSpore Lite（加载 ${loadMs}ms），耗时 ${Date.now() - start}ms`;
      this.onnxResult = xOffset >= 0
        ? `x_offset: ${xOffset}（test.jpg 基准 258）`
        : '未检测到滑块';
    } catch (e) {
      const err = e as BusinessError;
      hilog.error(0x0000, ONNX_TEST_TAG, 'test failed: %{public}s', err.message);
      this.onnxResult = `测试失败: ${err.message}`;
    } finally {
      if (pixelMap !== undefined) {
        pixelMap.release();
      }
      this.onnxRunning = false;
    }
  }

  private async loadTestImage(): Promise<image.PixelMap> {
    const buf = this.context.resourceManager.getRawFileContentSync(IMAGE_RAWFILE);
    const source = image.createImageSource(buf.buffer as ArrayBuffer);
    try {
      return await source.createPixelMap({ desiredPixelFormat: image.PixelMapFormat.RGBA_8888 });
    } finally {
      source.release();
    }
  }

  /** 演示用验证码用户上下文：无真实 cookie，配合 demoMode 全程本地模拟 */
  private demoUser(): CaptchaUserParam {
    return {
      cookies: 'demo',
      uname: `演示用户${this.demoSession}`,
      refererParams: {
        courseId: 'demo',
        classId: 'demo',
        activePrimaryId: 'demo',
        uid: 'demo'
      }
    };
  }

  @Builder
  CaptchaDemoSheetBuilder() {
    Column({ space: 12 }) {
      CaptchaComponent({
        demoMode: true,
        captchaUser: this.demoUser(),
        captchaSession: this.demoSession,
        onValidated: (validate: string) => {
          this.demoLog = `onValidated(validate=${validate})`
        },
        onSkip: () => {
          this.demoLog = 'onSkip() 已跳过'
        }
      })

      Row({ space: 12 }) {
        Button('模拟下一位用户')
          .layoutWeight(1)
          .fontSize(14)
          .onClick(() => {
            this.demoSession++
            this.demoLog = `已切换到 ${this.demoUser().uname}（会话 ${this.demoSession}）`
          })
        Button('重置演示')
          .layoutWeight(1)
          .fontSize(14)
          .backgroundColor($r('sys.color.ohos_id_color_button_normal'))
          .fontColor($r('sys.color.ohos_id_color_text_primary'))
          .onClick(() => {
            this.demoSession = 1
            this.demoLog = '已重置为演示用户1'
          })
      }
      .width('100%')
      .padding({ left: 16, right: 16, bottom: 12 })

      Text('说明：演示模式全程本地模拟，不访问网络；奇数会话演示模型校验成功，偶数会话演示失败回退手动。')
        .fontSize(11)
        .fontColor($r('sys.color.ohos_id_color_text_tertiary'))
        .width('100%')
        .padding({ left: 16, right: 16 })
    }
    .width('100%')
  }

  /** 签到验证链路测试：统一取主用户登录态（getUserById(0) = 主用户） */
  private async getHostUser(): Promise<UserDataAndId> {
    const host = await DatabaseManager.getInstance().getUserById(0);
    if (!host || !host.cookies) {
      throw new Error('未找到主用户登录信息，请先登录');
    }
    return host;
  }

  private requireActiveId(): string {
    if (!this.testActiveId.trim()) {
      throw new Error('请先填写活动ID(activeId)');
    }
    return this.testActiveId.trim();
  }

  private logLine(line: string) {
    this.testLog = `${line}\n${this.testLog}`;
  }

  private async runTest(name: string, fn: () => Promise<void>) {
    if (this.testRunning) {
      promptAction.showToast({ message: '测试运行中，请稍候' });
      return;
    }
    this.testRunning = true;
    this.logLine(`▶ [${name}] 开始`);
    try {
      await fn();
      this.logLine(`✔ [${name}] 完成`);
    } catch (e) {
      this.logLine(`✘ [${name}] 失败: ${(e as Error).message}`);
    } finally {
      this.testRunning = false;
    }
  }

  /** 1. 活动详情解析：验证码/人脸/拍照/位置等验证开关 */
  private async testActiveDetail() {
    const host = await this.getHostUser();
    const activeId = this.requireActiveId();
    const d = await Sign.GetActiveDetail(host.cookies, activeId);
    this.logLine(`otherId=${d.otherId}(0拍照/2二维码/3手势/4位置/5签到码) ` +
      `验证码=${d.ifNeedVCode} 人脸=${d.openCheckFaceFlag} 需拍照=${d.ifphoto}`);
    this.logLine(`位置范围=${d.locationRange} lat=${d.locationLatitude} lng=${d.locationLongitude} ` +
      `二维码带定位=${d.ifopenAddress} 二维码刷新=${d.ifrefreshewm}`);
  }

  /** 2. 预签到检测：截止/已签到/可签到/无权限 */
  private async testPreSignIn() {
    const host = await this.getHostUser();
    const activeId = this.requireActiveId();
    if (!this.testClassId.trim() || !this.testCourseId.trim()) {
      throw new Error('请先填写课程ID和班级ID');
    }
    const r = await Sign.PreSignIn(activeId, this.testClassId.trim(), this.testCourseId.trim(), host.uid,
      host.cookies);
    let desc = '未知';
    if (r === -1) {
      desc = '-1=无权限/不在班级';
    } else if (r === 0) {
      desc = '0=已签到';
    } else if (r === 1) {
      desc = '1=可签到';
    } else if (r === 2) {
      desc = '2=已截止';
    }
    this.logLine(`preSign=${r}（${desc}），页面enc=${Sign.lastPreSignEnc || '(无)'}`);
  }

  /** 3. 滑块验证码全流程：拉图→模型识别→提交校验→validate */
  private async testCaptchaFlow() {
    const host = await this.getHostUser();
    const activeId = this.requireActiveId();
    if (!this.testClassId.trim() || !this.testCourseId.trim()) {
      throw new Error('请先填写课程ID和班级ID');
    }
    const params: CaptchaPhotosParam = {
      courseId: this.testCourseId.trim(),
      classId: this.testClassId.trim(),
      activePrimaryId: activeId,
      uid: `${host.uid}`
    };
    const photos = await CaptchaApi.getCaptchaPhotos(params, host.cookies);
    this.logLine(`验证码拉取成功 token=${photos.token.substring(0, 12)}...`);
    await MsCaptchaDetector.load(this.context);
    const buf = await Http.getBuffer(photos.imageVerificationVo.shadeImage);
    const source = image.createImageSource(buf);
    let pixelMap: image.PixelMap | undefined = undefined;
    try {
      pixelMap = await source.createPixelMap({ desiredPixelFormat: image.PixelMapFormat.RGBA_8888 });
    } finally {
      source.release();
    }
    const xOffset = await MsCaptchaDetector.detect(pixelMap);
    pixelMap.release();
    if (xOffset < 0) {
      throw new Error('模型未检测到滑块位置');
    }
    this.logLine(`模型识别 x=${xOffset}，提交校验…`);
    const validate = await CaptchaApi.checkCaptchaResult(photos, xOffset, params, host.cookies);
    if (!validate) {
      throw new Error('校验未通过（返回空 validate）');
    }
    this.logLine(`validate=${validate.substring(0, 24)}...`);
  }

  /** 4. 签到码/手势预校验（共用 checkSignCode 接口） */
  private async testCheckSignCode() {
    const host = await this.getHostUser();
    const activeId = this.requireActiveId();
    const ok = await Sign.CheckSignCode(host.cookies, activeId, this.testSignCode.trim());
    this.logLine(`签到码 ${this.testSignCode.trim()} 校验结果: ${ok ? '正确' : '错误'}`);
  }

  /** 5. clientId 解密（人脸 signToken 依赖的 cid/sc） */
  private async testDecryptClientId() {
    const host = await this.getHostUser();
    const loginInfo = await loginFunction.getUserInfo(host.cookies);
    if (!loginInfo.clientId) {
      throw new Error('用户信息未返回 clientId');
    }
    const info = FaceApi.decryptClientId(loginInfo.clientId);
    if (!info) {
      throw new Error('clientId 解密失败');
    }
    this.logLine(`clientId 解密成功 cid=${info.cid.substring(0, 16)}... sc=${info.sc.substring(0, 8)}...`);
  }

  /** 6. 人脸流程：默认底图 objectId→下载→faceEnc */
  private async testFaceFlow() {
    const host = await this.getHostUser();
    const activeId = this.requireActiveId();
    const objectId = await FaceApi.GetProfileFaceObjectId(host.cookies);
    this.logLine(`默认人脸照片 objectId=${objectId}`);
    const filePath = this.context.cacheDir + '/debug_face_test.jpg';
    await FaceApi.DownloadFaceImage(objectId, filePath);
    this.logLine(`底图已下载: ${filePath}`);
    const loginInfo = await loginFunction.getUserInfo(host.cookies);
    const enc = await FaceApi.CheckFaceResultAndGetEnc(host.cookies, activeId, objectId, loginInfo.clientId);
    this.logLine(`faceEnc=${enc.substring(0, 24)}...`);
  }

  /** 7. 云盘上传：token 获取 + multipart 上传（拍照/人脸共用链路） */
  private async testCloudUpload() {
    const host = await this.getHostUser();
    const loginInfo = await loginFunction.getUserInfo(host.cookies);
    if (!loginInfo.puid) {
      throw new Error('用户信息未返回 puid');
    }
    const buf = this.context.resourceManager.getRawFileContentSync(IMAGE_RAWFILE);
    const filePath = this.context.cacheDir + '/debug_upload_test.jpg';
    writeBufferToFile(filePath, buf.buffer as ArrayBuffer);
    const objectId = await uploadImageForObject(this.context, host.cookies, loginInfo.puid, filePath);
    this.logLine(`云盘上传成功 objectId=${objectId}`);
  }

  /** 8. 签退信息解析：signInId/signOutId/发布时间戳 */
  private async testSignOutInfo() {
    const host = await this.getHostUser();
    const activeId = this.requireActiveId();
    const info = await Sign.GetSignInfo(host.cookies, activeId);
    this.logLine(`signInId=${info.signInId} signOutId=${info.signOutId} ` +
      `签退时间戳=${info.signOutPublishTimeStamp || '(无签退)'}`);
  }

  /** 签到验证链路测试按钮见 build() 中「签到验证链路测试」卡片 */

  build() {
    Column() {
      Text('Debug 调试面板')
        .fontSize(24).fontWeight(FontWeight.Bold)
        .width('100%').textAlign(TextAlign.Start)
        .padding({ left: 20, bottom: 20 })

      List({ space: 12 }) {
        ListItem() {
          Column() {
            Text('签名状态')
              .fontSize(14)
              .fontColor($r('sys.color.ohos_id_color_text_secondary'))
              .width('100%')
              .margin({ bottom: 8, left: 4 })

            Column() {
              Row() {
                Text(this.dbInfo !== '' ? this.dbInfo : '加载中...')
                  .fontSize(14)
                  .fontColor($r('sys.color.ohos_id_color_text_secondary'))
              }
              .width('100%').padding(12)
            }
            .backgroundColor($r('sys.color.ohos_id_color_list_card_bg'))
            .borderRadius(16)
          }
        }

        ListItem() {
          Column() {
            Text('调试操作')
              .fontSize(14)
              .fontColor($r('sys.color.ohos_id_color_text_secondary'))
              .width('100%')
              .margin({ bottom: 8, left: 4 })

            Column() {
              Row() {
                Text('重置签名状态')
                  .fontSize(16)
                  .fontColor($r('sys.color.ohos_id_color_text_primary'))
                Blank()
                Image($r('app.media.arrow_right')) .draggable(false)
                  .width(16).height(16)
                  .fillColor($r('sys.color.ohos_id_color_text_tertiary'))
              }
              .width('100%').padding(12)
              .onClick(() => { this.resetSignState() })

              Divider()
                .color($r('sys.color.ohos_id_color_list_separator'))
                .margin({ left: 12, right: 12 })

              Row() {
                Text('设11个月前签名（触发备份提醒）')
                  .fontSize(14)
                  .fontColor($r('sys.color.ohos_id_color_text_primary'))
                Blank()
                Image($r('app.media.arrow_right')) .draggable(false)
                  .width(16).height(16)
                  .fillColor($r('sys.color.ohos_id_color_text_tertiary'))
              }
              .width('100%').padding(12)
              .onClick(() => { this.setSignTimeToTriggerReminder() })

              Divider()
                .color($r('sys.color.ohos_id_color_list_separator'))
                .margin({ left: 12, right: 12 })

              Row() {
                Text('设过期签名（12个月前）')
                  .fontSize(14)
                  .fontColor($r('sys.color.ohos_id_color_text_primary'))
                Blank()
                Image($r('app.media.arrow_right')) .draggable(false)
                  .width(16).height(16)
                  .fillColor($r('sys.color.ohos_id_color_text_tertiary'))
              }
              .width('100%').padding(12)
              .onClick(() => { this.setSignTimeExpired() })

              Divider()
                .color($r('sys.color.ohos_id_color_list_separator'))
                .margin({ left: 12, right: 12 })

              Row() {
                Text('设1天前签名')
                  .fontSize(14)
                  .fontColor($r('sys.color.ohos_id_color_text_primary'))
                Blank()
                Image($r('app.media.arrow_right')) .draggable(false)
                  .width(16).height(16)
                  .fillColor($r('sys.color.ohos_id_color_text_tertiary'))
              }
              .width('100%').padding(12)
              .onClick(() => { this.setSignDaysAgo(1) })

              Divider()
                .color($r('sys.color.ohos_id_color_list_separator'))
                .margin({ left: 12, right: 12 })

              Row() {
                Text('设365天前签名')
                  .fontSize(14)
                  .fontColor($r('sys.color.ohos_id_color_text_primary'))
                Blank()
                Image($r('app.media.arrow_right')) .draggable(false)
                  .width(16).height(16)
                  .fillColor($r('sys.color.ohos_id_color_text_tertiary'))
              }
              .width('100%').padding(12)
              .onClick(() => { this.setSignDaysAgo(365) })
            }
            .backgroundColor($r('sys.color.ohos_id_color_list_card_bg'))
            .borderRadius(16)
          }
        }
        ListItem(){
          Column(){
            Text('打开Debug详情页')
          }.onClick(()=>{ this.pathInfos.pushPath({ name: 'Debug' }) })
        }

        ListItem() {
          Column() {
            Text('滑块检测测试（MindSpore Lite）')
              .fontSize(14)
              .fontColor($r('sys.color.ohos_id_color_text_secondary'))
              .width('100%')
              .margin({ bottom: 8, left: 4 })

            Column() {
              Row() {
                Image($rawfile(IMAGE_RAWFILE)) .draggable(false)
                  .height(64)
                  .objectFit(ImageFit.Contain)
                Blank()
                Button(this.onnxRunning ? '运行中...' : '运行滑块检测')
                  .fontSize(14)
                  .height(36)
                  .enabled(!this.onnxRunning)
                  .onClick(() => { this.runOnnxTest() })
              }
              .width('100%').padding(12)

              if (this.onnxStatus !== '') {
                Text(this.onnxStatus)
                  .fontSize(12)
                  .fontColor($r('sys.color.ohos_id_color_text_tertiary'))
                  .width('100%').padding({ left: 12, right: 12, bottom: 4 })
              }
              if (this.onnxResult !== '') {
                Text(this.onnxResult)
                  .fontSize(13)
                  .fontColor($r('sys.color.ohos_id_color_text_secondary'))
                  .width('100%').padding({ left: 12, right: 12, bottom: 12 })
              }
            }
            .backgroundColor($r('sys.color.ohos_id_color_list_card_bg'))
            .borderRadius(16)
          }
        }

        ListItem() {
          Column() {
            Text('验证码弹窗演示')
              .fontSize(14)
              .fontColor($r('sys.color.ohos_id_color_text_secondary'))
              .width('100%')
              .margin({ bottom: 8, left: 4 })

            Column() {
              Row() {
                Text('多用户弹层复用 + 模型状态文案（本地模拟）')
                  .fontSize(16)
                  .fontColor($r('sys.color.ohos_id_color_text_primary'))
                Blank()
                Button('打开演示弹窗')
                  .fontSize(14)
                  .height(36)
                  .onClick(() => { this.captchaDemoShow = true })
              }
              .width('100%').padding(12)

              Text(this.demoLog)
                .fontSize(12)
                .fontColor($r('sys.color.ohos_id_color_text_tertiary'))
                .width('100%').padding({ left: 12, right: 12, bottom: 12 })
            }
            .backgroundColor($r('sys.color.ohos_id_color_list_card_bg'))
            .borderRadius(16)
          }
        }

        ListItem() {
          Column() {
            Text('签到验证链路测试')
              .fontSize(14)
              .fontColor($r('sys.color.ohos_id_color_text_secondary'))
              .width('100%')
              .margin({ bottom: 8, left: 4 })

            Column({ space: 8 }) {
              Row({ space: 8 }) {
                TextInput({ placeholder: '活动ID activeId', text: $$this.testActiveId })
                  .layoutWeight(2)
                  .height(40)
                  .fontSize(13)
                  .backgroundColor($r('sys.color.ohos_id_color_text_field_sub_bg'))
                TextInput({ placeholder: '课程ID', text: $$this.testCourseId })
                  .layoutWeight(1)
                  .height(40)
                  .fontSize(13)
                  .backgroundColor($r('sys.color.ohos_id_color_text_field_sub_bg'))
                TextInput({ placeholder: '班级ID', text: $$this.testClassId })
                  .layoutWeight(1)
                  .height(40)
                  .fontSize(13)
                  .backgroundColor($r('sys.color.ohos_id_color_text_field_sub_bg'))
              }
              .width('100%')

              Row({ space: 8 }) {
                TextInput({ placeholder: '签到码/手势编码', text: $$this.testSignCode })
                  .layoutWeight(1)
                  .height(40)
                  .fontSize(13)
                  .backgroundColor($r('sys.color.ohos_id_color_text_field_sub_bg'))
              }
              .width('100%')

              Row({ space: 8 }) {
                Button('活动详情解析')
                  .layoutWeight(1).fontSize(13).height(36)
                  .enabled(!this.testRunning)
                  .onClick(() => { this.runTest('活动详情解析', (): Promise<void> => this.testActiveDetail()) })
                Button('预签到检测')
                  .layoutWeight(1).fontSize(13).height(36)
                  .enabled(!this.testRunning)
                  .onClick(() => { this.runTest('预签到检测', (): Promise<void> => this.testPreSignIn()) })
              }
              .width('100%')

              Row({ space: 8 }) {
                Button('验证码全流程')
                  .layoutWeight(1).fontSize(13).height(36)
                  .enabled(!this.testRunning)
                  .onClick(() => { this.runTest('验证码全流程', (): Promise<void> => this.testCaptchaFlow()) })
                Button('签到码预校验')
                  .layoutWeight(1).fontSize(13).height(36)
                  .enabled(!this.testRunning)
                  .onClick(() => { this.runTest('签到码预校验', (): Promise<void> => this.testCheckSignCode()) })
              }
              .width('100%')

              Row({ space: 8 }) {
                Button('clientId解密')
                  .layoutWeight(1).fontSize(13).height(36)
                  .enabled(!this.testRunning)
                  .onClick(() => { this.runTest('clientId解密', (): Promise<void> => this.testDecryptClientId()) })
                Button('人脸底图+faceEnc')
                  .layoutWeight(1).fontSize(13).height(36)
                  .enabled(!this.testRunning)
                  .onClick(() => { this.runTest('人脸底图+faceEnc', (): Promise<void> => this.testFaceFlow()) })
              }
              .width('100%')

              Row({ space: 8 }) {
                Button('云盘上传')
                  .layoutWeight(1).fontSize(13).height(36)
                  .enabled(!this.testRunning)
                  .onClick(() => { this.runTest('云盘上传', (): Promise<void> => this.testCloudUpload()) })
                Button('签退信息解析')
                  .layoutWeight(1).fontSize(13).height(36)
                  .enabled(!this.testRunning)
                  .onClick(() => { this.runTest('签退信息解析', (): Promise<void> => this.testSignOutInfo()) })
              }
              .width('100%')

              Text('说明：全部走主用户真实登录态；前4项需要有效活动ID（预签到/验证码另需课程与班级ID）。')
                .fontSize(11)
                .fontColor($r('sys.color.ohos_id_color_text_tertiary'))
                .width('100%')

              Text(this.testLog)
                .fontSize(12)
                .fontColor($r('sys.color.ohos_id_color_text_secondary'))
                .width('100%')
                .padding(8)
                .borderRadius(8)
                .backgroundColor($r('sys.color.ohos_id_color_sub_background'))
            }
            .backgroundColor($r('sys.color.ohos_id_color_list_card_bg'))
            .borderRadius(16)
            .padding(12)
          }
        }
      }
      .width('100%').layoutWeight(1)
      .padding({ left: 16, right: 16 })
    }
    .width('100%').height('100%')
    .backgroundColor($r('sys.color.ohos_id_color_sub_background'))
    .borderRadius({ topLeft: 20, topRight: 20 })
    .bindSheet($$this.captchaDemoShow, this.CaptchaDemoSheetBuilder, {
      title: { title: '验证码弹窗演示' },
      backgroundColor: $r('sys.color.ohos_id_color_dialog_bg'),
      detents: [SheetSize.MEDIUM, SheetSize.LARGE]
    })
  }
}
