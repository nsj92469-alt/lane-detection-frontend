<template>
  <div class="app-layout">
    <header class="navbar">
      <div class="brand-container">
        <div class="logo-box">🔬</div>
        <div class="brand-text">
          <h1>LaneDet System</h1>
          <span class="version-tag">Pro v2.0</span>
        </div>
      </div>

      <div class="nav-links">
        <router-link to="/detect" class="nav-item" active-class="active">检测工作台</router-link>
        <router-link to="/dashboard" class="nav-item" active-class="active">数据看板</router-link>
        <router-link to="/history" class="nav-item" active-class="active">历史记录</router-link>
        <router-link to="/personal" class="nav-item" active-class="active">个人中心</router-link>
      </div>

      <div class="user-profile">
        <span class="username" @click="router.push('/personal')">
          👤 {{ username }}
        </span>
        <span class="divider">|</span>
        <button class="logout-btn" @click="handleLogout">退出</button>
      </div>
    </header>

    <main class="workspace-container">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('User')

onMounted(() => {
  const stored = localStorage.getItem('username')
  if (stored) username.value = stored
})

const handleLogout = async () => {
  if (!confirm('确定要退出登录吗？')) return
  try {
    // 尝试通知后端清除 Session
    await fetch('/login_out')
  } finally {
    // 前端强制清除
    localStorage.removeItem('username')
    router.push('/login')
  }
}
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.navbar {
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.brand-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-box {
  font-size: 24px;
}

.brand-text h1 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #1e293b;
}

.version-tag {
  background: #dbeafe;
  color: #1d4ed8;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.nav-links {
  display: flex;
  gap: 8px;
}

.nav-item {
  text-decoration: none;
  color: #64748b;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.nav-item:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.nav-item.active {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 600;
}

.user-profile {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
}

.username {
  cursor: pointer;
  color: #334155;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.username:hover {
  background: #f1f5f9;
  color: #2563eb;
}

.divider {
  margin: 0 12px;
  color: #cbd5e1;
}

.logout-btn {
  border: none;
  background: none;
  color: #ef4444;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 4px 8px;
  border-radius: 4px;
}

.logout-btn:hover {
  background: #fef2f2;
}

.workspace-container {
  flex: 1;
  background: #f8fafc;
  overflow: hidden;
  padding: 20px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>