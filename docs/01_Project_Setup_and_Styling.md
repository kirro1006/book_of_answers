# 早餐時光實戰手冊 (一)：專案初始化與樣式設定 (v2025)

歡迎來到「早餐時光」React 實戰手冊！在本系列教學中，我們將從零開始，使用最新、最高效的技術棧，一步步親手打造一個功能完整的線上早餐訂餐網站。

本章節，我們將專注於專案的起點：建立專案並設定一個現代化、無設定檔的樣式系統。

---

## 1. 專案初始化 (with Vite)

我們將使用 [Vite](https://vitejs.dev/) 這個現代化的前端建置工具來建立我們的 React 專案。

在你的終端機中，移動到你想要放置專案的目錄，然後執行以下指令：

```bash
# 這個指令會建立一個名為 breakfast-app 的新目錄
# 並在其中設定好一個使用 React 模板的 Vite 專案
npm create vite@latest breakfast-app -- --template react
```

指令執行完畢後，進入這個新建立的目錄：

```bash
cd breakfast-app
```

接著，安裝專案所需的所有預設依賴套件：

```bash
# 這個指令會讀取 package.json 檔案，並下載所有需要的套件
npm install
```

太棒了！現在你的專案已經建立完成。讓我們啟動開發伺服器，看看它最初的樣子：

```bash
# 啟動 Vite 開發伺服器
npm run dev
```

終端機將會顯示一個本地網址（通常是 `http://localhost:5173`）。在瀏覽器中打開它，你應該會看到 Vite 和 React 的預設歡迎頁面。

---

## 2. 清理預設模板

Vite 的預設模板提供了一些範例檔案，但我們即將建立自己的架構，所以先把它們清理乾淨。

**A. 刪除以下檔案：**
*   `src/App.css`
*   `src/assets/react.svg`
*   `public/vite.svg`

**B. 修改 `src/App.jsx`：**
將檔案內容替換成以下最基本的 "Hello World"：

```jsx
// src/App.jsx
function App() {
  return (
    <div>
      <h1 className="text-3xl font-bold underline">
        Hello World!
      </h1>
    </div>
  )
}

export default App
```

**C. 清空 `src/index.css`：**
將 `src/index.css` 的所有內容刪除，我們馬上就會在這裡配置全新的 Tailwind CSS。

---

## 3. 設定 Tailwind CSS v4 (最新作法)

Tailwind CSS v4 大幅簡化了設定流程。我們不再需要 `tailwind.config.js` 或 `postcss.config.js` 檔案了！

**A. 安裝最新版 Tailwind CSS、Vite 外掛與 DaisyUI：**

在終端機中（確保你仍在 `breakfast-app` 目錄下），執行以下指令來安裝所有需要的開發依賴：

```bash
# @next 標籤會安裝 v4 的預覽版本
# @tailwindcss/vite 是 v4 官方的 Vite 整合工具
npm install -D tailwindcss@next @tailwindcss/vite@next daisyui
```

**B. 設定 Vite 外掛：**

為了讓 Vite 能夠理解並處理 Tailwind CSS v4 的新語法，我們需要在 `vite.config.js` 中載入剛剛安裝的 `@tailwindcss/vite` 外掛。

**完全替換 `vite.config.js` 的內容**：

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 1. 引入 Tailwind CSS 的 Vite 外掛

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 2. 將外掛加入到 plugins 陣列中
  ],
})
```

**C. 在 CSS 中直接配置 Tailwind 和 DaisyUI：**

這是最神奇的一步。打開我們之前清空的 `src/index.css`，並貼上以下內容：

```css
/* src/index.css */
@import "tailwindcss";

/* DaisyUI V5 設定 - 直接在 CSS 中配置 */
@plugin "daisyui" {
  themes: light --default, dark --prefersdark;
}
```

**程式碼講解：**
*   `@import "tailwindcss";`：這一行會神奇地載入 Tailwind CSS 的所有功能，並讓 Vite 處理所有底層的編譯工作。它同時會自動掃描你專案中所有使用到 Tailwind Class 的檔案 (`.jsx`, `.html` 等)。
*   `@plugin "daisyui" { ... }`：這是 DaisyUI v5 的新語法，可以直接在 CSS 中載入外掛並進行設定。這裡我們設定了兩個主題：`light` 是預設主題，而 `dark` 則會根據使用者作業系統的偏好來自動啟用。

> **注意**：完成以上步驟後，請務必**重新啟動你的 Vite 開發伺服器**（在終端機中按下 `Ctrl + C`，然後重新執行 `npm run dev`）以確保所有新的設定和外掛都已生效。

---

## 4. 驗證設定

讓我們修改 `src/App.jsx`，試用一下 DaisyUI 的元件，來驗證我們這套現代化的設定是否成功。

```jsx
// src/App.jsx
function App() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-primary mb-4">早餐時光</h1>
      <p className="mb-4">我們的專案已經採用了最新的樣式設定！</p>
      <button className="btn btn-primary">這是一個 DaisyUI 按鈕</button>
      <button className="btn btn-secondary ml-2">這是第二個按鈕</button>
    </div>
  )
}

export default App
```

回到你的瀏覽器，你現在應該能看到一個帶有主題色的漂亮按鈕了！點擊它們時還會有互動效果。這證明我們全新的、無設定檔的 Tailwind CSS v4 + DaisyUI v5 流程已經成功運作！

---

**做得太棒了！**

你已經使用了當前最高效的方式，完成了專案的初始化和樣式系統設定。我們現在有了一個極其穩固且現代化的基礎。

在下一個章節，我們將會繼續建立專案的**基本佈局（Layout）和頁面路由（Routing）**。