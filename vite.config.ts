// vite.config.ts
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    // const env = loadEnv(mode, '.', ''); // 这部分也不再需要了
    return {
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
