// 地理位置结果
export interface GeoResult {
  country: string;
  countryCode: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

// 检测目标
export interface Target {
  name: string;
  url: string;
  parser: 'json' | 'text';
  path?: string;      // JSON 路径，如 'ip'
  regex?: string;     // 文本正则
}

// 检测结果
export interface DetectResult {
  name: string;
  ip: string;
  geo?: GeoResult;
  success: boolean;
  error?: string;
}

// 配置
export interface Config {
  timeout: number;
  targets: Target[];
  maxmindPath?: string;
}
