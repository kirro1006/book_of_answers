import { Database } from "bun:sqlite";
import { GoogleGenAI } from "@google/genai";
import backupAnswers from "./backup_answers.json"; // 直接匯入備用 JSON 金句庫



// 👑 正確的（把尾巴的 [cite: 1] 刪乾淨）
const db = new Database("answer_book.db");

// 🚀 2026 終極相容洗滌：只去空格與引號，完全相信你從 AI Studio 貼過來的任何格式！
let rawApiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
rawApiKey = rawApiKey.replace(/^["']|["']$/g, ""); 

let ai: GoogleGenAI | null = null;
if (rawApiKey && rawApiKey !== "YOUR_FREE_API_KEY" && rawApiKey.length > 10) {
  ai = new GoogleGenAI({ apiKey: rawApiKey });
  console.log("✨ [系統提示] Gemini AI 客戶端已成功載入最新版安全金鑰！");
} else {
  console.warn("⚠️ [警告] 未檢測到有效的 GEMINI_API_KEY，AI 智慧語意防護將自動切換為全自動通過模式。");
}

console.log("GEMINI =", rawApiKey);
// 自動建立歷史紀錄表與預設資料表
db.run(`
  CREATE TABLE IF NOT EXISTS HistoryRecord (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
db.run(`CREATE TABLE IF NOT EXISTS AnswerType (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, weight INTEGER NOT NULL);`);
db.run(`CREATE TABLE IF NOT EXISTS Template (id INTEGER PRIMARY KEY AUTOINCREMENT, type_id INTEGER, content TEXT NOT NULL);`);
db.run(`CREATE TABLE IF NOT EXISTS TemplateSlot (id INTEGER PRIMARY KEY AUTOINCREMENT, template_id INTEGER, slot_name TEXT NOT NULL, category_id INTEGER);`);
db.run(`CREATE TABLE IF NOT EXISTS Word (id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER, content TEXT NOT NULL);`);

const checkData = db.query("SELECT COUNT(*) as count FROM AnswerType").get() as { count: number };
if (checkData.count === 0) {
  db.run("INSERT INTO AnswerType (id, name, weight) VALUES (1, '肯定', 20), (2, '否定', 20), (3, '等待', 30), (4, '警告', 15), (5, '反思', 15);");
  db.run("INSERT INTO Template (id, type_id, content) VALUES (1, 1, '{thing}會帶來好結果。'), (2, 2, '現在不要相信{thing}。'), (3, 3, '關於{thing}還需要等待。'), (4, 4, '小心{thing}背後的代價。'), (5, 5, '或許你該重新思考{thing}。');");
  db.run("INSERT INTO TemplateSlot (template_id, slot_name, category_id) VALUES (1, 'thing', 1), (2, 'thing', 1), (3, 'thing', 1), (4, 'thing', 1), (5, 'thing', 1);");
  db.run("INSERT INTO Word (category_id, content) VALUES (1, '機會'), (1, '決定'), (1, '約定'), (1, '旅程');");
}

// 根據權重隨機抽樣演算法
function choiceWithWeights(items: any[], weights: number[]): any {
  if (items.length === 0) return null;
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let randomNum = Math.random() * totalWeight;
  
  for (let i = 0; i < items.length; i++) {
    const currentWeight = weights[i];
    if (currentWeight !== undefined) {
      if (randomNum < currentWeight) return items[i];
      randomNum -= currentWeight;
    }
  }
  return items[0];
}

// 🧠 核心加分功能：調用 AI 審查語意是否通順
async function checkSemanticValidity(sentence: string): Promise<boolean> {
  // 防防呆：如果上面 AI 根本沒初始化成功，直接優雅放行，不拋出錯誤
  if (!ai) {
    console.log(`⚠️ [防護牆通報] 由於缺少 API Key，已自動放行句子：${sentence}`);
    return true; 
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `你是一個嚴格的中文語意審查員。請判斷以下這句隨機生成的占卜句子，在中文文法與邏輯上是否通順、是否符合人類說話習慣。
句子：「${sentence}」

如果是通順有意義的中文句子，請只回傳兩個字："通順"。
如果語意矛盾、詞性錯亂、或極度不自然（例如：小心睡一覺背後的代價），請只回傳兩個字："不通"。
絕對不要回傳任何其他多餘的字或標點符號。`,
    });

    const result = response.text ? response.text.trim() : "不通";
    console.log(`🤖 [AI 審查日誌] 句子：${sentence} ➔ 審查結果：${result}`);
    return result === "通順";
  } catch (error) {
    console.error("AI 審查連線異常，預設放行：", error);
    return true; // 避免 API 壞掉導致系統掛點
  }
}

// 2. 啟動 Bun 全端伺服器
const server = Bun.serve({
  port: process.env.PORT || 5000,
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url);
    
    // 路由 A：靜態網頁渲染
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(Bun.file("templates/index.html"), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 路由 B：宇宙解答 API（含 AI 審查與降級機制）
    if (url.pathname === "/api/get_answer" && req.method === "GET") {
      const nickname = url.searchParams.get("nickname") || "神秘訪客";
      const urlQuestion = url.searchParams.get("question");
      const question = urlQuestion && urlQuestion.trim() !== "" ? urlQuestion : "未輸入問題 (純隨機抽卡)";

      try {
        // Step 1: 從 SQLite 資料庫抽樣組合句子
        const types: any[] = db.query("SELECT id, name, weight FROM AnswerType").all();
        const typeId = choiceWithWeights(types.map(t => t.id), types.map(t => t.weight));

        const templateRow: any = db.query("SELECT id, content FROM Template WHERE type_id = $typeId ORDER BY RANDOM() LIMIT 1").get({ $typeId: typeId });
        const { id: templateId, content: templateContent } = templateRow;

        const slots: any[] = db.query("SELECT slot_name, category_id FROM TemplateSlot WHERE template_id = $templateId").all({ $templateId: templateId });

        let sqlGeneratedSentence = templateContent;
        for (const slot of slots) {
          const wordRow: any = db.query("SELECT content FROM Word WHERE category_id = $categoryId ORDER BY RANDOM() LIMIT 1").get({ $categoryId: slot.category_id });
          const word = wordRow ? wordRow.content : "";
          sqlGeneratedSentence = sqlGeneratedSentence.replace(`{${slot.slot_name}}`, word);
        }

// -----------------------------------------------------------------

        let finalAnswer = sqlGeneratedSentence;

        // ✅ 新增關鍵判斷：只有當 url 有傳入 question，且不是預設的空字串時，才啟動 AI 審查
        if (url.searchParams.get("question") && url.searchParams.get("question")?.trim() !== "") {
          
          console.log(`🧠 [系統提示] 偵測到使用者提問，啟動 AI 智慧語意防護牆...`);
          
          // Step 2: 送交 AI 審查
          const isSemanticOk = await checkSemanticValidity(sqlGeneratedSentence);

          // Step 3: 降級處理（Fallback）
          if (!isSemanticOk) {
            const randomIndex = Math.floor(Math.random() * backupAnswers.length);
            const fallbackObj = backupAnswers[randomIndex];
            if (fallbackObj) {
              finalAnswer = fallbackObj.content;
              console.log(`⚠️ [降級啟動] 原句子語意不通，已成功抽換為備用金句：${finalAnswer}`);
            }
          }
          
        } else {
          // 🎲 如果是純隨機抽卡（沒有 question 參數），則跳過 AI 審查，直接使用 SQLite 組合的成果
          console.log(`🎲 [系統提示] 純隨機抽取封包，跳過 AI 審查，完全交給命運決定。`);
        }
        // 寫入 SQLite 歷史紀錄
        db.run(
          `INSERT INTO HistoryRecord (nickname, question, answer) VALUES (?, ?, ?)`,
          [nickname, question, finalAnswer]
        );

        return Response.json({ status: "success", answer: finalAnswer });

      } catch (e: any) {
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

    // 路由 D：清除個人歷史紀錄 API
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

console.log(`\n🛸 [AI解答之書] 智慧語意防護伺服器已由 Bun 強勢驅動！`);
console.log(`🌍 請用瀏覽器打開：http://localhost:${server.port}`);