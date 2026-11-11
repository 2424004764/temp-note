// 处理 OAuth 跳转授权
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const clientId = env.OAUTH_CLIENT_ID;
  if (!clientId) {
    return new Response('服务端未配置 OAUTH_CLIENT_ID 环境变量', { status: 500 });
  }

  // 动态拼接或使用指定的回调地址
  const redirectUri = env.OAUTH_REDIRECT_URI || `${url.origin}/api/auth/callback`;

  // 生成防 CSRF 随机 state
  const state = crypto.randomUUID().replace(/-/g, '');

  const authUrl = new URL('https://tool.fologde.com/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', 'profile');

  // 将 state 存入短期 Cookie 用于回跳验证（10分钟）
  const headers = new Headers();
  headers.set('Location', authUrl.toString());
  headers.append('Set-Cookie', `qn_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600; Secure`);

  return new Response(null, {
    status: 302,
    headers
  });
}
