/**
 * 合并版 Worker（Cloudflare Workers）：崩溃上报（→ Sentry）+ 签到排行榜（→ D1）
 * 由 crash-mailer.js 与 leaderboard.js 合并而来：两者路由不冲突、token 请求头不同，
 * 可单实例同时承载；两个独立版文件保留，单功能部署时仍可用它们。
 *
 * 一、创建 D1 数据库（一次性；只用崩溃上报可跳过）
 * 1. Cloudflare Dashboard → Storage & Databases → D1 SQL Database → Create，名字如 chaoxingsignfaker-lb
 *
 * 二、部署/更新本 Worker（单实例，二选一）
 * A. 复用现有崩溃上报 Worker：Workers & Pages → crash-mailer → Edit code → 用本文件全部内容
 *    替换原代码 → Deploy → 再补两样绑定（见第 2、3 步的 DB 与 LB_TOKEN）
 * B. 新建：Workers & Pages → Create Worker（如 cxsf-worker）→ 粘贴本文件 → Deploy → 绑定如下
 * 2. Settings → Bindings → Add binding → D1 DB：变量名填 DB，选择第一步建的库
 *    （仅排行榜依赖；缺失时只有排行榜接口返回 500，崩溃上报不受影响）
 * 3. Settings → Variables and Secrets（类型选 Secret）：
 *    SENTRY_DSN   崩溃上报必配：Sentry 项目 DSN，形如
 *                 https://<publicKey>@oXXXXXX.ingest.us.sentry.io/<projectId>
 *    CRASH_TOKEN  549200ccc8254e17bf4d9e126b211f811b619f3e7d3542c6854868f28fa55d25
 *                 （与 utils/CrashReporter.ets 的 CRASH_TOKEN 一致）
 *    LB_TOKEN     同值即可（与 utils/LeaderboardReporter.ets 的 LB_TOKEN 一致；
 *                 崩溃与排行榜用不同请求头 x-crash-token / x-lb-token，同值互不干扰）
 * 4. 初始化排行榜表：POST {worker域名}/init（带 x-lb-token 头）→ {"ok":true}（幂等，可重复执行）
 * 5. 验证：
 *    GET  {worker域名}/leaderboard → {"ok":true,"list":[]}
 *    手机 Debug 页「发送测试报告」→ Sentry 项目 Issues 出现 LinkTest 事件（返回 {"ok":true,"sentry":200}）
 * 6. App 端零代码改动：CrashReporter 的 WORKER_URL 填 {worker域名}/crash、
 *    LeaderboardReporter 的 WORKER_URL 填 {worker域名}，两者指向同一个 Worker 即可
 *
 * Sentry 侧准备（建项目、拿 DSN、邮件提醒配置）见 crash-mailer.js 头部注释。
 *
 * 路由与权限：
 *   POST /crash        需 x-crash-token；崩溃负载 → 转写 Sentry Envelope 转发
 *   POST /init         需 x-lb-token；排行榜建表（幂等）
 *   POST /report       需 x-lb-token；上报一条签到记录（建用户档案 + 写流水，事务批处理）
 *   GET  /leaderboard  公开只读；榜单 JSON（?limit=50，最大 200）
 *   其余 GET           pong（存活探测）；其余 POST → 404
 *
 * 计分口径：action='sign' 且 kind IN ('success','already') 计分；
 * 部分唯一索引保证「同账号 + 同活动」只计一次（重复上报/失败重试静默去重），
 * 失败尝试（error/wrongPosition 等）同样入库但不占去重坑、不计分，便于以后调整口径。
 */

/* ==================== 崩溃上报（原 crash-mailer.js） ==================== */

const SENTRY_SDK = { name: 'crash-mailer-worker', version: '1.2.0' };
const CN_TZ_OFFSET_MS = 8 * 3600 * 1000;

/** 解析 DSN（https://<publicKey>@<host>/<projectId>）→ 三元组；非法返回 null */
export function parseDsn(dsn) {
  const m = /^https?:\/\/([^@\s:]+)@([^@\s/:]+)(?::\d+)?\/([^\s?#]+)/.exec(String(dsn ?? '').trim());
  return m ? { publicKey: m[1], host: m[2], projectId: m[3] } : null;
}

/**
 * JS 栈文本 → Sentry frames（文本 newest-first，转 oldest-first）
 * 兼容两种行：at fn (path:line:col) / at path:line:col
 */
function parseJsFrames(stack) {
  const frames = [];
  for (const line of String(stack).split('\n')) {
    const m = /at\s+(?:(.*?)\s+\()?([^(]+?):(\d+):(\d+)\)?$/.exec(line.trim());
    if (!m) {
      continue;
    }
    frames.push({
      function: (m[1] || '').trim() || '<anonymous>',
      filename: m[2].trim(),
      lineno: Number(m[3]),
      colno: Number(m[4]),
      in_app: true
    });
  }
  return frames.reverse();
}

/**
 * NativeCrash frames 文本（App 端拼成 #0 symbol (file+offset) pc=0x…，#0 为崩溃点）→ oldest-first
 */
function parseNativeFrames(stack) {
  const frames = [];
  for (const line of String(stack).split('\n')) {
    const m = /^#(\d+)\s+(.*?)\s+\((.*?)\+(.*?)\)\s+pc=(.*)$/.exec(line.trim());
    if (!m) {
      continue;
    }
    const frame = {
      function: m[2].trim() || '<unknown>',
      filename: m[3].trim(),
      in_app: true
    };
    const pc = m[5].trim();
    if (/^0x[0-9a-fA-F]+$/.test(pc)) {
      frame.instruction_addr = pc;
    }
    frames.push(frame);
  }
  return frames.reverse();
}

/** hilog 文本 → breadcrumbs（能解析行首 MM-DD HH:MM:SS.mmm 则换算时间戳，否则用崩溃时刻） */
function hilogToBreadcrumbs(hilog, fallbackTs) {
  if (!hilog) {
    return [];
  }
  const now = Date.now();
  const year = new Date().getUTCFullYear();
  return String(hilog)
    .split('\n')
    .filter((line) => line.trim() !== '')
    .slice(-20)
    .map((line) => {
      const crumb = {
        timestamp: fallbackTs,
        type: 'default',
        category: 'hilog',
        level: 'info',
        message: line.slice(0, 200)
      };
      const tm = /^(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})/.exec(line);
      if (tm) {
        // hilog 是设备本地（UTC+8）时间，换算回 epoch；跨年兜底：未来超 1 天则按去年
        let ts =
          Date.UTC(year, Number(tm[1]) - 1, Number(tm[2]), Number(tm[3]), Number(tm[4]), Number(tm[5]), Number(tm[6])) -
            CN_TZ_OFFSET_MS;
        if (ts > now + 24 * 3600 * 1000) {
          ts -= 365 * 24 * 3600 * 1000;
        }
        crumb.timestamp = ts / 1000;
      }
      const lm = /\s([VDIWEF])\s/.exec(line);
      if (lm) {
        crumb.level = {
          V: 'debug',
          D: 'debug',
          I: 'info',
          W: 'warning',
          E: 'error',
          F: 'fatal'
        }[lm[1]] ?? 'info';
      }
      return crumb;
    });
}

/** App 崩溃负载 → Sentry event JSON（协议要点：oldest-first 帧、数值秒时间戳、32 位无横线 event_id） */
export function buildEvent(crash, eventId) {
  const isJs = crash.crash_type === 'JsError';
  const crashTsMs = Date.parse(crash.time || '') || Date.now();
  const frames = isJs ? parseJsFrames(crash.stack || '') : parseNativeFrames(crash.stack || '');
  const exceptionValue = {
    type: crash.name || (isJs ? 'JsError' : 'NativeCrash'),
    value: crash.message || '(no message)'
  };
  if (frames.length > 0) {
    exceptionValue.stacktrace = { frames: frames };
  }

  const os = { name: 'HarmonyOS' };
  if (crash.os) {
    os.version = String(crash.os);
  }
  const device = {};
  if (crash.device) {
    device.model = String(crash.device);
  }
  const app = {};
  if (crash.app) {
    app.app_name = String(crash.app);
  }
  if (crash.version) {
    app.app_version = String(crash.version);
  }
  const contexts = { os: os };
  if (Object.keys(device).length > 0) {
    contexts.device = device;
  }
  if (Object.keys(app).length > 0) {
    contexts.app = app;
  }

  const tags = {};
  if (crash.crash_type) {
    tags['crash.type'] = String(crash.crash_type);
  }
  if (crash.foreground) {
    tags.foreground = String(crash.foreground);
  }
  if (crash.uuid) {
    tags['fault.uuid'] = String(crash.uuid);
  }

  return {
    event_id: eventId,
    timestamp: crashTsMs / 1000,
    platform: isJs ? 'javascript' : 'native',
    level: 'fatal',
    logger: 'harmony.hiappevent',
    environment: 'production',
    release: `${crash.app || 'app'}@${crash.version || 'unknown'}`,
    server_name: String(crash.device || ''),
    tags: tags,
    contexts: contexts,
    breadcrumbs: hilogToBreadcrumbs(crash.hilog, crashTsMs / 1000),
    exception: { values: [exceptionValue] }
  };
}

/** 组装 Envelope：header 行 + item header 行 + event JSON（length 为 UTF-8 字节数） */
export function buildEnvelope(crash, eventId) {
  const payload = JSON.stringify(buildEvent(crash, eventId));
  const header = JSON.stringify({
    event_id: eventId,
    sent_at: new Date().toISOString(),
    sdk: SENTRY_SDK
  });
  const item = JSON.stringify({
    type: 'event',
    content_type: 'application/json',
    length: new TextEncoder().encode(payload).length
  });
  return `${header}\n${item}\n${payload}`;
}

/** 转发一条崩溃到 Sentry ingest；返回 200 或诊断串 */
async function forwardToSentry(env, crash) {
  if (!env.SENTRY_DSN) {
    return 'not-configured';
  }
  const dsn = parseDsn(env.SENTRY_DSN);
  if (!dsn) {
    return 'bad-dsn';
  }
  const eventId = crypto.randomUUID().replaceAll('-', '');
  try {
    const resp = await fetch(`https://${dsn.host}/api/${dsn.projectId}/envelope/?sentry_key=${dsn.publicKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body: buildEnvelope(crash, eventId)
    });
    return resp.ok ? 200 : resp.status;
  } catch (e) {
    return `error: ${(e && e.message) || e}`;
  }
}

/** POST /crash：校验 token → 解析负载 → 转发 Sentry */
async function handleCrash(request, env) {
  if (request.headers.get('x-crash-token') !== env.CRASH_TOKEN) {
    return new Response('forbidden', { status: 403 });
  }
  let crash;
  try {
    crash = await request.json();
  } catch (e) {
    return new Response('bad json', { status: 400 });
  }
  if (!crash || typeof crash !== 'object') {
    return new Response('bad payload', { status: 400 });
  }
  const sentry = await forwardToSentry(env, crash);
  const ok = sentry === 200;
  return Response.json({ ok: ok, sentry: sentry }, { status: ok ? 200 : 502 });
}

/* ==================== 签到排行榜（原 leaderboard.js） ==================== */

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

/* ==================== 合并路由（两套路径互不冲突） ==================== */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/leaderboard') {
      return await handleLeaderboard(env, url);
    }
    if (request.method !== 'POST') {
      return new Response('pong');
    }
    if (url.pathname === '/crash') {
      return await handleCrash(request, env);
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
