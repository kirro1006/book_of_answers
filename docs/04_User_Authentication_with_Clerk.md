# 早餐時光實戰手冊 (四)：使用者驗證與 Clerk 整合

我們的應用程式越來越有模有樣了！現在，我們需要一個方法來「識別」使用者，這樣他們才能擁有自己的購物車，並最終完成下單。這就是「使用者驗證」(Authentication) 的作用。

從頭打造一個安全的使用者驗證系統非常複雜，涉及到密碼學、資料庫安全、Session 管理等多個領域。幸運的是，現在有許多優秀的第三方服務可以為我們處理這一切。在本教學中，我們將使用 [Clerk](https://clerk.com/)，它專為現代 React 框架設計，整合起來非常簡單。

本章目標：
1.  設定 Clerk 帳號並將其整合進我們的 React 專案。
2.  建立登入、註冊頁面。
3.  在導覽列加入一個動態的使用者選單（已登入/未登入狀態）。
4.  保護我們的功能，例如只允許已登入的使用者將商品加入購物車。

---

## 1. 建立你的 Clerk 應用程式

**A. 註冊 Clerk 帳號**

前往 [clerk.com](https://clerk.com/) 並註冊一個免費帳號。

**B. 建立一個新的應用程式**

登入 Clerk 儀表板 (Dashboard) 後，點擊「Add application」按鈕。你可以將應用程式命名為 "Breakfast App"，並選擇你希望使用者使用的登入方式（例如 Email, Google, etc.）。

**C. 取得 API Keys**

建立應用程式後，Clerk 會引導你到 API Keys 頁面。我們需要的是 `Publishable key`。它通常以 `pk_test_` 開頭。

![Clerk Publishable Key](https://clerk.com/docs/images/quickstarts/get-api-keys.svg)

請複製這把 `Publishable key`，我們馬上就會用到它。

---

## 2. 在 React 專案中整合 Clerk

**A. 安裝 Clerk React 套件**

回到你的專案終端機，安裝 Clerk 的 React 函式庫：

```bash
npm install @clerk/clerk-react
```

**B. 設定環境變數**

像 API Key 這類的設定值，最佳實踐是將它們儲存在「環境變數」中，而不是直接寫死在程式碼裡。

在你的專案根目錄 (`breakfast-app`) 建立一個名為 `.env.local` 的檔案。

`breakfast-app/.env.local`

然後，在檔案中加入以下內容，並將 `pk_test_...` 換成你剛剛從 Clerk 儀表板複製的 `Publishable key`：

```
VITE_CLERK_PUBLISHABLE_KEY="pk_test_YOUR_PUBLISHABLE_KEY"
```

> **重要提示**：Vite 要求所有要在前端程式碼中存取的環境變數都必須以 `VITE_` 作為前綴。建立或修改 `.env.local` 檔案後，你需要**重新啟動你的 Vite 開發伺服器**（在終端機中按下 `Ctrl + C`，然後重新執行 `npm run dev`）才能讓新的環境變數生效。

**C. 用 `ClerkProvider` 包裹你的應用**

和 `RouterProvider` 類似，Clerk 也需要一個 `Provider` 元件來包裹整個應用程式，以便在任何地方都能存取到使用者的登入狀態。

打開 `src/main.jsx`，並進行以下修改：

```jsx
// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react'; // 1. 匯入 ClerkProvider

// ... 引入其他元件 ...
import './index.css';
import App from './App.jsx';
// ...

// 2. 獲取環境變數中的 Publishable Key
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY. Please add it to your .env.local file.");
}

const router = createBrowserRouter([
  // ... 路由設定保持不變 ...
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 3. 使用 ClerkProvider 包裹 RouterProvider */}
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <RouterProvider router={router} />
    </ClerkProvider>
  </React.StrictMode>
);
```

---

## 3. 建立驗證相關的頁面與元件

Clerk 最棒的一點是它提供了開箱即用的 UI 元件，我們只需要將它們放到對應的頁面即可。

**A. 建立登入/註冊頁面**

*   `src/pages/Login.jsx`:
    ```jsx
    import { SignIn } from "@clerk/clerk-react";

    export default function LoginPage() {
      return (
        <div className="flex justify-center items-center py-12">
          <SignIn path="/login" />
        </div>
      );
    }
    ```

*   `src/pages/Register.jsx`:
    ```jsx
    import { SignUp } from "@clerk/clerk-react";

    export default function RegisterPage() {
      return (
        <div className="flex justify-center items-center py-12">
          <SignUp path="/register" />
        </div>
      );
    }
    ```

**B. 更新路由設定**

打開 `src/main.jsx`，在 `children` 陣列中加入這兩個新頁面的路由規則：

```jsx
// src/main.jsx

// ... 匯入新頁面
import LoginPage from './pages/Login.jsx';
import RegisterPage from './pages/Register.jsx';

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // ... 其他路由 ...
      {
        path: "cart",
        element: <Cart />,
      },
      // 加入以下兩個新路由
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "register",
        element: <RegisterPage />,
      },
    ],
  },
]);

// ...
```

**C. 建立動態使用者選單 (`UserMenu`)**

我們需要在 `Header` 中顯示一個選單，它會根據使用者是否登入而顯示不同的內容。

在 `src/components/layout/` 目錄下建立 `UserMenu.jsx`：

```jsx
// src/components/layout/UserMenu.jsx
import { Link } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

export default function UserMenu() {
  return (
    <>
      {/* 當使用者登出時，顯示登入按鈕 */}
      <SignedOut>
        <Link to="/login" className="btn btn-ghost">
          登入
        </Link>
      </SignedOut>
      {/* 當使用者登入時，顯示 Clerk 提供的 UserButton */}
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </>
  );
}
```

**D. 在 `Header` 中使用 `UserMenu`**

打開 `src/components/layout/Header.jsx`，在 `navbar-end` 的區塊，加入 `<UserMenu />`。

```jsx
// src/components/layout/Header.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import UserMenu from './UserMenu'; // 匯入 UserMenu

const Header = () => {
  return (
    <header className="navbar ...">
      {/* ... */}
      <div className="navbar-end">
        <Link to="/cart" className="btn btn-ghost btn-circle">
          {/* ... 購物車圖示 ... */}
        </Link>
        
        {/* 在這裡加入使用者選單 */}
        <UserMenu />
      </div>
    </header>
  );
};

export default Header;
```

現在，重新整理你的應用程式，你應該會在右上角看到「登入」按鈕。點擊它，你會看到 Clerk 提供的精美登入表單。你可以試著註冊一個新帳號並登入，登入成功後，原本的按鈕會變成一個使用者頭像的選單！

---

## 4. 保護你的功能

現在我們可以識別使用者了，讓我們來利用這個狀態。我們來修改「美味菜單」頁面，只讓已登入的使用者能夠點擊「加入購物車」按鈕。

**修改 `src/pages/Menu.jsx`:**

```jsx
// src/pages/Menu.jsx
import React from 'react';
import useMenu from '../hooks/useMenu';
import { formatCurrency } from '../utils/helpers';
import { useUser } from '@clerk/clerk-react'; // 1. 匯入 useUser Hook

const Menu = () => {
  const { menuItems, isLoading, error } = useMenu();
  const { isSignedIn } = useUser(); // 2. 取得登入狀態

  // ... 載入和錯誤處理 ...

  return (
    <div className="space-y-12">
      {/* ... */}
      <div className="grid ...">
        {menuItems.map((item) => (
          <div key={item.id} className="card ...">
            {/* ... */}
            <div className="card-body">
              {/* ... */}
              <div className="card-actions justify-end">
                {/* 3. 根據登入狀態決定按鈕的行為和外觀 */}
                <button
                  className="btn btn-primary"
                  disabled={!isSignedIn}
                >
                  {isSignedIn ? "加入購物車" : "請先登入"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Menu;
```

現在，當你處於登出狀態時，菜單頁面上的所有「加入購物車」按鈕都會變成不可點擊的「請先登入」狀態。

---

**完美！**

我們的應用程式現在擁有了一個完整且專業的使用者驗證流程。我們不僅能讓使用者登入註冊，還能根據他們的登入狀態來控制 UI 的行為。

我們已經為實現真正的購物車功能鋪平了所有道路。在下一個，也是最核心的章節中，我們將會**動手建立我們的 `CartContext`**，使用 React 的 Context API 來管理購物車的全域狀態。
