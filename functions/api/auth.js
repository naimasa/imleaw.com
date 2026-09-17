// Decap CMS 用 GitHub OAuth 開始エンドポイント。
// CMS はこの URL をポップアップで開き、ここから GitHub の認可画面へリダイレクトする。
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const clientId = env.GITHUB_OAUTH_CLIENT_ID;

  if (!clientId) {
    return new Response('GITHUB_OAUTH_CLIENT_ID is not configured', { status: 500 });
  }

  const state = crypto.randomUUID();
  const scope = url.searchParams.get('scope') || 'repo';

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', `${url.origin}/api/callback`);
  authorizeUrl.searchParams.set('scope', scope);
  authorizeUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
      'Set-Cookie': `decap_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
