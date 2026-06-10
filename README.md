# Solana Alpha — Live Data Pipeline

This dashboard now renders **real Solana market data** from API-generated JSON (no hardcoded fake stats).

## What the pipeline does

- Pulls live token universe from DexScreener:
  - `token-profiles/latest/v1`
  - `token-boosts/top/v1`
  - `token-boosts/latest/v1`
  - `tokens/v1/solana/{tokenAddresses}`
- Builds dashboard datasets:
  - **Top Gainers (24h)**
  - **New Listings (last 72h)**
  - **Trending** (boosted + high-volume tokens)
- Reads scout context from `memory/scout-findings/` when available and stores summary metadata
- Writes output to `data/live-data.json`
- Frontend (`index.html`) fetches this JSON and renders live cards

## Local run

```bash
npm run fetch:data
```

Then open `index.html` with a static server (or via GitHub Pages) and it will load `data/live-data.json`.

## Automation (hourly)

Workflow: `.github/workflows/live-data-update.yml`

- Runs every hour (`7 * * * *`)
- Regenerates `data/live-data.json`
- Commits/pushes only when data changed
- GitHub Pages serves latest committed data

## Data quality and filters

Current filters for dashboard inclusion:

- Solana chain only
- Minimum liquidity: **$50,000**
- Minimum 24h volume: **$25,000**
- Requires market cap/FDV value

You can adjust thresholds in `scripts/fetch-live-data.mjs`.
