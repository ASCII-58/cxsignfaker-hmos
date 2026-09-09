/**
 * 崩溃邮件 Worker（Cloudflare Workers + Resend，全免费额度）
 *
 * 部署步骤（约 10 分钟）：
 * 1. Resend（https://resend.com）注册 → API Keys → Create API Key（免费 100 封/天；
 *    未验证域名时发件人固定为 onboarding@resend.dev，只能发往 Resend 注册邮箱——个人自用够）
 * 2. Cloudflare（https://dash.cloudflare.com）→ Workers & Pages → Create Worker（名字随意，
 *    如 crash-mailer）→ Deploy 后点 Edit code，粘贴本文件全部内容 → Deploy
 * 3. Worker → Settings → Variables and Secrets，添加三个变量（类型选 Secret）：
 *    RESEND_API_KEY  第 1 步的 API Key（re_ 开头，勿写入任何仓库文件）
 *    ALERT_EMAIL     3558687503@qq.com
 *    CRASH_TOKEN     549200ccc8254e17bf4d9e126b211f811b619f3e7d3542c6854868f28fa55d25
 *                    （已同步填入 utils/CrashReporter.ets 的 CRASH_TOKEN，两端必须一致）
 * 4. 记下 Worker 地址（https://<名字>.<账户名>.workers.dev），填入 CrashReporter.ets 的 WORKER_URL
 *    （注意 CrashReporter 端 URL 带了 /crash 路径，部署时本代码同样按 POST /crash 校验路径）
 * 5. 验证：
 *    curl -X POST https://<worker>/crash -H "x-crash-token: 549200ccc8254e17bf4d9e126b211f811b619f3e7d3542c6854868f28fa55d25" -H "Content-Type: application/json" -d '{"app":"curl-test","crash_type":"JsError","message":"link check"}'
 *    收到 {"ok":true} 且邮箱收到邮件即通
 */

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

    const crash = await request.json();
    const summary = `${crash.app ?? 'app'} ${crash.version ?? ''} [${crash.crash_type ?? 'unknown'}] ${crash.name ?? ''} @ ${crash.device ?? ''}`;
    const resendResponse = await fetch('https://api.resend.com/emails', {
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

    if (!resendResponse.ok) {
      const detail = await resendResponse.text();
      return new Response(`resend error: ${detail}`, { status: 502 });
    }
    return Response.json({ ok: true });
  }
};
