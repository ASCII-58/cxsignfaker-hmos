/**
 * 崩溃监控共享配置（CrashReporter 邮件通道与 SentryClient 通道共用的单一真相源）
 * 修改 CRASH_TOKEN 时必须同步修改 Worker 环境变量（见 cloudflare-worker/crash-mailer.js 头部注释）
 */

/** 与 Worker 环境变量 CRASH_TOKEN 一致的共享口令 */
export const CRASH_TOKEN = '549200ccc8254e17bf4d9e126b211f811b619f3e7d3542c6854868f28fa55d25';

/** Worker 自定义域（国内可达；workers.dev 在大陆被阻断勿回退） */
export const WORKER_ORIGIN = 'https://crash.ascii58.dpdns.org';
