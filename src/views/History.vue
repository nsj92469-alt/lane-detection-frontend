<template>
  <div class="history-page">
    <div class="page-header">
      <h2>历史记录</h2>
      <div class="actions">
        <button class="btn-refresh" @click="fetchData">🔄 刷新</button>
      </div>
    </div>

    <div class="table-card modern-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>图片预览</th>
            <th>文件名</th>
            <th>检测结果</th>
            <th>上传时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="text-center">加载中...</td>
          </tr>
          <tr v-else-if="list.length === 0">
            <td colspan="6" class="text-center">暂无数据</td>
          </tr>
          <tr v-for="item in list" :key="item.id">
            <td>#{{ item.id }}</td>
            <td>
              <a :href="item.result_path" target="_blank">
                <img :src="item.result_path" class="thumb-img" @error="imgError" />
              </a>
            </td>
            <td>{{ item.name }}</td>
            <td>
              <span class="tag-success">成功</span>
            </td>
            <td>{{ item.create_time }}</td>
            <td>
              <button class="btn-del" @click="handleDelete(item.id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination">
        <button :disabled="page <= 1" @click="changePage(-1)">上一页</button>
        <span>第 {{ page }} 页</span>
        <button :disabled="list.length < limit" @click="changePage(1)">下一页</button>
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

// src/views/History.vue (Script 部分)

const fetchData = async () => {
  loading.value = true
  try {
    // ✅ 修改 1: 接口地址
    const response = await request(`/api/history/list?skip=${(page.value - 1) * limit}&limit=${limit}`)
    const data = await response.json()
    if (Array.isArray(data)) {
      list.value = data
    }
  } catch (err) {
    console.error(err)
    alert('获取数据失败')
  } finally {
    loading.value = false
  }
}

const handleDelete = async (id) => {
  if (!confirm('确定删除该记录吗？')) return

  try {
    
    const response = await request(`/api/history/${id}`, { method: 'DELETE' })

    if (response.ok) {
      fetchData() // 刷新
    } else {
      alert('删除失败')
    }
  } catch (err) {
    alert('请求出错')
  }
}

const changePage = (delta) => {
  page.value += delta
  fetchData()
}

const imgError = (e) => {
  e.target.src = '/vite.svg' // 占位图
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.history-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #1e293b;
  font-size: 1.5rem;
}

.table-card {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th,
.data-table td {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.data-table th {
  background: #f8fafc;
  font-weight: 600;
  color: #64748b;
}

.data-table tr:hover {
  background: #f8fafc;
}

.thumb-img {
  width: 60px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.tag-success {
  background: #dcfce7;
  color: #166534;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
}

.btn-refresh {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
}

.btn-del {
  color: #ef4444;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.btn-del:hover {
  text-decoration: underline;
}

.pagination {
  padding: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  align-items: center;
}

.pagination button {
  padding: 6px 12px;
  cursor: pointer;
}

.text-center {
  text-align: center;
  color: #94a3b8;
  padding: 40px;
}
</style>