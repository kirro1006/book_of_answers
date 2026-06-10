# 1. 使用官方極速的 Bun 鏡像
FROM oven/bun:1.1-alpine AS base
WORKDIR /usr/src/app

# 2. 複製依賴描述檔與備用金句庫（關鍵修正：移除 bun.lockb* 的強制綁定）
COPY package.json backup_answers.json ./

# 3. 關鍵修正：拔掉 --frozen-lockfile，直接進行標準安裝
RUN bun install

# 4. 複製專案其餘所有程式碼（包含資料庫與網頁模板）
COPY . .

# 5. 宣告容器內運行的 Port
EXPOSE 5000

# 6. 用正式環境指令啟動 Bun 全端伺服器
CMD ["bun", "run", "server.ts"]