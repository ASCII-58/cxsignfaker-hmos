import { hilog } from '@kit.PerformanceAnalysisKit';
import { Http } from './httpClient';
import { DatabaseManager, SignRecord, SignRecordData, UserDataAndId } from './DataBase';
import { loginFunction } from './Login';

const TAG = 'LeaderboardReporter';
const DOMAIN = 0x0010;

/**
 * 上报端点：Cloudflare Worker 部署后填入（部署方法见仓库 cloudflare-worker/leaderboard.js 头部注释）。
 * 只填域名根路径，/report 由本类拼接；含 REPLACE 视为未配置，上报静默关闭。
 */
const WORKER_URL = 'https://crash.ascii58.dpdns.org';
/** 与 Worker 环境变量 LB_TOKEN 一致的共享口令 */
const LB_TOKEN = '549200ccc8254e17bf4d9e126b211f811b619f3e7d3542c6854868f28fa55d25';

/** 上报负载（扁平结构，字段名与 Worker 端 normalizeReport 对齐） */
export interface LeaderboardPayload {
  uid: number
  name: string
  activity_id: string
  activity_name: string
  sign_type: string
  kind: string
  action: string
  signed_at: number
}

/** 云同步补录结果（skipped = 无法匹配账号或缺活动 id 的记录数） */
export interface SyncOutcome {
  total: number
  synced: number
  failed: number
  skipped: number
}

/** 榜单条目（字段名与 Worker 端 LEADERBOARD_SQL 输出列对齐，已按当前连续天数降序） */
export interface LeaderboardEntry {
  uid: number
  display_name: string
  total_signs: number
  total_days: number
  week_signs: number
  streak_days: number
  longest_streak: number
  last_sign_date: string
}

/** /leaderboard 响应（公开只读，无需 token） */
interface LeaderboardResponse {
  ok: boolean
  list: LeaderboardEntry[]
  error?: string
}

/**
 * 签到信息云上报（排行榜）：
 * 复用崩溃上报的 Cloudflare Worker 方案——签到记录落库后 fire-and-forget POST 一条扁平 JSON，
 * 失败仅记日志，不影响签到流程；「同账号 + 同活动」的重复上报由 Worker 端唯一索引去重。
 */
export class LeaderboardReporter {
  /**
   * 上报单条签到记录（uid 传超星 uid，解析失败时跳过不上报）
   */
  static report(record: SignRecordData, uid: string): void {
    if (WORKER_URL.includes('REPLACE')) {
      return;
    }
    const uidNum = Number(uid);
    if (!Number.isInteger(uidNum) || uidNum <= 0) {
      hilog.warn(DOMAIN, TAG, 'Skip report: invalid uid %{public}s', uid);
      return;
    }
    const payload: LeaderboardPayload = {
      uid: uidNum,
      name: record.uname,
      activity_id: record.activityId,
      activity_name: record.activityName,
      sign_type: record.signType,
      kind: record.kind,
      action: record.action,
      signed_at: Date.now()
    };
    LeaderboardReporter.send(payload).catch((e: Error) => {
      hilog.error(DOMAIN, TAG, `Report failed: ${e.message}`);
    });
  }

  /**
   * 历史记录 → 上报负载（signed_at 用本地落库时间，补录后榜单的天数/连续计算才正确）
   * @param name 展示名：记录里是真实昵称时用昵称；「主用户/用户N」标签补录时用映射到的真实昵称
   */
  private static buildPayload(record: SignRecord, uid: number, name: string): LeaderboardPayload {
    return {
      uid: uid,
      name: name,
      activity_id: record.activityId,
      activity_name: record.activityName,
      sign_type: record.signType,
      kind: record.kind,
      action: record.action,
      signed_at: record.createTime
    };
  }

  /**
   * 从签退记录的「主用户/用户N」展示标签解析用户 id（主用户=0，其他用户=OtherUser 表 id）
   */
  private static labelToUserId(uname: string): number {
    if (uname === '主用户') {
      return 0;
    }
    if (uname.startsWith('用户')) {
      const n = Number(uname.substring(2));
      if (Number.isInteger(n) && n > 0) {
        return n;
      }
    }
    return -1;
  }

  /**
   * 本地签到统计全量补录到云端（同一 uid+活动+操作+结果只发一次；
   * 计分记录由 Worker 唯一索引二次去重，重复执行不会重复计分）
   * 昵称 → uid 通过已登录用户的 getUserInfo 建立（与签到流程同源），拿不到 uid 的记录跳过
   */
  static async syncHistoryToCloud(): Promise<SyncOutcome> {
    if (WORKER_URL.includes('REPLACE')) {
      throw new Error('未配置上报地址');
    }
    const db = DatabaseManager.getInstance();
    const hostUsers = await db.getAllUsers(true);
    const otherUsers = await db.getAllUsers();

    // 用户表 id → uid（签退「主用户/用户N」标签反查用）
    const idToUid = new Map<number, number>();
    if (hostUsers.length > 0) {
      idToUid.set(0, hostUsers[0].uid);
    }
    otherUsers.forEach((user: UserDataAndId) => {
      idToUid.set(user.id, user.uid);
    });

    // 真实昵称 → uid，及 uid → 昵称（标签记录补录时还原展示名）：走签到流程同款 getUserInfo
    const nameToUid = new Map<string, number>();
    const uidToName = new Map<number, string>();
    const allUsers = hostUsers.concat(otherUsers);
    for (const user of allUsers) {
      if (user.cookies.trim() === '') {
        continue;
      }
      try {
        const info = await loginFunction.getUserInfo(user.cookies);
        const puidNum = Number(info.puid);
        const uidNum = Number.isInteger(puidNum) && puidNum > 0 ? puidNum : user.uid;
        if (info.uname !== '') {
          nameToUid.set(info.uname, uidNum);
          uidToName.set(uidNum, info.uname);
        }
      } catch (e) {
        hilog.warn(DOMAIN, TAG, `Resolve uname for uid %{public}d failed: %{public}s`,
          user.uid, (e as Error).message);
      }
    }

    const records = await db.getAllSignRecords();
    const outcome: SyncOutcome = { total: records.length, synced: 0, failed: 0, skipped: 0 };
    const seen = new Set<string>();
    for (const record of records) {
      // 记录 uname 是真实昵称时直接命中；否则按「主用户/用户N」标签反查（此时需还原展示名）
      const realNameHit = nameToUid.get(record.uname);
      let uid = realNameHit;
      if (uid === undefined) {
        const userId = LeaderboardReporter.labelToUserId(record.uname);
        uid = userId >= 0 ? idToUid.get(userId) : undefined;
      }
      // 无匹配账号或记录缺活动 id（无法计分）→ 跳过；同键只发一次，避免重复补录
      if (uid === undefined || uid <= 0 || record.activityId.trim() === '' ||
        seen.has(`${uid}|${record.activityId}|${record.action}|${record.kind}`)) {
        outcome.skipped++;
        continue;
      }
      seen.add(`${uid}|${record.activityId}|${record.action}|${record.kind}`);
      const name = realNameHit !== undefined ? record.uname : (uidToName.get(uid) ?? record.uname);
      try {
        if (await LeaderboardReporter.send(LeaderboardReporter.buildPayload(record, uid, name))) {
          outcome.synced++;
        } else {
          outcome.failed++;
        }
      } catch (e) {
        outcome.failed++;
        hilog.error(DOMAIN, TAG, `Sync record failed: %{public}s`, (e as Error).message);
      }
    }
    hilog.info(DOMAIN, TAG, 'Cloud sync done: total %{public}d, synced %{public}d, failed %{public}d, skipped %{public}d',
      outcome.total, outcome.synced, outcome.failed, outcome.skipped);
    return outcome;
  }

  /**
   * POST 单条负载到 Worker，返回是否成功（仅记日志，状态不进 UI）
   */
  private static async send(payload: LeaderboardPayload): Promise<boolean> {
    const response =
      await Http.postJson(`${WORKER_URL}/report`, payload, { 'x-lb-token': LB_TOKEN });
    if (response.code === 200) {
      hilog.info(DOMAIN, TAG, 'Sign reported: %{public}d %{public}s', payload.uid, payload.activity_id);
      return true;
    }
    hilog.error(DOMAIN, TAG, 'Report rejected: HTTP %{public}d', response.code);
    return false;
  }

  /**
   * 拉取云端排行榜（公开只读，无需 token）；失败抛错，由调用方决定 UI 提示
   * @param limit 榜单条数上限（Worker 端最大 200）
   */
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
