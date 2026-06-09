from flask import Flask, render_template, jsonify
import sqlite3
import random
import os

app = Flask(__name__, template_folder='templates')

def get_db_connection():
    """使用絕對路徑，確保 Flask 無論在哪裡啟動，都能精準讀到你上傳的這個 answer_book.db"""
    # 取得目前 app.py 檔案所在的資料夾路徑
    base_dir = os.path.abspath(os.path.dirname(__file__))
    # 強制組合出正確的資料庫絕對路徑
    db_path = os.path.join(base_dir, "answer_book.db")
    
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"【系統錯誤】找不到原本的資料庫檔案！請確認 answer_book.db 有和 app.py 放在同一個資料夾。目前預期路徑為: {db_path}")
        
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

@app.route('/')
def home():
    """首頁：直接渲染 templates 資料夾下的 index.html"""
    return render_template('index.html')

@app.route('/api/get_answer', methods=['GET'])
def get_answer():
    """API 接口：隨機生成句子並回傳給前端"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. 根據權重隨機抽出 AnswerType
        cursor.execute("SELECT id, name, weight FROM AnswerType")
        types = cursor.fetchall()
        type_id = random.choices(
            [row[0] for row in types],
            weights=[row[2] for row in types]
        )[0]
        
        # 2. 隨機抽出該分類下的一個模板
        cursor.execute("""
            SELECT id, content FROM Template 
            WHERE type_id = ? 
            ORDER BY RANDOM() LIMIT 1
        """, (type_id,))
        template_row = cursor.fetchone()
        
        if not template_row:
            return jsonify({"status": "error", "message": "找不到對應的模板"}), 404
            
        template_id, template_content = template_row
        
        # 3. 找出該模板需要填入的變數 (Slots)
        cursor.execute("""
            SELECT slot_name, category_id FROM TemplateSlot 
            WHERE template_id = ?
        """, (template_id,))
        slots = cursor.fetchall()
        
        # 4. 隨機抽出變數對應的字詞並填入
        fill_data = {}
        for slot_name, category_id in slots:
            cursor.execute("""
                SELECT content FROM Word 
                WHERE category_id = ? 
                ORDER BY RANDOM() LIMIT 1
            """, (category_id,))
            word_row = cursor.fetchone()
            fill_data[slot_name] = word_row[0] if word_row else ""
            
        # 5. 組合最終答案
        result_message = template_content.format(**fill_data)
        
        conn.close()
        
        # 回傳 JSON 格式給前端
        return jsonify({"status": "success", "answer": result_message})
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    # 啟動本地伺服器，預設網址為 http://127.0.0.1:5000
    app.run(debug=True)