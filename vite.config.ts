/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — Vite 构建与本地开发配置文件 (Vite Config)
 * ============================================================================
 * 
 * 配置重点：
 * 1. 采用 base: './' 相对路径加载，完美适配 Electron file:// 本地磁盘离线加载；
 * 2. 配置 '@' 路径别名指向 './src'，提升模块引用可读性与可维护性；
 * 3. 固定端口 5173，与 Electron 主进程嵌入式服务端口规范保持一致。
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // 相对路径基准，保证打包后在 Electron 内以 file:// 协议直接安全加载
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
