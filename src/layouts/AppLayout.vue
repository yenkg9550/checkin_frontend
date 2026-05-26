<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import liff from '@line/liff'
import { useAuthStore } from '@/stores/auth.js'

const route = useRoute()
const auth = useAuthStore()

const pageTitle = computed(() => route.meta?.title || '打卡系統')

async function handleLogout() {
  await ElMessageBox.confirm('確定要登出嗎？', '登出', {
    confirmButtonText: '登出',
    cancelButtonText: '取消',
    type: 'warning',
  })
  auth.logout()
  // LIFF App 登出後直接關閉視窗，讓使用者重新從 LINE 開啟
  if (liff.isInClient()) {
    liff.closeWindow()
  } else {
    window.location.hash = '#/login'
  }
}
</script>

<template>
  <el-container class="layout">
    <el-header class="topbar">
      <div class="brand">
        <el-icon size="20" color="#fff"><Clock /></el-icon>
        <span class="brand-title">打卡系統</span>
      </div>
      <div class="topbar-right">
        <img v-if="auth.pictureUrl" :src="auth.pictureUrl" class="avatar" />
        <span class="username">{{ auth.displayName }}</span>
        <el-button text style="color:#fff" @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
        </el-button>
      </div>
    </el-header>

    <el-main class="main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component v-if="Component" :is="Component" />
          <div v-else class="route-status">載入中</div>
        </transition>
      </router-view>
    </el-main>

    <!-- 底部導航 -->
    <el-footer class="bottom-nav" height="60px">
      <router-link to="/app/checkin" class="nav-item" :class="{ active: route.name === 'checkin' }">
        <el-icon size="22"><Clock /></el-icon>
        <span>打卡</span>
      </router-link>
      <router-link to="/app/history" class="nav-item" :class="{ active: route.name === 'history' }">
        <el-icon size="22"><List /></el-icon>
        <span>紀錄</span>
      </router-link>
      <router-link v-if="auth.isAdmin" to="/app/admin" class="nav-item" :class="{ active: route.name === 'admin' || route.name === 'employees' }">
        <el-icon size="22"><Setting /></el-icon>
        <span>管理</span>
      </router-link>
    </el-footer>
  </el-container>
</template>

<style scoped>
.layout { height: 100vh; display: flex; flex-direction: column; }
.topbar {
  background: var(--el-color-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 52px;
  flex-shrink: 0;
}
.brand { display: flex; align-items: center; gap: 8px; }
.brand-title { color: #fff; font-size: 16px; font-weight: 700; }
.topbar-right { display: flex; align-items: center; gap: 8px; }
.avatar { width: 28px; height: 28px; border-radius: 50%; }
.username { color: #fff; font-size: 13px; }
.main { flex: 1; overflow-y: auto; padding: 16px; background: #f5f7fa; }
.route-status {
  min-height: 120px;
  display: grid;
  place-items: center;
  color: #909399;
  font-size: 13px;
}
.bottom-nav {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: #fff;
  border-top: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
}
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: #909399;
  text-decoration: none;
  font-size: 11px;
  padding: 6px 20px;
}
.nav-item.active { color: var(--el-color-primary); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
