// vite.config.ts (最终正确版)

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // 1. 导入 React 插件
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()], // 2. 在这里启用插件
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
})
