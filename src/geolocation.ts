import * as fs from 'fs';
import * as maxmind from 'maxmind';
import { Reader, CityResponse } from 'maxmind';
import axios from 'axios';
import { GeoResult, GeoSource } from './types';

let cityLookup: Reader<CityResponse> | null = null;

// 初始化 MaxMind 数据库
export async function initMaxMind(dbPath: string): Promise<boolean> {
  if (!fs.existsSync(dbPath)) {
    console.log('MaxMind 数据库不存在');
    return false;
  }
  try {
    cityLookup = await maxmind.open<CityResponse>(dbPath);
    console.log('MaxMind 数据库已加载');
    return true;
  } catch (e) {
    console.log('MaxMind 加载失败');
    return false;
  }
}

// 逆地理编码：通过经纬度获取详细地址 (Nominatim)
async function reverseGeocode(lat: number, lon: number): Promise<string | undefined> {
  try {
    const { data } = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=zh`,
      {
        timeout: 5000,
        headers: { 'User-Agent': 'ip-detector/1.0' }
      }
    );
    const addr = data.address;
    if (!addr) return undefined;

    // 城市级别：city > town > county > state
    const city = addr.city || addr.town || addr.county || addr.state || addr.province;
    // 更细的级别：quarter > neighbourhood
    const detail = addr.quarter || addr.neighbourhood || addr.suburb || addr.district;

    if (city && detail) {
      return `${city} ${detail}`;
    }
    return city || detail;
  } catch {}
  return undefined;
}

// MaxMind 查询
async function locateByMaxMind(ip: string, useReverseGeocode: boolean = false): Promise<GeoResult | null> {
  if (!cityLookup) return null;
  const result = cityLookup.get(ip);
  if (!result?.country) return null;

  let city = result.city?.names?.['zh-CN'] || result.city?.names?.en;

  // 无城市但有坐标时，使用逆地理编码
  if (!city && useReverseGeocode && result.location?.latitude && result.location?.longitude) {
    city = await reverseGeocode(result.location.latitude, result.location.longitude);
  }

  return {
    source: 'maxmind',
    country: result.country.names?.['zh-CN'] || result.country.names?.en || '',
    countryCode: result.country.iso_code || '',
    city,
    latitude: result.location?.latitude,
    longitude: result.location?.longitude
  };
}

// ip-api.com 查询
async function locateByIpApi(ip: string): Promise<GeoResult | null> {
  try {
    const { data } = await axios.get(`http://ip-api.com/json/${ip}?lang=zh-CN`, { timeout: 5000 });
    if (data.status === 'success') {
      return {
        source: 'ip-api',
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

export interface LocateOptions {
  source?: GeoSource;
  reverseGeocode?: boolean;
}

// 查询 IP 地理位置
export async function locate(ip: string, options: LocateOptions = {}): Promise<GeoResult[]> {
  const { source = 'both', reverseGeocode: useReverse = false } = options;
  const results: GeoResult[] = [];

  if (source === 'maxmind' || source === 'both') {
    const r = await locateByMaxMind(ip, useReverse);
    if (r) results.push(r);
  }

  if (source === 'ip-api' || source === 'both') {
    const r = await locateByIpApi(ip);
    if (r) results.push(r);
  }

  return results;
}
