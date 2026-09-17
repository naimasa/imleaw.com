// Decap CMS 用 GitHub OAuth コールバックエンドポイント。
// GitHub から認可コードを受け取り、アクセストークンと交換して
// window.opener へ postMessage で結果を返す（Decap CMS が期待するプロトコル）。
function renderResultPage(status, payload) {
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;

  return `<!doctype html>
<html>
  <body>
    <script>
      (function () {
        function receiveMessage(e) {
          window.opener.postMessage(${JSON.stringify(message)}, e.origin);
          window.removeEventListener('message', receiveMessage, false);
        }
        window.addEventListener('message', receiveMessage, false);
        window.opener.postMessage('authorizing:github', '*');
      })();
    </script>
  </body>
</html>`;
}

function withCookieCleared(response) {
  response.headers.append('Set-Cookie', 'decap_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  return response;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookieState = cookieHeader.match(/(?:^|;\s*)decap_oauth_state=([^;]+)/)?.[1];

  const respond = (html) =>
    withCookieCleared(
      new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }),
    );

  if (!code || !state || state !== cookieState) {
    return respond(renderResultPage('error', { message: 'OAuth state の検証に失敗しました。もう一度ログインしてください。' }));
  }

  const clientId = env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = env.GITHUB_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return respond(renderResultPage('error', { message: 'GITHUB_OAUTH_CLIENT_ID / GITHUB_OAUTH_CLIENT_SECRET が設定されていません。' }));
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${url.origin}/api/callback`,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
    return respond(
      renderResultPage('error', {
        message: tokenData.error_description || 'GitHub からのアクセストークン取得に失敗しました。',
      }),
    );
  }

  return respond(renderResultPage('success', { token: tokenData.access_token, provider: 'github' }));
}
