// 地理位置结果
export interface GeoResult {
  source: 'maxmind' | 'ip-api';
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
  geoResults?: GeoResult[];
  success: boolean;
  error?: string;
}

// 地理定位源
export type GeoSource = 'maxmind' | 'ip-api' | 'both';

// 配置
export interface Config {
  timeout: number;
  targets: Target[];
  maxmindPath?: string;
  geoSource?: GeoSource;  // 默认 'both'
  reverseGeocode?: boolean;  // 无城市时用坐标反查，默认 false
}
