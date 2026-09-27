import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { getSnapshot, INTERVALS, WATCHLIST } from './market'

const MODEL = 'claude-opus-5'
const MAX_TURNS = 8

// Created on first use so builds don't need ANTHROPIC_API_KEY
let client: Anthropic | null = null
const getClient = () => (client ??= new Anthropic())

// Kept byte-stable so it caches across requests; anything per-request
// (dates, prices) goes into messages, never here.
const SYSTEM = `You are Leo, the private market analyst for the two operators of Pilot Crypto, a crypto mentorship business. Only these operators can talk to you.

What you do in this phase:
- Analyse crypto markets using the get_market_snapshot tool (live Binance data with computed indicators) and web search for news, macro events and on-chain headlines.
- Explain what the data shows: trend regime, momentum, volatility, key levels, and what would change the picture.
- Help the operators think through trade ideas, strategy rules and risk.

Hard limits:
- You cannot place, modify or cancel orders. Trading is not connected. If asked to trade, say so plainly.
- Never state a price, level or indicator value you did not get from a tool result or a cited source in this conversation. If you lack data, fetch it or say you don't have it.
- Separate facts (tool data, cited news) from your interpretation, and give the conditions that would invalidate a view.
- Express uncertainty honestly. No guaranteed outcomes, no hype.

Style: concise, structured, plain language. Use short headings and bullet points for analysis. Quote prices with the asset's normal precision.`

const SnapshotInput = z.object({
  symbol: z.string().regex(/^[A-Z0-9]{2,15}USDT$/),
  interval: z.enum(INTERVALS),
})

const TOOLS: Anthropic.Beta.BetaToolUnion[] = [
  {
    name: 'get_market_snapshot',
    description:
      'Live Binance spot data for one USDT pair on one timeframe: last price, 24h change, EMA 20/50/200, RSI(14), ATR(14), trend regime (stacked EMAs), distance from EMA200, 50-candle high/low range, and volume vs its 20-candle average. ' +
      `Watchlist: ${WATCHLIST.join(', ')}; other Binance USDT pairs also work. Call it in parallel for several symbols or timeframes.`,
    input_schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Binance USDT pair, e.g. BTCUSDT' },
        interval: { type: 'string', enum: [...INTERVALS], description: 'Candle timeframe' },
      },
      required: ['symbol', 'interval'],
      additionalProperties: false,
    },
    eager_input_streaming: true,
  },
  { type: 'web_search_20260209', name: 'web_search', max_uses: 4 },
]

export type LeoEvent =
  | { t: 'text'; v: string }
  | { t: 'status'; v: string }
  | { t: 'error'; v: string }
  | { t: 'saved'; v: string }

export type ChatTurn = { role: 'user' | 'assistant'; content: string }

async function runTool(block: Anthropic.Beta.BetaToolUseBlock): Promise<Anthropic.Beta.BetaToolResultBlockParam> {
  // Eager input streaming means the server no longer validates tool input
  const parsed = SnapshotInput.safeParse(block.input)
  if (block.name !== 'get_market_snapshot' || !parsed.success) {
    return {
      type: 'tool_result',
      tool_use_id: block.id,
      is_error: true,
      content: `Invalid input: ${JSON.stringify(block.input)}`,
    }
  }
  try {
    const snap = await getSnapshot(parsed.data.symbol, parsed.data.interval)
    return { type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(snap) }
  } catch (err) {
    return {
      type: 'tool_result',
      tool_use_id: block.id,
      is_error: true,
      content: err instanceof Error ? err.message : 'Market data unavailable',
    }
  }
}

// Runs Leo over a conversation, emitting text and status events as they
// happen. Returns the full text of Leo's reply.
export async function runLeo(
  history: ChatTurn[],
  emit: (e: LeoEvent) => void,
  opts: { effort?: 'low' | 'medium' | 'high' } = {}
): Promise<string> {
  const now = new Date().toUTCString()
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((m, i) =>
    // Current time rides on the latest user turn so the system prompt stays cacheable
    i === history.length - 1 && m.role === 'user'
      ? { role: 'user', content: `[Current time: ${now}]\n\n${m.content}` }
      : { role: m.role, content: m.content }
  )

  let reply = ''
  let jsonRetries = 0

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const stream = getClient().beta.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: { effort: opts.effort ?? 'medium' },
      cache_control: { type: 'ephemeral' },
      system: SYSTEM,
      tools: TOOLS,
      messages,
    })

    stream.on('text', (delta) => {
      reply += delta
      emit({ t: 'text', v: delta })
    })
    stream.on('streamEvent', (event) => {
      if (event.type === 'content_block_start' && event.content_block.type === 'server_tool_use') {
        emit({ t: 'status', v: 'Searching the web…' })
      }
    })

    let message: Anthropic.Beta.BetaMessage
    try {
      message = await stream.finalMessage()
      jsonRetries = 0
    } catch (err) {
      // Only an unparseable tool input is worth re-issuing; API errors bubble up
      if (err instanceof Anthropic.APIError || jsonRetries++ >= 2) throw err
      continue
    }

    if (message.stop_reason === 'refusal') {
      emit({ t: 'error', v: 'Leo declined this request.' })
      break
    }
    if (message.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: message.content })
      continue
    }

    const toolUses = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use')
    if (toolUses.length === 0) break
    if (message.stop_reason === 'max_tokens') throw new Error('Leo ran out of output space mid tool call')

    emit({
      t: 'status',
      v: `Reading ${toolUses.map((b) => `${(b.input as { symbol?: string }).symbol ?? '?'} ${(b.input as { interval?: string }).interval ?? ''}`).join(', ')}…`,
    })
    messages.push({ role: 'assistant', content: message.content })
    messages.push({ role: 'user', content: await Promise.all(toolUses.map(runTool)) })

    if (reply && !reply.endsWith('\n')) {
      reply += '\n\n'
      emit({ t: 'text', v: '\n\n' })
    }
  }

  return reply
}

// Streams LeoEvents to the browser as newline-delimited JSON.
export function leoResponse(run: (emit: (e: LeoEvent) => void) => Promise<void>) {
  const encoder = new TextEncoder()
  const body = new ReadableStream({
    async start(controller) {
      const emit = (e: LeoEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + '\n'))
      try {
        await run(emit)
      } catch (err) {
        console.error('Leo error:', err)
        emit({
          t: 'error',
          v:
            err instanceof Anthropic.RateLimitError
              ? 'Rate limited by the AI provider. Try again in a minute.'
              : err instanceof Anthropic.AuthenticationError
                ? 'The Anthropic API key is missing or invalid.'
                : 'Leo hit an error. Check the server logs.',
        })
      } finally {
        controller.close()
      }
    },
  })
  return new Response(body, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
