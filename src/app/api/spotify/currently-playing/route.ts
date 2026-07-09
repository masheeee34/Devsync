import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing access token' }, { status: 401 });
  }

  const accessToken = authHeader.split(' ')[1];

  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 204) {
      // Empty response, nothing playing
      return NextResponse.json({ isPlaying: false });
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Spotify API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    if (!data || !data.item) {
      return NextResponse.json({ isPlaying: false });
    }

    const track = data.item;
    return NextResponse.json({
      isPlaying: data.is_playing,
      title: track.name,
      artists: track.artists.map((a: any) => a.name).join(', '),
      albumArt: track.album?.images?.[0]?.url || '',
      trackUrl: track.external_urls?.spotify || '',
      progressMs: data.progress_ms,
      durationMs: track.duration_ms,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch player data' }, { status: 500 });
  }
}
