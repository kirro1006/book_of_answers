# 早餐時光實戰手冊 (五)：購物車狀態管理 (Context API)

恭喜你來到本系列教學最核心的一章！我們即將為「早餐時光」應用程式打造它的心臟——購物車系統。這不僅僅是關於加入商品，更是關於學習如何在一個複雜的 React 應用中，優雅地管理「全域狀態」。

## 1. 為什麼需要「全域狀態管理」？

想像一下購物車的狀態：裡面有哪些商品、總共有幾件、總金額多少... 這個狀態在很多地方都會被用到：
*   `Header` 元件需要知道商品總數，來顯示在購物車圖示上。
*   `Menu` 元件需要一個「加入購物車」的函式。
*   `Cart` 頁面需要顯示所有商品，並能修改它們的數量或將其刪除。

如果我們把這個狀態放在最頂層的 `App.jsx` 元件中，要如何將它傳遞給深層的子元件呢？我們可能需要這樣做：

`App` -> `Header` -> `...` -> `CartIcon` (傳遞 `cartCount`)
`App` -> `MenuPage` -> `MenuList` -> `MenuItem` (傳遞 `addToCart` 函式)

這種層層傳遞 props 的方式，被稱為 **"Props Drilling"（屬性鑽取）**。它會讓程式碼變得非常混亂且難以維護。

為了解決這個問題，React 提供了一個內建的解決方案：**Context API**。

**Context API** 允許我們建立一個「全域」的狀態儲藏室，任何被授權的元件，無論它在多深層的位置，都可以直接存取這個儲藏室裡的狀態，而無需透過中間元件傳遞。

---

## 2. Context API 的三劍客

我們的購物車系統將由三個核心部分組成：

1.  **Context 物件**: 使用 `createContext` 建立，像是一個空的「狀態容器」。
2.  **Provider 元件**: 將狀態和操作狀態的函式「提供」給所有子元件。這是我們所有邏輯的家。
3.  **自訂 Hook**: 一個我們自己寫的 Hook (例如 `useCart`)，讓其他元件能方便地「取用」狀態。

讓我們動手來建立它們。

---

## 3. 建立 `CartContext` 和 `useCart` Hook

**A. 建立 Context 物件**

在 `src/` 下建立一個新目錄 `contexts`。然後在其中建立 `cartContext.js`：
`src/contexts/cartContext.js`
```javascript
import { createContext } from "react";

// 建立一個新的 Context 物件，初始值為 null
const CartContext = createContext(null);

export default CartContext;
```

**B. 建立 `useCart` Hook**

接著，在 `src/hooks/` 目錄下建立 `useCart.js`。這個 Hook 是一個捷徑，讓元件可以輕鬆地存取 `CartContext`。

`src/hooks/useCart.js`
```javascript
import { useContext } from "react";
import CartContext from "../contexts/cartContext.js";

export default function useCart() {
  const context = useContext(CartContext);
  if (context === null) {
    // 建立一個保護機制，確保這個 Hook 只在 CartProvider 內部使用
    throw new Error("useCart 必須在 CartProvider 中使用");
  }
  return context;
}
```

---

## 4. 建立 `CartProvider` (核心邏輯)

這是我們系統的大腦。我們將在這裡管理購物車的狀態，並定義所有相關的操作。

在 `src/contexts/` 目錄下建立 `CartProvider.jsx`。

`src/contexts/CartProvider.jsx`
```jsx
import React, { useState, useMemo } from 'react';
import CartContext from './cartContext';

// 為了方便說明，我們先從一個只存在於前端記憶體的購物車開始
export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  // 加入購物車的函式
  const addToCart = (menuItem) => {
    setCartItems(prevItems => {
      // 檢查商品是否已在購物車中
      const existingItem = prevItems.find(item => item.id === menuItem.id);
      if (existingItem) {
        // 如果已存在，數量 +1
        return prevItems.map(item =>
          item.id === menuItem.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        // 如果是新商品，加入陣列，數量設為 1
        return [...prevItems, { ...menuItem, quantity: 1 }];
      }
    });
  };

  // 從購物車移除的函式
  const removeFromCart = (itemId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  // 計算購物車商品總數
  const cartCount = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  // 我們要提供給所有子元件的「值」
  const value = useMemo(() => ({
    cartItems,
    cartCount,
    addToCart,
    removeFromCart,
  }), [cartItems, cartCount]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
```

**程式碼講解 (非常重要！):**
1.  我們使用 `useState` 來管理一個 `cartItems` 陣列。
2.  `addToCart` 函式處理了新增商品或增加已存在商品數量的邏輯。
3.  `cartCount` 使用 `useMemo` 進行了效能優化，只有在 `cartItems` 改變時，它才會重新計算總數。
4.  `value` 物件同樣使用 `useMemo` 包裝，它將我們想要分享的**狀態** (`cartItems`, `cartCount`) 和**函式** (`addToCart`) 捆綁在一起。
5.  最後，`CartContext.Provider` 元件將這個 `value` 「廣播」給被它包裹的所有 `children`。

---

## 5. 在應用程式中啟用 `CartProvider`

現在我們有了 Provider，需要將它放置在元件樹的頂層，以便所有頁面都能存取到它。最佳位置就在 `main.jsx` 中，包裹在 `ClerkProvider` 的內部。

**修改 `src/main.jsx`:**

```jsx
// src/main.jsx
// ... 其他 import
import { CartProvider } from './contexts/CartProvider'; // 1. 匯入 CartProvider

// ...
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkPublishableKey}>
      {/* 2. 用 CartProvider 包裹 RouterProvider */}
      <CartProvider>
        <RouterProvider router={router} />
      </CartProvider>
    </ClerkProvider>
  </React.StrictMode>
);
```

---

## 6. 在元件中使用購物車功能！

見證奇蹟的時刻到了！讓我們來改造 `Header` 和 `Menu` 元件，讓它們使用我們全新的購物車系統。

**A. 改造 `Header.jsx`**

```jsx
// src/components/layout/Header.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import UserMenu from './UserMenu';
import useCart from '../../hooks/useCart'; // 1. 匯入 useCart

const Header = () => {
  const { cartCount } = useCart(); // 2. 一行程式碼取得購物車數量！

  return (
    <header className="navbar ...">
      {/* ... */}
      <div className="navbar-end">
        <Link to="/cart" className="btn btn-ghost btn-circle">
          <div className="indicator">
            {/* ... svg 圖示 ... */}
            {/* 3. 使用真實的 cartCount */}
            {cartCount > 0 && (
              <span className="badge badge-sm indicator-item badge-primary">
                {cartCount}
              </span>
            )}
          </div>
        </Link>
        <UserMenu />
      </div>
    </header>
  );
};

export default Header;
```

**B. 改造 `Menu.jsx`**

```jsx
// src/pages/Menu.jsx
import React from 'react';
import useMenu from '../hooks/useMenu';
import { formatCurrency } from '../utils/helpers';
import { useUser } from '@clerk/clerk-react';
import useCart from '../hooks/useCart'; // 1. 匯入 useCart

const Menu = () => {
  const { menuItems, isLoading, error } = useMenu();
  const { isSignedIn } = useUser();
  const { addToCart } = useCart(); // 2. 取得 addToCart 函式！

  // ... 載入和錯誤處理 ...

  const handleAddToCart = (item) => {
    addToCart(item);
    // 你可以在這裡加入一個提示，例如 "已加入購物車！"
    console.log(`${item.name} 已加入購物車`);
  };

  return (
    <div className="space-y-12">
      {/* ... */}
      <div className="grid ...">
        {menuItems.map((item) => (
          <div key={item.id} className="card ...">
            {/* ... */}
            <div className="card-actions justify-end">
              <button
                className="btn btn-primary"
                disabled={!isSignedIn}
                onClick={() => handleAddToCart(item)} // 3. 呼叫 handleAddToCart
              >
                {isSignedIn ? "加入購物車" : "請先登入"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Menu;
```

---

**動手試試看！**

現在，請確保你處於登入狀態，然後去「美味菜單」頁面點擊幾個「加入購物車」按鈕。你會神奇地發現：
1.  你點擊按鈕時，`console` 中會印出成功加入的訊息。
2.  右上角的購物車圖示上的數字會即時更新！

我們成功了！我們建立了一個全域的、解耦的、易於使用的狀態管理系統，而沒有寫一行 Props Drilling 的程式碼。

> **關於後端整合**：
> 目前的 `CartProvider` 只是將資料儲存在記憶體中，重新整理頁面後購物車就會被清空。在真實的專案中，`addToCart` 等函式內部會呼叫 `fetch` API，將購物車資料儲存到後端資料庫中，並與使用者 ID 關聯。這將是我們後續章節會探討的進階主題。

在下一個章節，我們將會**打造 `/cart` 頁面**，讓使用者可以看到他們購物車中的所有商品，並能進行修改或刪除。
