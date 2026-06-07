# 早餐時光實戰手冊 (七)：與 API 同步，保存購物車

我們已經建立了一個很棒的購物車，但它有個「健忘」的毛病——只要重新整理頁面，一切都將煙消雲散。這是因為我們的狀態目前只存在於瀏覽器的記憶體中。

在本章，我們將徹底解決這個問題。我們將把購物車的狀態儲存到我們的 `json-server` 模擬後端中，並將它與當前登入的使用者綁定。這樣，無論使用者何時回來，他們的購物車都會靜靜地在那裡等待。

---

## 1. 建立 API 服務層

為了保持 `CartProvider` 的程式碼清晰，一個好的實踐是將所有 `fetch` 網路請求的邏輯，抽象到一個專門的「服務層」(Service Layer) 檔案中。

在 `src/` 目錄下建立一個新資料夾 `services`，並在其中建立 `api.js` 檔案。

`src/services/api.js`
```javascript
const API_BASE_URL = 'http://localhost:3301';

// 輔助函式，用於處理 fetch 回應
async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '發生未知錯誤' }));
    throw new Error(error.message || '請求失敗');
  }
  return response.json();
}

// 獲取某個使用者的購物車
export async function fetchCart(userId) {
  if (!userId) return [];
  const response = await fetch(`${API_BASE_URL}/cart?userId=${userId}`);
  return handleResponse(response);
}

// 根據菜單 ID 查詢購物車中是否已有該商品
export async function findCartItemByMenuId(menuItemId, userId) {
  if (!userId) return null;
  const response = await fetch(`${API_BADE_URL}/cart?userId=${userId}&menuItemId=${menuItemId}`);
  const items = await handleResponse(response);
  return items[0] || null;
}

// 新增一個商品到購物車
export async function addCartItem(item) {
  const response = await fetch(`${API_BASE_URL}/cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  return handleResponse(response);
}

// 更新購物車中的商品 (例如更新數量)
export async function updateCartItem(itemId, updatedFields) {
  const response = await fetch(`${API_BASE_URL}/cart/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedFields),
  });
  return handleResponse(response);
}

// 從購物車中刪除一個商品
export async function removeCartItem(itemId) {
  const response = await fetch(`${API_BASE_URL}/cart/${itemId}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}
```

**程式碼講解：**
*   我們將所有與 `/cart` 端點相關的 CRUD (Create, Read, Update, Delete) 操作都封裝成了獨立的、可重用的 `async` 函式。
*   `handleResponse` 是一個輔助函式，用於統一處理錯誤情況。
*   注意 `fetchCart` 和 `findCartItemByMenuId` 都需要 `userId`，這是實現「使用者專屬購物車」的關鍵。

---

## 2. 全面升級 `CartProvider`

現在，我們要對 `CartProvider` 進行一次大手術，將它從一個同步的、基於記憶體的管理者，升級為一個非同步的、與後端連動的指揮中心。

**完全替換 `src/contexts/CartProvider.jsx` 的內容：**

```jsx
// src/contexts/CartProvider.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import CartContext from './cartContext';
import * as api from '../services/api'; // 1. 引入我們的 API 服務

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // 全域載入狀態
  const [error, setError] = useState(null);
  
  const { user, isLoaded: isUserLoaded } = useUser(); // 2. 取得 Clerk 的使用者物件
  const userId = user?.id;

  // 3. 當使用者狀態載入完成或使用者 ID 改變時，從後端獲取購物車
  useEffect(() => {
    if (!isUserLoaded) return; // 等待 Clerk 初始化完成

    if (!userId) {
      // 如果使用者登出，清空購物車
      setCartItems([]);
      setIsLoading(false);
      return;
    }

    const loadCart = async () => {
      setIsLoading(true);
      try {
        const items = await api.fetchCart(userId);
        setCartItems(items);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
  }, [userId, isUserLoaded]);

  // 重新獲取購物車的輔助函式
  const refreshCart = useCallback(async () => {
    if (!userId) return;
    try {
      const items = await api.fetchCart(userId);
      setCartItems(items);
    } catch (err) {
      console.error("刷新購物車失敗:", err);
    }
  }, [userId]);

  // 4. 改造 addToCart 為 async 函式
  const addToCart = useCallback(async (menuItem) => {
    if (!userId) throw new Error("請先登入");

    try {
      const existingItem = await api.findCartItemByMenuId(menuItem.id, userId);
      
      if (existingItem) {
        // 如果已存在，更新數量 (PATCH)
        await api.updateCartItem(existingItem.id, {
          quantity: existingItem.quantity + 1
        });
      } else {
        // 如果不存在，新增一筆 (POST)
        await api.addCartItem({
          ...menuItem,
          menuItemId: menuItem.id, // 確保有關聯 ID
          id: undefined, // 讓 json-server 自動產生 id
          userId: userId,
          quantity: 1,
        });
      }
      await refreshCart(); // 操作成功後，重新獲取整個購物車以同步狀態
    } catch (err) {
      setError(err.message);
      throw err; // 將錯誤向上拋出，讓 UI 層可以捕捉到
    }
  }, [userId, refreshCart]);
  
  // 5. 改造 updateQuantity 和 removeFromCart
  const updateQuantity = useCallback(async (itemId, newQuantity) => {
    const quantity = Math.max(0, newQuantity);
    if (quantity === 0) {
      await removeFromCart(itemId);
    } else {
      await api.updateCartItem(itemId, { quantity });
      await refreshCart();
    }
  }, [userId, refreshCart]);

  const removeFromCart = useCallback(async (itemId) => {
    await api.removeCartItem(itemId);
    await refreshCart();
  }, [userId, refreshCart]);


  const cartCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);
  const totalAmount = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [cartItems]);

  const value = useMemo(() => ({
    cartItems,
    cartCount,
    totalAmount,
    isLoading,
    error,
    addToCart,
    removeFromCart,
    updateQuantity,
  }), [cartItems, cartCount, totalAmount, isLoading, error, addToCart, removeFromCart, updateQuantity]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
```

**主要變更：**
1.  **引入 `api.js`**：我們不再直接操作 `cartItems` 陣列。
2.  **取得 `userId`**：使用 `useUser()` 來識別當前操作的使用者。
3.  **`useEffect` 初始化**：在元件掛載或使用者變更時，自動從後端載入屬於該使用者的購物車。
4.  **非同步改造**：`addToCart` 等函式現在都是 `async`，它們會先呼叫 `api.js` 中的服務，操作成功後再呼叫 `refreshCart` 來同步前端的狀態，確保資料一致性。
5.  **錯誤處理**：`addToCart` 會將 API 錯誤向上拋出，這樣呼叫它的元件（例如 `Menu.jsx`）就能夠捕捉到並給予使用者提示。

---

## 3. 升級 `Menu.jsx` 以處理非同步操作

我們的 `CartProvider` 已經變成了非同步，現在我們需要更新 `Menu.jsx` 來適應這個變化。我們需要處理按鈕的載入狀態，並捕捉可能發生的錯誤。

**修改 `src/pages/Menu.jsx`:**

```jsx
// src/pages/Menu.jsx
import React, { useState } from 'react'; // 引入 useState
import useMenu from '../hooks/useMenu';
import { formatCurrency } from '../utils/helpers';
import { useUser } from '@clerk/clerk-react';
import useCart from '../hooks/useCart';

const Menu = () => {
  const { menuItems, isLoading: isMenuLoading, error: menuError } = useMenu();
  const { isSignedIn } = useUser();
  const { addToCart } = useCart();
  
  // 新增兩個 state 來處理 UI 反饋
  const [isAdding, setIsAdding] = useState(null); // 追蹤哪個商品正在被加入
  const [feedback, setFeedback] = useState(null); // 顯示成功或失敗訊息

  // ...
  const handleAddToCart = async (item) => {
    if (isAdding) return; // 防止重複點擊

    setIsAdding(item.id);
    setFeedback(null);
    try {
      await addToCart(item);
      setFeedback({ type: 'success', message: `${item.name} 已加入購物車！` });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || '加入失敗，請稍後再試' });
    } finally {
      setIsAdding(null);
      // 設定一個計時器，幾秒後自動隱藏提示訊息
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // ... 載入和錯誤處理 ...

  return (
    <div className="space-y-12">
      {/* 增加一個顯示提示訊息的區塊 */}
      {feedback && (
        <div className={`alert ${feedback.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ... */}
      <div className="card-actions justify-end">
        <button
          className="btn btn-primary"
          disabled={!isSignedIn || isAdding === item.id}
          onClick={() => handleAddToCart(item)}
        >
          {isAdding === item.id ? (
            <span className="loading loading-spinner"></span>
          ) : isSignedIn ? (
            "加入購物車"
          ) : (
            "請先登入"
          )}
        </button>
      </div>
      {/* ... */}
    </div>
  );
};

export default Menu;

```
*請注意，你需要將上述程式碼片段整合到你現有的 `Menu.jsx` 中，主要是 `handleAddToCart` 函式和 `button` 的部分。*

**主要變更：**
*   `handleAddToCart` 現在是一個 `async` 函式，並用 `try...catch` 包裹了對 `addToCart` 的呼叫。
*   我們新增了 `isAdding` 狀態，在 API 請求期間禁用按鈕並顯示載入中動畫，防止使用者重複點擊。
*   我們新增了 `feedback` 狀態，在操作完成後給予使用者明確的成功或失敗提示。

---

**驗收成果！**

這是關鍵時刻。請執行以下步驟：
1.  確保你的 `npm run dev` 和 `npm run mock-api` 都在運行。
2.  登入你的帳號。
3.  在菜單頁面加入幾個商品。
4.  **重新整理你的瀏覽器！**
5.  回到購物車頁面 (`/cart`)。

如果一切順利，你會發現... 購物車裡的商品都還在！它們已經被成功地儲存到了 `json-server/db.json` 檔案中，並與你的 `userId` 關聯。你可以試著登出，然後用另一個帳號登入，你會發現那是一個全新的、空的購物車。

我們已經完成了一個真正意義上持久化的購物車系統。

在最後的章節中，我們將完成「**結帳**」的流程，並為我們的專案做最後的潤飾和總結。
