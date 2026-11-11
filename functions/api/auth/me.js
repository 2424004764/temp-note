import { getCurrentUser, jsonResponse } from '../_utils.js';

// 获取当前登录用户信息
export async function onRequestGet(context) {
  const { request, env } = context;
  const user = await getCurrentUser(request, env);

  if (!user) {
    return jsonResponse({ loggedIn: false, user: null });
  }

  return jsonResponse({
    loggedIn: true,
    user: {
      id: user.sub,
      username: user.username,
      avatar: user.avatar
    }
  });
}
