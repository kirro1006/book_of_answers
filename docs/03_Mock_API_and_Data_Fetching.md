# 早餐時光實戰手冊 (三)：模擬 API 與資料獲取

目前為止，我們的應用程式已經有了漂亮的佈局和頁面切換功能，但所有內容都是靜態寫死在程式碼裡的。在這一章，我們將邁出成為一個「動態」應用程式的關鍵一步：從後端獲取資料並顯示它。

由於我們還沒有真實的後端伺服器，我們將使用一個名為 `json-server` 的神奇工具，來快速模擬出一個 REST API。

本章目標：
1.  設定並啟動一個模擬 API 伺服器。
2.  建立一個自訂 Hook (`useMenu`) 來封裝獲取資料的邏輯。
3.  在「美味菜單」頁面中，動態地顯示我們獲取到的菜單項目。

---

## 1. 設定模擬 API (`json-server`)

`json-server` 是一個能讓你用一個簡單的 JSON 檔案，在 30 秒內建立出一個功能完整的 REST API 的工具。這對於前端開發者來說非常方便，因為我們不再需要等待後端開發完成才能開始工作。

**A. 安裝 `json-server`:**

在你的專案根目錄 (`breakfast-app`) 下，執行以下指令：

```bash
# 將 json-server 安裝為開發依賴
npm install -D json-server
```

**B. 建立資料檔案 (`db.json`):**

首先，在專案的**根目錄**（與 `src` 同層）建立一個名為 `json-server` 的新資料夾。然後，在該資料夾中建立一個 `db.json` 檔案。

`breakfast-app/json-server/db.json`

將以下 JSON 內容貼到 `db.json` 檔案中。這將是我們 API 的資料來源：

```json
{
  "menu": [
    {
      "id": "1",
      "category": "breakfast",
      "name": "經典早餐",
      "description": "包含煎蛋、培根、吐司和咖啡",
      "price": 25,
      "image": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80"
    },
    {
      "id": "2",
      "category": "breakfast",
      "name": "健康早餐",
      "description": "包含燕麥、水果和優格",
      "price": 20,
      "image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80"
    },
    {
      "id": "5",
      "category": "breakfast",
      "name": "漢堡系列",
      "description": "美式經典漢堡",
      "price": 30,
      "image": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80"
    },
    {
      "id": "6",
      "category": "breakfast",
      "name": "披薩系列",
      "description": "手工現烤披薩",
      "price": 22,
      "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80"
    },
    {
      "id": "8",
      "category": "drink",
      "name": "美式咖啡",
      "description": "經典美式咖啡，提神醒腦",
      "price": 15,
      "image": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80"
    },
    {
      "id": "9",
      "category": "drink",
      "name": "拿鐵",
      "description": "香濃牛奶與咖啡的完美結合",
      "price": 20,
      "image": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80"
    }
  ]
}
```

**C. 在 `package.json` 中新增啟動腳本:**

為了方便啟動這個 API 伺服器，我們在 `package.json` 的 `scripts` 區塊中加入一個新指令。

打開 `package.json`，在 `scripts` 中加入 `"mock-api"` 這一行：

```json
// package.json
{
  // ...
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "mock-api": "json-server --watch json-server/db.json --port 3301"
  },
  // ...
}
```

**D. 啟動模擬 API 伺服器:**

現在，你需要**開啟一個新的終端機視窗**（保持原本執行 `npm run dev` 的視窗開啟），並在其中執行：

```bash
npm run mock-api
```

成功後，你會看到 `json-server` 的提示，告訴你 API 已經在 `http://localhost:3301` 上運行，並且有一個 `/menu` 的資源路徑。用瀏覽器打開 `http://localhost:3301/menu`，你應該能看到剛剛我們定義的 JSON 資料。

> **重要提示**：在接下來的開發中，你需要保持這兩個終端機視窗都處於開啟狀態：一個運行 `npm run dev`（前端），另一個運行 `npm run mock-api`（後端模擬）。

---

## 2. 建立自訂 Hook (`useMenu`)

為了讓獲取資料的邏輯可以被重用，並且不讓頁面元件變得過於臃腫，最佳實踐是將獲取資料的邏輯封裝在一個自訂 Hook 中。

在 `src/hooks/` 目錄下建立一個新檔案 `useMenu.js`，並貼上以下內容：

```jsx
// src/hooks/useMenu.js
import { useState, useEffect } from 'react';

export default function useMenu() {
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 定義一個非同步函式來獲取資料
    const fetchMenuItems = async () => {
      try {
        // 使用 Fetch API 向我們的模擬伺服器請求資料
        const response = await fetch('http://localhost:3301/menu');
        if (!response.ok) {
          throw new Error('無法獲取菜單資料');
        }
        const data = await response.json();
        setMenuItems(data);
      } catch (err) {
        setError(err.message);
      } finally {
        // 無論成功或失敗，最後都將載入狀態設為 false
        setIsLoading(false);
      }
    };

    fetchMenuItems();
  }, []); // 空依賴陣列 [] 表示這個 effect 只在元件掛載時執行一次

  // 回傳狀態和資料
  return { menuItems, isLoading, error };
}
```

**程式碼講解：**
*   我們使用 `useState` 來管理三個重要的狀態：`menuItems` (儲存資料)、`isLoading` (顯示載入中)、`error` (顯示錯誤訊息)。
*   我們使用 `useEffect` 來在元件首次渲染後執行獲取資料的副作用 (Side Effect)。
*   `fetch` 是瀏覽器內建的 API，用來發送網路請求。
*   `try...catch...finally` 語法確保我們能優雅地處理成功、失敗和載入完成等不同情況。
*   最後，這個 Hook 回傳一個物件，包含了資料和所有相關狀態，供元件使用。

---

## 3. 在菜單頁面顯示資料

現在萬事俱備，只欠東風。讓我們來修改「美味菜單」頁面，讓它使用 `useMenu` 這個 Hook 來顯示真實的資料。

首先，我們先建立一個格式化貨幣的輔助函式。在 `src/utils/` 目錄下建立 `helpers.js`：
```javascript
// src/utils/helpers.js
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
```

接著，**完全替換** `src/pages/Menu.jsx` 的內容：

```jsx
// src/pages/Menu.jsx
import React from 'react';
import useMenu from '../hooks/useMenu';
import { formatCurrency } from '../utils/helpers';

const Menu = () => {
  // 一行程式碼，搞定資料獲取的所有複雜邏輯！
  const { menuItems, isLoading, error } = useMenu();

  // 處理載入中的情況
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  // 處理發生錯誤的情況
  if (error) {
    return (
      <div className="alert alert-error shadow-lg">
        <span>載入菜單資料時發生錯誤：{error}</span>
      </div>
    );
  }

  // 成功獲取資料，渲染菜單列表
  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-3xl font-bold mb-6">美味菜單</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <div key={item.id} className="card bg-base-100 shadow-xl">
              <figure>
                <img src={item.image} alt={item.name} className="w-full h-48 object-cover" />
              </figure>
              <div className="card-body">
                <h2 className="card-title">{item.name}</h2>
                <p>{item.description}</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(item.price)}
                </p>
                <div className="card-actions justify-end">
                  <button className="btn btn-primary">
                    加入購物車
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Menu;
```

---

**見證奇蹟的時刻！**

回到你的瀏覽器，並切換到「美味菜單」頁面。你應該會先短暫地看到一個載入中的動畫，然後是從 `db.json` 來的菜單項目，以卡片的形式漂亮地呈現在你眼前！

我們成功地將一個靜態頁面，改造成了從後端 API 動態載入資料的頁面。這是在建構真實世界應用程式中非常重要的一步。

在下一個章節，我們將要處理一個更核心的功能：**使用者驗證 (Authentication)**。我們將引入第三方服務 Clerk，讓使用者可以註冊和登入，為之後的「加入購物車」功能鋪路。
