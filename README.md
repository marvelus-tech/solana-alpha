# Invest-Innovation: Reward-Generating Assets Dashboard

This dashboard focuses on **unique wealth-building instruments**: curated Scout Finds with hold-to-earn mechanics, the Strategy / Saylor Stack of tokenized equities and synthetic trackers, and high-conviction research insights from InvestAnswers coverage.

## Agent-Ready

This site is **agent-callable** via WebMCP or direct JSON endpoints. See:
- [Agent README](./agent/README.md) — share with friends' agents
- [Delight Infusion Pattern](./docs/delight-infusion.md) — portable catalog pattern with personality beats

## What the pipeline does

- Enriches **Scout Finds** from curated markdown reports with live DexScreener prices
- Enriches **Strategy / Saylor Stack** instruments with live market data
- Tracks **InvestAnswers Highlights** for high-conviction research insights
- Builds datasets:
  - `data/scout-findings.json` — reward-generating tokens with PnL tracking
  - `data/strategy-stack.json` — tokenized equities & trackers with PnL
  - `data/investanswers-highlights.json` — curated research highlights
- Frontend (`index.html`) fetches all JSON files and renders Scout + Strategy + InvestAnswers panels

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

## Agent Tools

WebMCP tools auto-register when opened in agent browsers:
- `list_scout_assets` — curated hold-to-earn tokens
- `list_strategy_stack` — Strategy Inc / Saylor instruments
- `get_asset` — lookup by ticker
- `get_overview` — counts & confidence summary

Fallback: fetch `data/scout-findings.json` and `data/strategy-stack.json` directly. See `agent/tools.json` for schemas.
