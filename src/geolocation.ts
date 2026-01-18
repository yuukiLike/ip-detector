import * as fs from 'fs';
import * as maxmind from 'maxmind';
import { Reader, CityResponse } from 'maxmind';
import axios from 'axios';
import { GeoResult } from './types';

let cityLookup: Reader<CityResponse> | null = null;

// 初始化 MaxMind 数据库
export async function initMaxMind(dbPath: string): Promise<boolean> {
  if (!fs.existsSync(dbPath)) {
    console.log('MaxMind 数据库不存在，将使用在线 API');
    return false;
  }
  try {
    cityLookup = await maxmind.open<CityResponse>(dbPath);
    console.log('MaxMind 数据库已加载');
    return true;
  } catch (e) {
    console.log('MaxMind 加载失败，将使用在线 API');
    return false;
  }
}

// 查询 IP 地理位置
export async function locate(ip: string): Promise<GeoResult | null> {
  // 优先使用本地 MaxMind
  if (cityLookup) {
    const result = cityLookup.get(ip);
    if (result?.country) {
      return {
        country: result.country.names?.['zh-CN'] || result.country.names?.en || '',
        countryCode: result.country.iso_code || '',
        city: result.city?.names?.['zh-CN'] || result.city?.names?.en,
        latitude: result.location?.latitude,
        longitude: result.location?.longitude
      };
    }
  }

  // 备用：使用 ip-api.com（免费）
  try {
    const { data } = await axios.get(`http://ip-api.com/json/${ip}?lang=zh-CN`, { timeout: 5000 });
    if (data.status === 'success') {
      return {
        country: data.country,
        countryCode: data.countryCode,
        city: data.city,
        latitude: data.lat,
        longitude: data.lon
      };
    }
  } catch {}

  return null;
}
