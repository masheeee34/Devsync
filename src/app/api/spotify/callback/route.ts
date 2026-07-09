import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  // Get nextUrl origin (automatically detects http/https correctly), replacing 0.0.0.0 with localhost if needed
  let origin = request.nextUrl.origin;
  if (origin.includes('0.0.0.0')) {
    origin = origin.replace('0.0.0.0', 'localhost');
  }

  if (!code) {
    const redirectUrl = new URL('/config', origin);
    redirectUrl.searchParams.set('error', 'spotify_code_missing');
    return NextResponse.redirect(redirectUrl);
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID || '';
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/spotify/callback';

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    // Redirect to config with keys in URL parameters, resolving 0.0.0.0 to localhost
    const redirectUrl = new URL('/config', origin);
    redirectUrl.searchParams.set('spotify_connected', 'true');
    redirectUrl.searchParams.set('refresh_token', data.refresh_token);
    redirectUrl.searchParams.set('access_token', data.access_token);
    redirectUrl.searchParams.set('expires_in', String(data.expires_in));

    return NextResponse.redirect(redirectUrl);
  } catch (err: any) {
    const redirectUrl = new URL('/config', origin);
    redirectUrl.searchParams.set('error', err.message || 'spotify_token_exchange_failed');
    return NextResponse.redirect(redirectUrl);
  }
}
