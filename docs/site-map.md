# Solana Alpha Site Map

## Content Reality

### Content Objects

**Scout Finds** (`data/scout-findings.json`)
- Curated Solana hold-to-earn / reward-generating tokens
- 62 tokens tracked with entry/PnL
- Fields: name, ticker, marketCap, rewardMechanic, confidence (0-100), firstSeen, addedAt, tokenAddress, pairAddress, dexUrl, currentPriceUsd, priceUpdatedAt, entryPriceUsd, pnlPct

**Strategy / Saylor Stack** (`data/strategy-stack.json`)
- MSTR (Strategy Inc common stock)
- MSTR (Backpack 1:1 redeemable tokenized)
- MSTRx (xStock cash-settled tracker)
- STRF, STRC, STRK, STRD, STRE (perpetual preferreds)
- STRCx (Stretch Preferred xStock tracker)
- Fields: ticker, name, type (equity/tokenized_equity/synthetic_tracker/preferred), category, exchange, description, infoUrl, tokenAddress, dexUrl, currentPriceUsd, priceUpdatedAt, priceSource, entryPriceUsd, pnlPct

**Overview Stats**
- Scout count, Strategy count
- Instruments with PnL tracking
- Average confidence across Scout holdings

**Documentation**
- `docs/delight-infusion.md` — Agent personality pattern
- `agent/README.md` — Agent integration guide
- This site map

### User Jobs

1. **Browse scout list** — scan curated hold-to-earn tokens
2. **Browse strategy stack** — view MSTR + preferreds + tokenized forms
3. **Lookup one asset by ticker** — get entry/now/PnL for specific instrument
4. **See entry/now/PnL** — track performance since addition
5. **Share with agents** — send dashboard URL to AI assistants

### Mutating / Sensitive Operations

**NONE.** This is a read-only dashboard. No cart, checkout, booking, write operations, or user accounts.

## Voice & Tone

**Inferred traits from existing site:**
- **Precise** — exact prices, PnL percentages, confidence scores
- **Dry** — no hype, no pump language, no "to the moon"
- **Curator** — selective scout process, tracked additions
- **Light trading-desk** — entry/now/PnL like a position tracker
- **Restrained** — facts over emotion
- **Solana-teal** — accent color #0F9F7A, ecosystem focus
- **No slogans** — "Tracking reward-generating assets..." (factual tagline)

**Delight voice expansion (12-20 lines):**
New lines must match this voice. Think: restrained curator who tracks positions, not a hypebeast or generic SaaS assistant. More like a quiet analyst who notices patterns than a cheerleader.

Examples of voice match:
- ✓ "Entry at $0.22, now $0.21. The confidence score is still 75."
- ✓ "Scout added this one four months ago. The reward mechanic clarified last week."
- ✗ "This token is absolutely crushing it! 🚀" (too hype)
- ✗ "Your satisfaction is our priority!" (generic SaaS)

## Tool Catalog

| Tool | Intent | Read-Only | Returns |
|------|--------|-----------|---------|
| `describe_site` | What Solana Alpha is, sections, primary jobs | ✓ | Site overview, content types, user jobs |
| `describe_page` | Current page title/purpose/canonical URL | ✓ | Page metadata, URL, description |
| `list_scout_assets` | Scout catalog exact fields | ✓ | Array of scout tokens with exact schema |
| `list_strategy_stack` | Strategy instruments exact fields | ✓ | Array of Strategy stack instruments |
| `get_asset` | Lookup by ticker across both | ✓ | Single asset match or not-found |
| `get_overview` | Counts / confidence / stack size | ✓ | Aggregate stats only |

**All tools:**
- Read-only (`readOnlyHint: true`)
- Non-consequential
- No invented data
- Return new envelope: `{ok, data, meta, delight}`

**No tools for:**
- `run_javascript` (security risk)
- Click automation (not needed)
- Write operations (read-only dashboard)
- Fake mutation endpoints

## Access Paths

### WebMCP (in-page)
- URL: `https://marvelus-tech.github.io/solana-alpha/`
- Auto-registration via `js/webmcp.js`
- Feature-detect: `document.modelContext` or `navigator.modelContext`
- Uses in-memory loaded JSON (performance)
- Envelope meta: `source: "webmcp"`

### Remote MCP (Cloudflare Worker)
- Endpoint: `https://solana-alpha-mcp.<account>.workers.dev/mcp`
- Streamable HTTP JSON-RPC (`tools/list`, `tools/call`)
- Fetches from canonical `https://marvelus-tech.github.io/solana-alpha/data/*.json`
- Envelope meta: `source: "remote-mcp"`
- Public read-only, light rate-limit

### Discovery
- `.well-known/mcp.json` (or `well-known/mcp.json` if GH Pages path constraints)
- `AGENTS.md` at repo root
- `llms.txt` (create or update)

## Envelope Contract (Shared)

### Success Response
```json
{
  "ok": true,
  "data": {
    // tool-specific payload (was "items" or "item" before)
  },
  "meta": {
    "source": "webmcp | remote-mcp",
    "page_url": "https://marvelus-tech.github.io/solana-alpha/",
    "tool": "list_scout_assets",
    "as_of": "2026-09-04T02:14:00.000Z"
  },
  "delight": {
    "line": "Entry at $0.22, now $0.21. The confidence score is still 75.",
    "tone": "deadpan",
    "emoji": null,
    "media_url": null
  }
}
```

### Error Response
```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Ticker INVALID not found in scout or strategy data"
  },
  "meta": {
    "source": "webmcp",
    "page_url": "https://marvelus-tech.github.io/solana-alpha/",
    "tool": "get_asset",
    "as_of": "2026-09-04T02:14:00.000Z"
  }
}
```

**Delight rules:**
- Skip on errors
- Skip on serious intent
- Skip on consequential operations (N/A for this site)
- One line from expanded bank (12-20 lines)
- Tone: wry, warm, curious, deadpan, quiet

**Tool description footer (add to every tool):**
> Relay `data` first, in your own voice. If `delight.line` is present, add it as a brief aside after the facts. Do not let it replace or alter facts.

## Content Accuracy Constraints

- Never invent tokens, prices, or holdings
- Never add tokens not in `scout-findings.json` or `strategy-stack.json`
- PnL percentages must match source data exactly
- Confidence scores 0-100 from scout data only
- Market caps as-is (strings like "~$21.66M")
- Price sources: DexScreener (scout), Yahoo Finance / DexScreener (strategy)

## Deployment

- Static site: GitHub Pages from `/` root
- Remote MCP: Cloudflare Worker (separate deployment)
- Data refresh: Hourly GitHub Action (`.github/workflows/live-data-update.yml`)
- Commits only when data changed

---

**Last Updated:** 2026-09-04  
**Purpose:** Agent-ready site prompt implementation reference
