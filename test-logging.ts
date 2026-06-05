/**
 * 临时的日志测试工具
 * 用于验证生成操作的日志记录功能
 * 
 * 使用方法：
 * 1. 在浏览器控制台中导入这个文件
 * 2. 调用 setupLoggingTest() 来启动日志收集
 * 3. 执行生成操作（生成角色、场景、关键帧、视频）
 * 4. 调用 getCollectedLogs() 来查看收集到的日志
 * 5. 调用 printLogsReport() 来打印详细报告
 */

import { setLogCallback, clearLogCallback } from './services/renderLogService';
import { RenderLog } from './types';

// 全局日志收集器
let collectedLogs: RenderLog[] = [];

/**
 * 设置日志收集
 */
export function setupLoggingTest() {
  collectedLogs = [];
  
  setLogCallback((log: RenderLog) => {
    collectedLogs.push(log);
    console.log(
      `%c[日志记录] %c${log.type}`,
      'color: #00ff00; font-weight: bold',
      'color: #00ccff; font-weight: bold',
      {
        资源: log.resourceName,
        状态: log.status,
        耗时: `${log.duration}ms`,
        错误: log.error || '无'
      }
    );
  });
  
  console.log('%c✅ 日志收集已启动', 'color: #00ff00; font-size: 14px; font-weight: bold');
  console.log('现在执行生成操作（生成角色、场景、关键帧、视频等）');
  console.log('完成后，调用 getCollectedLogs() 或 printLogsReport() 查看结果');
}

/**
 * 获取收集到的日志
 */
export function getCollectedLogs(): RenderLog[] {
  return collectedLogs;
}

/**
 * 打印日志报告
 */
export function printLogsReport() {
  console.log('\n%c=== 日志收集报告 ===', 'color: #ffff00; font-size: 16px; font-weight: bold');
  console.log(`%c总日志数: ${collectedLogs.length}`, 'color: #00ccff; font-weight: bold');
  
  // 按类型统计
  const typeStats = collectedLogs.reduce((acc, log) => {
    acc[log.type] = (acc[log.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n%c按类型统计:', 'color: #ffff00; font-weight: bold');
  Object.entries(typeStats).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  
  // 按状态统计
  const statusStats = collectedLogs.reduce((acc, log) => {
    acc[log.status] = (acc[log.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n%c按状态统计:', 'color: #ffff00; font-weight: bold');
  Object.entries(statusStats).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  
  // 详细日志列表
  console.log('\n%c详细日志列表:', 'color: #ffff00; font-weight: bold');
  collectedLogs.forEach((log, index) => {
    const statusColor = log.status === 'success' ? '#00ff00' : '#ff0000';
    console.log(
      `%c[${index + 1}] ${log.type}%c ${log.resourceName} - %c${log.status}`,
      'color: #00ccff; font-weight: bold',
      'color: white',
      `color: ${statusColor}; font-weight: bold`
    );
    console.log(`    ID: ${log.resourceId}`);
    console.log(`    模型: ${log.model}`);
    console.log(`    耗时: ${log.duration}ms`);
    if (log.error) {
      console.log(`    错误: ${log.error}`);
    }
    if (log.prompt) {
      console.log(`    提示词: ${log.prompt.substring(0, 100)}...`);
    }
  });
  
  // 验证报告
  console.log('\n%c=== 验证报告 ===', 'color: #ffff00; font-size: 16px; font-weight: bold');
  
  const checks = {
    '是否有角色生成日志': collectedLogs.some(l => l.type === 'character'),
    '是否有场景生成日志': collectedLogs.some(l => l.type === 'scene'),
    '是否有服装变体日志': collectedLogs.some(l => l.type === 'character-variation'),
    '是否有关键帧日志': collectedLogs.some(l => l.type === 'keyframe'),
    '是否有视频生成日志': collectedLogs.some(l => l.type === 'video'),
    '所有日志都有resourceName': collectedLogs.every(l => l.resourceName),
    '所有日志都有model': collectedLogs.every(l => l.model),
    '所有日志都有duration': collectedLogs.every(l => typeof l.duration === 'number'),
    '失败日志都有error': collectedLogs.filter(l => l.status === 'failed').every(l => l.error),
    '成功日志都有prompt': collectedLogs.filter(l => l.status === 'success').every(l => l.prompt)
  };
  
  Object.entries(checks).forEach(([check, result]) => {
    const color = result ? '#00ff00' : '#ff0000';
    console.log(`%c${result ? '✅' : '❌'} ${check}`, `color: ${color}; font-weight: bold`);
  });
  
  // 总体评分
  const passedChecks = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.keys(checks).length;
  const score = (passedChecks / totalChecks) * 100;
  
  console.log(`\n%c验证得分: ${passedChecks}/${totalChecks} (${score.toFixed(0)}%)`, 
    `color: ${score === 100 ? '#00ff00' : score >= 80 ? '#ffff00' : '#ff0000'}; font-size: 14px; font-weight: bold`);
}

/**
 * 清除日志收集
 */
export function stopLoggingTest() {
  clearLogCallback();
  console.log('%c✅ 日志收集已停止', 'color: #00ff00; font-size: 14px; font-weight: bold');
}

/**
 * 导出日志为 JSON
 */
export function exportLogsAsJSON() {
  const json = JSON.stringify(collectedLogs, null, 2);
  console.log(json);
  return json;
}

/**
 * 清除收集的日志
 */
export function clearCollectedLogs() {
  collectedLogs = [];
  console.log('%c✅ 已清除收集的日志', 'color: #00ff00');
}

/**
 * 获取特定类型的日志
 */
export function getLogsByType(type: RenderLog['type']) {
  return collectedLogs.filter(log => log.type === type);
}

/**
 * 获取失败的日志
 */
export function getFailedLogs() {
  return collectedLogs.filter(log => log.status === 'failed');
}

/**
 * 获取成功的日志
 */
export function getSuccessfulLogs() {
  return collectedLogs.filter(log => log.status === 'success');
}

// 方便在浏览器控制台中使用
declare global {
  interface Window {
    LoggingTest: {
      setup: typeof setupLoggingTest;
      stop: typeof stopLoggingTest;
      report: typeof printLogsReport;
      getLogs: typeof getCollectedLogs;
      getByType: typeof getLogsByType;
      getFailed: typeof getFailedLogs;
      getSuccess: typeof getSuccessfulLogs;
      export: typeof exportLogsAsJSON;
      clear: typeof clearCollectedLogs;
    };
  }
}

// 注册到全局
if (typeof window !== 'undefined') {
  (window as any).LoggingTest = {
    setup: setupLoggingTest,
    stop: stopLoggingTest,
    report: printLogsReport,
    getLogs: getCollectedLogs,
    getByType: getLogsByType,
    getFailed: getFailedLogs,
    getSuccess: getSuccessfulLogs,
    export: exportLogsAsJSON,
    clear: clearCollectedLogs
  };
}
