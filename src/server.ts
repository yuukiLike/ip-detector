import Koa from 'koa';
import Router from '@koa/router';
import cors from '@koa/cors';
import { loadConfig } from './config';
import { initMaxMind, locate } from './geolocation';
import { detectAll } from './detector';

const app = new Koa();
const router = new Router();
const config = loadConfig();
const locateOptions = {
  source: config.geoSource || 'both',
  reverseGeocode: config.reverseGeocode
};

// 健康检查
router.get('/api/health', (ctx) => {
  ctx.body = { status: 'ok' };
});

// 检测所有目标
router.get('/api/detect', async (ctx) => {
  const results = await detectAll(config.targets, config.timeout, locateOptions);
  ctx.body = { success: true, data: results };
});

// IP 地理定位
router.get('/api/locate/:ip', async (ctx) => {
  const geoResults = await locate(ctx.params.ip, locateOptions);
  ctx.body = geoResults.length
    ? { success: true, data: geoResults }
    : { success: false, error: '无法定位' };
});

app.use(cors());
app.use(router.routes());

async function start() {
  const geoSource = config.geoSource || 'both';
  if (config.maxmindPath && (geoSource === 'maxmind' || geoSource === 'both')) {
    await initMaxMind(config.maxmindPath);
  }

  const port = 3000;
  app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
  });
}

start();
