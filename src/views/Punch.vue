<script setup lang="ts">
import { ref, computed } from 'vue'
import liff from '@line/liff'
import axios from 'axios'
import type { CheckType, GpsCoords } from '@/types'

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'

function resolveAction(): CheckType {
  const sp = new URLSearchParams(window.location.search)
  if (sp.get('action')) return sp.get('action') as CheckType
  const raw = sp.get('liff.state')
  if (raw) {
    const decoded = decodeURIComponent(raw).replace(/^\?/, '')
    return (new URLSearchParams(decoded).get('action') as CheckType) || 'clock_in'
  }
  return 'clock_in'
}

const action     = ref<CheckType>(resolveAction())
const isClockIn  = computed<boolean>(() => action.value === 'clock_in')
const label      = computed<string>(() => isClockIn.value ? '上班打卡' : '下班打卡')
const themeColor = computed<string>(() => isClockIn.value ? '#10b981' : '#f59e0b')

const state      = ref<'loading' | 'success' | 'error'>('loading')
const statusText = ref<string>('初始化中…')
const resultTime = ref<string>('')
const errorMsg   = ref<string>('')
const retryCount = ref<number>(0)
const MAX_RETRY  = 2

async function axiosWithRetry<T>(fn: () => Promise<T>, retries = MAX_RETRY): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (e: unknown) {
      const err = e as { response?: unknown }
      if (err?.response) throw e
      if (i === retries) throw e
      await new Promise(r => setTimeout(r, 800 * (i + 1)))
    }
  }
  throw new Error('unreachable')
}

function getLocation(): Promise<GpsCoords> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve({ lat: null, lng: null }); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()    => resolve({ lat: null, lng: null }),
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
    )
  })
}

async function doPunch(): Promise<void> {
  state.value    = 'loading'
  errorMsg.value = ''

  try {
    statusText.value = '取得身份中…'
    await liff.init({ liffId: import.meta.env.VITE_LIFF_ID })
    action.value = resolveAction()

    if (!liff.isLoggedIn()) {
      liff.login()
      return
    }

    statusText.value = '驗證身份中…'
    const id_token = liff.getIDToken()
    const { data: authData } = await axiosWithRetry(() =>
      axios.post(`${API_BASE}/auth/line`, { id_token })
    )
    const token: string = authData.access_token

    statusText.value = '取得位置中…'
    const { lat, lng } = await getLocation()

    statusText.value = '打卡中…'
    await axiosWithRetry(() =>
      axios.post(
        `${API_BASE}/attendance`,
        { check_type: action.value, lat, lng },
        { headers: { Authorization: `Bearer ${token}` } }
      )
    )

    resultTime.value = new Date().toLocaleTimeString('zh-TW', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
    state.value = 'success'

  } catch (e: unknown) {
    const err = e as { response?: { data?: { detail?: string } }; message?: string }
    const serverMsg = err?.response?.data?.detail
    const isNetwork = !err?.response
    errorMsg.value = serverMsg || (isNetwork ? '網路連線失敗，請重試' : '打卡失敗，請再試一次')
    state.value = 'error'
  }
}

void doPunch()

function retry(): void { void doPunch() }

function close(): void {
  if (liff.isInClient()) {
    liff.closeWindow()
  }
}
</script>

<template>
  <div class="punch-wrap" :style="{ '--theme': themeColor }">

    <div class="top-bar">
      <div class="top-label">{{ label }}</div>
    </div>

    <div class="card">

      <template v-if="state === 'loading'">
        <div class="ring"></div>
        <p class="status-txt">{{ statusText }}</p>
      </template>

      <template v-else-if="state === 'success'">
        <div class="icon-circle success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" width="40" height="40">
            <path d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <p class="result-label">打卡成功</p>
        <p class="result-time">{{ resultTime }}</p>
        <button class="close-btn" @click="close">關閉</button>
      </template>

      <template v-else-if="state === 'error'">
        <div class="icon-circle error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="36" height="36">
            <circle cx="12" cy="12" r="10"/>
            <path d="M15 9l-6 6M9 9l6 6"/>
          </svg>
        </div>
        <p class="result-label error-txt">{{ errorMsg }}</p>
        <button class="close-btn" @click="retry">重試</button>
        <button class="close-btn ghost-btn" @click="close">關閉</button>
      </template>

    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }

.punch-wrap {
  min-height: 100vh;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.top-bar {
  width: 100%;
  background: var(--theme);
  padding: 48px 24px 32px;
  text-align: center;
  border-radius: 0 0 32px 32px;
}

.top-label {
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.05em;
}

.card {
  width: calc(100% - 48px);
  max-width: 320px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
  margin-top: -20px;
  padding: 40px 24px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.ring {
  width: 64px;
  height: 64px;
  border: 4px solid #e5e7eb;
  border-top-color: var(--theme);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.status-txt {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.icon-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-circle.success {
  background: #d1fae5;
  color: #10b981;
}
.icon-circle.error {
  background: #fee2e2;
  color: #ef4444;
}

.result-label {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  text-align: center;
}
.error-txt {
  font-size: 14px !important;
  color: #ef4444 !important;
  font-weight: 500 !important;
  line-height: 1.5;
}

.result-time {
  font-size: 40px;
  font-weight: 800;
  color: var(--theme);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.close-btn {
  margin-top: 8px;
  width: 100%;
  padding: 14px;
  background: var(--theme);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}
.ghost-btn {
  background: transparent;
  color: #9ca3af;
  border: 1px solid #e5e7eb;
  margin-top: 4px;
  padding: 10px;
  font-size: 14px;
}
</style>
