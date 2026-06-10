# 1. 使用官方極速的 Bun 鏡像
FROM oven/bun:1.1-alpine AS base
WORKDIR /usr/src/app

# 2. 複製依賴描述檔與備用金句庫（關鍵修正：先把 json 拿進來以免編譯失敗）
COPY package.json bun.lockb* backup_answers.json ./
RUN bun install --frozen-lockfile

# 3. 複製專案其餘所有程式碼（包含資料庫與網頁模板）
COPY . .

# 4. 宣告容器內運行的 Port
EXPOSE 5000

# 5. 用正式環境指令啟動 Bun 全端伺服器
CMD ["bun", "run", "server.ts"]