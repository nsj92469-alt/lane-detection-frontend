<template>
  <div class="login-container">
    <div class="login-card modern-card">
      <div class="brand-header">
        <div class="logo">🔬</div>
        <h2>LaneDet System</h2>
        <p>车道线智能检测系统</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label>账号</label>
          <input type="text" v-model="form.username" placeholder="请输入用户名" required autocomplete />
        </div>

        <div class="form-group">
          <label>密码</label>
          <input type="password" v-model="form.password" placeholder="请输入密码" required autocomplete />
        </div>

        <button type="submit" class="btn-login" :disabled="isLoading">
          {{ isLoading ? '登录中...' : '立即登录' }}
        </button>

        <div class="form-footer">
          <span>暂无账号？ <router-link to="/register">去注册</router-link></span>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '../composables/useToast'

const router = useRouter()
const toast = useToast()
const isLoading = ref(false)
const form = ref({ username: '', password: '' })

// 1. 修改接口地址为 FastAPI 的新地址
// 由于你开了代理，这里直接写相对路径，Vite 会自动转发到 http://localhost:8000
const LOGIN_API = '/api/auth/login'

const handleLogin = async () => {
  isLoading.value = true

  // FastAPI 的 OAuth2PasswordRequestForm 需要表单数据
  const formData = new FormData()
  formData.append('username', form.value.username)
  formData.append('password', form.value.password)

  try {
    const res = await fetch(LOGIN_API, {
      method: 'POST',
      body: formData
    })

    // FastAPI 验证失败通常返回 400 或 401，fetch 不会抛错，需手动处理
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      // FastAPI 的错误信息通常在 detail 字段中
      throw new Error(errorData.detail || '登录失败，请检查账号密码')
    }

    const data = await res.json()
    console.log('Login Response:', data)

    // ✅ [关键修复] 检查 access_token 是否存在
    if (data.access_token) {
      // 1. 存储 Token (非常重要！后续请求都要带这个)
      localStorage.setItem('token', data.access_token)
      // 2. 存储用户名
      localStorage.setItem('username', form.value.username)

      toast.success('登录成功，正在跳转...')

      setTimeout(() => {
        router.push('/detect') // 确保路由名称正确
      }, 800)
    } else {
      toast.error('登录异常：服务器未返回令牌')
    }

  } catch (err) {
    console.error(err)
    toast.error(err.message || '网络请求失败，请检查后端服务')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
/* 保持原有样式 */
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.login-card {
  width: 400px;
  background: rgba(255, 255, 255, 0.95);
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.brand-header {
  text-align: center;
  margin-bottom: 30px;
}

.logo {
  font-size: 48px;
  margin-bottom: 10px;
}

.brand-header h2 {
  margin: 0;
  color: #1e293b;
}

.brand-header p {
  margin: 5px 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #475569;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-group input:focus {
  border-color: #2563eb;
  outline: none;
}

.btn-login {
  width: 100%;
  padding: 12px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-login:hover {
  background: #1d4ed8;
}

.btn-login:disabled {
  background: #94a3b8;
}

.form-footer {
  margin-top: 20px;
  text-align: center;
  font-size: 0.9rem;
  color: #64748b;
}

.form-footer a {
  color: #2563eb;
  text-decoration: none;
}
</style>