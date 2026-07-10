import type { Plugin, ViteDevServer } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Vite 插件：提供 /api/save-log 端点
 * 将渲染日志持久化到 logs/ 目录
 */
export function saveLogPlugin(): Plugin {
  return {
    name: 'save-log-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/save-log', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        let body = '';
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const logData = JSON.parse(body);
            const logsDir = path.resolve(process.cwd(), 'logs');
            if (!fs.existsSync(logsDir)) {
              fs.mkdirSync(logsDir, { recursive: true });
            }
            const dateStr = new Date().toISOString().slice(0, 10);
            const logFile = path.join(logsDir, `render-${dateStr}.log`);
            const timestamp = new Date().toLocaleString('zh-CN', { hour12: false });
            const logLine = `[${timestamp}] [${(logData.type || '').toUpperCase()}] [${(logData.status || '').toUpperCase()}] ${logData.resourceName || ''} (${logData.duration || 0}ms)${logData.error ? ' Error: ' + logData.error : ''}\n`;
            fs.appendFileSync(logFile, logLine, 'utf-8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e?.message || 'Internal error' }));
          }
        });
      });
    },
    configurePreviewServer(server: ViteDevServer) {
      server.middlewares.use('/api/save-log', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }
        // preview 模式下仅返回成功，不写文件
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      });
    },
  };
}
