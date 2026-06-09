import { Database } from "bun:sqlite";

// 1. 連接你原本的資料庫檔案（Bun 內建 SQLite 支援）
const db = new Database("answer_book.db");

// 新增：如果歷史紀錄表不存在，則自動建立
db.run(`
  CREATE TABLE IF NOT EXISTS HistoryRecord (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 模擬 Python 的 random.choices (根據權重隨機抽樣)
function choiceWithWeights(items: any[], weights: number[]): any {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let randomNum = Math.random() * totalWeight;
  
  for (let i = 0; i < items.length; i++) {
    const currentWeight = weights[i]; // 先取出數值

    // ✅ 關鍵修正：透過安全檢查確保 currentWeight 不是 undefined 
    if (currentWeight !== undefined) {
      if (randomNum < currentWeight) {
        return items[i];
      }
      randomNum -= currentWeight;
    }
  }
  return items[0];
}

// 2. 啟動 Bun 全端伺服器
const server = Bun.serve({
  // 優先讀取 Render 提供的 PORT，本地則預設 5000
  port: process.env.PORT || 5000,
  // 關鍵新增：在 Docker 環境下必須指定為 '0.0.0.0'
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url);
    // 確保 userQuestion 變數在 query 之前有被宣告（如果前面漏掉了請補上）
    // 如果你的前端傳過來的是 question，確保它有 fallback 預設字串
    const userQuestion = "未輸入問題 (純隨機抽卡)";
    // 路由 A：前端首頁 API - 直接渲染網頁
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(Bun.file("templates/index.html"), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 路由 B：宇宙解答 API
if (url.pathname === "/api/get_answer" && req.method === "GET") {
  try {
    // 🔥 【關鍵修正】從前端傳過來的 URL 網址參數中取得 "question"
    // 如果網址裡有 ?question=xxx 就用它，沒有的話（例如純隨機）就 fallback 回預設字串
    const urlQuestion = url.searchParams.get("question");
    const userQuestion = urlQuestion && urlQuestion.trim() !== "" 
      ? urlQuestion 
      : "未輸入問題 (純隨機抽卡)";

    // 核心邏輯 1：根據權重抽出 AnswerType
    const types: any[] = db.query("SELECT id, name, weight FROM AnswerType").all();
    const typeId = choiceWithWeights(
      types.map(t => t.id),
      types.map(t => t.weight)
    );

    // 核心邏輯 2：隨機抽出該分類下的一個模板
    const templateRow: any = db.query(`
      SELECT id, content FROM Template 
      WHERE type_id = $typeId 
      ORDER BY RANDOM() LIMIT 1
    `).get({ $typeId: typeId });

    if (!templateRow) {
      return Response.json({ status: "error", message: "找不到對應的模板" }, { status: 404 });
    }

    const { id: templateId, content: templateContent } = templateRow;

    // 核心邏輯 3 & 4：找出 Slot 並填入 Word
    const slots: any[] = db.query("SELECT slot_name, category_id FROM TemplateSlot WHERE template_id = $templateId")
      .all({ $templateId: templateId });

    let resultMessage = templateContent;

    for (const slot of slots) {
      const wordRow: any = db.query(`
        SELECT content FROM Word 
        WHERE category_id = $categoryId 
        ORDER BY RANDOM() LIMIT 1
      `).get({ $categoryId: slot.category_id });

      const word = wordRow ? wordRow.content : "";
      resultMessage = resultMessage.replace(`{${slot.slot_name}}`, word);
    }

// ----------------------------------------------------

// 🔥 將正確辨識到的 userQuestion 寫入 SQLite 歷史紀錄
    db.run(
      "INSERT INTO HistoryRecord (question, answer) VALUES (?, ?)",
      [userQuestion, resultMessage]
    );

        return Response.json({ status: "success", answer: resultMessage });

      } catch (e: any) {
        return Response.json({ status: "error", message: e.message }, { status: 500 });
      }
    }

    // 🔥 【全新新增】路由 C：獲取歷史紀錄 API (限制唯讀取最新 10 筆)
    if (url.pathname === "/api/get_history" && req.method === "GET") {
      try {
        const history: any[] = db.query(`
          SELECT question, answer, datetime(created_at, 'localtime') as time 
          FROM HistoryRecord 
          ORDER BY id DESC 
          LIMIT 10
        `).all();

        return Response.json({ status: "success", history: history });
      } catch (e: any) {
        return Response.json({ status: "error", message: e.message }, { status: 500 });
      }
    }

    // 🔥 【全新新增】路由 D：清除所有歷史紀錄 API
if (url.pathname === "/api/clear_history" && req.method === "POST") {
  try {
    // 執行 SQL 指令，將 HistoryRecord 資料表清空
    db.run("DELETE FROM HistoryRecord");
    
    return Response.json({ status: "success", message: "所有占卜紀錄已成功從宇宙核心抹除！" });
  } catch (e: any) {
    return Response.json({ status: "error", message: e.message }, { status: 500 });
  }
}

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`\n🛸 [AI解答之書] 核心伺服器已由 Bun 強勢驅動！`);
console.log(`🌍 請用瀏覽器打開：http://localhost:${server.port}`);