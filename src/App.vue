<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const navigating = ref<boolean>(false)
let navTimer: ReturnType<typeof setTimeout> | null = null

router.beforeEach(() => {
  if (navTimer) clearTimeout(navTimer)
  navTimer = setTimeout(() => { navigating.value = true }, 80)
})
router.afterEach(() => {
  if (navTimer) clearTimeout(navTimer)
  navigating.value = false
})
</script>

<template>
  <transition name="nav-fade">
    <div v-if="navigating" class="nav-overlay">
      <div class="nav-spinner"></div>
    </div>
  </transition>

  <router-view v-slot="{ Component }">
    <transition name="page-fade" mode="out-in">
      <component :is="Component" :key="$route.name" />
    </transition>
  </router-view>
</template>

<style>
html, body, #app {
  background: #1e40af;
}
</style>

<style scoped>
.nav-overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(160deg, #1e40af, #3b82f6);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.nav-fade-enter-active,
.nav-fade-leave-active { transition: opacity 0.15s; }
.nav-fade-enter-from,
.nav-fade-leave-to { opacity: 0; }

.page-fade-enter-active,
.page-fade-leave-active { transition: opacity 0.1s; }
.page-fade-enter-from,
.page-fade-leave-to { opacity: 0; }

@keyframes spin { to { transform: rotate(360deg); } }
</style>
