import type { LeoEvent } from './agent'

// Reads Leo's newline-delimited JSON stream in the browser
export async function readLeoStream(res: Response, onEvent: (e: LeoEvent) => void) {
  if (!res.ok || !res.body) {
    const msg = res.status === 401 ? 'Your session expired. Sign in again.' : `Request failed (${res.status})`
    onEvent({ t: 'error', v: msg })
    return
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) if (line.trim()) onEvent(JSON.parse(line))
  }
}
