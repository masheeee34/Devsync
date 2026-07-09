import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json({ error: 'Missing refresh token' }, { status: 400 });
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID || '';
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    return NextResponse.json({
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Token refresh failed' }, { status: 500 });
  }
}
