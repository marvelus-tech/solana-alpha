# Solana Alpha Remote MCP Server

Cloudflare Worker implementing Streamable HTTP MCP for Solana Alpha dashboard.

## What This Does

Exposes 6 read-only tools via remote MCP endpoint:
- `describe_site` — What Solana Alpha is, sections, jobs
- `describe_page` — Page title/purpose/canonical URL
- `list_scout_assets` — Curated hold-to-earn tokens
- `list_strategy_stack` — Strategy Inc instruments  
- `get_asset` — Lookup by ticker
- `get_overview` — Counts and confidence stats

All tools return unified envelope: `{ok, data, meta, delight}`

## Deploy Steps

### 1. Install Wrangler

```bash
npm install
```

### 2. Login to Cloudflare

```bash
npx wrangler login
```

### 3. Deploy Worker

```bash
npx wrangler deploy
```

This will deploy to: `https://solana-alpha-mcp.<your-account>.workers.dev`

### 4. Update Discovery File

After deployment, update `/.well-known/mcp.json` with your actual Worker URL:

```json
{
  "mcpServers": {
    "solana-alpha": {
      "url": "https://solana-alpha-mcp.<your-account>.workers.dev/mcp",
      "transport": "http-sse"
    }
  }
}
```

## Local Development

Run locally:

```bash
npx wrangler dev
```

Test endpoint:

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/list"}'
```

## MCP Protocol

### List Tools

**Request:**
```json
POST /mcp
{
  "method": "tools/list"
}
```

**Response:**
```json
{
  "tools": [
    {
      "name": "describe_site",
      "description": "...",
      "inputSchema": { ... }
    },
    ...
  ]
}
```

### Call Tool

**Request:**
```json
POST /mcp
{
  "method": "tools/call",
  "params": {
    "name": "get_asset",
    "arguments": {
      "ticker": "FLOCK"
    }
  }
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "found": true,
    "source": "scout",
    "asset": { ... }
  },
  "meta": {
    "source": "remote-mcp",
    "page_url": "https://marvelus-tech.github.io/solana-alpha/",
    "tool": "get_asset",
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

## Data Source

Worker fetches live data from:
- `https://marvelus-tech.github.io/solana-alpha/data/scout-findings.json`
- `https://marvelus-tech.github.io/solana-alpha/data/strategy-stack.json`

Data cached for 1 hour in Worker memory.

## Rate Limiting

Currently no rate limiting implemented. Add if needed:

```javascript
// Example rate limit logic
const RATE_LIMIT = 100; // requests per minute
```

## Environment Variables

None required for basic deployment. Optional:

- `MCP_PUBLIC_URL` — Override Worker URL in discovery (set in GitHub Pages deployment)

## Troubleshooting

**Worker not accessible:**
- Check Cloudflare dashboard for deployment status
- Verify Worker route is active
- Check CORS headers in response

**Tools returning empty data:**
- Verify GitHub Pages URLs are accessible
- Check cache TTL (default 1 hour)
- Inspect Worker logs: `npx wrangler tail`

**Delight not appearing:**
- Check `serious` parameter is not set to `true`
- Verify delight lines array is populated in Worker code

## Security

- **Read-only tools** — No write operations
- **Public data** — Fetches from public GitHub Pages
- **No secrets** — No API keys or credentials required
- **CORS enabled** — Allows cross-origin requests

Add authentication if needed:
```javascript
// Example bearer token auth
const auth = request.headers.get('Authorization');
if (auth !== 'Bearer YOUR_SECRET') {
  return new Response('Unauthorized', { status: 401 });
}
```

---

**Last Updated:** 2026-09-04  
**Cloudflare Workers Docs:** https://developers.cloudflare.com/workers/
