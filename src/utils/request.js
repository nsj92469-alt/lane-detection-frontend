// src/utils/request.js

/**
 * 轻量级 fetch 封装
 * 1. 自动注入 Authorization Token
 * 2. 全局拦截 401 过期状态
 */
export default async function request(url, options = {}) {
  // 1. 获取 Token
  const token = localStorage.getItem('token')

  // 2. 处理 Headers
  // 注意：如果是 FormData，fetch 会自动设置 Content-Type，我们不要覆盖它
  const headers = options.headers || {}

  // 自动携带 Token
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // 3. 组装配置
  const config = {
    ...options,
    headers
  }

  try {
    // 发起请求
    // 如果你配置了 vite 代理，url 直接写 '/api/...' 即可
    const response = await fetch(url, config)

    // 4. 🔥 核心：拦截 401 状态码
    if (response.status === 401) {
      console.warn('登录已过期 (401)')

      // 清除失效信息
      localStorage.removeItem('token')
      localStorage.removeItem('username')

      // 防止在登录页重复跳转
      if (window.location.pathname !== '/login') {
        alert('您的登录已过期，请重新登录')
        window.location.href = '/login' // 强制跳转
      }

      // 抛出错误，中断后续代码执行
      throw new Error('Unauthorized')
    }

    // 返回原始 response 对象，保持和原生 fetch 用法一致
    return response

  } catch (error) {
    // 网络错误等
    throw error
  }
}