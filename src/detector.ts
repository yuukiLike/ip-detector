import axios from 'axios';
import { Target, DetectResult } from './types';
import { locate, LocateOptions } from './geolocation';

// 从 JSON 中提取值
function getJsonValue(obj: any, path: string): string | null {
  const value = path.split('.').reduce((o, k) => o?.[k], obj);
  return typeof value === 'string' ? value.trim() : null;
}

// 从文本中提取 IP
function extractIP(text: string, regex?: string): string | null {
  const pattern = regex ? new RegExp(regex) : /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;
  const match = text.match(pattern);
  return match ? (match[1] || match[0]).trim() : null;
}

// 检测单个目标
export async function detectOne(target: Target, timeout: number, locateOptions: LocateOptions = {}): Promise<DetectResult> {
  try {
    const { data } = await axios.get(target.url, {
      timeout,
      headers: { 'User-Agent': 'curl/7.64.1' }
    });

    // 解析 IP
    let ip: string | null = null;
    if (target.parser === 'json') {
      ip = getJsonValue(data, target.path || 'ip');
    } else {
      ip = extractIP(String(data), target.regex);
    }

    if (!ip) {
      return { name: target.name, ip: '', success: false, error: '无法解析 IP' };
    }

    // 获取地理位置
    const geoResults = await locate(ip, locateOptions);

    return { name: target.name, ip, geoResults: geoResults.length ? geoResults : undefined, success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { name: target.name, ip: '', success: false, error: msg };
  }
}

// 检测所有目标
export async function detectAll(targets: Target[], timeout: number, locateOptions: LocateOptions = {}): Promise<DetectResult[]> {
  return Promise.all(targets.map(t => detectOne(t, timeout, locateOptions)));
}
