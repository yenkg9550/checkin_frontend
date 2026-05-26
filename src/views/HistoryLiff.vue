<script setup>
import { ref, onMounted } from 'vue'
import liff from '@line/liff'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'

// 預設今天（台灣時間）
function todayStr() {
  return new Date().toLocaleDateString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).replace(/\//g, '-')
}

const selectedDate = ref(todayStr())
const state        = ref('loading')   // loading | ready | error
const records      = ref([])
const errorMsg     = ref('')

// UTC naive → 台灣時間
function utc(dt) {
  return new Date(dt.endsWith('Z') ? dt : dt + 'Z')
}
function formatTime(dt) {
  return utc(dt).toLocaleTimeString('zh-TW', {
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Asia/Taipei',
  })
}
function formatDateLabel(isoStr) {
  const d = new Date(isoStr + 'T00:00:00+08:00')
  return d.toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    timeZone: 'Asia/Taipei',
  })
}

let jwtToken = ''

async function init() {
  state.value = 'loading'
  try {
    await liff.init({ liffId: import.meta.env.VITE_HISTORY_LIFF_ID || import.meta.env.VITE_LIFF_ID })
    if (!liff.isLoggedIn()) { liff.login(); return }

    const id_token = liff.getIDToken()
    const { data } = await axios.post(`${API_BASE}/auth/line`, { id_token })
    jwtToken = data.access_token

    await loadRecords()
  } catch (e) {
    const detail = e?.response?.data?.detail || e?.message || String(e)
    errorMsg.value = `載入失敗：${detail}`
    state.value = 'error'
  }
}

async function loadRecords() {
  state.value = 'loading'
  try {
    const { data } = await axios.get(`${API_BASE}/attendance/me/by-date`, {
      params: { date: selectedDate.value },
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
    records.value = data
    state.value = 'ready'
  } catch (e) {
    errorMsg.value = '查詢失敗，請重試'
    state.value = 'error'
  }
}

async function onDateChange() {
  await loadRecords()
}

onMounted(init)

function close() {
  if (liff.isInClient()) liff.closeWindow()
}
</script>

<template>
  <div class="wrap">

    <!-- 標題列 -->
    <div class="header">
      <div class="header-title">打卡紀錄</div>
    </div>

    <!-- 日期選擇器 -->
    <div class="date-bar">
      <input
        type="date"
        class="date-input"
        v-model="selectedDate"
        :max="todayStr()"
        @change="onDateChange"
      />
      <div class="date-label">{{ formatDateLabel(selectedDate) }}</div>
    </div>

    <!-- 主內容 -->
    <div class="content">

      <!-- Loading -->
      <div v-if="state === 'loading'" class="center">
        <div class="ring"></div>
        <p class="hint">載入中…</p>
      </div>

      <!-- 錯誤 -->
      <div v-else-if="state === 'error'" class="center">
        <p class="err-txt">{{ errorMsg }}</p>
        <button class="btn" @click="init">重試</button>
      </div>

      <!-- 有記錄 -->
      <div v-else-if="records.length" class="record-list">
        <div v-for="r in records" :key="r.id" class="record-card">
          <div class="badge" :class="r.check_type === 'clock_in' ? 'badge-in' : 'badge-out'">
            {{ r.check_type === 'clock_in' ? '上班' : '下班' }}
          </div>
          <div class="rec-time">{{ formatTime(r.checked_at) }}</div>
        </div>
      </div>

      <!-- 無記錄 -->
      <div v-else class="center empty">
        <div class="empty-icon">📋</div>
        <p class="hint">沒有打卡紀錄</p>
      </div>

    </div>

    <!-- 關閉按鈕 -->
    <div class="footer">
      <button class="btn-close" @click="close">關閉</button>
    </div>

  </div>
</template>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }

.wrap {
  min-height: 100vh;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
}

/* ── 標題 ── */
.header {
  background: #1e293b;
  padding: 20px 20px 16px;
}
.header-title {
  font-size: 18px;
  font-weight: 800;
  color: #f8fafc;
  letter-spacing: 0.04em;
}

/* ── 日期列 ── */
.date-bar {
  background: #fff;
  padding: 14px 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
}
.date-input {
  font-size: 15px;
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  color: #1e293b;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  background: #f8fafc;
  -webkit-appearance: none;
  appearance: none;
}
.date-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

/* ── 主內容 ── */
.content {
  flex: 1;
  padding: 16px;
}

/* ── 置中（loading / empty / error）── */
.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 0;
}
.hint { font-size: 14px; color: #94a3b8; }
.err-txt { font-size: 14px; color: #ef4444; font-weight: 500; }
.empty { gap: 8px; }
.empty-icon { font-size: 40px; }

/* ── Loading ring ── */
.ring {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── 打卡卡片 ── */
.record-list { display: flex; flex-direction: column; gap: 10px; }
.record-card {
  background: #fff;
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}
.badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
}
.badge-in  { background: #d1fae5; color: #059669; }
.badge-out { background: #fef3c7; color: #d97706; }
.rec-time {
  font-size: 22px;
  font-weight: 800;
  color: #1e293b;
  font-variant-numeric: tabular-nums;
}

/* ── 重試按鈕 ── */
.btn {
  padding: 10px 28px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

/* ── 關閉按鈕 ── */
.footer {
  padding: 12px 16px 24px;
}
.btn-close {
  width: 100%;
  padding: 13px;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 15px;
  color: #94a3b8;
  cursor: pointer;
}
</style>
