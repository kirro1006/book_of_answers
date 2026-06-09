-- 建立資料表
CREATE TABLE IF NOT EXISTS AnswerType (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    weight INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS Template (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_id INTEGER,
    content TEXT NOT NULL,
    FOREIGN KEY(type_id) REFERENCES AnswerType(id)
);

CREATE TABLE IF NOT EXISTS TemplateSlot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER,
    slot_name TEXT NOT NULL,
    category_id INTEGER,
    FOREIGN KEY(template_id) REFERENCES Template(id)
);

CREATE TABLE IF NOT EXISTS Word (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    content TEXT NOT NULL
);

-- 寫入基礎測試資料
INSERT INTO AnswerType (id, name, weight) VALUES (1, '肯定', 20);
INSERT INTO AnswerType (id, name, weight) VALUES (2, '否定', 20);
INSERT INTO AnswerType (id, name, weight) VALUES (3, '等待', 30);
INSERT INTO AnswerType (id, name, weight) VALUES (4, '警告', 15);
INSERT INTO AnswerType (id, name, weight) VALUES (5, '反思', 15);

-- 建立測試模板（對應分類 1: 肯定）
INSERT INTO Template (id, type_id, content) VALUES (1, 1, '{person}將改變你的決定。');

-- 定義模板內的挖空欄位 (Slot)，對應類別編號 100
INSERT INTO TemplateSlot (template_id, slot_name, category_id) VALUES (1, 'person', 100);

-- 填入可以隨機塞入該欄位的字詞
INSERT INTO Word (category_id, content) VALUES (100, '舊識');
INSERT INTO Word (category_id, content) VALUES (100, '遠方的朋友');
INSERT INTO Word (category_id, content) VALUES (100, '身邊的智者');