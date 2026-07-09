import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/spotify/callback';

  // Get current host safely, replacing 0.0.0.0 with localhost for browser compatibility
  const host = request.headers.get('host') || 'localhost:3000';
  const safeHost = host.includes('0.0.0.0') ? host.replace('0.0.0.0', 'localhost') : host;
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const origin = `${proto}://${safeHost}`;

  if (!clientId) {
    // If the server environment variables aren't loaded yet, redirect to config with an explanation
    const url = new URL('/config', origin);
    url.searchParams.set('error', 'spotify_env_missing');
    return NextResponse.redirect(url);
  }

  const scopes = 'user-read-currently-playing user-read-playback-state';
  const spotifyUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return NextResponse.redirect(spotifyUrl);
}
