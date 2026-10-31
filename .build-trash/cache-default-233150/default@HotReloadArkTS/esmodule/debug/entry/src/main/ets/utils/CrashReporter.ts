import fs from "@ohos:file.fs";
import hiAppEvent from "@ohos:hiviewdfx.hiAppEvent";
import hilog from "@ohos:hilog";
import deviceInfo from "@ohos:deviceInfo";
import bundleManager from "@ohos:bundle.bundleManager";
import { Http } from "@normalized:N&&&entry/src/main/ets/utils/httpClient&";
const TAG = 'CrashReporter';
const DOMAIN = 0x0010;
/** 上报端点：Cloudflare Worker 部署后填入（部署方法见仓库 cloudflare-worker/crash-mailer.js 头部注释） */
const WORKER_URL = 'https://crash.ascii58.dpdns.org/crash';
/** 与 Worker 环境变量 CRASH_TOKEN 一致的共享口令 */
const CRASH_TOKEN = '549200ccc8254e17bf4d9e126b211f811b619f3e7d3542c6854868f28fa55d25';
/** 邮件正文携带的 hilog 摘要行数上限 */
const HILOG_MAX_LINES = 20;
/** NativeCrash 拼接的故障线程调用栈条数上限 */
const FRAMES_MAX_LINES = 30;
/** 上报负载（扁平结构，Worker 端直接整体渲染进邮件正文） */
interface CrashPayload {
    app: string;
    version: string;
    crash_type: string;
    time: string;
    uuid: string;
    foreground: string;
    device: string;
    os: string;
    name: string;
    message: string;
    stack: string;
    hilog: string;
}
/**
 * 把链路状态写入 AppStorage（Debug 面板展示，便于排查断点）
 */
function setStatus(message: string): void {
    AppStorage.setOrCreate('crashReportStatus', `${new Date().toISOString().slice(11, 19)} ${message}`);
}
/**
 * 把事件 params 里的任意字段安全转成字符串（字段缺失/类型异常时返回空串）
 */
function safeStr(value: Object): string {
    if (value === undefined || value === null) {
        return '';
    }
    try {
        const str = String(value);
        return str === 'undefined' || str === 'null' ? '' : str;
    }
    catch (error) {
        return '';
    }
}
/**
 * NativeCrash 的故障线程调用栈（frames）拼接为文本
 */
function joinFrames(value: Object): string {
    if (!Array.isArray(value)) {
        return '';
    }
    const lines: string[] = [];
    const arr = value as Array<Object>;
    const count = Math.min(arr.length, FRAMES_MAX_LINES);
    for (let i = 0; i < count; i++) {
        try {
            const frame = arr[i] as Record<string, Object>;
            lines.push(`#${i} ${safeStr(frame['symbol'])} (${safeStr(frame['file'])}+${safeStr(frame['offset'])}) pc=${safeStr(frame['pc'])}`);
        }
        catch (error) {
            break;
        }
    }
    return lines.join('\n');
}
/**
 * hilog 摘要（string[]）拼接为文本
 */
function joinHilog(value: Object): string {
    if (!Array.isArray(value)) {
        return '';
    }
    const arr = value as Array<Object>;
    const lines: string[] = [];
    const count = Math.min(arr.length, HILOG_MAX_LINES);
    for (let i = 0; i < count; i++) {
        lines.push(safeStr(arr[i]));
    }
    return lines.join('\n');
}
/**
 * 从 exception 字段提取异常名/原因/调用栈：
 * - JsError：name / message / stack
 * - NativeCrash：message / signal / thread_name / tid / frames（stack 为空时用 frames 拼接）
 */
function extractException(params: Record<string, Object>): string[] {
    let name = '';
    let message = '';
    let stack = '';
    const exception = params['exception'];
    if (typeof exception !== 'object' || exception === null) {
        return [name, message, stack];
    }
    const ex = exception as Record<string, Object>;
    name = safeStr(ex['name']);
    message = safeStr(ex['message']);
    const rawStack = safeStr(ex['stack']);
    stack = rawStack !== '' ? rawStack : joinFrames(ex['frames']);
    const signal = ex['signal'];
    if (typeof signal === 'object' && signal !== null) {
        const sig = signal as Record<string, Object>;
        message = `${message} (signal=${safeStr(sig['signo'])}/${safeStr(sig['code'])} addr=${safeStr(sig['address'])})`;
    }
    const threadName = safeStr(ex['thread_name']);
    if (threadName !== '') {
        message = `${message} [${threadName} tid=${safeStr(ex['tid'])}]`;
    }
    return [name, message, stack];
}
/**
 * 把 AppEventInfo 组装成上报负载
 */
function assemblePayload(info: hiAppEvent.AppEventInfo): CrashPayload {
    const params = info.params as Record<string, Object>;
    const exceptionParts = extractException(params);
    let version = '';
    try {
        const bundleInfo = bundleManager.getBundleInfoForSelfSync(bundleManager.BundleFlag.GET_BUNDLE_INFO_DEFAULT);
        version = `${bundleInfo.versionName}(${bundleInfo.versionCode})`;
    }
    catch (error) {
        hilog.warn(DOMAIN, TAG, 'Get bundle info failed: %{public}s', (error as Error).message);
    }
    const timeMs = Number(params['time'] ?? 0);
    const payload: CrashPayload = {
        app: safeStr(params['bundle_name']),
        version: version,
        crash_type: safeStr(params['crash_type']),
        time: timeMs > 0 ? new Date(timeMs).toISOString() : '',
        uuid: safeStr(params['uuid']),
        foreground: safeStr(params['foreground']),
        device: `${deviceInfo.marketName} ${deviceInfo.productModel}`,
        os: deviceInfo.osFullName,
        name: exceptionParts[0],
        message: exceptionParts[1],
        stack: exceptionParts[2],
        hilog: joinHilog(params['hilog'])
    };
    return payload;
}
/**
 * 上报成功后删除系统落盘的故障日志文件（官方建议：不删除会逐渐吃满 5M 目录上限导致新日志写入失败）
 */
function removeFaultLogs(params: Record<string, Object>): void {
    const logs = params['external_log'];
    if (!Array.isArray(logs)) {
        return;
    }
    const arr = logs as Array<Object>;
    for (let i = 0; i < arr.length; i++) {
        const path = safeStr(arr[i]);
        if (path === '') {
            continue;
        }
        try {
            fs.unlinkSync(path);
        }
        catch (error) {
            hilog.warn(DOMAIN, TAG, 'Remove fault log failed: %{public}s', (error as Error).message);
        }
    }
}
/**
 * POST 单条负载到 Worker（状态写入 AppStorage 供 Debug 面板展示），返回是否成功
 */
async function sendPayload(payload: CrashPayload): Promise<boolean> {
    try {
        const response = await Http.postJson(WORKER_URL, payload, { 'x-crash-token': CRASH_TOKEN });
        if (response.code === 200) {
            hilog.info(DOMAIN, TAG, 'Crash reported: %{public}s', payload.uuid);
            setStatus(`上报成功 ${payload.uuid.slice(0, 8)}`);
            return true;
        }
        hilog.error(DOMAIN, TAG, 'Crash report rejected: HTTP %{public}d', response.code);
        setStatus(`上报失败 HTTP ${response.code}`);
        return false;
    }
    catch (error) {
        hilog.error(DOMAIN, TAG, 'Crash report failed: %{public}s', (error as Error).message);
        setStatus(`上报异常: ${(error as Error).message}`);
        return false;
    }
}
/**
 * 上报单条崩溃事件（fire-and-forget，失败仅打日志）
 */
async function reportCrash(info: hiAppEvent.AppEventInfo): Promise<void> {
    let payload: CrashPayload;
    try {
        payload = assemblePayload(info);
    }
    catch (error) {
        hilog.error(DOMAIN, TAG, 'assemblePayload failed: %{public}s', (error as Error).message);
        setStatus(`组装负载异常: ${(error as Error).message}`);
        return;
    }
    const ok = await sendPayload(payload);
    if (ok) {
        removeFaultLogs(info.params as Record<string, Object>);
    }
}
/**
 * Debug 面板「发送测试报告」：不制造崩溃，直接发送一条测试负载到 Worker，
 * 独立验证 URL/口令/JSON/邮件链路（与真实崩溃上报走完全相同的 POST）。
 * 失败时抛出异常，由调用方展示。
 */
export async function sendTestCrashReport(): Promise<void> {
    if (WORKER_URL.includes('REPLACE')) {
        setStatus('WORKER_URL 未配置，上报关闭');
        throw new Error('WORKER_URL 未配置，上报关闭');
    }
    const payload: CrashPayload = {
        app: 'link-test',
        version: 'debug',
        crash_type: 'JsError',
        time: new Date().toISOString(),
        uuid: `test-${Date.now()}`,
        foreground: 'yes',
        device: `${deviceInfo.marketName} ${deviceInfo.productModel}`,
        os: deviceInfo.osFullName,
        name: 'LinkTest',
        message: 'Debug 面板发送链路测试（非真实崩溃）',
        stack: '',
        hilog: ''
    };
    const ok = await sendPayload(payload);
    if (!ok) {
        throw new Error('发送失败，详见崩溃上报状态行');
    }
}
/**
 * 崩溃邮件上报：
 * 通过 HiAppEvent 订阅系统 APP_CRASH 事件（覆盖 JsError 与 NativeCrash）。
 * 崩溃事件由系统 faultlogger 落盘、在下次启动注册 watcher 后回调，故邮件在用户再次打开应用时送达。
 */
export class CrashReporter {
    static init(): void {
        if (WORKER_URL.includes('REPLACE')) {
            hilog.warn(DOMAIN, TAG, 'WORKER_URL not configured, crash reporting disabled');
            setStatus('WORKER_URL 未配置，上报关闭');
            return;
        }
        try {
            hiAppEvent.addWatcher({
                name: 'crashMailWatcher',
                appEventFilters: [
                    { domain: hiAppEvent.domain.OS, names: [hiAppEvent.event.APP_CRASH] }
                ],
                onReceive: (domain: string, appEventGroups: Array<hiAppEvent.AppEventGroup>) => {
                    let total = 0;
                    for (let g = 0; g < appEventGroups.length; g++) {
                        const group = appEventGroups[g];
                        total += group.appEventInfos.length;
                        for (let i = 0; i < group.appEventInfos.length; i++) {
                            reportCrash(group.appEventInfos[i]);
                        }
                    }
                    hilog.info(DOMAIN, TAG, 'onReceive fired: %{public}d events', total);
                    setStatus(`收到 ${total} 条崩溃事件，上报中`);
                }
            });
            hilog.info(DOMAIN, TAG, '%{public}s', 'Crash watcher registered');
            setStatus('watcher 已注册，等待崩溃事件');
        }
        catch (error) {
            hilog.error(DOMAIN, TAG, 'addWatcher failed: %{public}s', (error as Error).message);
            setStatus(`watcher 注册失败: ${(error as Error).message}`);
        }
    }
}
