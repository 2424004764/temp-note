import { jsonResponse } from '../_utils.js';

// 退出登录，清空 Cookie
export async function onRequestPost(context) {
  const headers = new Headers();
  headers.append('Set-Cookie', 'qn_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure');
  
  return jsonResponse({ success: true, message: '已安全退出' }, 200, {
    'Set-Cookie': 'qn_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure'
  });
}
