import { promptAction } from '@kit.ArkUI';
import { common } from '@kit.AbilityKit';
import { preferences } from '@kit.ArkData';
import { image } from '@kit.ImageKit';
import { picker } from '@kit.CoreFileKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import fs from '@ohos.file.fs';
import { DatabaseManager } from '../utils/DataBase';
import { MsCaptchaDetector } from '../utils/detector/MsCaptchaDetector';
import { CaptchaComponent, CaptchaUserParam } from './Captcha';
import { Sign, parseSignResult } from '../utils/sign';
import { writeBufferToFile } from '../utils/httpClient';
import { FaceApi, FaceResultParam, randomizeFaceImage } from '../utils/faceApi';
import { randomizeImageInPlace } from '../utils/upload';
import { sendTestCrashReport } from '../utils/CrashReporter';

const ONNX_TEST_TAG = 'OnnxTest';

const SIGN_TIME = 'sign_time';
const VERSION = 'version';
const SIGN_EXPIRY_MS = 12 * 30 * 24 * 60 * 60 * 1000;
const BACKUP_REMINDER_MS = 11 * 30 * 24 * 60 * 60 * 1000;

const IMAGE_RAWFILE = 'models/test.jpg';

/** 本地解析用例：签到接口原始返回文本 → 期望解析出的 SignOutcome.kind */
interface ParseCase {
  raw: string;
  expectKind: string;
}

const PARSE_CASES: ParseCase[] = [
  { raw: 'success', expectKind: 'success' },
  { raw: '[face]检测到非本人', expectKind: 'face' },
  { raw: 'success2', expectKind: 'ended' },
  { raw: '签到失败，请重新扫描。', expectKind: 'qrcodeExpired' },
  { raw: 'errorLocation_512', expectKind: 'wrongPosition' },
  { raw: '您已签到过了', expectKind: 'already' },
  { raw: 'validate:abcdef123456', expectKind: 'captcha' },
  { raw: '<html>500 Internal Server Error</html>', expectKind: 'error' }
];

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
  // 签到验证本地校验（不访问网络）
  @State testClientId: string = '';
  @State testLog: string = '尚未运行任何测试';
  @State testRunning: boolean = false;
  // 人脸识别全流程本地模拟（不访问网络）
  @State faceLog: string = '尚未运行';
  @State faceImagePath: string = '';
  // 图片随机化本地演示（issue #209，仅本地展示不上传）
  @State randSrcPath: string = '';
  @State randOutPath: string = '';
  @State randLog: string = '尚未运行';
  private randSrcRound: number = 0;
  private randOutRound: number = 0;
  private lastRandHash: string = '';
  // 默认人脸查看（联网：主用户 cookie 拉取云盘默认人脸，仅查看）
  @State profileLog: string = '尚未获取';
  @State profileImagePath: string = '';
  // 崩溃上报链路状态（CrashReporter 写入 AppStorage，用于 Debug 面板排查）
  @StorageProp('crashReportStatus') crashReportStatus: string = '';
  // 崩溃邮件发送链路测试（不崩溃，直接 POST 测试负载到 Worker）
  @State crashSending: boolean = false;
  @State crashSendLog: string = '尚未发送';

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

  /** 崩溃邮件发送链路测试：不制造崩溃，直接 POST 一条测试负载到 Worker（等价于崩溃后重启时上报的那次请求） */
  private async testCrashSend() {
    if (this.crashSending) {
      return;
    }
    this.crashSending = true;
    this.crashSendLog = '发送中...';
    try {
      await sendTestCrashReport();
      this.crashSendLog = '✔ 发送成功（HTTP 200），请查收邮箱';
      promptAction.showToast({ message: '测试邮件已提交，请查收邮箱' });
    } catch (e) {
      this.crashSendLog = `✘ 发送失败: ${(e as Error).message}`;
      promptAction.showToast({ message: '发送失败，详见日志' });
    } finally {
      this.crashSending = false;
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

  private logLine(line: string) {
    this.testLog = `${line}\n${this.testLog}`;
  }

  private async runTest(name: string, fn: () => Promise<void>, sink?: (line: string) => void) {
    if (this.testRunning) {
      promptAction.showToast({ message: '测试运行中，请稍候' });
      return;
    }
    this.testRunning = true;
    const log: (line: string) => void =
      sink !== undefined ? sink : (line: string): void => { this.logLine(line); };
    log(`▶ [${name}] 开始`);
    try {
      await fn();
      log(`✔ [${name}] 完成`);
    } catch (e) {
      log(`✘ [${name}] 失败: ${(e as Error).message}`);
    } finally {
      this.testRunning = false;
    }
  }

  /** 1. 签到结果解析 parseSignResult 全分支（success/face/ended/二维码过期/位置/重复/验证码/错误） */
  private async testParseSignResult() {
    let pass = 0;
    for (const c of PARSE_CASES) {
      const outcome = parseSignResult(c.raw);
      const ok = outcome.kind === c.expectKind;
      if (ok) {
        pass++;
      }
      this.logLine(`${ok ? '✔' : '✘'} "${c.raw.substring(0, 16)}" → ${outcome.kind}` +
        `${ok ? '' : `（期望 ${c.expectKind}）`}`);
    }
    if (pass !== PARSE_CASES.length) {
      throw new Error(`${PARSE_CASES.length - pass} 个分支不符`);
    }
  }

  /** 2. 设备码生成（88 位 Base64，全部签到请求共用） */
  private async testDeviceCode() {
    const code = await Sign.generateDeviceCode();
    if (code.length !== 88) {
      throw new Error(`deviceCode 长度 ${code.length}，预期 88`);
    }
    this.logLine(`deviceCode 长度=88 ✔ ${code.substring(0, 16)}...`);
  }

  /** 3. clientId 解密（人脸 signToken 依赖的 cid/sc，纯本地 RSA 还原） */
  private async testDecryptClientId() {
    if (!this.testClientId.trim()) {
      throw new Error('请先在输入框粘贴 clientId');
    }
    const info = FaceApi.decryptClientId(this.testClientId.trim());
    if (!info) {
      throw new Error('clientId 解密失败（格式非法或公钥不匹配）');
    }
    this.logLine(`cid=${info.cid.substring(0, 16)}... sc=${info.sc.substring(0, 8)}...`);
  }

  /** 4. 人脸 faceResult 构造（buildFaceResult + signToken MD5，纯本地） */
  private async testBuildFaceResult() {
    const clientId = this.testClientId.trim();
    const r = JSON.parse(FaceApi.buildFaceResult('debugObjectId', clientId || undefined)) as FaceResultParam;
    if (r.currentFaceId !== 'debugObjectId' || r.LiveDetectionStatus !== 1 || r.collectStatus !== 1) {
      throw new Error('faceResult 基础字段不符');
    }
    if (r.signToken) {
      if (r.signToken.length !== 32) {
        throw new Error(`signToken 长度 ${r.signToken.length}，预期 32 位 MD5`);
      }
      this.logLine(`faceResult ✔ signToken=${r.signToken.substring(0, 12)}...（含 clientId 签名）`);
    } else {
      this.logLine('faceResult ✔ 基础字段正确（未填 clientId，跳过 signToken 签名）');
    }
  }

  /** 5. 人脸识别全流程本地模拟：默认人脸(模拟)→随机化裁剪(真实)→faceResult(真实)→签到解析(真实) */
  private async testFaceFlow() {
    this.faceLog = '';
    const rawPath = `${this.context.cacheDir}/debug_face_raw.jpg`;
    const processedPath = `${this.context.cacheDir}/debug_face_processed.jpg`;
    this.cleanupFile(rawPath);
    this.cleanupFile(processedPath);
    try {
      // ① 模拟 DownloadFaceImage：内置测试图充当云端默认人脸
      const buf = this.context.resourceManager.getRawFileContentSync(IMAGE_RAWFILE);
      writeBufferToFile(rawPath, buf.buffer as ArrayBuffer);
      const rawSize = await this.readImageSize(rawPath);
      this.faceLogLine(`① 模拟默认人脸 ${rawSize.width}×${rawSize.height}`);

      // ② 随机化裁剪（与 FacePicker 共用同一实现）
      await randomizeFaceImage(rawPath, processedPath);
      const stat = fs.statSync(processedPath);
      const head = new Uint8Array(2);
      const fd = fs.openSync(processedPath, fs.OpenMode.READ_ONLY);
      try {
        fs.readSync(fd.fd, head.buffer as ArrayBuffer);
      } finally {
        fs.closeSync(fd);
      }
      if (head[0] !== 0xFF || head[1] !== 0xD8) {
        throw new Error('输出不是有效 JPEG');
      }
      const outSize = await this.readImageSize(processedPath);
      if (outSize.width > rawSize.width || outSize.width < Math.floor(rawSize.width * 0.9) ||
        outSize.height > rawSize.height || outSize.height < Math.floor(rawSize.height * 0.9)) {
        throw new Error(`裁剪尺寸异常 ${outSize.width}×${outSize.height}`);
      }
      this.faceImagePath = processedPath;
      this.faceLogLine(`② 随机化裁剪 ✔ ${outSize.width}×${outSize.height}（${stat.size}B）`);

      // ③ 模拟上传得到 objectId，构造 faceResult（真实 buildFaceResult，clientId 选填验签名）
      const objectId = `mock${Date.now()}`;
      const clientId = this.testClientId.trim();
      const r = JSON.parse(FaceApi.buildFaceResult(objectId, clientId || undefined)) as FaceResultParam;
      if (r.currentFaceId !== objectId) {
        throw new Error('faceResult 字段不符');
      }
      if (r.signToken) {
        this.faceLogLine(`③ faceResult ✔ signToken=${r.signToken.substring(0, 8)}...（含 clientId 签名）`);
      } else {
        this.faceLogLine('③ faceResult ✔ 字段正确（未填 clientId，跳过签名）');
      }

      // ④ 模拟签到接口返回非本人（真实 parseSignResult）
      const outcome = parseSignResult('[face]检测到非本人');
      if (outcome.kind !== 'face') {
        throw new Error(`解析为 ${outcome.kind}，预期 face`);
      }
      this.faceLogLine('④ 签到响应解析 ✔ face 分支（检测到非本人）');
    } finally {
      this.cleanupFile(rawPath);
      // processedPath 保留供预览，下次运行时覆盖
    }
  }

  private faceLogLine(line: string) {
    this.faceLog = `${line}\n${this.faceLog}`;
  }

  /** 6. 默认人脸查看（联网：主用户 cookie → 云盘默认人脸 objectId → 下载显示，仅查看不上传） */
  private async fetchProfileFace() {
    this.profileLog = '';
    const path = `${this.context.cacheDir}/debug_face_profile.jpg`;
    this.cleanupFile(path);
    const user = await DatabaseManager.getInstance().getUserById(0);
    if (!user) {
      throw new Error('主用户未登录');
    }
    const objectId = await FaceApi.GetProfileFaceObjectId(user.cookies);
    this.profileLogLine(`① objectId=${objectId}`);
    await FaceApi.DownloadFaceImage(objectId, path);
    const size = await this.readImageSize(path);
    this.profileImagePath = path;
    this.profileLogLine(`② 已下载 ${size.width}×${size.height}（仅本地显示，未上传未签到）`);
  }

  private profileLogLine(line: string) {
    this.profileLog = `${line}\n${this.profileLog}`;
  }

  /** 图片随机化本地演示（issue #209）：与真实上传共用 randomizeImageInPlace，仅本地展示，不上传不联网 */
  private async testImageRandomize(pickNew: boolean) {
    this.randLog = '';
    let srcPath = this.randSrcPath;
    if (pickNew || srcPath === '') {
      const photoSelectOptions = new picker.PhotoSelectOptions();
      photoSelectOptions.MIMEType = picker.PhotoViewMIMETypes.IMAGE_TYPE;
      photoSelectOptions.maxSelectNumber = 1;
      const photoViewPicker = new picker.PhotoViewPicker();
      const res = await photoViewPicker.select(photoSelectOptions);
      if (!res.photoUris || res.photoUris.length === 0) {
        this.randLog = '已取消选择';
        return;
      }
      this.randSrcRound++;
      srcPath = `${this.context.cacheDir}/debug_rand_src_${this.randSrcRound}.jpg`;
      const srcFile = fs.openSync(res.photoUris[0], fs.OpenMode.READ_ONLY);
      try {
        fs.copyFileSync(srcFile.fd, srcPath);
      } finally {
        fs.closeSync(srcFile.fd);
      }
      this.randSrcPath = srcPath;
      this.lastRandHash = '';
    }

    // 每轮换新文件名，避免 Image 组件按路径缓存旧图；上一轮输出随手清理
    this.randOutRound++;
    const outPath = `${this.context.cacheDir}/debug_rand_out_${this.randOutRound}.jpg`;
    this.cleanupFile(`${this.context.cacheDir}/debug_rand_out_${this.randOutRound - 1}.jpg`);

    const srcStat = fs.statSync(srcPath);
    const srcSize = await this.readImageSize(srcPath);
    const srcHash = await this.fileFnvHash(srcPath);
    this.randLogLine(`① 源图 ${srcSize.width}×${srcSize.height} ${(srcStat.size / 1048576).toFixed(2)}MB hash=${srcHash}`);

    // 与 uploadImageForObject 相同的前置动作：复制到缓存后原地随机化
    const copyFile = fs.openSync(srcPath, fs.OpenMode.READ_ONLY);
    try {
      fs.copyFileSync(copyFile.fd, outPath);
    } finally {
      fs.closeSync(copyFile.fd);
    }
    await randomizeImageInPlace(outPath);

    const outStat = fs.statSync(outPath);
    const outSize = await this.readImageSize(outPath);
    const outHash = await this.fileFnvHash(outPath);
    this.randOutPath = outPath;
    this.randLogLine(`② 随机化后 ${outSize.width}×${outSize.height} ${(outStat.size / 1048576).toFixed(2)}MB hash=${outHash}`);
    if (outHash === srcHash) {
      throw new Error('输出与源图字节相同，随机化未生效');
    }
    if (this.lastRandHash !== '' && outHash === this.lastRandHash) {
      throw new Error('与上一轮输出字节相同，随机化未生效');
    }
    this.randLogLine(`✔ 字节与源图${this.lastRandHash === '' ? '' : '及上一轮'}不同，教师端/服务端将视为不同图片`);
    this.lastRandHash = outHash;
  }

  private randLogLine(line: string) {
    this.randLog = `${line}\n${this.randLog}`;
  }

  /** FNV-1a 32 位文件哈希（仅本地对比用，非加密哈希） */
  private async fileFnvHash(path: string): Promise<string> {
    const size = fs.statSync(path).size;
    const buf = new ArrayBuffer(size);
    const fd = fs.openSync(path, fs.OpenMode.READ_ONLY);
    try {
      fs.readSync(fd.fd, buf);
    } finally {
      fs.closeSync(fd);
    }
    const u8 = new Uint8Array(buf);
    let h = 0x811c9dc5;
    for (let i = 0; i < u8.length; i++) {
      h ^= u8[i];
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }

  private async readImageSize(path: string): Promise<image.Size> {
    const source = image.createImageSource(path);
    try {
      const info = await source.getImageInfo();
      return info.size;
    } finally {
      source.release();
    }
  }

  private cleanupFile(path: string) {
    try {
      fs.unlinkSync(path);
    } catch {
      // 文件不存在等场景忽略
    }
  }

  /** 签到验证本地校验按钮见 build() 中「签到验证（本地校验）」卡片 */

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

            if (this.crashReportStatus !== '') {
              Text(`崩溃上报：${this.crashReportStatus}`)
                .fontSize(12)
                .fontColor($r('sys.color.ohos_id_color_text_secondary'))
                .width('100%')
                .margin({ bottom: 8, left: 4 })
            }

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

              Divider()
                .color($r('sys.color.ohos_id_color_list_separator'))
                .margin({ left: 12, right: 12 })

              Row() {
                Text('模拟崩溃（验证邮件上报，重启后发送）')
                  .fontSize(14)
                  .fontColor($r('sys.color.ohos_id_color_text_primary'))
                Blank()
                Image($r('app.media.arrow_right')) .draggable(false)
                  .width(16).height(16)
                  .fillColor($r('sys.color.ohos_id_color_text_tertiary'))
              }
              .width('100%').padding(12)
              .onClick(() => {
                // 未捕获异常 → js crash，进程退出；下次启动由 CrashReporter 上报邮件
                throw new Error('DebugPage 模拟崩溃：验证 CrashReporter 邮件链路');
              })

              Divider()
                .color($r('sys.color.ohos_id_color_list_separator'))
                .margin({ left: 12, right: 12 })

              Row() {
                Text('发送测试报告（不崩溃，直接验证上报链路）')
                  .fontSize(14)
                  .fontColor($r('sys.color.ohos_id_color_text_primary'))
                Blank()
                Button(this.crashSending ? '发送中' : '发送')
                  .fontSize(13)
                  .height(32)
                  .enabled(!this.crashSending)
                  .onClick(() => { this.testCrashSend() })
              }
              .width('100%').padding(12)
            }
            .backgroundColor($r('sys.color.ohos_id_color_list_card_bg'))
            .borderRadius(16)

            Text(this.crashSendLog)
              .fontSize(12)
              .fontColor($r('sys.color.ohos_id_color_text_tertiary'))
              .width('100%')
              .margin({ top: 6, left: 4 })
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
            Text('签到验证（本地校验）')
              .fontSize(14)
              .fontColor($r('sys.color.ohos_id_color_text_secondary'))
              .width('100%')
              .margin({ bottom: 8, left: 4 })

            Column({ space: 8 }) {
              TextInput({ placeholder: 'clientId（选填，用户信息接口返回值）', text: $$this.testClientId })
                .width('100%')
                .height(40)
                .fontSize(13)
                .backgroundColor($r('sys.color.ohos_id_color_text_field_sub_bg'))

              Row({ space: 8 }) {
                Button('签到结果解析')
                  .layoutWeight(1).fontSize(13).height(36)
                  .enabled(!this.testRunning)
                  .onClick(() => { this.runTest('签到结果解析', (): Promise<void> => this.testParseSignResult()) })
                Button('设备码生成')
                  .layoutWeight(1).fontSize(13).height(36)
                  .enabled(!this.testRunning)
                  .onClick(() => { this.runTest('设备码生成', (): Promise<void> => this.testDeviceCode()) })
              }
              .width('100%')

              Row({ space: 8 }) {
                Button('clientId解密')
                  .layoutWeight(1).fontSize(13).height(36)
                  .enabled(!this.testRunning)
                  .onClick(() => { this.runTest('clientId解密', (): Promise<void> => this.testDecryptClientId()) })
                Button('faceResult构造')
                  .layoutWeight(1).fontSize(13).height(36)
                  .enabled(!this.testRunning)
                  .onClick(() => { this.runTest('faceResult构造', (): Promise<void> => this.testBuildFaceResult()) })
              }
              .width('100%')

              Text('说明：全部本地计算，不访问网络。clientId 选填，填入后可校验解密与 signToken 签名；滑块模型检测见上方独立卡片。')
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

        ListItem() {
          Column() {
            Text('人脸识别（本地模拟）')
              .fontSize(14)
              .fontColor($r('app.color.secondary_text'))
              .width('100%')
              .margin({ bottom: 8, left: 4 })

            Column({ space: 8 }) {
              Row({ space: 12 }) {
                if (this.faceImagePath !== '') {
                  Image(`file://${this.faceImagePath}`)
                    .draggable(false)
                    .height(64)
                    .borderRadius(8)
                    .objectFit(ImageFit.Contain)
                } else {
                  Text('运行后显示随机化结果')
                    .fontSize(12)
                    .fontColor($r('app.color.secondary_text'))
                }
                Blank()
                Button(this.testRunning ? '运行中...' : '运行人脸流程模拟')
                  .fontSize(13)
                  .height(36)
                  .enabled(!this.testRunning)
                  .onClick(() => {
                    this.runTest('人脸流程模拟', (): Promise<void> => this.testFaceFlow(),
                      (line: string): void => { this.faceLogLine(line); })
                  })
              }
              .width('100%')

              Text(this.faceLog)
                .fontSize(12)
                .fontColor($r('app.color.primary_text'))
                .width('100%')
                .padding(8)
                .borderRadius(8)
                .backgroundColor($r('app.color.page_background'))

              Text('说明：默认人脸下载/上传/enc 校验用本地数据模拟（不访问网络）；随机裁剪、faceResult 构造、签到响应解析为真实实现。clientId 选填（上方输入框），填入后校验 signToken 签名。')
                .fontSize(11)
                .fontColor($r('app.color.secondary_text'))
                .width('100%')
            }
            .backgroundColor($r('app.color.card_background'))
            .borderRadius(16)
            .padding(12)
          }
        }

        ListItem() {
          Column() {
            Text('默认人脸查看（联网）')
              .fontSize(14)
              .fontColor($r('app.color.secondary_text'))
              .width('100%')
              .margin({ bottom: 8, left: 4 })

            Column({ space: 8 }) {
              Row({ space: 12 }) {
                if (this.profileImagePath !== '') {
                  Image(`file://${this.profileImagePath}`)
                    .draggable(false)
                    .height(64)
                    .borderRadius(8)
                    .objectFit(ImageFit.Contain)
                } else {
                  Text('获取后显示云盘默认人脸')
                    .fontSize(12)
                    .fontColor($r('app.color.secondary_text'))
                }
                Blank()
                Button(this.testRunning ? '运行中...' : '获取默认人脸')
                  .fontSize(13)
                  .height(36)
                  .enabled(!this.testRunning)
                  .onClick(() => {
                    this.runTest('默认人脸获取', (): Promise<void> => this.fetchProfileFace(),
                      (line: string): void => { this.profileLogLine(line); })
                  })
              }
              .width('100%')

              Text(this.profileLog)
                .fontSize(12)
                .fontColor($r('app.color.primary_text'))
                .width('100%')
                .padding(8)
                .borderRadius(8)
                .backgroundColor($r('app.color.page_background'))

              Text('说明：用主用户 cookie 只读拉取云盘账号默认人脸，仅本地显示，不随机化、不上传、不签到。上游提示：拿原始默认人脸去签到可能被风控识别，影响账号安全。')
                .fontSize(11)
                .fontColor($r('app.color.secondary_text'))
                .width('100%')
            }
            .backgroundColor($r('app.color.card_background'))
            .borderRadius(16)
            .padding(12)
          }
        }
        ListItem() {
          Column() {
            Text('图片随机化（本地演示）')
              .fontSize(14)
              .fontColor($r('app.color.secondary_text'))
              .width('100%')
              .margin({ bottom: 8, left: 4 })

            Column({ space: 8 }) {
              Row({ space: 12 }) {
                Column({ space: 4 }) {
                  if (this.randSrcPath !== '') {
                    Image(`file://${this.randSrcPath}`)
                      .draggable(false)
                      .width(64).height(64)
                      .borderRadius(8)
                      .objectFit(ImageFit.Cover)
                  } else {
                    Column()
                      .width(64).height(64)
                      .borderRadius(8)
                      .backgroundColor($r('app.color.page_background'))
                  }
                  Text('源图')
                    .fontSize(11)
                    .fontColor($r('app.color.secondary_text'))
                }

                Column({ space: 4 }) {
                  if (this.randOutPath !== '') {
                    Image(`file://${this.randOutPath}`)
                      .draggable(false)
                      .width(64).height(64)
                      .borderRadius(8)
                      .objectFit(ImageFit.Cover)
                  } else {
                    Column()
                      .width(64).height(64)
                      .borderRadius(8)
                      .backgroundColor($r('app.color.page_background'))
                  }
                  Text('随机化后')
                    .fontSize(11)
                    .fontColor($r('app.color.secondary_text'))
                }

                Blank()

                Button(this.testRunning ? '运行中...' : '选择图片并随机化')
                  .fontSize(13)
                  .height(36)
                  .enabled(!this.testRunning)
                  .onClick(() => {
                    this.runTest('图片随机化', (): Promise<void> => this.testImageRandomize(true),
                      (line: string): void => { this.randLogLine(line); })
                  })
              }
              .width('100%')

              Button('同一张图再随机一次')
                .fontSize(13)
                .height(36)
                .width('100%')
                .enabled(!this.testRunning && this.randSrcPath !== '')
                .onClick(() => {
                  this.runTest('图片随机化(同图复跑)', (): Promise<void> => this.testImageRandomize(false),
                    (line: string): void => { this.randLogLine(line); })
                })

              Text(this.randLog)
                .fontSize(12)
                .fontColor($r('app.color.primary_text'))
                .width('100%')
                .padding(8)
                .borderRadius(8)
                .backgroundColor($r('app.color.page_background'))

              Text('说明：与拍照签到上传共用同一 randomizeImageInPlace（EXIF 烧录 + 随机裁剪 90%~99% + 随机质量 85~95 重编码），对比源图/输出的尺寸、大小与哈希；同一张图每轮字节都不同（issue #209 服务端重复图片检测）。全程仅本地缓存目录，不上传不联网。')
                .fontSize(11)
                .fontColor($r('app.color.secondary_text'))
                .width('100%')
            }
            .backgroundColor($r('app.color.card_background'))
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
