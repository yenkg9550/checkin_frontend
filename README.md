# CheckIn Frontend — 員工端

LINE 打卡系統的員工端，使用 LINE LIFF 登入，提供打卡、查看個人打卡紀錄功能。

## 技術棧

- Vue 3 + Composition API + TypeScript
- Vite
- Element Plus
- Pinia
- Vue Router
- Axios
- LINE LIFF SDK

## 快速開始

```bash
npm install
npm run dev     # 開發：http://localhost:5173
npm run build   # 型別檢查 + 打包
npm run preview # 預覽打包結果
```

## 環境變數

在根目錄建立 `.env` 檔：

```
VITE_API_BASE=http://localhost:8000/api/v1
VITE_LIFF_ID=your-liff-id
```

## 頁面路由

| 路徑 | 頁面 | 說明 |
|------|------|------|
| `/login` | Login | LINE LIFF 登入 |
| `/app/checkin` | CheckIn | 打卡（上班 / 下班） |
| `/app/history` | History | 個人打卡紀錄 |
| `/app/admin` | Dashboard | 出勤管理（管理員限定） |
| `/app/admin/employees` | Employees | 員工管理（管理員限定） |
| `/punch` | Punch | 打卡快捷頁（公開） |
| `/history` | HistoryLiff | LIFF 打卡紀錄（公開） |

## 一鍵 Commit

```bash
bash commit.sh              # 自動產生 commit message
bash commit.sh "自訂訊息"    # 使用自訂訊息
```
