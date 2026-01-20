<template>
  <div class="toast-stack">
    <transition-group name="toast-pop">
      <div v-for="toast in toasts" :key="toast.id" class="toast-capsule" :class="toast.type">
        <span class="icon">
          <svg v-if="toast.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <svg v-if="toast.type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <svg v-if="toast.type === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <svg v-if="toast.type === 'info'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </span>
        <span class="text">{{ toast.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useToast } from '../composables/useToast'
const { toasts } = useToast()
</script>

<style scoped>
.toast-stack {
  position: fixed;
  top: 32px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  pointer-events: none;
}

.toast-capsule {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px 10px 16px;
  background: #ffffff;
  border-radius: 99px;
  /* 胶囊形状 */
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  /* 细微边框 */
  min-width: 200px;
  max-width: 90vw;
}

/* 图标样式 */
.icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.icon svg {
  width: 18px;
  height: 18px;
}

/* 文字样式 */
.text {
  font-size: 0.9rem;
  font-weight: 500;
  color: #1f2937;
  line-height: 1.4;
}

/* 类型颜色配置 */
.toast-capsule.success .icon {
  color: #10b981;
}

.toast-capsule.error .icon {
  color: #ef4444;
}

.toast-capsule.warning .icon {
  color: #f59e0b;
}

.toast-capsule.info .icon {
  color: #3b82f6;
}

/* 进出场动画 */
.toast-pop-enter-active,
.toast-pop-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-pop-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.toast-pop-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}
</style>