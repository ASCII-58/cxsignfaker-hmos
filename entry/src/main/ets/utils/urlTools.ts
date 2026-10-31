export default class UrlTools {
  static parseUrlParams(url: string): Record<string, string> {
  const params: Record<string, string> = JSON.parse("{}") as Record<string, string>;

  try {
    // 查找 '?' 的位置
    const queryIndex = url.indexOf('?');

    // 如果没有查询参数，返回空对象
    if (queryIndex === -1) {
      return params;
    }

    // 获取查询字符串部分
    const queryString = url.substring(queryIndex + 1);

    // 按 '&' 分割参数
    const paramPairs = queryString.split('&');

    // 遍历每个参数对
    paramPairs.forEach((pair) => {
      // 只按第一个 '=' 分割：enc 等值可能含 Base64 填充符 '='，split('=') 会截断值
      const eqIndex = pair.indexOf('=');
      const key = eqIndex === -1 ? pair : pair.substring(0, eqIndex);
      const value = eqIndex === -1 ? '' : pair.substring(eqIndex + 1);

      if (key) {
        // 解码 URI 组件并添加到对象中
        params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
      }
    });

  } catch (error) {
    console.error('解析 URL 参数失败:', error);
  }

  return params;
}}