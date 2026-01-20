import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import MainLayout from '../layout/MainLayout.vue'
import Detection from '../views/Detection.vue'
import History from '../views/History.vue'
import Dashboard from '../views/Dashboard.vue'
import Personal from '../views/Personal.vue'

const routes = [
  // 1. 登录/注册是独立页面（全屏，无导航栏）
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/register',
    name: 'Register',
    component: Register
  },

  // 2. 主系统布局（包含导航栏、侧边栏、统一边距）
  {
    path: '/',
    component: MainLayout,
    redirect: '/detect',
    children: [
      {
        path: 'detect',
        name: 'Detection',
        component: Detection,
        meta: { title: '检测工作台' }
      },
      {
        path: 'history',
        name: 'History',
        component: History,
        meta: { title: '历史记录' }
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: Dashboard,
        meta: { title: '数据看板' }
      },
      { path: 'personal', name: 'Personal', component: Personal, meta: { title: '个人中心' } }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router