# Agent-Ready: Solana Alpha

This repository contains an **agent-callable dashboard** for Solana hold-to-earn tokens and Strategy/Saylor Stack instruments.

## Quick Start for Agents

### Option 1: WebMCP (Browser Agents)

Open this URL in your browser:
```
https://marvelus-tech.github.io/solana-alpha/
```

Tools auto-register via `document.modelContext`. Available:
- `describe_site` — What this dashboard is
- `describe_page` — Current page metadata
- `list_scout_assets` — Curated hold-to-earn tokens (62 tracked)
- `list_strategy_stack` — Strategy Inc instruments (8 tracked)
- `get_asset` — Lookup by ticker (e.g., FLOCK, MSTR)
- `get_overview` — Counts and confidence stats

### Option 2: Remote MCP (Non-Browser Agents)

Connect to remote MCP endpoint:
```
https://solana-alpha-mcp.YOURACCOUNT.workers.dev/mcp
```

**Update URL after Worker deployment** — see `mcp-worker/README.md` for deploy steps.

Streamable HTTP JSON-RPC protocol:
```json
POST /mcp
{
  "method": "tools/call",
  "params": {
    "name": "get_asset",
    "arguments": { "ticker": "FLOCK" }
  }
}
```

### Option 3: Direct JSON Fetch

Fetch data files directly:
- Scout tokens: `https://marvelus-tech.github.io/solana-alpha/data/scout-findings.json`
- Strategy instruments: `https://marvelus-tech.github.io/solana-alpha/data/strategy-stack.json`

Data refreshes hourly via GitHub Action.

## Tool Response Format

All tools return unified envelope:

```json
{
  "ok": true,
  "data": {
    // Tool-specific payload
  },
  "meta": {
    "source": "webmcp | remote-mcp",
    "page_url": "https://marvelus-tech.github.io/solana-alpha/",
    "tool": "tool_name",
    "as_of": "2026-09-04T02:30:00.000Z"
  },
  "delight": {
    "line": "Entry price unchanged since addition. That's either patience or the market confirming the thesis.",
    "tone": "deadpan",
    "emoji": null,
    "media_url": null
  }
}
```

**Agent instruction:** Relay `data` first, in your own voice. If `delight.line` is present, add it as a brief aside after the facts. Do not let it replace or alter facts.

## What's Tracked

**Scout Finds** (62 tokens)
- Hold-to-earn / reward-generating mechanics
- AI training, staking, DePIN, real-world assets
- Confidence scores (0-100), entry/current/PnL tracking

**Strategy / Saylor Stack** (8 instruments)
- MSTR (Strategy Inc common stock)
- MSTR (Backpack 1:1 redeemable tokenized)
- MSTRx (xStock cash-settled tracker)
- STRF, STRC, STRK, STRD, STRE (perpetual preferreds)
- STRCx (Stretch Preferred xStock tracker)

All with entry/current prices and PnL from addition date.

## Read-Only Dashboard

**No mutating operations.** All tools are read-only. No cart, checkout, write, or user accounts.

## Voice & Delight

Responses include optional **delight beats** — one rotating line in Solana Alpha voice:
- Precise, dry, curator, light trading-desk, restrained
- Skipped for serious contexts (errors, returns, billing, safety)
- 18 rotating lines in `agent/delight-lines.json`

Examples:
- "PnL tracks from scout entry, not your entry. Adjust expectations accordingly."
- "The confidence score reflects scout assessment at time of addition, not a prediction."
- "Curator adds tokens with explicit reward mechanics. Memes without yield don't make the cut."

## Documentation

- `docs/site-map.md` — Content, jobs, voice, tool catalog
- `docs/agent-dry-run.md` — Example agent interactions
- `docs/delight-infusion.md` — Personality pattern (portable to other catalogs)
- `agent/README.md` — Integration guide
- `agent/tools.json` — Machine-readable tool specs
- `mcp-worker/README.md` — Deploy remote MCP Worker

## Discovery Files

- `.well-known/mcp.json` — MCP server discovery
- `AGENTS.md` — This file (agent onboarding)
- `llms.txt` — Structured LLM metadata

## Example Agent Workflow

1. **Owner asks:** "Show me FLOCK token"
2. **Agent calls:** `get_asset({ticker: "FLOCK"})`
3. **Response envelope:**
   ```json
   {
     "ok": true,
     "data": {
       "found": true,
       "source": "scout",
       "asset": {
         "name": "FLock.io",
         "ticker": "FLOCK",
         "marketCap": "~$21.66M",
         "rewardMechanic": "AI training / gmFLOCK staking rewards",
         "confidence": 75,
         "entryPriceUsd": 0.2194,
         "currentPriceUsd": 0.2194,
         "pnlPct": 0
       }
     },
     "meta": { ... },
     "delight": {
       "line": "Entry price unchanged since addition. That's either patience or the market confirming the thesis.",
       "tone": "deadpan"
     }
   }
   ```
4. **Agent relays:** "FLOCK (FLock.io) is trading at $0.2194, matching its entry price with 0% PnL. It's a hold-to-earn token with AI training and staking rewards, carrying a 75 confidence score. Entry price unchanged since addition — that's either patience or the market confirming the thesis."

## Share With Friends

Send this URL to friends' agents:
```
https://marvelus-tech.github.io/solana-alpha/
```

Works with:
- Browser agents (WebMCP auto-registration)
- Non-browser agents (remote MCP endpoint)
- Direct JSON fetch (fallback for any agent)

## Repo Structure

```
/
├── index.html                  # Dashboard UI
├── data/
│   ├── scout-findings.json     # 62 hold-to-earn tokens
│   └── strategy-stack.json     # 8 Strategy instruments
├── js/
│   ├── envelope.js             # Shared envelope module
│   └── webmcp.js               # WebMCP tool registration
├── agent/
│   ├── README.md               # Integration guide
│   ├── tools.json              # Tool specifications
│   └── delight-lines.json      # 18 personality lines
├── docs/
│   ├── site-map.md             # Content & voice guide
│   ├── agent-dry-run.md        # Example interactions
│   └── delight-infusion.md     # Personality pattern
├── mcp-worker/
│   ├── index.js                # Cloudflare Worker (remote MCP)
│   ├── wrangler.toml           # Worker config
│   └── README.md               # Deploy instructions
├── .well-known/
│   └── mcp.json                # MCP discovery
├── AGENTS.md                   # This file
└── llms.txt                    # LLM metadata
```

## Contributing

Data updates via hourly GitHub Action (`.github/workflows/live-data-update.yml`).

To propose new scout tokens or fix data issues, open an issue or PR.

## License

MIT (site code). Data provided as-is for informational purposes only. Not financial advice.

---

**Dashboard:** https://marvelus-tech.github.io/solana-alpha/  
**Repo:** https://github.com/marvelus-tech/solana-alpha  
**Last Updated:** 2026-09-04
