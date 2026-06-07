<script setup lang="ts">
import { ref, onMounted } from 'vue'
import liff from '@line/liff'
import axios from 'axios'
import type { CheckType } from '@/types'

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'
const LIFF_ID  = import.meta.env.VITE_MANUAL_PUNCH_LIFF_ID || import.meta.env.VITE_LIFF_ID

/* ── 狀態 ── */
const state    = ref<'loading' | 'form' | 'submitting' | 'done' | 'error'>('loading')
const errorMsg = ref('')
let jwtToken   = ''

/* ── 表單 ── */
const checkType = ref<CheckType>('clock_in')
const date      = ref('')
const time      = ref('')
const reason    = ref('')

/* ── 申請紀錄 ── */
interface ReqRecord {
  id: number
  check_type: CheckType
  override_at: string
  reason: string
  status: string
  reject_reason?: string
}
const records      = ref<ReqRecord[]>([])
const recordsState = ref<'loading' | 'ready' | 'error'>('loading')

/* ── 初始化 ── */
async function init() {
  state.value = 'loading'
  errorMsg.value = ''
  try {
    await liff.init({ liffId: LIFF_ID })
    if (!liff.isLoggedIn()) { liff.login(); return }

    const id_token = liff.getIDToken()
    const { data } = await axios.post(`${API_BASE}/auth/line`, { id_token })
    jwtToken = data.access_token

    // 預設今天
    const now = new Date()
    date.value = now.toLocaleDateString('sv')
    time.value = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' })

    state.value = 'form'
    loadRecords()
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.detail || e?.message || '初始化失敗'
    state.value = 'error'
  }
}

async function loadRecords() {
  recordsState.value = 'loading'
  try {
    const { data } = await axios.get(`${API_BASE}/attendance/override-requests`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
    records.value = data
    recordsState.value = 'ready'
  } catch {
    recordsState.value = 'error'
  }
}

/* ── 送出 ── */
async function handleSubmit() {
  if (!date.value || !time.value) { alert('請選擇日期與時間'); return }
  if (!reason.value.trim())       { alert('請填寫補打原因'); return }

  state.value = 'submitting'
  try {
    const override_at = `${date.value}T${time.value}:00+08:00`
    await axios.post(
      `${API_BASE}/attendance/override-request`,
      { check_type: checkType.value, override_at, reason: reason.value.trim() },
      { headers: { Authorization: `Bearer ${jwtToken}` } },
    )
    reason.value = ''
    state.value  = 'done'
    loadRecords()
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.detail || '送出失敗，請稍後再試'
    state.value = 'error'
  }
}

function backToForm() {
  errorMsg.value = ''
  state.value = 'form'
}

function close() {
  if (liff.isInClient()) liff.closeWindow()
}

onMounted(init)

const statusLabel = (s: string) => ({ pending: '待審核', approved: '已通過', rejected: '已駁回' }[s] ?? s)
const statusColor = (s: string) => ({ pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444' }[s] ?? '#94a3b8')
const typeLabel   = (t: string) => t === 'clock_in' ? '上班' : '下班'
const typeBg      = (t: string) => t === 'clock_in' ? '#d1fae5' : '#fef3c7'
const typeClr     = (t: string) => t === 'clock_in' ? '#059669' : '#d97706'

function formatDt(iso: string) {
  if (!iso) return '—'
  return iso.slice(0, 16).replace('T', ' ')
}
</script>

<template>
  <div class="wrap">

    <!-- 頂欄 -->
    <div class="header">
      <div class="header-title">補打卡申請</div>
    </div>

    <!-- 載入中 -->
    <div v-if="state === 'loading'" class="center">
      <div class="ring"></div>
      <p class="hint">初始化中…</p>
    </div>

    <!-- 錯誤 -->
    <div v-else-if="state === 'error'" class="center">
      <div class="icon-circle error-circle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="36" height="36">
          <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
      </div>
      <p class="err-txt">{{ errorMsg }}</p>
      <button class="btn" @click="backToForm">重試</button>
    </div>

    <!-- 送出成功 -->
    <div v-else-if="state === 'done'" class="center">
      <div class="icon-circle success-circle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" width="40" height="40">
          <path d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <p class="result-label">申請已送出</p>
      <p class="hint">待管理員審核後將自動補打卡</p>
      <button class="btn" style="margin-top:8px" @click="backToForm">繼續申請</button>
      <button class="btn-ghost" @click="close">關閉</button>
    </div>

    <!-- 表單 -->
    <template v-else>
      <div class="content">

        <!-- 打卡類型 -->
        <div class="field">
          <div class="field-label">打卡類型</div>
          <div class="type-row">
            <button
              class="type-btn"
              :class="{ active: checkType === 'clock_in' }"
              @click="checkType = 'clock_in'"
            >上班打卡</button>
            <button
              class="type-btn"
              :class="{ active: checkType === 'clock_out' }"
              @click="checkType = 'clock_out'"
            >下班打卡</button>
          </div>
        </div>

        <!-- 日期 -->
        <div class="field">
          <div class="field-label">補打日期</div>
          <input type="date" class="input" v-model="date" :max="new Date().toLocaleDateString('sv')" />
        </div>

        <!-- 時間 -->
        <div class="field">
          <div class="field-label">補打時間</div>
          <input type="time" class="input" v-model="time" />
        </div>

        <!-- 原因 -->
        <div class="field">
          <div class="field-label">補打原因</div>
          <textarea
            class="input textarea"
            v-model="reason"
            placeholder="請說明補打卡原因（30字以內）"
            maxlength="30"
            rows="3"
          ></textarea>
          <div class="char-count">{{ reason.length }} / 30</div>
        </div>

        <button
          class="submit-btn"
          :disabled="state === 'submitting'"
          @click="handleSubmit"
        >
          <span v-if="state === 'submitting'">送出中…</span>
          <span v-else>確認送出申請</span>
        </button>

        <!-- 申請紀錄 -->
        <div class="records-section">
          <div class="section-title">我的申請紀錄</div>

          <div v-if="recordsState === 'loading'" class="center small-center">
            <div class="ring small-ring"></div>
          </div>

          <div v-else-if="records.length === 0" class="empty-hint">尚無申請紀錄</div>

          <div v-else class="record-list">
            <div v-for="r in records" :key="r.id" class="record-card">
              <div class="rec-top">
                <span class="badge" :style="{ background: typeBg(r.check_type), color: typeClr(r.check_type) }">
                  {{ typeLabel(r.check_type) }}
                </span>
                <span class="rec-time">{{ formatDt(r.override_at) }}</span>
                <span class="status-pill" :style="{ color: statusColor(r.status), borderColor: statusColor(r.status) }">
                  {{ statusLabel(r.status) }}
                </span>
              </div>
              <div class="rec-reason">{{ r.reason }}</div>
              <div v-if="r.reject_reason" class="rec-reject">駁回原因：{{ r.reject_reason }}</div>
            </div>
          </div>
        </div>

      </div>

      <div class="footer">
        <button class="btn-ghost" @click="close">關閉</button>
      </div>
    </template>

  </div>
</template>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }

.wrap {
  min-height: 100vh;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif;
}

/* 頂欄 */
.header {
  background: #1e293b;
  padding: 20px 20px 16px;
  flex-shrink: 0;
}
.header-title {
  font-size: 18px;
  font-weight: 800;
  color: #f8fafc;
  letter-spacing: 0.04em;
}

/* 置中狀態 */
.center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 60px 24px;
}
.small-center {
  flex: none;
  padding: 20px 0;
}
.hint { font-size: 13px; color: #94a3b8; }
.err-txt { font-size: 14px; color: #ef4444; font-weight: 500; text-align: center; line-height: 1.5; }
.result-label { font-size: 20px; font-weight: 800; color: #1f2937; }

/* 圖示圓圈 */
.icon-circle {
  width: 80px; height: 80px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.success-circle { background: #d1fae5; color: #10b981; }
.error-circle   { background: #fee2e2; color: #ef4444; }

/* 轉圈 */
.ring {
  width: 48px; height: 48px;
  border: 4px solid #e5e7eb; border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
.small-ring { width: 28px; height: 28px; border-width: 3px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 主體 */
.content {
  flex: 1;
  padding: 16px 16px 0;
  overflow-y: auto;
}

/* 欄位 */
.field { margin-bottom: 16px; }
.field-label { font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px; }

.type-row { display: flex; gap: 10px; }
.type-btn {
  flex: 1; padding: 11px 0;
  border: 2px solid #e2e8f0; border-radius: 10px;
  background: #fff; color: #64748b;
  font-size: 15px; font-weight: 600; cursor: pointer;
  transition: all .15s;
}
.type-btn.active {
  border-color: #3b82f6; background: #eff6ff; color: #2563eb;
}

.input {
  width: 100%; padding: 11px 12px;
  border: 1.5px solid #e2e8f0; border-radius: 10px;
  font-size: 15px; color: #1e293b;
  background: #fff;
  -webkit-appearance: none; appearance: none;
}
.input:focus { outline: none; border-color: #3b82f6; }
.textarea { resize: none; line-height: 1.5; }
.char-count { font-size: 11px; color: #94a3b8; text-align: right; margin-top: 4px; }

.submit-btn {
  width: 100%; padding: 14px;
  background: #3b82f6; color: #fff;
  border: none; border-radius: 12px;
  font-size: 16px; font-weight: 700;
  cursor: pointer; margin-bottom: 24px;
  transition: background .15s;
}
.submit-btn:disabled { background: #93c5fd; cursor: not-allowed; }

/* 紀錄區 */
.records-section { margin-bottom: 16px; }
.section-title { font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 10px; }
.empty-hint { font-size: 13px; color: #94a3b8; text-align: center; padding: 20px 0; }

.record-list { display: flex; flex-direction: column; gap: 10px; }
.record-card {
  background: #fff; border-radius: 12px;
  padding: 12px 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  display: flex; flex-direction: column; gap: 6px;
}
.rec-top { display: flex; align-items: center; gap: 8px; }
.badge {
  padding: 3px 9px; border-radius: 20px;
  font-size: 12px; font-weight: 700; flex-shrink: 0;
}
.rec-time { font-size: 14px; font-weight: 600; color: #1e293b; flex: 1; }
.status-pill {
  font-size: 12px; font-weight: 600;
  border: 1.5px solid; border-radius: 20px;
  padding: 2px 8px; flex-shrink: 0;
}
.rec-reason { font-size: 12px; color: #64748b; }
.rec-reject { font-size: 12px; color: #ef4444; }

/* 按鈕 */
.btn {
  padding: 11px 32px;
  background: #3b82f6; color: #fff;
  border: none; border-radius: 10px;
  font-size: 15px; font-weight: 600; cursor: pointer;
}

/* Footer */
.footer { padding: 12px 16px 24px; flex-shrink: 0; }
.btn-ghost {
  width: 100%; padding: 13px;
  background: transparent; border: 1px solid #e2e8f0;
  border-radius: 12px; font-size: 15px; color: #94a3b8; cursor: pointer;
}
</style>
