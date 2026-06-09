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

// ⚡ 防呆升級：確保基礎資料表存在，若全新沒資料則自動初始化
db.run(`CREATE TABLE IF NOT EXISTS AnswerType (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, weight INTEGER NOT NULL);`);
db.run(`CREATE TABLE IF NOT EXISTS Template (id INTEGER PRIMARY KEY AUTOINCREMENT, type_id INTEGER, content TEXT NOT NULL);`);
db.run(`CREATE TABLE IF NOT EXISTS TemplateSlot (id INTEGER PRIMARY KEY AUTOINCREMENT, template_id INTEGER, slot_name TEXT NOT NULL, category_id INTEGER);`);
db.run(`CREATE TABLE IF NOT EXISTS Word (id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER, content TEXT NOT NULL);`);

// 檢查如果 AnswerType 沒資料，自動塞入預設宇宙大數據
const checkData = db.query("SELECT COUNT(*) as count FROM AnswerType").get() as { count: number };
if (checkData.count === 0) {
  console.log("🧬 [System] 偵測到全新資料庫，正在寫入宇宙啟示基礎資料...");
  db.run("INSERT INTO AnswerType (id, name, weight) VALUES (1, '肯定', 20), (2, '否定', 20), (3, '等待', 30), (4, '警告', 15), (5, '反思', 15);");
  db.run("INSERT INTO Template (id, type_id, content) VALUES (1, 1, '{thing}會帶來好結果。'), (2, 2, '現在不要相信{thing}。'), (3, 3, '關於{thing}還需要等待。'), (4, 4, '小心{thing}背後的代價。'), (5, 5, '或許你該重新思考{thing}。');");
  db.run("INSERT INTO TemplateSlot (template_id, slot_name, category_id) VALUES (1, 'thing', 1), (2, 'thing', 1), (3, 'thing', 1), (4, 'thing', 1), (5, 'thing', 1);");
  db.run("INSERT INTO Word (category_id, content) VALUES (1, '機會'), (1, '決定'), (1, '約定'), (1, '旅程');");
}

// 模擬 Python 的 random.choices (根據權重隨機抽樣)
function choiceWithWeights(items: any[], weights: number[]): any {
  if (items.length === 0) return null;
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
      const nickname = url.searchParams.get("nickname") || "神秘訪客";
      const urlQuestion = url.searchParams.get("question");
      // ✅ 修正點：防呆確保 question 永遠有字串，不會因為前端沒傳而變成 null
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

        if (!typeId) {
          return Response.json({ status: "error", message: "資料庫無有效分類權重資料" }, { status: 500 });
        }

        // 核心邏輯 2：隨機抽出該分類下的一個模板
        const templateRow: any = db.query(`
          SELECT id, content FROM Template 
          WHERE type_id = $typeId 
          ORDER BY RANDOM() LIMIT 1
        `).get({ $typeId: typeId });

        if (!templateRow) {
          return Response.json({ status: "error", message: `分類 ${typeId} 下找不到對應的模板` }, { status: 404 });
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

        // 將記錄寫入資料庫歷史紀錄
        db.run(
          `INSERT INTO HistoryRecord (nickname, question, answer) VALUES (?, ?, ?)`,
          [nickname, question, resultMessage]
        );

        // 回傳給前端成功封包
        return Response.json({ status: "success", answer: resultMessage });

      } catch (e: any) {
        // 如果還是崩潰，會把真正的錯誤原因回傳，讓前端能看到具體是哪行 SQL 壞掉
        return Response.json({ status: "error", message: e.message }, { status: 500 });
      }
    }

    // 路由 C：獲取歷史紀錄 API
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