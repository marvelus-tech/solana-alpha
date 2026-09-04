# Solana Alpha — Reward-Generating Assets Dashboard

This dashboard focuses on **unique wealth-building instruments**: curated Scout Finds with hold-to-earn mechanics and the Strategy / Saylor Stack of tokenized equities and synthetic trackers.

## What the pipeline does

- Enriches **Scout Finds** from curated markdown reports with live DexScreener prices
- Enriches **Strategy / Saylor Stack** instruments with live market data
- Builds datasets:
  - `data/scout-findings.json` — reward-generating tokens with PnL tracking
  - `data/strategy-stack.json` — tokenized equities & trackers with PnL
- Frontend (`index.html`) fetches both JSON files and renders Scout + Strategy panels with full PnL

## Local run

```bash
npm run build:data
```

Then open `index.html` with a static server (or via GitHub Pages).

## Automation (hourly)

Workflow: `.github/workflows/live-data-update.yml`

- Runs every hour (`7 * * * *`)
- Regenerates `data/scout-findings.json` and `data/strategy-stack.json` with live prices
- Commits/pushes only when data changed
- GitHub Pages serves latest committed data

## Scripts

- `scripts/enrich-scout-prices.mjs` — enriches scout findings with DexScreener prices & PnL
- `scripts/enrich-strategy-stack.mjs` — enriches strategy instruments with market data & PnL
- Both preserve `.tastemaker/` metadata and existing data structures
