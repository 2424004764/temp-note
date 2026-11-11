-- Cloudflare D1 数据库初始化表结构
-- 用于保存用户的便签数据与同步时间

CREATE TABLE IF NOT EXISTS user_notes (
  user_id TEXT PRIMARY KEY,          -- 用户唯一 ID (OAuth sub)
  username TEXT DEFAULT '',          -- 用户名
  tabs_data TEXT NOT NULL,           -- JSON 序列化的标签列表与激活项
  updated_at INTEGER NOT NULL        -- 最后更新时间戳 (毫秒)
);

CREATE INDEX IF NOT EXISTS idx_user_notes_updated ON user_notes(updated_at);
