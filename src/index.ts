#!/usr/bin/env node

import chalk from 'chalk';
import Table from 'cli-table3';
import { loadConfig } from './config';
import { initMaxMind } from './geolocation';
import { detectAll } from './detector';

async function main() {
  const config = loadConfig();
  const geoSource = config.geoSource || 'both';

  // 初始化 MaxMind
  if (config.maxmindPath && (geoSource === 'maxmind' || geoSource === 'both')) {
    await initMaxMind(config.maxmindPath);
  }

  console.log(chalk.bold('\n IP 检测结果\n'));

  // 执行检测
  const results = await detectAll(config.targets, config.timeout, {
    source: geoSource,
    reverseGeocode: config.reverseGeocode
  });

  // 输出表格
  const table = new Table({
    head: ['名称', 'IP', '位置'].map(h => chalk.cyan(h)),
    style: { head: [], border: [] }
  });

  for (const r of results) {
    if (r.success) {
      let location = '-';
      if (r.geoResults?.length) {
        location = r.geoResults.map(g =>
          `[${g.source}] ${g.country} ${g.city || ''}`.trim()
        ).join('\n');
      }
      table.push([r.name, r.ip, location]);
    } else {
      table.push([r.name, chalk.red('失败'), chalk.gray(r.error || '')]);
    }
  }

  console.log(table.toString());

  // 统计
  const success = results.filter(r => r.success).length;
  console.log(chalk.gray(`\n成功: ${success}/${results.length}`));
}

main().catch(console.error);
