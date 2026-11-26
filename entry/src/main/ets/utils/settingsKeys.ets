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

/** 排行榜：是否参与（默认开启） */
export const PREF_LB_SYNC_ENABLED = 'lb_sync_enabled';
/** 排行榜：用户自定义展示名（空 = 用手机号后两位生成） */
export const PREF_LB_DISPLAY_NAME = 'lb_display_name';
/** 排行榜：是否隐藏学校（上报 school_name 追加 HIDE） */
export const PREF_LB_HIDE_SCHOOL = 'lb_hide_school';
/** 排行榜：稳定的匿名 uuid（非学习通 uid） */
export const PREF_LB_UUID = 'lb_uuid';
/** 排行榜：上次成功上传的日期 yyyy-MM-dd（当日只上传一次） */
export const PREF_LB_LAST_UPLOAD_DATE = 'lb_last_upload_date';
/** 排行榜：上次成功上传的时间戳（展示用） */
export const PREF_LB_LAST_UPLOAD_MS = 'lb_last_upload_ms';
