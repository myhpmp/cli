import http from 'node:http';
import open from 'open';
import type { SupabaseClient, Provider } from '@supabase/supabase-js';

const CALLBACK_HTML = `<!DOCTYPE html>
<html><body>
<h2>Authenticating...</h2>
<script>
  const params = new URLSearchParams(window.location.hash.substring(1));
  const queryParams = new URLSearchParams(window.location.search);

  const accessToken = params.get('access_token') || queryParams.get('access_token');
  const refreshToken = params.get('refresh_token') || queryParams.get('refresh_token');
  const code = queryParams.get('code');

  if (accessToken) {
    fetch('/complete?access_token=' + encodeURIComponent(accessToken) +
      '&refresh_token=' + encodeURIComponent(refreshToken || ''))
      .then(() => { document.body.innerHTML = '<h1>✅ Authentication complete! You can close this tab.</h1>'; })
      .catch(() => { document.body.innerHTML = '<h1>❌ Failed to complete auth</h1>'; });
  } else if (code) {
    fetch('/complete?code=' + encodeURIComponent(code))
      .then(() => { document.body.innerHTML = '<h1>✅ Authentication complete! You can close this tab.</h1>'; })
      .catch(() => { document.body.innerHTML = '<h1>❌ Failed to complete auth</h1>'; });
  } else {
    document.body.innerHTML = '<h1>❌ No auth data received</h1>';
  }
</script>
</body></html>`;

export async function signInWithOAuth(supabase: SupabaseClient, provider: Provider): Promise<{
  userId: string;
  accessToken: string;
  refreshToken: string;
}> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url!, `http://localhost`);

      if (url.pathname === '/callback') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(CALLBACK_HTML);
        return;
      }

      if (url.pathname === '/complete') {
        const code = url.searchParams.get('code');
        const accessToken = url.searchParams.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token');

        try {
          if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error || !data.session) {
              throw new Error(error?.message ?? 'Auth failed');
            }
            res.writeHead(200);
            res.end('OK');
            server.close();
            resolve({
              userId: data.session.user.id,
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token,
            });
          } else if (accessToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            if (error || !data.session) {
              throw new Error(error?.message ?? 'Auth failed');
            }
            res.writeHead(200);
            res.end('OK');
            server.close();
            resolve({
              userId: data.session.user.id,
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token,
            });
          } else {
            throw new Error('No auth data');
          }
        } catch (err) {
          res.writeHead(500);
          res.end('Auth failed');
          server.close();
          reject(err);
        }
        return;
      }
    });

    server.listen(0, async () => {
      const port = (server.address() as { port: number }).port;
      const redirectTo = `http://localhost:${port}/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      });

      if (error || !data.url) {
        server.close();
        reject(new Error(error?.message ?? 'Failed to get OAuth URL'));
        return;
      }

      await open(data.url);
    });

    setTimeout(() => {
      server.close();
      reject(new Error('Auth timeout (120s)'));
    }, 120000);
  });
}
