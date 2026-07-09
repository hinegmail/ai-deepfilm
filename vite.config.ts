import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/api/save-log' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                try {
                  const logData = JSON.parse(body);
                  const fs = require('fs');
                  const path = require('path');
                  const logsDir = path.resolve(__dirname, 'logs');
                  if (!fs.existsSync(logsDir)) {
                    fs.mkdirSync(logsDir, { recursive: true });
                  }
                  const dateStr = new Date().toISOString().slice(0, 10);
                  const logFile = path.join(logsDir, `render-${dateStr}.log`);
                  const timestamp = new Date().toLocaleString('zh-CN', { hour12: false });
                  fs.appendFileSync(logFile, `[${timestamp}] [${logData.type.toUpperCase()}] [${logData.status.toUpperCase()}] ${logData.resourceName} (${logData.duration || 0}ms)${logData.error ? ' Error: ' + logData.error : ''}\n`, 'utf-8');
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true }));
                } catch (e) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: e.message }));
                }
              });
            } else {
              next();
            }
          });
        },
        proxy: {
          '/api-proxy': {
            target: 'https://apihub.agnes-ai.com',
            changeOrigin: true,
            // 保留 /v1 部分，只移除 /api-proxy 前缀
            rewrite: (path) => path.replace(/^\/api-proxy/, '/v1'),
          },
          '/gcs-proxy': {
            target: 'https://storage.googleapis.com',
            changeOrigin: true,
            // 只移除 /gcs-proxy 前缀，其余路径原样转发
            rewrite: (path) => path.replace(/^\/gcs-proxy/, ''),
          },
        },
      },
      preview: {
        port: 3005,
        host: '0.0.0.0',
        proxy: {
          '/api-proxy': {
            target: 'https://apihub.agnes-ai.com',
            changeOrigin: true,
            // 保留 /v1 部分，只移除 /api-proxy 前缀
            rewrite: (path) => path.replace(/^\/api-proxy/, '/v1'),
          },
          '/gcs-proxy': {
            target: 'https://storage.googleapis.com',
            changeOrigin: true,
            // 只移除 /gcs-proxy 前缀，其余路径原样转发
            rewrite: (path) => path.replace(/^\/gcs-proxy/, ''),
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.ANTSK_API_KEY),
        'process.env.ANTSK_API_KEY': JSON.stringify(env.ANTSK_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('lucide-react')) {
                  return 'lucide';
                }
                if (id.includes('react') || id.includes('scheduler')) {
                  return 'react-vendor';
                }
              }
            }
          }
        }
      }
    };
});
