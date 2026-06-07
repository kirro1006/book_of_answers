# 早餐時光實戰手冊 (六)：打造購物車頁面

在上一章，我們成功地建立了一個可以跨元件運作的購物車狀態管理系統。我們可以將商品加入購物車，並在導覽列即時看到數量變化。現在，我們需要一個專屬的頁面，讓使用者可以清楚地看到他們選了些什麼，並對其進行管理。

本章的目標就是：**打造一個功能完整的 `/cart` 頁面**。

我們將會：
1.  顯示購物車中的所有商品。
2.  實作增加、減少商品數量，以及刪除單一商品的功能。
3.  計算並顯示購物車的總金額。

---

## 1. 擴充我們的 `CartProvider`

為了實現上述功能，我們需要先回到 `CartProvider`，為它加入一些新的「能力」。我們需要新增「更新商品數量」的函式，並讓它能計算購物車的「總金額」。

**完全替換 `src/contexts/CartProvider.jsx` 的內容**，注意看我們新增和修改了哪些地方：

```jsx
// src/contexts/CartProvider.jsx
import React, { useState, useMemo, useCallback } from 'react';
import CartContext from './cartContext';

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  // 更新商品數量的函式 (這是新的！)
  const updateQuantity = useCallback((itemId, newQuantity) => {
    const quantity = Math.max(0, newQuantity); // 確保數量不會是負數
    
    setCartItems(prevItems => {
      if (quantity === 0) {
        // 如果數量為 0，則從購物車中移除該商品
        return prevItems.filter(item => item.id !== itemId);
      }
      return prevItems.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      );
    });
  }, []);

  // 加入購物車的函式 (現在它會使用 updateQuantity)
  const addToCart = useCallback((menuItem) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === menuItem.id);
      if (existingItem) {
        // 如果已存在，呼叫 updateQuantity 來增加數量
        updateQuantity(menuItem.id, existingItem.quantity + 1);
        return prevItems; // 因為 updateQuantity 會觸發狀態更新，這裡回傳原狀態即可
      } else {
        // 如果是新商品，加入陣列，數量設為 1
        return [...prevItems, { ...menuItem, quantity: 1 }];
      }
    });
    // Manually trigger update for existing items
    const existingItem = cartItems.find(item => item.id === menuItem.id);
    if(existingItem) {
       updateQuantity(menuItem.id, existingItem.quantity + 1);
    }
  }, [cartItems, updateQuantity]);

  // 移除商品的函式 (現在它只是 updateQuantity 的一個簡化版)
  const removeFromCart = useCallback((itemId) => {
    updateQuantity(itemId, 0);
  }, [updateQuantity]);

  // 計算購物車商品總數
  const cartCount = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  // 計算購物車總金額 (這是新的！)
  const totalAmount = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cartItems]);

  // 我們要提供給所有子元件的「值」 (加入了新成員)
  const value = useMemo(() => ({
    cartItems,
    cartCount,
    totalAmount, // 新增
    addToCart,
    removeFromCart,
    updateQuantity, // 新增
  }), [cartItems, cartCount, totalAmount, addToCart, removeFromCart, updateQuantity]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
```

**主要變更：**
1.  **`updateQuantity` 函式**：這是一個更通用的函式，可以將指定商品的數量設定為任何數字。如果數字為 0，它會自動將商品移除。
2.  **`removeFromCart`**：現在變成 `updateQuantity(itemId, 0)` 的一個快捷方式，讓程式碼更簡潔。
3.  **`addToCart`**：也稍微修改以利用 `updateQuantity`。
4.  **`totalAmount`**：使用 `useMemo` 計算購物車所有商品的總價。
5.  **`value` 物件**：將 `totalAmount` 和 `updateQuantity` 也加入到廣播出去的 `value` 中，這樣我們的頁面元件才能使用它們。

---

## 2. 打造購物車頁面 (`Cart.jsx`)

現在 `CartProvider` 已經具備了所有我們需要的功能，讓我們來建構 `Cart.jsx` 頁面。

**完全替換 `src/pages/Cart.jsx` 的內容：**

```jsx
// src/pages/Cart.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import useCart from '../hooks/useCart';
import { formatCurrency } from '../utils/helpers';

const CartPage = () => {
  // 從 useCart Hook 中取得所有我們需要的狀態和函式
  const { cartItems, cartCount, totalAmount, updateQuantity, removeFromCart } = useCart();

  // 狀況一：購物車是空的
  if (cartCount === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold mb-4">你的購物車是空的</h1>
        <p className="mb-6">快去看看我們的美味菜單，把喜歡的都加進來！</p>
        <Link to="/menu" className="btn btn-primary">
          前往菜單
        </Link>
      </div>
    );
  }

  // 狀況二：購物車有商品
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">我的購物車</h1>
      
      {/* 商品列表 */}
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>商品</th>
              <th>單價</th>
              <th>數量</th>
              <th>小計</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {cartItems.map(item => (
              <tr key={item.id}>
                <td>
                  <div className="flex items-center space-x-3">
                    <div className="avatar">
                      <div className="mask mask-squircle w-12 h-12">
                        <img src={item.image} alt={item.name} />
                      </div>
                    </div>
                    <div>
                      <div className="font-bold">{item.name}</div>
                    </div>
                  </div>
                </td>
                <td>{formatCurrency(item.price)}</td>
                <td>
                  <div className="flex items-center space-x-2">
                    <button 
                      className="btn btn-xs"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button 
                      className="btn btn-xs"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </td>
                <td>{formatCurrency(item.price * item.quantity)}</td>
                <td>
                  <button 
                    className="btn btn-ghost btn-xs"
                    onClick={() => removeFromCart(item.id)}
                  >
                    移除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 總計與結帳 */}
      <div className="mt-8 flex justify-end">
        <div className="card w-96 bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">訂單摘要</h2>
            <div className="flex justify-between">
              <span>商品總數</span>
              <span>{cartCount}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>總金額</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            <div className="card-actions justify-end mt-4">
              <button className="btn btn-primary w-full">
                前往結帳
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

**程式碼講解：**
1.  **獲取 Context 資料**：我們在第一行就使用 `useCart()` 取得了所有需要的狀態 (`cartItems`, `cartCount`, `totalAmount`) 和函式 (`updateQuantity`, `removeFromCart`)。
2.  **空購物車畫面**：我們判斷 `cartCount` 是否為 0，如果是，就顯示一個友善的提示訊息。
3.  **商品列表**：如果購物車不為空，我們就 `map` `cartItems` 陣列，為每個商品渲染一個表格列 `<tr>`。
4.  **互動按鈕**：
    *   `+` 和 `-` 按鈕直接呼叫 `updateQuantity` 來更新商品數量。
    *   「移除」按鈕則呼叫 `removeFromCart`。
5.  **訂單摘要**：在頁面右下角，我們顯示了商品總數和格式化後的總金額，並提供一個（目前尚無功能的）「前往結帳」按鈕。

---

**動手玩玩看！**

現在，你的購物車頁面已經完全「活」了起來：
1.  去菜單頁面加入幾個不同的商品。
2.  點擊右上角的購物車圖示，或直接在網址列輸入 `/cart` 進入購物車頁面。
3.  試著點擊 `+`、`-` 和「移除」按鈕，看看商品列表和右下角的訂單摘要是否都如預期般即時更新。

我們已經建立了一個功能齊全的前端購物車體驗！

不過，它還有一個小小的「缺陷」：只要你重新整理瀏覽器，購物車裡的所有東西都會消失。這是因為我們目前的狀態只存在於瀏覽器的記憶體中。

在下一個章節，我們將解決這個問題，學習**如何將購物車的狀態與後端 API 同步**，讓它能夠被永久保存。
