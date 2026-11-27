import { Http } from './httpClient';
import { UPDATE_CHECK_API } from './PublicAPI';
import { PREF_UPDATE_OPEN_LINK, SETTINGS_PREF_NAME } from './settingsKeys';
import { preferences } from '@kit.ArkData';
import { bundleManager, common, Want } from '@kit.AbilityKit';
import { BusinessError } from '@kit.BasicServicesKit';

export interface LatestRelease {
  version: string
  ext: string
  signed: boolean
  uploadedAt: string
  download: string
}

/** 简单语义化版本比较：逐段比数字，缺少的段按 0 计；不可解析的段按 0 计 */
export function isNewerVersion(latest: string, current: string): boolean {
  const a = latest.split('.');
  const b = current.split('.');
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = parseInt(a[i] ?? '0', 10) || 0;
    const bv = parseInt(b[i] ?? '0', 10) || 0;
    if (av > bv) {
      return true;
    }
    if (av < bv) {
      return false;
    }
  }
  return false;
}

export async function getAppVersion(): Promise<string> {
  try {
    const info = await bundleManager.getBundleInfoForSelf(bundleManager.BundleFlag.GET_BUNDLE_INFO_WITH_APPLICATION);
    return info.versionName;
  } catch (error) {
    console.error('Failed to get bundle info', error);
    return '';
  }
}

/** 启动时检查：无更新返回 null；接口失败静默忽略，不阻塞启动 */
export async function checkForUpdate(): Promise<LatestRelease | null> {
  const current = await getAppVersion();
  if (current === '') {
    return null;
  }
  try {
    const result = await Http.get(UPDATE_CHECK_API);
    if (result.code !== 200) {
      return null;
    }
    const data = JSON.parse(result.body) as LatestRelease;
    if (!data.version || !data.download || !isNewerVersion(data.version, current)) {
      return null;
    }
    return data;
  } catch (error) {
    console.error('Update check failed', JSON.stringify(error));
    return null;
  }
}

/** 更新弹窗按钮动作由设置决定：默认复制，开启后直接打开下载链接 */
export async function shouldOpenDownloadLink(context: common.Context): Promise<boolean> {
  try {
    const pref = await preferences.getPreferences(context, SETTINGS_PREF_NAME);
    return await pref.get(PREF_UPDATE_OPEN_LINK, false) as boolean;
  } catch (error) {
    console.error('Failed to load update link mode', JSON.stringify(error));
    return false;
  }
}

export async function saveOpenDownloadLink(context: common.Context, open: boolean): Promise<void> {
  try {
    const pref = await preferences.getPreferences(context, SETTINGS_PREF_NAME);
    await pref.put(PREF_UPDATE_OPEN_LINK, open);
    await pref.flush();
  } catch (error) {
    console.error('Failed to save update link mode', JSON.stringify(error));
  }
}

export function openDownloadLink(context: common.Context, url: string): void {
  const want: Want = {
    action: 'ohos.want.action.viewData',
    entities: ['entity.system.browsable'],
    uri: url
  };
  (context as common.UIAbilityContext).startAbility(want).catch((err: BusinessError) => {
    console.error('Failed to open download link', JSON.stringify(err));
  });
}
