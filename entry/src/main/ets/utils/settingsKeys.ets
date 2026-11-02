/**
 * 设置项存储键（统一维护，避免读写两侧字面量漂移）
 * preferences 文件名固定为 'settings'
 */
export const SETTINGS_PREF_NAME = 'settings';

/**
 * 新版扫码器开关
 * false（默认）= 默认界面扫码 startScanForResult，逐人拉起系统扫码页
 * true          = 自定义界面扫码 customScan + rescan，一次连续扫完全部用户的码
 */
export const PREF_CUSTOM_SCAN_ENABLED = 'custom_scan_enabled';
