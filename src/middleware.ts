import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || '120')
const WINDOW_MS = parseInt(
  process.env.RATE_WINDOW_MS || String(60 * 1000)
)

type Entry = {
  count: number
  start: number
}

const ipMap = new Map<string, Entry>()

function getIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for')

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  const realIp = req.headers.get('x-real-ip')

  if (realIp) {
    return realIp.trim()
  }

  return 'unknown'
}

export function middleware(req: NextRequest) {
  const ip = getIp(req)
  const now = Date.now()

  let entry = ipMap.get(ip)

  if (!entry || now - entry.start >= WINDOW_MS) {
    entry = {
      count: 0,
      start: now,
    }
  }

  entry.count++

  ipMap.set(ip, entry)

  if (entry.count > RATE_LIMIT) {
    const retryAfter = Math.max(
      1,
      Math.ceil(
        (WINDOW_MS - (now - entry.start)) / 1000
      )
    )

    return NextResponse.json(
      {
        message: 'Too many requests',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
        },
      }
    )
  }

  const res = NextResponse.next()

  res.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  )

  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set(
    'Referrer-Policy',
    'strict-origin-when-cross-origin'
  )
  res.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=()'
  )
  res.headers.set('X-XSS-Protection', '0')

  res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  )

  return res
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}