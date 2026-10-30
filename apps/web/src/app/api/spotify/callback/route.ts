// apps/web/src/app/api/spotify/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, SPOTIFY_COOKIE_NAME } from '@/lib/spotify'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')
  const state = req.nextUrl.searchParams.get('state') // guildId if provided

  const baseUrl = process.env.NEXTAUTH_URL || 'https://play.lukka.dev'
  const redirectTarget = state ? `${baseUrl}/dashboard/${state}` : `${baseUrl}/dashboard`

  if (error || !code) {
    console.error('[Spotify Callback] OAuth error or missing code:', error)
    return NextResponse.redirect(`${redirectTarget}?spotify_error=${encodeURIComponent(error || 'missing_code')}`)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const encoded = Buffer.from(JSON.stringify(tokens)).toString('base64')

    const response = NextResponse.redirect(`${redirectTarget}?spotify_connected=1`)
    response.cookies.set(SPOTIFY_COOKIE_NAME, encoded, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch (err) {
    console.error('[Spotify Callback] Token exchange exception:', err)
    return NextResponse.redirect(`${redirectTarget}?spotify_error=exchange_failed`)
  }
}
