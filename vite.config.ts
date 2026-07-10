import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { saveLogPlugin } from './vite-plugins/save-log';

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
      plugins: [
        react(),
        saveLogPlugin(),
      ],
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
