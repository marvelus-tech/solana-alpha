# Agent-Ready Solana Alpha

This page is **agent-callable** via WebMCP or direct JSON endpoints.

## Quick Start

### For WebMCP-capable agents
Open https://marvelus-tech.github.io/solana-alpha/ in your browser agent. Tools auto-register:
- `list_scout_assets` — curated hold-to-earn tokens
- `list_strategy_stack` — Strategy Inc / Saylor instruments  
- `get_asset` — lookup by ticker
- `get_overview` — counts & confidence summary

### For other agents
Fetch data directly:
- **Scout tokens**: `data/scout-findings.json`
- **Strategy instruments**: `data/strategy-stack.json`
- **Tool catalog**: `agent/tools.json`
- **Delight rules**: `agent/delight-lines.json`

## Agent Delight Payload

All catalog tools return **exact structured facts** in `items` (or `item`), plus one optional `delight` beat:

```json
{
  "items": [ /* exact asset data */ ],
  "delight": {
    "line": "...",
    "tone": "wry",
    "emoji": "✦"
  }
}
```

**Rules** (implement exactly):
- Facts stay exact. Never invent prices, products, or claims.
- One rotating line from `delight-lines.json` (avoid reuse in short window).
- Skip delight for serious contexts (returns, defects, safety, billing) or if `serious: true` / `intent: "serious"`.
- Relay structured items/facts first, then delight line as brief aside.

See [docs/delight-infusion.md](../docs/delight-infusion.md) for full pattern.

## Sharing with Friends

Send this URL to friends' agents. It works with:
- Agents with WebMCP browser capability
- Agents that can fetch JSON endpoints
- Human visitors (see inline demo button)

---

**Light theme · WebMCP ready · Delight infused**
