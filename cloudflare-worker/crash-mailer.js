/**
 * 崩溃上报 Worker（Cloudflare Workers）：App → 本 Worker → Sentry（主）+ Resend 邮件（兜底）
 *
 * 一、Sentry 侧准备（一次性，约 5 分钟；已有账号可直接复用，如 Android 项目的 aquamarine5 组织）
 * 1. 注册/登录 https://sentry.io（免费版 5k errors/月，个人够用；新账号 Region 选 US 即可）
 * 2. 建 Project：Settings → Projects → Create Project → 平台列表没有鸿蒙，选 JavaScript 即可
 *    （平台只影响官方文档推荐，不影响接收数据）→ 项目名如 chaoxingsignfaker-harmony
 * 3. 拷 DSN：项目 Settings → Client Keys → DSN，形如
 *    https://<publicKey>@oXXXXXX.ingest.us.sentry.io/<projectId>（老账号形如 xxx.ingest.sentry.io）
 * 4.（可选）Sentry Settings → Alerts 自带邮件通知，配好后可下线本 Worker 的 Resend 兜底
 *
 * 二、部署/更新本 Worker
 * 1. Cloudflare → Workers & Pages → crash-mailer → Edit code → 粘贴本文件全部内容 → Deploy
 * 2. Settings → Variables and Secrets（类型选 Secret）：
 *    SENTRY_DSN      新增，填上面第 3 步的 DSN（不配则只走邮件兜底）
 *    RESEND_API_KEY  可选，保留则邮件兜底继续生效
 *    ALERT_EMAIL     可选
 *    CRASH_TOKEN     549200ccc8254e17bf4d9e126b211f811b619f3e7d3542c6854868f28fa55d25
 *                    （与 utils/CrashReporter.ets 的 CRASH_TOKEN 一致）
 * 3. 验证：手机 Debug 页点「发送测试崩溃」→ Sentry 项目 Issues 页出现 LinkTest 事件即通；
 *    返回体带诊断 {"ok":true,"sentry":200,"email":200}（App 端只看 HTTP 200，无感）
 *
 * App 端零改动：手机只访问自己的 Worker 域名（国内可达已验证），DSN 只存在 Worker 环境变量里，
 * 崩溃负载仍走原 POST /crash + x-crash-token，由本 Worker 转写成 Sentry Envelope 协议转发。
 */

const SENTRY_SDK = { name: 'crash-mailer-worker', version: '1.1.0' };
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
    if (!m) continue;
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
    if (!m) continue;
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
  if (!hilog) return [];
  const now = Date.now();
  const year = new Date().getUTCFullYear();
  return String(hilog)
    .split('\n')
    .filter((line) => line.trim() !== '')
    .slice(-20)
    .map((line) => {
      const crumb = { timestamp: fallbackTs, type: 'default', category: 'hilog', level: 'info', message: line.slice(0, 200) };
      const tm = /^(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})/.exec(line);
      if (tm) {
        // hilog 是设备本地（UTC+8）时间，换算回 epoch；跨年兜底：未来超 1 天则按去年
        let ts = Date.UTC(year, Number(tm[1]) - 1, Number(tm[2]), Number(tm[3]), Number(tm[4]), Number(tm[5]), Number(tm[6])) - CN_TZ_OFFSET_MS;
        if (ts > now + 24 * 3600 * 1000) {
          ts -= 365 * 24 * 3600 * 1000;
        }
        crumb.timestamp = ts / 1000;
      }
      const lm = /\s([VDIWEF])\s/.exec(line);
      if (lm) {
        crumb.level = { V: 'debug', D: 'debug', I: 'info', W: 'warning', E: 'error', F: 'fatal' }[lm[1]] ?? 'info';
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

/** 邮件兜底（Resend），未配 RESEND_API_KEY 时跳过 */
async function sendEmail(env, crash) {
  if (!env.RESEND_API_KEY) {
    return 'not-configured';
  }
  const summary = `${crash.app ?? 'app'} ${crash.version ?? ''} [${crash.crash_type ?? 'unknown'}] ${crash.name ?? ''} @ ${crash.device ?? ''}`;
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'CrashReporter <onboarding@resend.dev>',
        to: [env.ALERT_EMAIL],
        subject: `[崩溃] ${summary}`.slice(0, 200),
        text: JSON.stringify(crash, null, 2)
      })
    });
    return resp.ok ? 200 : resp.status;
  } catch (e) {
    return `error: ${(e && e.message) || e}`;
  }
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('pong');
    }
    const url = new URL(request.url);
    if (url.pathname !== '/crash') {
      return new Response('not found', { status: 404 });
    }
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
    const [sentry, email] = await Promise.all([forwardToSentry(env, crash), sendEmail(env, crash)]);
    const ok = sentry === 200 || email === 200;
    return Response.json({ ok: ok, sentry: sentry, email: email }, { status: ok ? 200 : 502 });
  }
};
