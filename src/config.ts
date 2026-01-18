import { Config } from './types';

export const defaultConfig: Config = {
  timeout: 10000,
  maxmindPath: './data/GeoLite2-City.mmdb',
  targets: [
    {
      name: '默认出口',
      url: 'https://api.ipify.org?format=json',
      parser: 'json',
      path: 'ip'
    },
    {
      name: 'Cloudflare',
      url: 'https://1.1.1.1/cdn-cgi/trace',
      parser: 'text',
      regex: 'ip=([\\d.]+)'
    },
    {
      name: 'AWS',
      url: 'https://checkip.amazonaws.com',
      parser: 'text',
      regex: '([\\d.]+)'
    },
    {
      name: 'httpbin',
      url: 'https://httpbin.org/ip',
      parser: 'json',
      path: 'origin'
    }
  ]
};

// 加载用户配置（如果存在）
export function loadConfig(): Config {
  try {
    const userConfig = require(process.cwd() + '/config.js');
    return { ...defaultConfig, ...userConfig };
  } catch {
    return defaultConfig;
  }
}
