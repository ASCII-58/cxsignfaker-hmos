/**
 * 排行榜 Worker（Cloudflare Workers + D1）：App → 本 Worker → D1（SQLite）
 * 复用崩溃上报（crash-mailer.js）的单文件粘贴部署模式，仅多了 D1 存储绑定。
 *
 * 一、创建 D1 数据库（一次性）
 * 1. Cloudflare Dashboard → Storage & Databases → D1 SQL Database → Create，名字如 chaoxing-lb
 *
 * 二、部署/更新本 Worker
 * 1. Workers & Pages → Create Worker（名字如 leaderboard）→ Edit code → 粘贴本文件全部内容 → Deploy
 * 2. Settings → Bindings → Add binding → D1 DB：变量名填 DB，选择第一步建的库（保存后自动重新部署）
 * 3. Settings → Variables and Secrets（类型选 Secret）：
 *    LB_TOKEN       549200ccc8254e17bf4d9e126b211f811b619f3e7d3542c6854868f28fa55d25
 *                   （与 utils/LeaderboardReporter.ets 的 LB_TOKEN 一致）
 * 4. 初始化表结构：POST {worker域名}/init（带 x-lb-token 头），返回 {"ok":true} 即建表完成（幂等，可重复执行）
 * 5. 验证：GET {worker域名}/leaderboard → {"ok":true,"list":[]}；App 端签到一次后 list 里出现该用户即通
 *
 * App 端对应 utils/LeaderboardReporter.ets（签到落库后 fire-and-forget 上报，链路同 CrashReporter）。
 *
 * 路由与权限：
 *   POST /init         需 x-lb-token；建表（幂等）
 *   POST /report       需 x-lb-token；上报一条签到记录（建用户档案 + 写流水，事务批处理）
 *   GET  /leaderboard  公开只读；榜单 JSON（?limit=50，最大 200）
 *
 * 计分口径：action='sign' 且 kind IN ('success','already') 计分；
 * 部分唯一索引保证「同账号 + 同活动」只计一次（重复上报/失败重试静默去重），
 * 失败尝试（error/wrongPosition 等）同样入库但不占去重坑、不计分，便于以后调整口径。
 */

/** 解析并收敛上报负载；返回 [错误信息, 归一化负载]，负载合法时错误信息为 null */
export function normalizeReport(body) {
  if (!body || typeof body !== 'object') {
    return ['bad payload', null];
  }
  const uid = Number(body.uid);
  if (!Number.isInteger(uid) || uid <= 0) {
    return ['bad uid', null];
  }
  const activityId = String(body.activity_id ?? '').trim().slice(0, 64);
  if (activityId === '') {
    return ['bad activity_id', null];
  }
  const kind = String(body.kind ?? '').trim().slice(0, 32);
  if (kind === '') {
    return ['bad kind', null];
  }
  const signTypeRaw = Number(body.sign_type);
  const signType =
    body.sign_type !== '' && body.sign_type != null && Number.isInteger(signTypeRaw) &&
    signTypeRaw >= 0 && signTypeRaw <= 5 ? signTypeRaw : null;
  const signedAtRaw = Number(body.signed_at);
  return [null, {
    uid: uid,
    name: String(body.name ?? '').trim().slice(0, 32) || '匿名',
    activityId: activityId,
    activityName: String(body.activity_name ?? '').slice(0, 128),
    signType: signType,
    kind: kind,
    action: body.action === 'signout' ? 'signout' : 'sign',
    signedAt: Number.isFinite(signedAtRaw) && signedAtRaw > 0 ? Math.floor(signedAtRaw) : Date.now(),
    now: Date.now()
  }];
}

/** 榜单 SQL：累计次数/天数、近 7 天、当前连续与最长连续（按东八区自然天） */
export const LEADERBOARD_SQL = `
WITH valid AS (
  SELECT uid, activity_id, date(signed_at / 1000, 'unixepoch', '+8 hours') AS d
  FROM lb_signs
  WHERE action = 'sign' AND kind IN ('success', 'already')
),
days AS (SELECT DISTINCT uid, d FROM valid),
runs AS (
  SELECT uid, d, julianday(d) - ROW_NUMBER() OVER (PARTITION BY uid ORDER BY d) AS grp
  FROM days
),
streaks AS (
  SELECT uid, COUNT(*) AS len, MAX(d) AS last_day FROM runs GROUP BY uid, grp
),
maxstreak AS (
  SELECT uid, MAX(len) AS len FROM streaks GROUP BY uid
)
SELECT
  u.uid,
  u.display_name,
  COUNT(v.uid)                                                AS total_signs,
  COUNT(DISTINCT v.d)                                         AS total_days,
  COALESCE(SUM(v.d >= date('now', '+8 hours', '-6 days')), 0) AS week_signs,
  COALESCE(cs.len, 0)                                         AS streak_days,
  COALESCE(ms.len, 0)                                         AS longest_streak,
  MAX(v.d)                                                    AS last_sign_date
FROM lb_users u
LEFT JOIN valid v ON v.uid = u.uid
LEFT JOIN streaks cs ON cs.uid = u.uid AND cs.last_day >= date('now', '+8 hours', '-1 day')
LEFT JOIN maxstreak ms ON ms.uid = u.uid
GROUP BY u.uid, u.display_name, cs.len
HAVING COUNT(v.uid) > 0
ORDER BY streak_days DESC, total_signs DESC
LIMIT ?1`;

function hasDb(env) {
  if (!env.DB) {
    return Response.json({ ok: false, error: 'D1 binding "DB" missing' }, { status: 500 });
  }
  return null;
}

function checkToken(request, env) {
  return request.headers.get('x-lb-token') === env.LB_TOKEN;
}

/** POST /init：建表（幂等） */
async function handleInit(request, env) {
  const missing = hasDb(env);
  if (missing) {
    return missing;
  }
  if (!checkToken(request, env)) {
    return new Response('forbidden', { status: 403 });
  }
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS lb_users (
      uid          INTEGER PRIMARY KEY,
      display_name TEXT NOT NULL DEFAULT '匿名',
      created_at   INTEGER NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS lb_signs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      uid           INTEGER NOT NULL REFERENCES lb_users(uid) ON DELETE CASCADE,
      activity_id   TEXT NOT NULL,
      activity_name TEXT NOT NULL DEFAULT '',
      sign_type     INTEGER,
      kind          TEXT NOT NULL,
      action        TEXT NOT NULL DEFAULT 'sign',
      signed_at     INTEGER NOT NULL,
      created_at    INTEGER NOT NULL
    )`),
    env.DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS lb_signs_counted_uniq
      ON lb_signs (uid, activity_id) WHERE action = 'sign' AND kind IN ('success', 'already')`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS lb_signs_uid_time ON lb_signs (uid, signed_at)`)
  ]);
  return Response.json({ ok: true });
}

/** POST /report：写用户档案 + 流水（D1 batch 事务）；重复上报由部分唯一索引去重 */
async function handleReport(request, env) {
  const missing = hasDb(env);
  if (missing) {
    return missing;
  }
  if (!checkToken(request, env)) {
    return new Response('forbidden', { status: 403 });
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response('bad json', { status: 400 });
  }
  const [error, p] = normalizeReport(body);
  if (error !== null) {
    return new Response(error, { status: 400 });
  }
  const results = await env.DB.batch([
    env.DB.prepare(`INSERT INTO lb_users (uid, display_name, created_at) VALUES (?1, ?2, ?3)
      ON CONFLICT(uid) DO UPDATE SET display_name = excluded.display_name`)
      .bind(p.uid, p.name, p.now),
    env.DB.prepare(`INSERT INTO lb_signs
        (uid, activity_id, activity_name, sign_type, kind, action, signed_at, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) ON CONFLICT DO NOTHING`)
      .bind(p.uid, p.activityId, p.activityName, p.signType, p.kind, p.action, p.signedAt, p.now)
  ]);
  return Response.json({ ok: true, duplicate: results[1].meta.changes === 0 });
}

/** GET /leaderboard：榜单 JSON（公开只读） */
async function handleLeaderboard(env, url) {
  const missing = hasDb(env);
  if (missing) {
    return missing;
  }
  let limit = Number(url.searchParams.get('limit'));
  if (!Number.isInteger(limit) || limit <= 0) {
    limit = 50;
  }
  limit = Math.min(limit, 200);
  const { results } = await env.DB.prepare(LEADERBOARD_SQL).bind(limit).all();
  return Response.json({ ok: true, list: results });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/leaderboard') {
      return await handleLeaderboard(env, url);
    }
    if (request.method !== 'POST') {
      return new Response('pong');
    }
    if (url.pathname === '/init') {
      return await handleInit(request, env);
    }
    if (url.pathname === '/report') {
      return await handleReport(request, env);
    }
    return new Response('not found', { status: 404 });
  }
};
