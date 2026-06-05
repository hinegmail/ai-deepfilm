import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api-proxy': {
            target: 'https://apihub.agnes-ai.com',
            changeOrigin: true,
            // 保留 /v1 部分，只移除 /api-proxy 前缀
            rewrite: (path) => path.replace(/^\/api-proxy/, '/v1'),
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
      }
    };
});
