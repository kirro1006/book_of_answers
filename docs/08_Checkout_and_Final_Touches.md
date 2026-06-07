# 早餐時光實戰手冊 (八)：結帳流程與專案總結

歡迎來到我們實戰手冊的最終章！你已經走過了一段漫長的旅程，從一個空無一物的資料夾，到現在一個功能豐富、接近真實的動態網站。在本章，我們將完成最後一塊拼圖：**結帳流程**。

當使用者心滿意足地選完所有商品後，我們需要提供一個「結帳」的按鈕，將他們的購物車「轉換」成一張訂單，並清空購物車，以便他們開始下一次的購物。

---

## 1. 後端與 API 準備

首先，我們需要讓後端 `json-server` 能夠接收和儲存「訂單」資料。

**A. 更新 `db.json`**

打開 `json-server/db.json` 檔案，在最外層的 JSON 物件中，加入一個空的 `orders` 陣列。

`json-server/db.json`
```json
{
  "menu": [
    // ... menu data ...
  ],
  "orders": [] // <--- 在這裡加入這行
}
```
`json-server` 會自動偵測到這個變動，並為我們建立一個 `http://localhost:3301/orders` 的 API 端點，我們可以對它進行 `GET` 和 `POST` 操作。

**B. 在 `api.js` 中新增 `createOrder` 函式**

打開 `src/services/api.js`，在檔案底部加入以下函式，用來將訂單資料傳送到後端。

`src/services/api.js`
```javascript
// ... 其他 api 函式 ...

// 建立一筆新訂單
export async function createOrder(order) {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
  return handleResponse(response);
}
```

---

## 2. 最終升級：`CartProvider` 的結帳與清空邏輯

現在，讓我們為 `CartProvider` 加入最後兩個關鍵能力：`checkout` 和 `clearCart`。

**修改 `src/contexts/CartProvider.jsx`**，加入 `checkout` 和 `clearCart` 函式，並將它們提供出去。

```jsx
// src/contexts/CartProvider.jsx
// ... (保留頂部的 import 和現有函式)

export function CartProvider({ children }) {
  // ... (保留現有的 useState, useUser, useEffect, refreshCart, addToCart, updateQuantity, removeFromCart)

  // 新增：清空購物車函式
  const clearCart = useCallback(async () => {
    if (!userId) return;
    try {
      // 獲取當前使用者的所有購物車項目
      const userCartItems = await api.fetchCart(userId);
      // 遍歷並刪除每一項
      for (const item of userCartItems) {
        await api.removeCartItem(item.id);
      }
      await refreshCart(); // 重新整理前端狀態
    } catch (err) {
      console.error("清空購物車失敗:", err);
      setError(err.message);
    }
  }, [userId, refreshCart]);
  
  // 新增：結帳函式
  const checkout = useCallback(async () => {
    if (!userId || cartItems.length === 0) {
      throw new Error("購物車是空的或使用者未登入");
    }
    
    // 1. 建立訂單 payload
    const orderPayload = {
      userId,
      items: cartItems.map(item => ({
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      totalAmount,
      status: 'pending', // 訂單狀態，例如 'pending', 'completed'
      createdAt: new Date().toISOString(),
    };
    
    try {
      // 2. 呼叫 API 建立訂單
      await api.createOrder(orderPayload);
      
      // 3. 訂單建立成功後，清空購物車
      await clearCart();
      
    } catch (err) {
      console.error("結帳失敗:", err);
      setError(err.message);
      throw err; // 將錯誤拋出，讓 UI 層處理
    }
    
  }, [userId, cartItems, totalAmount, clearCart]);

  // ... (保留 cartCount 和 totalAmount 的 useMemo)

  // 將新函式加入到 value 中
  const value = useMemo(() => ({
    // ... (保留現有的值)
    checkout, // 新增
    clearCart, // 新增
  }), [/* ... 更新依賴 ... */, checkout, clearCart]);
  
  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
```
*請注意：你需要將 `checkout` 和 `clearCart` 函式以及更新後的 `value` 物件，整合到你現有的 `CartProvider.jsx` 中。*

---

## 3. 在購物車頁面觸發結帳

萬事俱備，只差臨門一腳。讓我們回到 `Cart.jsx`，讓「前往結帳」按鈕真正地動起來。

**修改 `src/pages/Cart.jsx`:**

```jsx
// src/pages/Cart.jsx
import React, { useState } from 'react'; // 引入 useState
import { Link, useNavigate } from 'react-router-dom'; // 引入 useNavigate
import useCart from '../hooks/useCart';
import { formatCurrency } from '../utils/helpers';

const CartPage = () => {
  // 1. 從 Hook 中取得 checkout 函式
  const { cartItems, cartCount, totalAmount, updateQuantity, removeFromCart, checkout } = useCart();
  const navigate = useNavigate(); // 用於頁面跳轉
  
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState(null);

  // 2. 建立結帳處理函式
  const handleCheckout = async () => {
    setIsCheckingOut(true);
    setError(null);
    try {
      await checkout();
      // 結帳成功後，可以跳轉到一個感謝頁面或訂單頁
      alert("下單成功！感謝您的購買！");
      navigate('/'); // 跳轉回首頁
    } catch (err) {
      setError(err.message || "結帳過程中發生錯誤，請稍後再試。");
    } finally {
      setIsCheckingOut(false);
    }
  };

  // ... (保留空購物車的 JSX)

  return (
    <div>
      {/* ... (保留商品列表的 JSX) ... */}

      {/* 顯示錯誤訊息 */}
      {error && <div className="alert alert-error mt-4"><span>{error}</span></div>}

      {/* 總計與結帳 */}
      <div className="mt-8 flex justify-end">
        <div className="card w-96 bg-base-200 shadow-xl">
          <div className="card-body">
            {/* ... */}
            <div className="card-actions justify-end mt-4">
              {/* 3. 綁定事件並處理載入中狀態 */}
              <button 
                className="btn btn-primary w-full"
                onClick={handleCheckout}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? <span className="loading loading-spinner"></span> : "前往結帳"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
```
**主要變更：**
1.  從 `useCart` 中取得了 `checkout` 函式。
2.  建立了一個 `handleCheckout` 函式，它會呼叫 `checkout` 並處理載入中和錯誤狀態。
3.  當結帳成功時，我們用一個簡單的 `alert` 提示使用者，並使用 `useNavigate` 這個 Hook 將使用者導回首頁。

---

## 4. 專案總結與回顧

**恭喜你！你已經完成了整個「早餐時光」專案的開發！**

讓我們一起回顧這趟旅程：
1.  **專案初始化**：我們使用 Vite 建立了專案，並整合了 Tailwind CSS 和 DaisyUI 來打造美觀的 UI。
2.  **佈局與路由**：我們使用 React Router 建立了網站的骨架，實現了單頁應用的導航。
3.  **模擬後端**：我們使用 `json-server` 快速建立了一個 REST API，實現了前後端分離的開發模式。
4.  **動態資料**：我們建立了自訂 Hook `useMenu`，從後端獲取菜單資料並動態渲染到頁面上。
5.  **使用者驗證**：我們整合了 Clerk，輕鬆地為應用程式加上了完整、安全的註冊和登入功能。
6.  **全域狀態管理**：我們學習並實作了 React Context API，建立了一個強大且解耦的購物車狀態管理系統。
7.  **API 同步**：我們將購物車狀態與後端 API 同步，實現了資料的持久化儲存。
8.  **結帳流程**：我們完成了最後的結帳功能，將購物車轉換為訂單。

你現在所掌握的，已經是一套足以應對真實世界中、中型複雜度 React 專案的完整技術棧。

## 接下來呢？

一個專案的完成，往往是另一個學習旅程的開始。如果你還意猶未盡，這裡有一些可以挑戰的方向：
*   **建立「我的訂單」頁面**：在 `api.js` 中新增 `fetchOrders(userId)` 函式，並建立一個新頁面 `/orders` 來顯示使用者的歷史訂單。
*   **樂觀更新 (Optimistic Updates)**：當使用者點擊「加入購物車」時，不等 API 回應，UI 就立刻更新。這會讓使用者體驗更加流暢。原始的專案程式碼中使用了 `useOptimistic` Hook，你可以試著研究它。
*   **更詳細的錯誤處理**：為不同的錯誤顯示更具體的提示訊息。
*   **後端深化**：嘗試用 Node.js + Express 或其他後端框架，來取代 `json-server`，建立一個真正的後端。

希望這份實戰手冊對你有所幫助。不斷練習、不斷探索，你將會在前端開發的道路上越走越遠。祝你編碼愉快！
