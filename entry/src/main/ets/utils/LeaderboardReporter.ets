import { hilog } from '@kit.PerformanceAnalysisKit';
import { common } from '@kit.AbilityKit';
import { preferences } from '@kit.ArkData';
import { Http } from './httpClient';
import { DatabaseManager, SignRecord } from './DataBase';
import { loginFunction, UserInfo } from './Login';
import { ChaoxingUtils } from './utils';
import {
  SETTINGS_PREF_NAME,
  PREF_LB_SYNC_ENABLED,
  PREF_LB_DISPLAY_NAME,
  PREF_LB_HIDE_SCHOOL,
  PREF_LB_UUID,
  PREF_LB_LAST_UPLOAD_DATE,
  PREF_LB_LAST_UPLOAD_MS
} from './settingsKeys';

const TAG = 'LeaderboardReporter';
const DOMAIN = 0x0010;

const WORKER_URL = 'https://crash.ascii58.dpdns.org';
/** 与 Worker 环境变量 LB_TOKEN 一致的共享口令 */
const LB_TOKEN = '549200ccc8254e17bf4d9e126b211f811b619f3e7d3542c6854868f28fa55d25';

/** 每日聚合上报负载：只有匿名 uuid、展示名、学校与分类计数，不含真实 uid/姓名/活动信息 */
export interface LeaderboardPayload {
  uuid: string
  name: string
  school_name: string
  latest_date: string
  other_sign: number
  photo_sign: number
  gesture_sign: number
  click_sign: number
  location_sign: number
  qrcode_sign: number
  password_sign: number
  total_sign_count: number
}

export interface SyncOutcome {
  total: number
  synced: number
  failed: number
  skipped: number
}

/** 榜单条目：对齐上游展示字段（展示名 + 学校 + 总签到次数/代签次数 + 分类次数） */
export interface LeaderboardEntry {
  uuid: string
  name: string
  school_name: string
  total_sign_count: number
  other_sign: number
  photo_sign: number
  gesture_sign: number
  click_sign: number
  location_sign: number
  qrcode_sign: number
  password_sign: number
  latest_date: string
  updated_at: number
}

interface LeaderboardResponse {
  ok: boolean
  list: LeaderboardEntry[]
  error?: string
}

/** 一条记录的分类计数槽位 */
class SignCounts {
  other: number = 0
  photo: number = 0
  gesture: number = 0
  click: number = 0
  location: number = 0
  qrcode: number = 0
  password: number = 0

  total(): number {
    return this.photo + this.gesture + this.click + this.location + this.qrcode + this.password;
  }
}

/** 主用户签到记录的标识（SignerPage 对主用户追加的后缀 / 签退使用的标签） */
function isHostRecord(uname: string, hostUname: string): boolean {
  if (uname === '主用户' || uname.endsWith(' (主用户)')) {
    return true;
  }
  return hostUname.length > 0 && (uname === hostUname || uname === `${hostUname} (主用户)`);
}

function dateString(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 排行榜数据上报：
 * 只上报主用户，且只上报每日聚合后的匿名画像（uuid + 展示名 + 学校 + 分类计数）；
 * 详细签到记录始终只留在本地 SignRecord 表，不上传活动 id / 名称 / 真实昵称 / 真实 uid。
 */
export class LeaderboardReporter {
  /** 启动时每日一次聚合上报；当天已成功上传则跳过 */
  static async autoSyncNewRecords(context: common.UIAbilityContext): Promise<void> {
    try {
      const outcome = await LeaderboardReporter.syncToCloud(context, false);
      hilog.info(DOMAIN, TAG, 'Auto sync: %{public}d/%{public}d, failed %{public}d, skipped %{public}d',
        outcome.synced, outcome.total, outcome.failed, outcome.skipped);
    } catch (e) {
      hilog.error(DOMAIN, TAG, 'Auto sync failed: %{public}s', (e as Error).message);
    }
  }

  /** 手动同步（签到统计页）：忽略当天已上传的限制，强制重算并覆盖画像 */
  static async syncHistoryToCloud(context: common.UIAbilityContext): Promise<SyncOutcome> {
    return LeaderboardReporter.syncToCloud(context, true);
  }

  private static async syncToCloud(context: common.UIAbilityContext, force: boolean): Promise<SyncOutcome> {
    const outcome: SyncOutcome = { total: 1, synced: 0, failed: 0, skipped: 0 };
    const pref = await preferences.getPreferences(context, SETTINGS_PREF_NAME);

    if (await pref.get(PREF_LB_SYNC_ENABLED, true) === false) {
      outcome.skipped = 1;
      return outcome;
    }

    const today = dateString(Date.now());
    if (!force && await pref.get(PREF_LB_LAST_UPLOAD_DATE, '') === today) {
      outcome.skipped = 1;
      return outcome;
    }

    const db = DatabaseManager.getInstance();
    const hostUsers = await db.getAllUsers(true);
    if (hostUsers.length === 0) {
      outcome.skipped = 1;
      return outcome;
    }
    const host = hostUsers[0];

    // 稳定匿名 uuid：只生成一次并持久化，与真实 uid 无关
    let uuid = await pref.get(PREF_LB_UUID, '') as string;
    if (uuid === '') {
      uuid = ChaoxingUtils.generateUUIDv4();
      await pref.put(PREF_LB_UUID, uuid);
      await pref.flush();
    }

    // 展示名：用户自定义名优先，否则用手机号后两位生成（上游默认 ****XX 用户）
    let name = await pref.get(PREF_LB_DISPLAY_NAME, '') as string;
    if (name.trim() === '') {
      const tail = host.phone.length >= 2 ? host.phone.slice(-2) : '**';
      name = `****${tail} 用户`;
    }

    const hostInfo = await loginFunction.getUserInfo(host.cookies);
    const hostUname = hostInfo.uname;

    // 学校名：从主用户信息里取候选，选最短的（对齐上游 parseFidList 的展示策略）
    let schoolName = LeaderboardReporter.resolveSchoolName(hostInfo);
    if (await pref.get(PREF_LB_HIDE_SCHOOL, false) === true) {
      schoolName = `${schoolName}HIDE`;
    }

    // 只统计主用户的成功签到；详细记录不上传
    const records = await db.getAllSignRecords();
    const counts = new SignCounts();
    for (const record of records) {
      if (!isHostRecord(record.uname, hostUname) || record.action !== 'sign') {
        continue;
      }
      if (record.kind !== 'success' && record.kind !== 'already') {
        continue;
      }
      LeaderboardReporter.addSign(counts, record.signType);
    }

    const payload: LeaderboardPayload = {
      uuid: uuid,
      name: name.slice(0, 32),
      school_name: schoolName,
      latest_date: today,
      other_sign: counts.other,
      photo_sign: counts.photo,
      gesture_sign: counts.gesture,
      click_sign: counts.click,
      location_sign: counts.location,
      qrcode_sign: counts.qrcode,
      password_sign: counts.password,
      total_sign_count: counts.total()
    };

    try {
      const ok = await LeaderboardReporter.send(payload);
      if (ok) {
        outcome.synced = 1;
        await pref.put(PREF_LB_LAST_UPLOAD_DATE, today);
        await pref.put(PREF_LB_LAST_UPLOAD_MS, Date.now());
        await pref.flush();
      } else {
        outcome.failed = 1;
      }
    } catch (e) {
      outcome.failed = 1;
      hilog.error(DOMAIN, TAG, 'Upload failed: %{public}s', (e as Error).message);
    }
    return outcome;
  }

  /** 把一条成功签到按类型计入聚合槽位（0=点击/拍照，2=二维码，3=手势，4=位置，5=签到码） */
  private static addSign(counts: SignCounts, signType: string): void {
    switch (signType) {
      case '0':
        counts.click++;
        break;
      case '2':
        counts.qrcode++;
        break;
      case '3':
        counts.gesture++;
        break;
      case '4':
        counts.location++;
        break;
      case '5':
        counts.password++;
        break;
      default:
        break;
    }
  }

  /** 学校名候选里取最短的一个（对齐上游展示逻辑） */
  private static resolveSchoolName(info: UserInfo): string {
    let best = '';
    for (const candidate of info.schoolNames) {
      if (candidate.trim() === '') {
        continue;
      }
      if (best === '' || candidate.length < best.length) {
        best = candidate;
      }
    }
    return best === '' ? '未知学校' : best;
  }

  private static async send(payload: LeaderboardPayload): Promise<boolean> {
    const response = await Http.postJson(`${WORKER_URL}/report`, payload, { 'x-lb-token': LB_TOKEN });
    if (response.code === 200) {
      hilog.info(DOMAIN, TAG, 'Aggregate uploaded: %{public}s', payload.uuid);
      return true;
    }
    hilog.error(DOMAIN, TAG, 'Report rejected: HTTP %{public}d', response.code);
    return false;
  }

  /** 拉取云端排行榜（公开只读，无需 token）；失败抛错，由调用方决定 UI 提示 */
  static async fetchLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
    const response = await Http.get(`${WORKER_URL}/leaderboard?limit=${limit}`);
    if (response.code !== 200) {
      throw new Error(`HTTP ${response.code}`);
    }
    const data = JSON.parse(response.body) as LeaderboardResponse;
    if (!data.ok) {
      throw new Error(data.error ?? 'unknown error');
    }
    return data.list;
  }
}
