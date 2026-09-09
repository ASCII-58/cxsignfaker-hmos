import request from '@ohos.request';
import fs from '@ohos.file.fs';
import { Context } from '@kit.AbilityKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { image } from '@kit.ImageKit';
import { ChaoXingApi } from './PublicAPI';
import { Sign } from './sign';
import { ChaoxingUtils } from './utils';

const TAG = 'CloudUpload';
const DOMAIN = 0x0011;
const UPLOAD_TIMEOUT_MS = 30000;
// 随机差异化参数（issue #209：服务端新增重复图片检测），裁剪比例与 faceApi.randomizeFaceImage 保持一致
const MAX_DECODE_EDGE = 2048;
const JPEG_QUALITY_MIN = 85;
const JPEG_QUALITY_MAX = 95;

// 随机化串行队列：多用户并发上传时限制同时解码大图的内存峰值
let randomizeChain: Promise<void> = Promise.resolve();

/**
 * 把 EXIF Orientation(1-8) 烧录到像素中。
 * 解码不会自动应用图片方向，重编码又会丢弃 EXIF，必须先旋转到位，否则竖拍照片会以横向上传
 */
async function applyExifOrientation(pixelMap: image.PixelMap, orientation: number): Promise<void> {
  switch (orientation) {
    case 2:
      await pixelMap.flip(true, false);
      break;
    case 3:
      await pixelMap.rotate(180);
      break;
    case 4:
      await pixelMap.flip(false, true);
      break;
    case 5:
      await pixelMap.rotate(90);
      await pixelMap.flip(true, false);
      break;
    case 6:
      await pixelMap.rotate(90);
      break;
    case 7:
      await pixelMap.rotate(270);
      await pixelMap.flip(true, false);
      break;
    case 8:
      await pixelMap.rotate(270);
      break;
    default:
      break;
  }
}

/**
 * 对缓存图片做随机差异化处理（随机裁剪 90%~99% + 随机质量重编码），原地覆盖。
 * 同一张源图每次处理结果都不同，规避服务端重复图片检测；极小图直接跳过保留原图
 */
export async function randomizeImageInPlace(filePath: string): Promise<void> {
  const imageSource = image.createImageSource(filePath);
  let pixelMap: image.PixelMap | null = null;
  let imagePacker: image.ImagePacker | null = null;
  try {
    let orientation = 1;
    try {
      const parsed = Number.parseInt(await imageSource.getImageProperty('Orientation'), 10);
      if (!Number.isNaN(parsed)) {
        orientation = parsed;
      }
    } catch {
      // 无 EXIF（如 PNG）时忽略方向处理
    }

    // 限制解码尺寸，避免高像素照片解码时内存峰值过高
    const srcInfo = await imageSource.getImageInfo();
    const srcW = srcInfo.size.width;
    const srcH = srcInfo.size.height;
    let decodeW = srcW;
    let decodeH = srcH;
    if (Math.max(srcW, srcH) > MAX_DECODE_EDGE) {
      const k = MAX_DECODE_EDGE / Math.max(srcW, srcH);
      decodeW = Math.max(1, Math.floor(srcW * k));
      decodeH = Math.max(1, Math.floor(srcH * k));
    }
    pixelMap = await imageSource.createPixelMap({ desiredSize: { width: decodeW, height: decodeH }, editable: true });
    await applyExifOrientation(pixelMap, orientation);

    const info = await pixelMap.getImageInfo();
    const width = info.size.width;
    const height = info.size.height;
    const cropWidth = Math.floor(width * (0.9 + Math.random() * 0.09));
    const cropHeight = Math.floor(height * (0.9 + Math.random() * 0.09));
    if (cropWidth < 1 || cropHeight < 1) {
      return;
    }
    const cropX = Math.floor(Math.random() * (width - cropWidth));
    const cropY = Math.floor(Math.random() * (height - cropHeight));
    await pixelMap.crop({ x: cropX, y: cropY, size: { width: cropWidth, height: cropHeight } });

    const quality = JPEG_QUALITY_MIN + Math.floor(Math.random() * (JPEG_QUALITY_MAX - JPEG_QUALITY_MIN + 1));
    imagePacker = image.createImagePacker();
    const packedBuffer = await imagePacker.packToData(pixelMap, { format: 'image/jpeg', quality: quality });
    const file = fs.openSync(filePath, fs.OpenMode.READ_WRITE | fs.OpenMode.CREATE | fs.OpenMode.TRUNC);
    try {
      fs.writeSync(file.fd, packedBuffer);
    } finally {
      fs.closeSync(file);
    }
    hilog.info(DOMAIN, TAG, 'image randomized: %dx%d -> crop(%d,%d,%dx%d) q%d',
      srcW, srcH, cropX, cropY, cropWidth, cropHeight, quality);
  } finally {
    pixelMap?.release();
    imagePacker?.release();
    imageSource.release();
  }
}

/** 排队执行随机化；单个失败不阻断队列中的后续任务 */
function enqueueRandomize(filePath: string): Promise<void> {
  const task: Promise<void> = randomizeChain.then(() => randomizeImageInPlace(filePath));
  randomizeChain = task.catch(() => {
  });
  return task;
}

/**
 * 上传图片到超星云盘，返回 objectId
 * （拍照签到与人脸照片共用；内部完成 _token 获取与 multipart 上传）
 *
 * @param context UIAbilityContext
 * @param cookies 用户 Cookie
 * @param puid 用户 puid
 * @param srcUri 本地图片路径或媒体库 URI
 * @param onProgress 可选，上传进度回调（0-100）
 * @param randomize 可选，上传前是否做随机差异化处理（默认 true）；
 *   已由 randomizeFaceImage 随机化过的人脸图应传 false，避免二次裁剪影响人脸比对
 */
export async function uploadImageForObject(context: Context, cookies: string, puid: string,
  srcUri: string, onProgress?: (percent: number) => void, randomize: boolean = true): Promise<string> {
  const token = await Sign.GetToken(cookies);
  const fileName = ChaoxingUtils.generatePhotoName() + '.jpg';
  const copyFilePath = context.cacheDir + '/' + fileName;
  // 相册选择器返回 file://media/... URI，copyFile 不支持 URI 入参，需先 openSync 取 fd 再按 fd 复制
  const srcFile = fs.openSync(srcUri, fs.OpenMode.READ_ONLY);
  try {
    fs.copyFileSync(srcFile.fd, copyFilePath);
  } finally {
    fs.closeSync(srcFile.fd);
  }
  // 图片随机差异化（issue #209：服务端新增重复图片检测，教师端会标红相同图片）：
  // 同一张源图多次上传时内容各不相同；随机化失败不阻断签到，回退为原图上传
  if (randomize) {
    try {
      await enqueueRandomize(copyFilePath);
    } catch (e) {
      hilog.warn(DOMAIN, TAG, 'randomize image failed, upload original: %{public}s',
        (e as Error).message);
    }
  }
  const uploadConfig: request.UploadConfig = {
    url: `${ChaoXingApi.URL_UPLOAD_PHOTO.toString()}&_token=${token}`,
    method: 'POST',
    header: { 'Content-Type': 'multipart/form-data' },
    files: [{
      filename: fileName,
      type: 'jpg',
      name: 'file',
      uri: `internal://cache/${fileName}`
    }],
    data: [{ name: 'puid', value: puid }]
  };
  const task = await request.uploadFile(context, uploadConfig);
  return await new Promise<string>((resolve, reject) => {
    let settled = false;
    if (onProgress) {
      task.on('progress', (uploadedSize: number, totalSize: number) => {
        hilog.info(DOMAIN, TAG, 'upload progress: %d/%d', uploadedSize, totalSize);
        if (totalSize > 0 && uploadedSize <= totalSize) {
          onProgress(Math.min(100, Math.round(uploadedSize * 100 / totalSize)));
        }
      });
    }
    task.on('headerReceive', (value) => {
      if (settled || !(value && value['body'])) {
        return;
      }
      try {
        const bodyObj = JSON.parse(value['body']) as object;
        const objectId = bodyObj['objectId'] as string;
        if (objectId) {
          settled = true;
          resolve(objectId);
        }
      } catch (e) {
        hilog.error(DOMAIN, TAG, 'Failed to parse upload response', e);
      }
    });
    task.on('fail', () => {
      if (!settled) {
        settled = true;
        reject(new Error('图片上传失败'));
      }
    });
    setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('图片上传超时'));
      }
    }, UPLOAD_TIMEOUT_MS);
  });
}
