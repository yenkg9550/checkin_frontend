<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import liff from '@line/liff'
import { postLineLogin } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const loading = ref<boolean>(true)
const error = ref<string>('')
const status = ref<string>('載入中')
const currentTime = ref<string>('')
let timeout: ReturnType<typeof setTimeout> | null = null
let clockTimer: ReturnType<typeof setInterval> | null = null

const statusText = computed<string>(() => error.value || status.value)

onMounted(async () => {
  updateClock()
  clockTimer = setInterval(updateClock, 1000)

  if (auth.isLoggedIn) {
    status.value = '進入中'
    await router.replace({ name: 'checkin' })
    return
  }

  await autoLogin()
})

onUnmounted(() => {
  if (timeout) clearTimeout(timeout)
  if (clockTimer) clearInterval(clockTimer)
})

function updateClock(): void {
  currentTime.value = new Date().toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

async function autoLogin(): Promise<void> {
  loading.value = true
  error.value = ''
  status.value = '載入中'
  let redirectingToLine = false

  timeout = setTimeout(() => {
    if (redirectingToLine) return
    loading.value = false
    error.value = '登入逾時，請再試一次'
  }, 10000)

  try {
    await liff.init({ liffId: import.meta.env.VITE_LIFF_ID })
    status.value = '登入中'

    if (!liff.isLoggedIn()) {
      redirectingToLine = true
      status.value = '登入中'
      const currentHash = window.location.hash
      if (currentHash && currentHash !== '#/' && currentHash !== '#/login') {
        sessionStorage.setItem('intended_hash', currentHash)
      }
      liff.login()
      return
    }

    status.value = '登入中'
    const id_token = liff.getIDToken()
    if (id_token) {
      const data = await postLineLogin(id_token)
      auth.setAuth(data.access_token, data.user)
    } else if (!auth.isLoggedIn) {
      throw new Error('無法取得 LINE Token')
    }

    const intendedHash = sessionStorage.getItem('intended_hash')
    sessionStorage.removeItem('intended_hash')
    if (intendedHash && intendedHash !== '#/login') {
      window.location.hash = intendedHash
    } else {
      await router.replace({ name: 'checkin' })
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { detail?: string } }; message?: string }
    error.value = err?.response?.data?.detail || err.message || '登入失敗，請再試一次'
  } finally {
    if (!redirectingToLine) {
      if (timeout) clearTimeout(timeout)
      loading.value = false
    }
  }
}

function retryLogin(): void {
  autoLogin()
}
</script>

<template>
  <div class="login-page">
    <div class="bg-circle top"></div>
    <div class="bg-circle bottom"></div>

    <div class="login-card">
      <div class="logo-wrap">
        <el-icon size="40" color="#fff"><Clock /></el-icon>
      </div>
      <h2 class="title">打卡系統</h2>
      <p class="subtitle">員工出勤管理平台</p>
      <div class="time-text">{{ currentTime }}</div>

      <div class="divider"></div>

      <div class="status-wrap" :class="{ error: !!error }" @click="error && retryLogin()">
        <el-icon v-if="!error" class="spin" size="22" color="#3b82f6"><Loading /></el-icon>
        <el-icon v-else size="20" color="#ef4444"><CircleClose /></el-icon>
        <span class="status-text">{{ statusText }}</span>
      </div>

      <p class="hint">{{ error ? '點擊狀態文字可重新登入' : '首次登入將自動建立帳號' }}</p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #1e40af 0%, #3b82f6 50%, #06b6d4 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.bg-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
}
.bg-circle.top {
  width: 320px; height: 320px;
  top: -80px; right: -80px;
}
.bg-circle.bottom {
  width: 240px; height: 240px;
  bottom: -60px; left: -60px;
}
.login-card {
  position: relative;
  background: #fff;
  border-radius: 24px;
  padding: 48px 32px 36px;
  width: 300px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
.logo-wrap {
  width: 76px;
  height: 76px;
  border-radius: 22px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  display: grid;
  place-items: center;
  margin: 0 auto 18px;
  box-shadow: 0 8px 20px rgba(59,130,246,0.4);
}
.title {
  font-size: 22px;
  font-weight: 800;
  margin: 0 0 6px;
  color: #1f2937;
  letter-spacing: -0.3px;
}
.subtitle {
  font-size: 13px;
  color: #9ca3af;
  margin: 0;
}
.time-text {
  font-size: 28px;
  font-weight: 800;
  color: #1f2937;
  line-height: 1;
  margin-top: 18px;
  font-variant-numeric: tabular-nums;
}
.divider {
  height: 1px;
  background: #f3f4f6;
  margin: 22px 0;
}
.status-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #6b7280;
  font-size: 14px;
  min-height: 50px;
  padding: 8px 0;
}
.status-wrap.error {
  color: #ef4444;
  cursor: pointer;
}
.status-text {
  color: inherit;
  line-height: 1.4;
}
.hint {
  font-size: 11px;
  color: #d1d5db;
  margin: 16px 0 0;
}
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
