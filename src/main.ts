import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhTw from 'element-plus/es/locale/lang/zh-tw'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import './styles/global.css'

function showStartupError(message = '頁面載入失敗，請重新載入'): void {
  const el = document.getElementById('app')
  if (!el) return
  el.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1d4ed8;padding:24px;">
      <div style="background:#fff;border-radius:20px;padding:40px 28px;text-align:center;width:280px;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
        <div style="font-size:18px;font-weight:700;margin-bottom:8px;color:#1f2937;">載入失敗</div>
        <div style="font-size:13px;color:#6b7280;margin-bottom:24px;">${message}</div>
        <button onclick="window.location.reload()" style="background:#3b82f6;color:#fff;border:none;border-radius:10px;padding:12px 32px;font-size:15px;cursor:pointer;width:100%;">重新載入</button>
      </div>
    </div>`
}

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhTw })

app.config.errorHandler = (err: unknown) => {
  console.error(err)
  showStartupError('發生錯誤，請重新載入')
}

router.isReady()
  .then(() => {
    app.mount('#app')

    setTimeout(() => {
      const appEl = document.getElementById('app')
      if (appEl && !appEl.innerHTML.trim()) showStartupError()
    }, 8000)
  })
  .catch((err: unknown) => {
    console.error(err)
    showStartupError('路由載入失敗，請重新載入')
  })
