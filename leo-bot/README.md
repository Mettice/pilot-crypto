# Leo trading bot (paper trading)

Freqtrade in **dry-run** (fake money, live Binance prices) behind Caddy for HTTPS.
Leo's dashboard at leo.pilotcrytor.io reads it and controls it through Freqtrade's REST API.

- Strategy: `LeoDailyRegime` (see `docs/leo/STRATEGY.md` for rules and backtest results)
- Paper wallet: 10,000 USDT, max 50% invested, max 2 positions, BTC/USDT + ETH/USDT
- No Binance API keys are needed or used in dry-run

## 1. Create the server (~€4–5/month)

Hetzner Cloud → new server: **Ubuntu 24.04**, type **CX22**, location **Falkenstein or Helsinki**
(EU; Binance blocks US-based servers). Add your SSH key. Note the IPv4 address.

## 2. Point bot.pilotcrytor.io at it

Your domain's DNS is managed by Vercel: Vercel → Domains → pilotcrytor.io → DNS Records → Add:
type `A`, name `bot`, value `<server IPv4>`.

## 3. Install and start

```bash
ssh root@<server IPv4>
curl -fsSL https://get.docker.com | sh
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable

git clone https://github.com/Mettice/pilot-crypto.git && cd pilot-crypto/leo-bot
cp user_data/config.private.example.json user_data/config.private.json
# Fill in random secrets:
sed -i "s|<random 64 chars>|$(openssl rand -hex 32)|; s|<random 32+ chars>|$(openssl rand -base64 32 | tr -d '/+=')|" user_data/config.private.json
echo "BOT_DOMAIN=bot.pilotcrytor.io" > .env

docker compose up -d
docker compose logs -f freqtrade   # Ctrl+C to leave; look for "state='RUNNING'"
curl https://bot.pilotcrytor.io/api/v1/ping   # -> {"status":"pong"}
```

Print the password to copy into Vercel:

```bash
grep '"password"' user_data/config.private.json
```

## 4. Connect Leo

Vercel → Settings → Environment Variables, then redeploy:

| Name | Value |
|---|---|
| `LEO_BOT_URL` | `https://bot.pilotcrytor.io` |
| `LEO_BOT_USERNAME` | `leo` |
| `LEO_BOT_PASSWORD` | the password from step 3 |

The "Trading bot" panel on the Leo dashboard then shows positions, P&L and the controls.

## Controls

| Control | Who | Effect |
|---|---|---|
| Pause entries | Operators, or Leo when asked | No new trades; open positions and stops stay managed |
| Resume | Operators only | Entries allowed again |
| Kill switch | Operators only | Pause, market-sell all positions, stop the bot |

Every action is logged in Supabase (`leo_bot_actions`) with who did it and why.

## Maintenance

```bash
cd ~/pilot-crypto && git pull && cd leo-bot && docker compose up -d   # update strategy/config
docker compose restart freqtrade                                        # restart
docker compose logs --tail 100 freqtrade                                # recent logs
```

## Optional: Telegram alerts

Create a bot with @BotFather, get your chat id from @userinfobot, put both in
`user_data/config.private.json` under `telegram`, set `"enabled": true`, then
`docker compose restart freqtrade`. Freqtrade sends entries, exits and errors, and accepts `/status`, `/profit`, `/stopentry`.

## Backtesting locally

```bash
docker run --rm -v "$PWD/user_data:/freqtrade/user_data" freqtradeorg/freqtrade:stable \
  download-data --config user_data/config.json --timerange 20200101- --timeframes 4h 1d
docker run --rm -v "$PWD/user_data:/freqtrade/user_data" freqtradeorg/freqtrade:stable \
  backtesting --config user_data/config.json --timerange 20210101- --enable-protections --breakdown year
```

## Going live (not yet)

Only after the paper period matches the backtest and the evaluation gates in `docs/leo/STRATEGY.md` pass.
Live needs a Binance API key with **trading only, withdrawals disabled, IP-restricted to this server**,
`"dry_run": false`, and a separate database.
