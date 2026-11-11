import { createSessionToken } from '../_utils.js';

// 处理 OAuth 授权回跳
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return new Response(`授权失败: ${error}`, { status: 400 });
  }

  if (!code) {
    return new Response('缺少授权码 code 参数', { status: 400 });
  }

  // 验证 state 防 CSRF
  const cookieHeader = request.headers.get('Cookie') || '';
  const stateMatch = cookieHeader.match(/qn_oauth_state=([^;]+)/);
  const expectedState = stateMatch ? stateMatch[1] : null;

  if (!state || !expectedState || state !== expectedState) {
    return new Response('CSRF 状态校验失败，请重试登录', { status: 403 });
  }

  const clientId = env.OAUTH_CLIENT_ID;
  const clientSecret = env.OAUTH_CLIENT_SECRET;
  const redirectUri = env.OAUTH_REDIRECT_URI || `${url.origin}/api/auth/callback`;

  if (!clientId || !clientSecret) {
    return new Response('服务端未配置 OAUTH_CLIENT_ID 或 OAUTH_CLIENT_SECRET', { status: 500 });
  }

  try {
    // 1. 服务端通过 POST 用 code 换 access_token
    const tokenResp = await fetch('https://tool.fologde.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret
      }).toString()
    });

    if (!tokenResp.ok) {
      const errText = await tokenResp.text();
      return new Response(`换取令牌失败: ${tokenResp.status} ${errText}`, { status: 502 });
    }

    const tokenData = await tokenResp.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return new Response('换取令牌失败，未返回 access_token', { status: 502 });
    }

    // 2. 用 access_token 获取用户资料
    const userResp = await fetch('https://tool.fologde.com/api/oauth/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!userResp.ok) {
      return new Response('获取用户资料失败', { status: 502 });
    }

    const userInfo = await userResp.json();
    const secret = env.JWT_SECRET || env.OAUTH_CLIENT_SECRET;

    // 3. 签发子站自身的 Session Cookie
    const sessionToken = await createSessionToken(userInfo, secret);

    const headers = new Headers();
    // 回跳到前端根目录，并附带已登录标记
    headers.set('Location', '/?auth_success=1');
    headers.append('Set-Cookie', `qn_session=${encodeURIComponent(sessionToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure`);
    // 清除 state cookie
    headers.append('Set-Cookie', `qn_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`);

    return new Response(null, {
      status: 302,
      headers
    });
  } catch (err) {
    return new Response(`登录异常: ${err.message}`, { status: 500 });
  }
}
