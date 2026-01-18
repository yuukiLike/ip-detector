#!/usr/bin/env node

import chalk from 'chalk';
import Table from 'cli-table3';
import { loadConfig } from './config';
import { initMaxMind } from './geolocation';
import { detectAll } from './detector';

async function main() {
  const config = loadConfig();

  // 初始化 MaxMind
  if (config.maxmindPath) {
    await initMaxMind(config.maxmindPath);
  }

  console.log(chalk.bold('\n IP 检测结果\n'));

  // 执行检测
  const results = await detectAll(config.targets, config.timeout);

  // 输出表格
  const table = new Table({
    head: ['名称', 'IP', '位置'].map(h => chalk.cyan(h)),
    style: { head: [], border: [] }
  });

  for (const r of results) {
    if (r.success) {
      const location = r.geo ? `${r.geo.country} ${r.geo.city || ''}`.trim() : '-';
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
