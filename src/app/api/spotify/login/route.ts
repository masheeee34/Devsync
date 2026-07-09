import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/spotify/callback';

  if (!clientId) {
    // If the server environment variables aren't loaded yet, redirect to config with an explanation
    const url = new URL('/config', request.url);
    url.searchParams.set('error', 'spotify_env_missing');
    return NextResponse.redirect(url);
  }

  const scopes = 'user-read-currently-playing user-read-playback-state';
  const spotifyUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return NextResponse.redirect(spotifyUrl);
}
