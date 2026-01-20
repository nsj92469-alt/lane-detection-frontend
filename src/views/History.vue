<template>
  <div class="history-page">
    <div class="page-header">
      <h2>历史记录</h2>
      <div class="actions">
        <button class="btn-refresh" @click="handleRefresh">🔄 刷新</button>
      </div>
    </div>

    <div class="table-card modern-card">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-id">ID</th>
              <th class="col-img">图片预览</th>
              <th class="col-name">文件名</th>
              <th class="col-status">检测结果</th>
              <th class="col-time">上传时间</th>
              <th class="col-action">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading && list.length === 0">
              <td colspan="6" class="text-center">加载中...</td>
            </tr>
            <tr v-else-if="list.length === 0">
              <td colspan="6" class="text-center">暂无数据</td>
            </tr>
            <tr v-for="item in list" :key="item.id">
              <td class="col-id">#{{ item.id }}</td>
              <td class="col-img">
                <a :href="item.result_path" target="_blank">
                  <img :src="item.result_path" class="thumb-img" @error="imgError" />
                </a>
              </td>
              <td class="col-name" :title="item.name">{{ item.name }}</td>
              <td class="col-status">
                <span class="tag-success">成功</span>
              </td>
              <td class="col-time">{{ formatDate(item.create_time) }}</td>
              <td class="col-action">
                <button class="btn-del" @click="handleDelete(item.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button class="btn-page" :disabled="page <= 1 || loading" @click="changePage(-1)">上一页</button>
        <span class="page-num">第 {{ page }} 页</span>
        <button class="btn-page" :disabled="list.length < limit || loading" @click="changePage(1)">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '../utils/request'

const list = ref([])
const loading = ref(false)
const page = ref(1)
const limit = 10

const formatDate = (dateStr) => {
  if (!dateStr) return '--'
  try {
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
  } catch (e) {
    return dateStr
  }
}

const handleRefresh = () => {
  page.value = 1
  fetchData()
}

const fetchData = async () => {
  loading.value = true
  try {
    const skip = (page.value - 1) * limit
    const response = await request(`/api/history/list?skip=${skip}&limit=${limit}`)
    if (!response.ok) throw new Error('网络请求失败')
    const data = await response.json()
    if (Array.isArray(data)) {
      if (data.length === 0 && page.value > 1) {
        page.value -= 1
      } else {
        list.value = data
      }
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleDelete = async (id) => {
  if (!confirm('确定删除该记录吗？')) return
  try {
    const response = await request(`/api/history/${id}`, { method: 'DELETE' })
    if (response.ok) fetchData()
  } catch (err) {
    alert('请求出错')
  }
}

const changePage = (delta) => {
  page.value += delta
  fetchData()
}

const imgError = (e) => { e.target.src = '/vite.svg' }

onMounted(() => { fetchData() })
</script>

<style scoped>
.history-page {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.table-card {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.table-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.data-table {
  width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.data-table thead {
  flex-shrink: 0;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.data-table tbody {
  flex: 1;
  overflow-y: auto;
  display: block;
}

.data-table tr {
  display: flex;
  width: 100%;
  /* 确保每一行占满父容器 */
  border-bottom: 1px solid #f1f5f9;
}

.data-table th,
.data-table td {
  padding: 16px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

/* --- 关键：列宽分配 --- */
/* ID 和 图片预览：保持固定宽度 */
.col-id {
  width: 10%;
  min-width: 80px;
}

.col-img {
  width: 15%;
  min-width: 120px;
}

/* 文件名：占满剩余空间 (flex: 1) */
.col-name {
  flex: 1;
  min-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 其他信息：使用百分比分配，确保均匀占满 */
.col-status {
  width: 15%;
  min-width: 100px;
  justify-content: center;
}

.col-time {
  width: 25%;
  min-width: 180px;
  justify-content: center;
}

.col-action {
  width: 10%;
  min-width: 80px;
  justify-content: center;
}

.thumb-img {
  width: 60px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.tag-success {
  background: #dcfce7;
  color: #166534;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.pagination {
  padding: 12px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  align-items: center;
  background: #fff;
  border-top: 1px solid #f1f5f9;
}

.btn-refresh,
.btn-page {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
  color: #475569;
}

.btn-del {
  color: #ef4444;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.text-center {
  width: 100%;
  justify-content: center;
  padding: 40px;
  color: #94a3b8;
}
</style>