import { Database } from "bun:sqlite";

// 1. 連接你原本的資料庫檔案（Bun 內建 SQLite 支援）
const db = new Database("answer_book.db");

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
  port: process.env.PORT || 5000,
  async fetch(req) {
    const url = new URL(req.url);

    // 路由 A：前端首頁 API - 直接渲染網頁
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(Bun.file("templates/index.html"), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 路由 B：宇宙解答 API（替代原本 Python Flask 的 /api/get_answer）
    if (url.pathname === "/api/get_answer" && req.method === "GET") {
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
          // 替換掉字串中的 {thing}, {person} 等挖空
          resultMessage = resultMessage.replace(`{${slot.slot_name}}`, word);
        }

        // 回傳 JSON 回前端
        return Response.json({ status: "success", answer: resultMessage });

      } catch (e: any) {
        return Response.json({ status: "error", message: e.message }, { status: 500 });
      }
    }

    // 404 處理
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`\n🛸 [AI解答之書] 核心伺服器已由 Bun 強勢驅動！`);
console.log(`🌍 請用瀏覽器打開：http://localhost:${server.port}`);