# Solana Alpha — Unique Reward-Generating Assets

This dashboard showcases **unique reward-generating assets** with the greatest wealth-building potential, tracked by Scout + Strategy with live PnL.

## What the pipeline does

- Reads curated scout findings from `memory/scout-findings/` directory
- Builds `data/scout-findings.json` from markdown reports and database
- Enriches scout findings with live prices from DexScreener → PnL tracking
- Enriches Strategy/Saylor Stack instruments with live prices → PnL tracking
- Hourly workflow updates all PnL data automatically
- Frontend (`index.html`) displays Scout Finds + Strategy Stack with hold-to-earn/reward mechanics

## Content focus

This site is **NOT** a generic market dashboard. It only tracks assets with unique reward mechanisms:
- Hold-to-earn / staking rewards
- DePIN infrastructure rewards
- Revenue sharing protocols
- AI platform rewards
- Move-to-earn / location-based rewards
- Tokenized equity / synthetic stock trackers (Strategy Stack)
- Other unique wealth-building mechanics

Generic market lists (trending, top gainers, new listings) have been removed — those are available in other apps (DexScreener, etc.).

## Local run

```bash
npm run build:data
npm run enrich:scout
npm run enrich:strategy
```

Then open `index.html` with a static server (or via GitHub Pages) and it will load scout + strategy data with PnL.

## Automation (hourly)

Workflow: `.github/workflows/live-data-update.yml`

- Runs every hour (`7 * * * *`)
- Regenerates all data files with live PnL enrichment
- Commits/pushes only when data changed
- GitHub Pages serves latest committed data with current prices
