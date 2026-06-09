import { Database } from "bun:sqlite";

// 1. 連接你原本的資料庫檔案（Bun 內建 SQLite 支援）
const db = new Database("answer_book.db");

// 新增：如果歷史紀錄表不存在，則自動建立
db.run(`
  CREATE TABLE IF NOT EXISTS HistoryRecord (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
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
    const currentWeight = weights[i];
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
  port: process.env.PORT || 5000,
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url);
    
    // 路由 A：前端首頁 API - 直接渲染網頁
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(Bun.file("templates/index.html"), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 路由 B：宇宙解答 API
    if (url.pathname === "/api/get_answer" && req.method === "GET") {
      // ✅ 修正點一：乾淨地從網址解析前端傳來的參數，不重複宣告
      const nickname = url.searchParams.get("nickname") || "神秘訪客";
      const urlQuestion = url.searchParams.get("question");
      const question = urlQuestion && urlQuestion.trim() !== "" 
        ? urlQuestion 
        : "未輸入問題 (純隨機抽卡)";

      try {
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

        // ✅ 修正點二：移除寫死的 finalAnswer 變數，直接把真正組好的 resultMessage 存入 SQLite！
        db.run(
          `INSERT INTO HistoryRecord (nickname, question, answer) VALUES (?, ?, ?)`,
          [nickname, question, resultMessage]
        );

        // 回傳給前端
        return Response.json({ status: "success", answer: resultMessage });

      } catch (e: any) {
        return Response.json({ status: "error", message: e.message }, { status: 500 });
      }
    }

    // 路由 C：獲取歷史紀錄 API (限制唯讀取最新 10 筆)
    if (url.pathname === "/api/get_history" && req.method === "GET") {
      const nickname = url.searchParams.get("nickname") || "神秘訪客";
      try {
        const history: any[] = db.query(`
          SELECT question, answer, datetime(created_at, 'localtime') as time 
          FROM HistoryRecord 
          WHERE nickname = ? 
          ORDER BY id DESC 
          LIMIT 10
        `).all(nickname);

        return Response.json({ status: "success", history: history });
      } catch (e: any) {
        return Response.json({ status: "error", message: e.message }, { status: 500 });
      }
    }

    // 路由 D：清除個人專屬歷史紀錄 API
    if (url.pathname === "/api/clear_history" && req.method === "POST") {
      try {
        const body: any = await req.json();
        const nickname = body.nickname || "神秘訪客";

        // 加上 WHERE 條件，只刪除這個人的紀錄
        db.run(`DELETE FROM HistoryRecord WHERE nickname = ?`, [nickname]);

        return Response.json({ status: "success", message: `已成功抹除 ${nickname} 在宇宙中的所有紀錄！` });
      } catch (e: any) {
        return Response.json({ status: "error", message: e.message }, { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`\n🛸 [AI解答之書] 核心伺服器已由 Bun 強勢驅動！`);
console.log(`🌍 請用瀏覽器打開：http://localhost:${server.port}`);