import { hilog } from '@kit.PerformanceAnalysisKit';
import { Http } from './httpClient';
import { SignRecordData } from './DataBase';

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
