#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# commit.sh  ─  line-checkin-frontend（Vue 3 + TypeScript 員工端）
# 用法：
#   bash commit.sh            # 自動產生 commit message
#   bash commit.sh "自訂訊息"  # 使用自訂 commit message
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── 1. 若尚未初始化 git，自動 init ──────────────────────────
if ! git rev-parse --git-dir &>/dev/null; then
  echo "⚙️  初始化 git repository..."
  git init
  if [[ ! -f .gitignore ]]; then
    cat > .gitignore <<'EOF'
node_modules/
dist/
.DS_Store
*.log
.env
.env.*
!.env.example
EOF
    echo "✅ 已建立 .gitignore"
  fi
fi

# ── 2. git add 全部變動 ──────────────────────────────────────
git add -A

# ── 3. 確認有東西可以 commit ─────────────────────────────────
if git diff --cached --quiet; then
  echo "✨ 沒有任何變動，無需 commit。"
  exit 0
fi

# ── 4. 分析變動的檔案，自動產生 commit message ───────────────
if [[ $# -ge 1 && -n "$1" ]]; then
  COMMIT_MSG="$1"
else
  CHANGED_FILES=$(git diff --cached --name-only)
  ADDED=$(git diff --cached --name-only --diff-filter=A | wc -l | tr -d ' ')
  MODIFIED=$(git diff --cached --name-only --diff-filter=M | wc -l | tr -d ' ')
  DELETED=$(git diff --cached --name-only --diff-filter=D | wc -l | tr -d ' ')

  SCOPES=()
  echo "$CHANGED_FILES" | grep -q "src/views/CheckIn"   && SCOPES+=("checkin")
  echo "$CHANGED_FILES" | grep -q "src/views/History"   && SCOPES+=("history")
  echo "$CHANGED_FILES" | grep -q "src/views/Login"     && SCOPES+=("login")
  echo "$CHANGED_FILES" | grep -q "src/views/Punch"     && SCOPES+=("punch")
  echo "$CHANGED_FILES" | grep -q "src/views/admin/"    && SCOPES+=("admin-view")
  echo "$CHANGED_FILES" | grep -q "src/stores/"         && SCOPES+=("store")
  echo "$CHANGED_FILES" | grep -q "src/router/"         && SCOPES+=("router")
  echo "$CHANGED_FILES" | grep -q "src/api/"            && SCOPES+=("api")
  echo "$CHANGED_FILES" | grep -q "src/types/"          && SCOPES+=("types")
  echo "$CHANGED_FILES" | grep -q "src/layouts/"        && SCOPES+=("layout")
  echo "$CHANGED_FILES" | grep -q "commit\.sh\|\.gitignore\|package\.json\|vite\.config\|tsconfig" && SCOPES+=("config")

  IFS=$'\n' UNIQUE_SCOPES=($(printf "%s\n" "${SCOPES[@]:-other}" | sort -u))
  SCOPE_STR=$(IFS=", "; echo "${UNIQUE_SCOPES[*]}")

  STATS=""
  [[ "$ADDED"    -gt 0 ]] && STATS+="${ADDED} 新增"
  [[ "$MODIFIED" -gt 0 ]] && { [[ -n "$STATS" ]] && STATS+=", "; STATS+="${MODIFIED} 修改"; }
  [[ "$DELETED"  -gt 0 ]] && { [[ -n "$STATS" ]] && STATS+=", "; STATS+="${DELETED} 刪除"; }

  TOTAL=$(( ADDED + MODIFIED + DELETED ))
  if [[ "$TOTAL" -eq 1 ]]; then
    SINGLE_FILE=$(echo "$CHANGED_FILES" | head -1 | xargs basename)
    COMMIT_MSG="feat(${SCOPE_STR}): update ${SINGLE_FILE}"
  else
    COMMIT_MSG="feat(${SCOPE_STR}): ${STATS} 個檔案"
  fi
fi

# ── 5. 執行 commit ───────────────────────────────────────────
git commit -m "$COMMIT_MSG"

echo ""
echo "✅ Commit 完成！"
echo "   訊息：$COMMIT_MSG"
echo ""
git log --oneline -5

# ── 6. git push ────────────────────────────────────────────
if git remote get-url origin &>/dev/null; then
  echo ""
  echo "🚀 推送中..."
  git push
  echo "✅ Push 完成！"
else
  echo "⚠️  尚未設定 remote origin，跳過 push。"
  echo "   請執行：git remote add origin <你的 repo URL>"
fi
