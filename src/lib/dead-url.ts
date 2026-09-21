/**
 * Where a dead URL is sent. Unmatched and unknown URLs redirect home, and the
 * browser (or crawler) then requests `/` as a second, separate request. The
 * marker lets the proxy recognise that follow-up and not count it as another
 * page view — see proxy.ts. Keep this file free of imports: the proxy loads it.
 */
export const REDIRECT_MARKER = 'ap_r'

export const DEAD_URL_DESTINATION = `/?${REDIRECT_MARKER}=1`
