import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { REQUESTS } from '@/lib/guide-request'

/**
 * One-click unsubscribe. No login, no confirmation step: the link in the email
 * is the whole proof, and putting a form in the way is how an unsubscribe turns
 * into a spam complaint.
 *
 * Deliberately returns the same page for a token that matches nothing, so the
 * endpoint cannot be used to discover which addresses are on the list.
 */
export const dynamic = 'force-dynamic'

const page = (message: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>AllParx</title>
    <style>
      body{margin:0;background:#f6f7f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827}
      main{max-width:440px;margin:12vh auto;background:#fff;border:1px solid #e9ecea;border-radius:16px;padding:32px}
      h1{font-size:20px;margin:0 0 10px}
      p{font-size:15px;line-height:23px;color:#4b5563;margin:0 0 18px}
      a{display:inline-block;background:#15803d;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 20px;border-radius:999px}
    </style>
  </head>
  <body>
    <main>
      <h1>${message}</h1>
      <p>You will not get another guide email from us. The site stays open.</p>
      <a href="https://allparx.com">Back to AllParx</a>
    </main>
  </body>
</html>`

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t')?.trim()
  const done = page('You are off the list.')

  if (token) {
    try {
      const match = await REQUESTS.where('unsubscribeToken', '==', token).limit(1).get()
      const doc = match.docs[0]
      if (doc) {
        await doc.ref.set({ unsubscribedAt: new Date() }, { merge: true })
      }
    } catch (error) {
      console.error('[guide] unsubscribe failed', error)
    }
  }

  return new NextResponse(done, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
