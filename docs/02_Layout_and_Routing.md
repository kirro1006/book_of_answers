# 早餐時光實戰手冊 (二)：頁面佈局與路由設定

在上一章，我們成功初始化了專案並配置了強大的樣式系統 (Tailwind CSS + DaisyUI)。現在，我們的專案還只是一個單一的頁面。是時候為它建立一個完整的網站骨架，並讓它能夠在不同「頁面」之間導航了。

本章節，我們將專注於兩大重點：
1.  **頁面佈局 (Layout)**：建立網站共同的頁首 (Header) 和頁尾 (Footer)。
2.  **前端路由 (Routing)**：使用 `react-router-dom` 來管理我們的頁面，實現無刷新切換頁面的單頁應用 (SPA) 效果。

---

## 1. 建立專業的資料夾結構

一個清晰的資料夾結構是專案能夠長期維護的關鍵。讓我們在 `src` 目錄下建立一些標準的資料夾來組織我們的程式碼。

在你的專案根目錄（`breakfast-app`）下，你可以手動或透過終端機建立以下資料夾：

```bash
# 在 src 目錄下建立一系列的子目錄
mkdir -p src/components/layout src/pages src/hooks src/utils
```

**資料夾職責說明：**
*   `src/components`: 存放可重用的 React 元件。
    *   `layout`: 專門存放像 `Header`, `Footer` 這樣的佈局型元件。
*   `src/pages`: 存放代表一個完整頁面的元件，例如首頁、菜單頁。
*   `src/hooks`: 存放我們自訂的 React Hooks (例如，未來用來獲取資料的 Hook)。
*   `src/utils`: 存放一些共用的輔助函式 (Helper functions)。

---

## 2. 建立佈局元件 (Layout Components)

現在，讓我們來建立網站的頁首和頁尾。

**A. 建立 `Header.jsx`**

在 `src/components/layout/` 目錄下建立一個新檔案 `Header.jsx`，並貼上以下內容：

```jsx
// src/components/layout/Header.jsx
import React from 'react';

const Header = () => {
  return (
    <header className="navbar bg-base-100 shadow-lg">
      <div className="navbar-start">
        <a href="/" className="btn btn-ghost text-xl font-bold text-primary">
          🍳 早餐時光
        </a>
      </div>
      <div className="navbar-center hidden md:flex">
        <ul className="menu menu-horizontal px-1">
          <li><a href="/">首頁</a></li>
          <li><a href="/menu">美味菜單</a></li>
          <li><a href="/about">關於我們</a></li>
        </ul>
      </div>
      <div className="navbar-end">
        <a href="/cart" className="btn btn-ghost btn-circle">
          <div className="indicator">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            <span className="badge badge-sm indicator-item badge-primary">0</span>
          </div>
        </a>
      </div>
    </header>
  );
};

export default Header;
```
> 我們暫時使用 `<a>` 標籤，稍後會將它們換成 `react-router-dom` 提供的 `<Link>` 元件。

**B. 建立 `Footer.jsx`**

在 `src/components/layout/` 目錄下建立一個新檔案 `Footer.jsx`：

```jsx
// src/components/layout/Footer.jsx
import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer footer-center p-4 bg-base-300 text-base-content">
      <aside>
        <p>Copyright © {currentYear} - All right reserved by 早餐時光 Ltd</p>
      </aside>
    </footer>
  );
};

export default Footer;
```

---

## 3. 建立初步的頁面元件

接下來，我們在 `src/pages/` 目錄中建立幾個簡單的頁面元件作為內容的佔位符。

*   `src/pages/Home.jsx`:
    ```jsx
    import React from 'react';
    const Home = () => <h1 className="text-4xl">首頁</h1>;
    export default Home;
    ```
*   `src/pages/Menu.jsx`:
    ```jsx
    import React from 'react';
    const Menu = () => <h1 className="text-4xl">美味菜單</h1>;
    export default Menu;
    ```
*   `src/pages/About.jsx`:
    ```jsx
    import React from 'react';
    const About = () => <h1 className="text-4xl">關於我們</h1>;
    export default About;
    ```
*   `src/pages/Cart.jsx`:
    ```jsx
    import React from 'react';
    const Cart = () => <h1 className="text-4xl">購物車</h1>;
    export default Cart;
    ```

---

## 4. 設定前端路由 (React Router)

這是本章最關鍵的一步。我們將安裝並設定 `react-router-dom` 來管理頁面之間的切換。

**A. 安裝 React Router:**

```bash
npm install react-router-dom
```

**B. 修改 `App.jsx` 作為佈局容器:**

我們需要修改 `App.jsx`，讓它成為一個「樣板」。它將會渲染共用的 `Header` 和 `Footer`，並在中間為不同的頁面內容預留一個「插座」。

將 `src/App.jsx` 的內容更新為：

```jsx
// src/App.jsx
import React from 'react';
import { Outlet } from 'react-router-dom'; // 匯入 Outlet
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Outlet 是 react-router 的一個特殊元件，
            它會根據當前的 URL，將對應的子路由頁面元件渲染到這裡 */}
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default App;
```

**C. 在 `main.jsx` 中定義路由規則:**

最後，我們需要告訴 React Router 哪個 URL 對應哪個頁面。這個設定將在我們應用程式的進入點 `src/main.jsx` 中完成。

將 `src/main.jsx` 的內容**完全替換**為以下程式碼：

```jsx
// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// 引入我們的 CSS 和元件
import './index.css';
import App from './App.jsx';
import Home from './pages/Home.jsx';
import Menu from './pages/Menu.jsx';
import About from './pages/About.jsx';
import Cart from './pages/Cart.jsx';

// 建立路由設定物件
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, // 使用 App 作為所有頁面的父層佈局
    // 在 children 中定義子路由
    children: [
      {
        index: true, // index: true 表示這個是預設的子路由
        element: <Home />,
      },
      {
        path: "menu",
        element: <Menu />,
      },
      {
        path: "about",
        element: <About />,
      },
      {
        path: "cart",
        element: <Cart />,
      },
    ],
  },
]);

// 渲染應用程式，傳入 RouterProvider
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
```

**程式碼講解：**
*   `createBrowserRouter`：這是建立路由器的函式。
*   `RouterProvider`：這是一個元件，它會接收我們建立的 `router` 設定，並讓整個應用程式都能感知到路由的存在。
*   在設定物件中，我們定義了父路由 `/` 使用 `App` 元件，這意味著所有匹配到的子路由（`Home`, `Menu` 等）都會被渲染到 `App` 元件的 `<Outlet />` 位置。

---

## 5. 修正導覽列連結

最後一步，回到 `src/components/layout/Header.jsx`，將原本的 `<a>` 標籤換成 React Router 提供的 `<Link>` 元件。這樣點擊連結時才不會重新整理整個頁面。

**修改 `src/components/layout/Header.jsx`：**

```jsx
// src/components/layout/Header.jsx
import React from 'react';
// 匯入 Link 元件
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="navbar bg-base-100 shadow-lg">
      <div className="navbar-start">
        {/* 將 a 換成 Link */}
        <Link to="/" className="btn btn-ghost text-xl font-bold text-primary">
          🍳 早餐時光
        </Link>
      </div>
      <div className="navbar-center hidden md:flex">
        <ul className="menu menu-horizontal px-1">
          {/* 將 a 換成 Link */}
          <li><Link to="/">首頁</Link></li>
          <li><Link to="/menu">美味菜單</Link></li>
          <li><Link to="/about">關於我們</Link></li>
        </ul>
      </div>
      <div className="navbar-end">
        {/* 將 a 換成 Link */}
        <Link to="/cart" className="btn btn-ghost btn-circle">
          <div className="indicator">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            <span className="badge badge-sm indicator-item badge-primary">0</span>
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Header;
```

---

**大功告成！**

現在重新啟動你的開發伺服器 (`npm run dev`)，你應該能看到一個包含頁首和頁尾的完整網站佈局。試著點擊導覽列中的「首頁」、「美味菜單」等連結，你會發現頁面中間的內容會立刻切換，而且整個瀏覽器頁面沒有重新整理！

我們已經成功地為應用程式打下了堅實的結構基礎。

在下一個章節，我們將會**設定後端模擬伺服器 (Mock API Server)，並從中獲取真實的菜單資料**，讓我們的「美味菜單」頁面不再只是一個標題。
