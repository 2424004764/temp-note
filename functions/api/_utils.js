// 辅助函数：Web Crypto HMAC-SHA256 签名与验证，用于安全的 Session Cookie
const SECRET_SALT = 'tempnote_auth_secret_v1';

async function getCryptoKey(secret) {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(secret + SECRET_SALT),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex) {
  const tokens = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(tokens.map(t => parseInt(t, 16)));
}

// 签发会话 Token
export async function createSessionToken(user, secret) {
  const payload = {
    sub: user.sub || user.id,
    username: user.username || '',
    avatar: user.avatar || '',
    exp: Math.floor(Date.now() / 1000) + (30 * 86400) // 30天有效
  };
  const jsonStr = JSON.stringify(payload);
  const enc = new TextEncoder();
  const data = enc.encode(jsonStr);
  const b64Payload = btoa(unescape(encodeURIComponent(jsonStr)));
  
  const key = await getCryptoKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const sigHex = bufferToHex(signature);
  return `${b64Payload}.${sigHex}`;
}

// 验证会话 Token
export async function verifySessionToken(token, secret) {
  if (!token || !token.includes('.')) return null;
  const [b64Payload, sigHex] = token.split('.');
  try {
    const jsonStr = decodeURIComponent(escape(atob(b64Payload)));
    const key = await getCryptoKey(secret);
    const enc = new TextEncoder();
    const data = enc.encode(jsonStr);
    const sigBuffer = hexToBuffer(sigHex);
    const isValid = await crypto.subtle.verify('HMAC', key, sigBuffer, data);
    if (!isValid) return null;

    const payload = JSON.parse(jsonStr);
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // 过期
    }
    return payload;
  } catch (e) {
    return null;
  }
}

// 从 Request 中提取当前登录用户
export async function getCurrentUser(request, env) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/qn_session=([^;]+)/);
  if (!match) return null;
  const token = decodeURIComponent(match[1]);
  const secret = env.JWT_SECRET || env.OAUTH_CLIENT_SECRET || 'tempnote-default-secret-key-2026';
  return await verifySessionToken(token, secret);
}

// 标准 JSON 响应包装
export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      ...headers
    }
  });
}
