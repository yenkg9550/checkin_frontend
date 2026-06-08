# CheckIn Frontend — 員工端

LINE 打卡系統的員工端，以 LINE LIFF 為載體，提供打卡、補打卡申請、請假申請、打卡紀錄、班表查詢等功能。

## 技術棧

- Vue 3 + Composition API + TypeScript
- Vite / Element Plus / Pinia / Vue Router / Axios
- LINE LIFF SDK

## 快速開始

```bash
npm install
npm run dev     # 開發：http://localhost:5173
npm run build   # 型別檢查 + 打包
```

## 環境變數

複製 `.env.example` 為 `.env` 並填入：

```
VITE_API_BASE=http://localhost:8000/api/v1
VITE_LIFF_ID=                      # 打卡 LIFF ID
VITE_HISTORY_LIFF_ID=              # 打卡紀錄 LIFF ID
VITE_SCHEDULE_LIFF_ID=             # 班表 LIFF ID
VITE_MANUAL_PUNCH_LIFF_ID=         # 補打卡申請 LIFF ID
VITE_LEAVE_REQUEST_LIFF_ID=        # 請假申請 LIFF ID
```

> ⚠️ `.env` 已加入 `.gitignore`，請勿提交真實金鑰。

## 頁面路由

### AppLayout（需 LINE 登入）

| 路徑 | 說明 |
|------|------|
| `/app/checkin` | 上班 / 下班打卡 |
| `/app/history` | 個人打卡紀錄 |
| `/app/schedule` | 我的班表 |

### 獨立 LIFF 頁面

| 路徑 | 說明 | LIFF 環境變數 |
|------|------|------|
| `/punch` | 快速打卡（上/下班） | `VITE_LIFF_ID` |
| `/history` | 查詢指定日期打卡紀錄 | `VITE_HISTORY_LIFF_ID` |
| `/schedule` | 查詢個人班表 | `VITE_SCHEDULE_LIFF_ID` |
| `/manual-punch` | 補打卡申請 | `VITE_MANUAL_PUNCH_LIFF_ID` |
| `/leave-request` | 請假申請 | `VITE_LEAVE_REQUEST_LIFF_ID` |

## 一鍵 Commit & Push

```bash
bash commit.sh
bash commit.sh "自訂訊息"
```
