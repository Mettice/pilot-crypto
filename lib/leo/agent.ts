import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { botConfigured, getBotStatus, runBotAction } from './bot'
import { getSnapshot, INTERVALS, WATCHLIST } from './market'

export const DEFAULT_MODEL = 'claude-sonnet-4-6'
const MAX_TURNS = 8

// Created on first use so builds don't need ANTHROPIC_API_KEY
let client: Anthropic | null = null
const getClient = () => (client ??= new Anthropic())

// Kept byte-stable so it caches across requests; anything per-request
// (dates, prices) goes into messages, never here.
const SYSTEM = `You are Leo, the private market analyst for the two operators of Pilot Crypto, a crypto mentorship business. Only these operators can talk to you.

What you do:
- Analyse crypto markets using the get_market_snapshot tool (live Binance data with computed indicators) and web search for news, macro events and on-chain headlines.
- Explain what the data shows: trend regime, momentum, volatility, key levels, and what would change the picture.
- Help the operators think through trade ideas, strategy rules and risk.
- Report on the operators' trading bot with get_bot_status: a Freqtrade bot running in paper-trading (dry-run) mode with fake money on Binance spot, strategy LeoDailyRegime (hold BTC/ETH while the daily close is above EMA200 and EMA50 is above EMA200; exit when the daily close falls below EMA200). Explain its positions, P&L and why it is in or out of the market.

Hard limits:
- You cannot open, close or size trades, and you cannot resume or stop the bot. Those are operator-only dashboard controls. If asked, say so plainly.
- Your only bot action is pause_new_entries, a risk-reducing pause: the bot keeps managing open positions and their stops but takes no new entries. Use it only when an operator explicitly asks you to, or proposes it and confirms. Always state the reason. Resuming is the operators' decision, made on the dashboard.
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
  {
    name: 'get_bot_status',
    description:
      "The trading bot's live state: running/paused/stopped, paper or live mode, strategy, equity, P&L, win/loss count, open positions (entry, current price, stop, P&L), the 10 most recent closed trades with exit reasons, and pair locks from its risk protections.",
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'pause_new_entries',
    description:
      'Pause the bot so it opens no new trades. Open positions stay managed, with their stops active. Operators resume from the dashboard. Only call when an operator has explicitly asked for or confirmed a pause.',
    input_schema: {
      type: 'object',
      properties: { reason: { type: 'string', description: 'Why the bot is being paused, for the audit log' } },
      required: ['reason'],
      additionalProperties: false,
    },
    eager_input_streaming: true,
  },
  { type: 'web_search_20260209', name: 'web_search', max_uses: 4 },
]

const PauseInput = z.object({ reason: z.string().min(1).max(500) })

// Voice turns get live data up front so Leo can answer in one pass instead of
// stopping to call tools (each tool round trip adds several seconds). Anything
// that takes too long is simply left out; Leo can still use the tools.
const BRIEFING_TIMEOUT_MS = 2500

const withTimeout = <T,>(p: Promise<T>) =>
  Promise.race([p, new Promise<null>((resolve) => setTimeout(() => resolve(null), BRIEFING_TIMEOUT_MS))]).catch(() => null)

// Coins a spoken question is about, so only their data is fetched
const COIN_WORDS: [RegExp, string][] = [
  [/\b(btc|bitcoin)\b/i, 'BTCUSDT'],
  [/\b(eth|ether|ethereum)\b/i, 'ETHUSDT'],
  [/\b(sol|solana)\b/i, 'SOLUSDT'],
  [/\b(bnb|binance coin)\b/i, 'BNBUSDT'],
  [/\b(xrp|ripple)\b/i, 'XRPUSDT'],
  [/\b(tao|bittensor)\b/i, 'TAOUSDT'],
]
const BOT_WORDS = /\b(bot|trade|trades|trading|position|positions|p&l|profit|loss|paper|freqtrade|strategy)\b/i

export async function voiceBriefing(question: string): Promise<string> {
  const named = COIN_WORDS.filter(([re]) => re.test(question)).map(([, symbol]) => symbol)
  const symbols = named.length ? named : ['BTCUSDT', 'ETHUSDT'] // general questions: the two majors
  const pairs = symbols.flatMap((symbol) => (['4h', '1d'] as const).map((interval) => ({ symbol, interval })))
  const [snaps, bot] = await Promise.all([
    Promise.all(pairs.map(({ symbol, interval }) => withTimeout(getSnapshot(symbol, interval)))),
    botConfigured() && BOT_WORDS.test(question) ? withTimeout(getBotStatus()) : Promise.resolve(null),
  ])
  // Compact rows keep the extra input small (~1-2k tokens)
  const market = snaps.flatMap((s) =>
    s
      ? [
          {
            pair: `${s.symbol} ${s.interval}`,
            price: s.price,
            chg24h: s.change.last24hPct,
            trend: s.trend,
            rsi: s.rsi14,
            atrPct: s.atrPctOfPrice,
            vsEma200Pct: s.priceVsEma200Pct,
            ema50: s.ema.ema50,
            ema200: s.ema.ema200,
            range50: [s.range.low, s.range.high],
          },
        ]
      : []
  )
  const parts = [`Market snapshots: ${JSON.stringify(market)}`]
  if (bot)
    parts.push(
      `Bot status: ${JSON.stringify({ state: bot.state, dryRun: bot.dryRun, strategy: bot.strategy, profit: bot.profit, openTrades: bot.openTrades, locks: bot.locks })}`
    )
  const header =
    "[Live data fetched just now. Use it directly and don't call get_market_snapshot or get_bot_status for anything it already covers.]"
  return [header, ...parts].join('\n')
}

// Mid-conversation system messages are only accepted by the newest models
const supportsMidConversationSystem = (model: string) => /^claude-(opus-5|opus-4-8|fable-5|mythos-5)/.test(model)

// Operator instruction added after the user's turn when spoken replies are on.
// A mid-conversation system message keeps the cached prefix intact.
const VOICE_MODE = `Spoken replies are on: the operator hears part of your answer through text-to-speech.
Speed matters in voice mode: answer from the live data provided when you can, and only use tools for what it doesn't cover.
Start your reply with a <spoken>...</spoken> block: two or three short, conversational sentences (under 60 words) that give the headline answer, written to be heard. No markdown, lists, emoji or URLs inside it. Then write your full answer as usual; it is shown on screen and not read aloud.`

export type StepKind = 'data' | 'market' | 'search' | 'bot' | 'pause'

export type LeoEvent =
  | { t: 'text'; v: string }
  // A step Leo is taking, shown live in the activity trail and on the orb
  | { t: 'status'; v: string; kind: StepKind }
  | { t: 'error'; v: string }
  | { t: 'saved'; v: string }

export type ChatTurn = { role: 'user' | 'assistant'; content: string }

// The signed-in operator's Supabase client, used to write the audit log
export type LeoContext = { supabase: SupabaseClient }

const result = (id: string, content: string, isError = false): Anthropic.Beta.BetaToolResultBlockParam => ({
  type: 'tool_result',
  tool_use_id: id,
  content,
  ...(isError && { is_error: true }),
})

async function runTool(block: Anthropic.Beta.BetaToolUseBlock, ctx: LeoContext): Promise<Anthropic.Beta.BetaToolResultBlockParam> {
  // Eager input streaming means the server no longer validates tool input,
  // so every input is checked against its schema here.
  try {
    switch (block.name) {
      case 'get_market_snapshot': {
        const input = SnapshotInput.safeParse(block.input)
        if (!input.success) return result(block.id, `Invalid input: ${JSON.stringify(block.input)}`, true)
        return result(block.id, JSON.stringify(await getSnapshot(input.data.symbol, input.data.interval)))
      }
      case 'get_bot_status': {
        if (!botConfigured()) return result(block.id, 'The trading bot is not connected yet.', true)
        return result(block.id, JSON.stringify(await getBotStatus()))
      }
      case 'pause_new_entries': {
        const input = PauseInput.safeParse(block.input)
        if (!input.success) return result(block.id, 'A reason is required.', true)
        if (!botConfigured()) return result(block.id, 'The trading bot is not connected yet.', true)
        let ok = true
        let outcome: string
        try {
          outcome = await runBotAction('pause')
        } catch (err) {
          ok = false
          outcome = err instanceof Error ? err.message : 'Bot unreachable'
        }
        await ctx.supabase
          .from('leo_bot_actions')
          .insert({ source: 'leo', action: 'pause', reason: input.data.reason, ok, result: outcome })
        return result(block.id, outcome, !ok)
      }
      default:
        return result(block.id, `Unknown tool ${block.name}`, true)
    }
  } catch (err) {
    return result(block.id, err instanceof Error ? err.message : 'Tool failed', true)
  }
}

function describeTool(b: Anthropic.Beta.BetaToolUseBlock): { v: string; kind: StepKind } {
  const input = b.input as { symbol?: string; interval?: string }
  if (b.name === 'get_market_snapshot')
    return { v: `Reading ${(input.symbol ?? '?').replace('USDT', '')} ${input.interval ?? ''}`.trim(), kind: 'market' }
  if (b.name === 'get_bot_status') return { v: 'Checking the bot', kind: 'bot' }
  if (b.name === 'pause_new_entries') return { v: 'Pausing new entries', kind: 'pause' }
  return { v: b.name, kind: 'data' }
}

// Runs Leo over a conversation, emitting text and status events as they
// happen. Returns the full text of Leo's reply.
export async function runLeo(
  history: ChatTurn[],
  emit: (e: LeoEvent) => void,
  ctx: LeoContext,
  opts: { effort?: 'low' | 'medium' | 'high'; voice?: boolean; model?: string; maxTokens?: number } = {}
): Promise<string> {
  const model = opts.model ?? DEFAULT_MODEL
  const effort = opts.effort ?? (opts.voice ? 'low' : 'medium')
  const defaultMaxTokens = opts.voice ? 2048 : effort === 'high' ? 8192 : 4096
  const max_tokens = opts.maxTokens ?? defaultMaxTokens

  // Cap message history to avoid prompt token bloat on long conversations.
  // Ensure the history slice starts with a user turn so role alternation is valid.
  const MAX_HISTORY = 16
  const sliced = history.length > MAX_HISTORY ? history.slice(-MAX_HISTORY) : history
  const activeHistory = sliced[0]?.role === 'assistant' ? sliced.slice(1) : sliced

  const now = new Date().toUTCString()
  const messages: Anthropic.Beta.BetaMessageParam[] = activeHistory.map((m, i) =>
    // Current time rides on the latest user turn so the system prompt stays cacheable
    i === activeHistory.length - 1 && m.role === 'user'
      ? { role: 'user', content: `[Current time: ${now}]\n\n${m.content}` }
      : { role: m.role, content: m.content }
  )

  if (opts.voice) {
    const last = messages[messages.length - 1]
    if (last?.role === 'user' && typeof last.content === 'string') last.content = [await voiceBriefing(last.content), last.content].join('\n\n')
    if (supportsMidConversationSystem(model)) {
      messages.push({ role: 'system', content: VOICE_MODE })
    } else {
      // Older models (e.g. Sonnet 4.6) reject role 'system' in messages:
      // attach the instruction to the latest user turn instead
      const last = messages[messages.length - 1]
      if (last?.role === 'user' && typeof last.content === 'string') last.content = `${last.content}

[${VOICE_MODE}]`
    }
  }

  let reply = ''
  let jsonRetries = 0

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const stream = getClient().beta.messages.stream({
      model,
      max_tokens,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // Spoken summaries don't need extended thinking, and skipping it saves
      // seconds per round. On Sonnet/Haiku, omitting the parameter turns it off.
      ...(opts.voice && /sonnet|haiku/.test(model) ? {} : { thinking: { type: 'adaptive' as const } }),
      output_config: { effort },
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
        emit({ t: 'status', v: 'Searching the news', kind: 'search' })
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

    for (const b of toolUses) emit({ t: 'status', ...describeTool(b) })
    messages.push({ role: 'assistant', content: message.content })
    messages.push({ role: 'user', content: await Promise.all(toolUses.map((b) => runTool(b, ctx))) })

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
