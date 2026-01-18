# IP Detector

极简 IP 检测工具，检测公网 IP 并查询地理位置。

## 快速开始

```bash
npm install
npm run cli
```

## 项目结构

```
src/
├── index.ts       # CLI 入口
├── server.ts      # Web 服务器
├── config.ts      # 配置
├── detector.ts    # IP 检测
├── geolocation.ts # 地理定位（MaxMind + API 备用）
└── types.ts       # 类型定义
```

## 配置

创建 `config.js` 覆盖默认配置：

```javascript
module.exports = {
  timeout: 10000,
  maxmindPath: './data/GeoLite2-City.mmdb',
  targets: [
    { name: '名称', url: 'https://api.ipify.org?format=json', parser: 'json', path: 'ip' },
    { name: '名称', url: 'https://icanhazip.com', parser: 'text', regex: '([\\d.]+)' }
  ]
};
```

## 命令

```bash
npm run cli          # 运行 CLI
npm run server       # 运行 Web 服务器
npm run build        # 构建
npm run update-geoip # 更新 MaxMind 数据库
```

## API

| 端点 | 说明 |
|------|------|
| `GET /api/health` | 健康检查 |
| `GET /api/detect` | 检测所有目标 |
| `GET /api/locate/:ip` | IP 地理定位 |

## MaxMind 配置

1. 注册：https://www.maxmind.com/en/geolite2/signup
2. 下载数据库：
   ```bash
   export MAXMIND_LICENSE_KEY='your_key'
   npm run update-geoip
   ```
