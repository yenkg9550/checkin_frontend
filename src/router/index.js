import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import CheckIn from '@/views/CheckIn.vue'
import Login from '@/views/Login.vue'
import Punch from '@/views/Punch.vue'
import HistoryLiff from '@/views/HistoryLiff.vue'

const TOKEN_KEY = 'lc_token'
const USER_KEY = 'lc_user'

const routes = [
  { path: '/', redirect: '/login' },

  // ── 獨立打卡頁（LIFF 直接開，不需登入守衛）─────────────────────────────────
  { path: '/punch',   name: 'punch',   component: Punch,       meta: { public: true } },
  { path: '/history', name: 'history-liff', component: HistoryLiff, meta: { public: true } },

  { path: '/login', name: 'login', component: Login, meta: { public: true } },
  {
    path: '/app',
    component: AppLayout,
    redirect: '/app/checkin',
    children: [
      { path: 'checkin', name: 'checkin', component: CheckIn, meta: { title: '打卡' } },
      {
        path: 'history',
        name: 'history',
        component: () => import('@/views/History.vue'),
        meta: { title: '打卡紀錄' },
      },
      {
        path: 'admin',
        name: 'admin',
        component: () => import('@/views/admin/Dashboard.vue'),
        meta: { title: '後台管理', adminOnly: true },
      },
      {
        path: 'admin/employees',
        name: 'employees',
        component: () => import('@/views/admin/Employees.vue'),
        meta: { title: '員工管理', adminOnly: true },
      },
    ],
  },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  if (to.meta.public) return  // 公開頁面直接放行

  const isLoggedIn = !!sessionStorage.getItem(TOKEN_KEY)
  let user = null
  try { user = JSON.parse(sessionStorage.getItem(USER_KEY) || 'null') } catch {}

  if (!isLoggedIn) return { name: 'login' }
  if (to.meta.adminOnly && user?.role !== 'admin') return { name: 'checkin' }
})

export default router
