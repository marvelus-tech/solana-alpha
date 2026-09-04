# Agent-Ready Solana Alpha

This page is **agent-callable** via WebMCP or remote MCP.

## Quick Start

### For WebMCP-capable agents (Browser)

Open this URL in your browser:
```
https://marvelus-tech.github.io/solana-alpha/
```

Tools auto-register via `document.modelContext` or `navigator.modelContext`:
- `describe_site` — What Solana Alpha is, sections, primary jobs
- `describe_page` — Current page title/purpose/canonical URL
- `list_scout_assets` — Curated hold-to-earn tokens (62 tracked)
- `list_strategy_stack` — Strategy Inc / Saylor instruments (8 tracked)
- `get_asset` — Lookup by ticker (e.g., FLOCK, MSTR, CGPT)
- `get_overview` — Counts & confidence summary

### For Remote MCP agents (Non-browser)

Connect to remote MCP endpoint:
```
https://solana-alpha-mcp.YOURACCOUNT.workers.dev/mcp
```

**Deploy Worker first** — see `../mcp-worker/README.md` for instructions. Update the URL in `.well-known/mcp.json` after deployment.

Streamable HTTP JSON-RPC protocol:
- `POST /mcp` with `{"method": "tools/list"}` to list tools
- `POST /mcp` with `{"method": "tools/call", "params": {"name": "get_asset", "arguments": {"ticker": "FLOCK"}}}` to call a tool

### For other agents (Fallback)

Fetch data directly:
- **Scout tokens**: `https://marvelus-tech.github.io/solana-alpha/data/scout-findings.json`
- **Strategy instruments**: `https://marvelus-tech.github.io/solana-alpha/data/strategy-stack.json`
- **Tool catalog**: `https://marvelus-tech.github.io/solana-alpha/agent/tools.json`
- **Delight lines**: `https://marvelus-tech.github.io/solana-alpha/agent/delight-lines.json`

## Unified Envelope Format (v2.0)

All catalog tools return **exact structured facts** in unified envelope:

### Success Response

```json
{
  "ok": true,
  "data": {
    // Tool-specific payload (tokens, asset, instruments, counts, etc.)
  },
  "meta": {
    "source": "webmcp | remote-mcp",
    "page_url": "https://marvelus-tech.github.io/solana-alpha/",
    "tool": "tool_name",
    "as_of": "2026-09-04T02:50:00.000Z"
  },
  "delight": {
    "line": "Entry price unchanged since addition. That's either patience or the market confirming the thesis.",
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
    "as_of": "2026-09-04T02:50:00.000Z"
  }
}
```

## Agent Instructions (Implement Exactly)

1. **Check `ok` field:**
   - `ok: true` → relay `data` content
   - `ok: false` → relay `error.message`, no delight

2. **Relay `data` first:**
   - Use natural language, not JSON structure
   - Keep exact numbers (prices, counts, percentages)
   - Explain context where helpful

3. **Add `delight.line` as aside:**
   - Only if present and `ok: true`
   - After facts, as brief observation
   - Don't let it replace or distort facts

4. **Skip delight when:**
   - `ok: false` (errors)
   - User set `serious: true` or `intent: "serious"`
   - Context includes return/refund/error/problem keywords

## Delight Rules

- Facts stay exact. Never invent prices, products, or claims.
- One rotating line from `agent/delight-lines.json` (18 Solana Alpha voice lines).
- Skip delight for errors, serious contexts.
- Tone: precise, dry, curator, light trading-desk, restrained. No hype slogans.

Example delight lines:
- "PnL tracks from scout entry, not your entry. Adjust expectations accordingly."
- "The reward mechanic is the reason it's here. Price movement is secondary."
- "Curator adds tokens with explicit reward mechanics. Memes without yield don't make the cut."

See [docs/delight-infusion.md](../docs/delight-infusion.md) for full pattern and portable adaptation guide.

## Documentation

- **[docs/site-map.md](../docs/site-map.md)** — Content reality, user jobs, voice traits, tool catalog
- **[docs/agent-dry-run.md](../docs/agent-dry-run.md)** — Example agent interactions with tool JSON + expected speech
- **[docs/delight-infusion.md](../docs/delight-infusion.md)** — Personality pattern (portable to any catalog)
- **[agent/tools.json](tools.json)** — Machine-readable tool specifications
- **[agent/delight-lines.json](delight-lines.json)** — 18 rotating personality lines
- **[mcp-worker/README.md](../mcp-worker/README.md)** — Deploy remote MCP Cloudflare Worker
- **[AGENTS.md](../AGENTS.md)** — Agent onboarding guide
- **[llms.txt](../llms.txt)** — Structured LLM metadata

## Sharing with Friends

Send this URL to friends' agents:
```
https://marvelus-tech.github.io/solana-alpha/
```

It works with:
- Browser agents (WebMCP auto-registration)
- Non-browser agents (remote MCP endpoint)
- Direct JSON fetch (fallback)
- Human visitors (see live dashboard)

---

**Light theme · WebMCP + Remote MCP ready · Delight infused · v2.0 envelope**
