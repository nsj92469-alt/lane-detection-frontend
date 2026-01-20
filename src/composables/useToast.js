import { ref } from 'vue'

// 全局状态，保证所有组件共享同一个消息队列
const toasts = ref([])

export function useToast() {
  const addToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random()
    toasts.value.push({ id, message, type })

    // 自动移除
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }

  const removeToast = (id) => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return {
    toasts,
    addToast,
    removeToast,
    // 便捷方法
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    warning: (msg) => addToast(msg, 'warning'),
    info: (msg) => addToast(msg, 'info')
  }
}