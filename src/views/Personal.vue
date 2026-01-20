<template>
  <div class="personal-page">
    <div class="page-header">
      <h2>个人中心</h2>
    </div>

    <div class="profile-card modern-card">
      <div class="profile-header">
        <div class="avatar">
          <span>{{ username.charAt(0).toUpperCase() }}</span>
        </div>
        <div class="info">
          <h3>{{ username }}</h3>
          <p class="role">超级管理员 (Administrator)</p>
        </div>
      </div>

      <div class="profile-body">
        <div class="section-title">基本信息</div>
        <div class="info-grid">
          <div class="info-item">
            <label>用户名</label>
            <div class="value">{{ username }}</div>
          </div>
          <div class="info-item">
            <label>手机号</label>
            <div class="value">138****8888</div>
          </div>
          <div class="info-item">
            <label>邮箱</label>
            <div class="value">{{ username }}@lanedet.com</div>
          </div>
          <div class="info-item">
            <label>注册时间</label>
            <div class="value">2024-01-01</div>
          </div>
        </div>

        <div class="section-title" style="margin-top: 30px;">安全设置</div>
        <div class="actions">
          <button class="btn-secondary" @click="toast.info('演示系统暂不支持修改密码')">修改密码</button>
          <button class="btn-danger" @click="handleLogout">退出登录</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '../composables/useToast'

const router = useRouter()
const toast = useToast()
const username = ref('Admin')

onMounted(() => {
  // 从本地存储读取用户名
  const storedName = localStorage.getItem('username')
  if (storedName) {
    username.value = storedName
  }
})

const handleLogout = async () => {
  if (!confirm('确定要退出登录吗？')) return

  // ✅ 修改: 直接清理本地存储，不需要请求后端 (除非你有黑名单机制)
  localStorage.removeItem('token')
  localStorage.removeItem('username')

  toast.success('已安全退出')
  setTimeout(() => {
    router.push('/login')
  }, 500)
}
</script>

<style scoped>
.personal-page {
  padding: 0;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  color: #1e293b;
}

.profile-card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.profile-header {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  padding: 40px;
  display: flex;
  align-items: center;
  gap: 24px;
  color: white;
}

.avatar {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: bold;
  border: 2px solid rgba(255, 255, 255, 0.5);
}

.info h3 {
  margin: 0;
  font-size: 1.5rem;
}

.info .role {
  margin: 4px 0 0;
  opacity: 0.9;
  font-size: 0.9rem;
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-block;
}

.profile-body {
  padding: 30px;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 20px;
  padding-left: 10px;
  border-left: 4px solid #3b82f6;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.info-item label {
  display: block;
  font-size: 0.85rem;
  color: #64748b;
  margin-bottom: 6px;
}

.info-item .value {
  font-size: 1rem;
  color: #334155;
  font-weight: 500;
}

.actions {
  display: flex;
  gap: 15px;
}

.btn-secondary {
  padding: 10px 20px;
  border: 1px solid #cbd5e1;
  background: white;
  color: #475569;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #f1f5f9;
}

.btn-danger {
  padding: 10px 20px;
  border: none;
  background: #fee2e2;
  color: #ef4444;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-danger:hover {
  background: #fca5a5;
  color: #fff;
}
</style>