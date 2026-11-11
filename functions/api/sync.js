import { getCurrentUser, jsonResponse } from './_utils.js';

// GET: 获取云端便签数据
export async function onRequestGet(context) {
  const { request, env } = context;
  const user = await getCurrentUser(request, env);

  if (!user) {
    return jsonResponse({ error: '未登录' }, 401);
  }

  const db = env.DB;
  if (!db) {
    return jsonResponse({ error: '数据库 D1 未绑定 (请在 Pages 设置中绑定 DB 变量)' }, 500);
  }

  try {
    const row = await db.prepare(
      'SELECT tabs_data, updated_at FROM user_notes WHERE user_id = ?'
    ).bind(user.sub).first();

    if (!row) {
      return jsonResponse({ exists: false, tabsData: null, updatedAt: 0 });
    }

    let parsed = null;
    try {
      parsed = JSON.parse(row.tabs_data);
    } catch(e) {
      parsed = null;
    }

    return jsonResponse({
      exists: true,
      tabsData: parsed,
      updatedAt: row.updated_at
    });
  } catch (err) {
    return jsonResponse({ error: `数据库读取失败: ${err.message}` }, 500);
  }
}

// POST: 保存/同步便签数据到 D1
export async function onRequestPost(context) {
  const { request, env } = context;
  const user = await getCurrentUser(request, env);

  if (!user) {
    return jsonResponse({ error: '未登录' }, 401);
  }

  const db = env.DB;
  if (!db) {
    return jsonResponse({ error: '数据库 D1 未绑定 (请在 Pages 设置中绑定 DB 变量)' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch(e) {
    return jsonResponse({ error: '无效的 JSON 请求体' }, 400);
  }

  const { tabsData, updatedAt } = body;
  if (!tabsData || !Array.isArray(tabsData.tabs)) {
    return jsonResponse({ error: '便签数据格式不合法' }, 400);
  }

  const now = updatedAt || Date.now();
  const tabsJsonStr = JSON.stringify(tabsData);

  try {
    // 写入或更新 (Upsert)
    await db.prepare(`
      INSERT INTO user_notes (user_id, username, tabs_data, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        username = excluded.username,
        tabs_data = excluded.tabs_data,
        updated_at = excluded.updated_at
    `).bind(user.sub, user.username || '', tabsJsonStr, now).run();

    return jsonResponse({
      success: true,
      updatedAt: now
    });
  } catch (err) {
    return jsonResponse({ error: `数据库保存失败: ${err.message}` }, 500);
  }
}
