<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import liff from '@line/liff'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'
const LIFF_ID  = import.meta.env.VITE_LEAVE_REQUEST_LIFF_ID || import.meta.env.VITE_LIFF_ID

/* ── 狀態 ── */
const state    = ref<'loading' | 'form' | 'submitting' | 'done' | 'error'>('loading')
const errorMsg = ref('')
let jwtToken   = ''

/* ── 假別清單 ── */
interface LeaveTypeInfo {
  leave_type_id: number
  name: string
  color: string
  is_paid: boolean
  max_days: number | null
  used_days: number
  remaining: number | null
}
const leaveTypes    = ref<LeaveTypeInfo[]>([])
const selectedType  = ref<number | null>(null)

/* ── 表單 ── */
const startDate = ref('')
const endDate   = ref('')
const reason    = ref('')

/* ── 計算申請天數 ── */
const days = computed(() => {
  if (!startDate.value || !endDate.value) return 0
  const s = new Date(startDate.value)
  const e = new Date(endDate.value)
  if (e < s) return 0
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1
})

const selectedTypeInfo = computed(() =>
  leaveTypes.value.find(t => t.leave_type_id === selectedType.value) ?? null
)

const balanceWarn = computed(() => {
  const t = selectedTypeInfo.value
  if (!t || t.remaining === null) return false
  return days.value > t.remaining
})

/* ── 申請紀錄 ── */
interface LeaveReqRecord {
  id: number
  leave_type_name: string
  leave_type_color: string
  start_date: string
  end_date: string
  days: number
  reason?: string
  status: string
  reject_reason?: string
  created_at: string
}
const records      = ref<LeaveReqRecord[]>([])
const recordsState = ref<'loading' | 'ready'>('loading')

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
    const today = new Date().toLocaleDateString('sv')
    startDate.value = today
    endDate.value   = today

    const [types] = await Promise.all([
      axios.get(`${API_BASE}/attendance/my-leave-types`, { headers: { Authorization: `Bearer ${jwtToken}` } }),
    ])
    leaveTypes.value = types.data
    if (leaveTypes.value.length > 0) selectedType.value = leaveTypes.value[0].leave_type_id

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
    const { data } = await axios.get(`${API_BASE}/attendance/leave-requests`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
    records.value = data
  } finally {
    recordsState.value = 'ready'
  }
}

/* ── 送出 ── */
async function handleSubmit() {
  if (!selectedType.value) { alert('請選擇假別'); return }
  if (!startDate.value || !endDate.value) { alert('請選擇請假日期'); return }
  if (days.value <= 0) { alert('結束日期不能早於開始日期'); return }

  state.value = 'submitting'
  try {
    await axios.post(
      `${API_BASE}/attendance/leave-request`,
      {
        leave_type_id: selectedType.value,
        start_date: startDate.value,
        end_date: endDate.value,
        days: days.value,
        reason: reason.value.trim() || null,
      },
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

function backToForm() { errorMsg.value = ''; state.value = 'form' }
function close() { if (liff.isInClient()) liff.closeWindow() }

onMounted(init)

const statusLabel = (s: string) => ({ pending: '待審核', approved: '已通過', rejected: '已駁回' }[s] ?? s)
const statusColor = (s: string) => ({ pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444' }[s] ?? '#94a3b8')
</script>

<template>
  <div class="wrap">

    <div class="header">
      <div class="header-title">請假申請</div>
    </div>

    <!-- 載入中 -->
    <div v-if="state === 'loading'" class="center">
      <div class="ring"></div>
      <p class="hint">初始化中…</p>
    </div>

    <!-- 錯誤 -->
    <div v-else-if="state === 'error'" class="center">
      <div class="icon-circle err-circle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" width="36" height="36">
          <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
      </div>
      <p class="err-txt">{{ errorMsg }}</p>
      <button class="btn" @click="backToForm">重試</button>
    </div>

    <!-- 送出成功 -->
    <div v-else-if="state === 'done'" class="center">
      <div class="icon-circle ok-circle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
             stroke-linecap="round" stroke-linejoin="round" width="40" height="40">
          <path d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <p class="result-label">申請已送出</p>
      <p class="hint">待管理員審核後生效</p>
      <button class="btn" style="margin-top:8px" @click="backToForm">繼續申請</button>
    </div>

    <!-- 表單 -->
    <template v-else>
      <div class="content">

        <!-- 無假別提示 -->
        <div v-if="leaveTypes.length === 0" class="no-types">
          您目前沒有可用的假別，請聯繫管理員設定。
        </div>

        <template v-else>
          <!-- 假別選擇 -->
          <div class="field">
            <div class="field-label">假別</div>
            <div class="type-list">
              <button
                v-for="t in leaveTypes"
                :key="t.leave_type_id"
                class="type-chip"
                :class="{ selected: selectedType === t.leave_type_id }"
                :style="selectedType === t.leave_type_id ? { background: t.color, borderColor: t.color } : { borderColor: t.color }"
                @click="selectedType = t.leave_type_id"
              >
                {{ t.name }}
              </button>
            </div>

            <!-- 剩餘天數 -->
            <div v-if="selectedTypeInfo" class="balance-bar">
              <span class="balance-label">剩餘</span>
              <span class="balance-val" :style="{ color: selectedTypeInfo.remaining !== null && selectedTypeInfo.remaining <= 0 ? '#ef4444' : '#10b981' }">
                {{ selectedTypeInfo.remaining !== null ? `${selectedTypeInfo.remaining} 天` : '無上限' }}
              </span>
              <span class="balance-used">（已用 {{ selectedTypeInfo.used_days }} 天）</span>
            </div>
          </div>

          <!-- 開始日期 -->
          <div class="field">
            <div class="field-label">開始日期</div>
            <input type="date" class="input" v-model="startDate" />
          </div>

          <!-- 結束日期 -->
          <div class="field">
            <div class="field-label">結束日期</div>
            <input type="date" class="input" v-model="endDate" :min="startDate" />
          </div>

          <!-- 天數顯示 -->
          <div class="days-row" v-if="days > 0">
            <span class="days-label">申請天數</span>
            <span class="days-val">{{ days }} 天</span>
            <span v-if="balanceWarn" class="days-warn">⚠ 超出剩餘假日</span>
          </div>

          <!-- 原因 -->
          <div class="field">
            <div class="field-label">請假原因 <span class="optional">（選填）</span></div>
            <textarea
              class="input textarea"
              v-model="reason"
              placeholder="可填寫原因（30字以內）"
              maxlength="30"
              rows="2"
            ></textarea>
            <div class="char-count">{{ reason.length }} / 30</div>
          </div>

          <button
            class="submit-btn"
            :disabled="state === 'submitting' || days <= 0"
            @click="handleSubmit"
          >
            <span v-if="state === 'submitting'">送出中…</span>
            <span v-else>確認送出申請</span>
          </button>
        </template>

        <!-- 申請紀錄 -->
        <div class="records-section">
          <div class="section-title">我的請假紀錄</div>

          <div v-if="recordsState === 'loading'" class="center small-center">
            <div class="ring small-ring"></div>
          </div>

          <div v-else-if="records.length === 0" class="empty-hint">尚無申請紀錄</div>

          <div v-else class="record-list">
            <div v-for="r in records" :key="r.id" class="record-card">
              <div class="rec-top">
                <span class="type-dot" :style="{ background: r.leave_type_color }"></span>
                <span class="rec-type">{{ r.leave_type_name }}</span>
                <span class="rec-days">{{ r.days }} 天</span>
                <span class="status-pill" :style="{ color: statusColor(r.status), borderColor: statusColor(r.status) }">
                  {{ statusLabel(r.status) }}
                </span>
              </div>
              <div class="rec-dates">{{ r.start_date }} ～ {{ r.end_date }}</div>
              <div v-if="r.reason" class="rec-reason">{{ r.reason }}</div>
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

.header {
  background: #1e293b;
  padding: 20px 20px 16px;
  flex-shrink: 0;
}
.header-title { font-size: 18px; font-weight: 800; color: #f8fafc; letter-spacing: 0.04em; }

.center {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 14px; padding: 60px 24px;
}
.small-center { flex: none; padding: 20px 0; }
.hint { font-size: 13px; color: #94a3b8; }
.err-txt { font-size: 14px; color: #ef4444; font-weight: 500; text-align: center; line-height: 1.5; }
.result-label { font-size: 20px; font-weight: 800; color: #1f2937; }

.icon-circle { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.ok-circle  { background: #d1fae5; color: #10b981; }
.err-circle { background: #fee2e2; color: #ef4444; }

.ring { width: 48px; height: 48px; border: 4px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin .8s linear infinite; }
.small-ring { width: 28px; height: 28px; border-width: 3px; }
@keyframes spin { to { transform: rotate(360deg); } }

.content { flex: 1; padding: 16px 16px 0; overflow-y: auto; }

.field { margin-bottom: 16px; }
.field-label { font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px; }
.optional { font-weight: 400; color: #94a3b8; }

.no-types {
  margin: 32px 0; padding: 20px; background: #fff;
  border-radius: 12px; text-align: center;
  font-size: 14px; color: #64748b; line-height: 1.6;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}

/* 假別選擇 */
.type-list { display: flex; flex-wrap: wrap; gap: 8px; }
.type-chip {
  padding: 7px 14px; border-radius: 20px; border: 2px solid;
  background: #fff; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all .15s; color: #475569;
}
.type-chip.selected { color: #fff; }

.balance-bar { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 13px; }
.balance-label { color: #94a3b8; }
.balance-val { font-weight: 700; font-size: 15px; }
.balance-used { color: #94a3b8; }

/* 天數 */
.days-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.days-label { font-size: 13px; color: #475569; font-weight: 600; }
.days-val { font-size: 18px; font-weight: 800; color: #3b82f6; }
.days-warn { font-size: 12px; color: #f59e0b; font-weight: 600; }

.input {
  width: 100%; padding: 11px 12px;
  border: 1.5px solid #e2e8f0; border-radius: 10px;
  font-size: 15px; color: #1e293b; background: #fff;
  -webkit-appearance: none; appearance: none;
}
.input:focus { outline: none; border-color: #3b82f6; }
.textarea { resize: none; line-height: 1.5; }
.char-count { font-size: 11px; color: #94a3b8; text-align: right; margin-top: 4px; }

.submit-btn {
  width: 100%; padding: 14px; background: #3b82f6; color: #fff;
  border: none; border-radius: 12px; font-size: 16px; font-weight: 700;
  cursor: pointer; margin-bottom: 24px; transition: background .15s;
}
.submit-btn:disabled { background: #93c5fd; cursor: not-allowed; }

/* 紀錄 */
.records-section { margin-bottom: 16px; }
.section-title { font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 10px; }
.empty-hint { font-size: 13px; color: #94a3b8; text-align: center; padding: 20px 0; }
.record-list { display: flex; flex-direction: column; gap: 10px; }
.record-card {
  background: #fff; border-radius: 12px; padding: 12px 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  display: flex; flex-direction: column; gap: 5px;
}
.rec-top { display: flex; align-items: center; gap: 8px; }
.type-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.rec-type { font-size: 14px; font-weight: 700; color: #1e293b; flex: 1; }
.rec-days { font-size: 13px; font-weight: 600; color: #475569; }
.status-pill { font-size: 12px; font-weight: 600; border: 1.5px solid; border-radius: 20px; padding: 2px 8px; flex-shrink: 0; }
.rec-dates { font-size: 13px; color: #64748b; }
.rec-reason { font-size: 12px; color: #94a3b8; }
.rec-reject { font-size: 12px; color: #ef4444; }

.btn {
  padding: 11px 32px; background: #3b82f6; color: #fff;
  border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer;
}
.footer { padding: 12px 16px 24px; flex-shrink: 0; }
.btn-ghost {
  width: 100%; padding: 13px; background: transparent;
  border: 1px solid #e2e8f0; border-radius: 12px;
  font-size: 15px; color: #94a3b8; cursor: pointer;
}
</style>
