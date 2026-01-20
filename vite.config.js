import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      // 1. 用户认证相关
      '/user': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        headers: { Referer: 'http://127.0.0.1:8000' }
      },
      '/login_out': {  // <--- [新增] 修复注销功能
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      // 2. 核心业务接口
      '/detection': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/get_data': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/del_data': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        headers: { Referer: 'http://127.0.0.1:8000' }
      },
      '/edit_data': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        headers: { Referer: 'http://127.0.0.1:8000' }
      },

      // 3. 系统日志接口
      '/log_data': {   // <--- [新增] 修复日志无法获取的问题
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      // 4. 静态资源 (图片/视频)
      '/static': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
})