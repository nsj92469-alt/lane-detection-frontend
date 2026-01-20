<template>
  <div class="login-container">
    <div class="login-card modern-card">
      <div class="brand-header">
        <div class="logo">🔬</div>
        <h2>用户注册</h2>
        <p>创建您的 LaneDet 账号</p>
      </div>

      <form @submit.prevent="handleRegister" class="login-form">
        <div class="form-group">
          <label>用户名</label>
          <input type="text" v-model="form.username" placeholder="设置用户名" required />
        </div>

        <div class="form-group">
          <label>密码</label>
          <input type="password" v-model="form.password" placeholder="设置密码" required />
        </div>

        <div class="form-group">
          <label>确认密码</label>
          <input type="password" v-model="form.confirmPassword" placeholder="再次输入密码" required />
        </div>

        <button type="submit" class="btn-login" :disabled="isLoading">
          {{ isLoading ? '注册中...' : '立即注册' }}
        </button>

        <div class="form-footer">
          <span>已有账号？ <router-link to="/login">去登录</router-link></span>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isLoading = ref(false)
const form = ref({ username: '', password: '', confirmPassword: '' })

// ⚠️ 猜测后端注册接口位置，如果后端 index/urls.py 里写的是 path('register', ...)
// 这里可能需要改为 '/register' 或者 '/user/register'
// 根据 Login 使用 /user/login_check，这里尝试调用 /user/register
const REGISTER_API = '/user/register'

const handleRegister = async () => {
  if (form.value.password !== form.value.confirmPassword) {
    alert('两次输入的密码不一致！')
    return
  }

  isLoading.value = true
  const formData = new FormData()
  formData.append('username', form.value.username)
  formData.append('password', form.value.password)
  // 如果后端需要邮箱等其他字段，请在这里 append

  try {
    const res = await fetch(REGISTER_API, {
      method: 'POST',
      body: formData
    })

    const data = await res.json()

    // 兼容后端不同的成功返回格式
    if (res.ok && (data.code === 200 || data.code === 0 || data.success)) {
      alert('注册成功！请登录。')
      router.push('/login')
    } else {
      alert(data.msg || data.message || '注册失败，用户名可能已存在')
    }
  } catch (err) {
    console.error(err)
    alert('注册请求失败，请检查网络或后端接口')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
/* 复用 Login.vue 的样式，保持一致性 */
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