# Agent Dry Run: Solana Alpha

This document demonstrates expected agent interactions with Solana Alpha tools using the new envelope format.

## Scenario 1: Owner Asks About a Specific Token

**Owner Question:**  
"What can you tell me about FLOCK token?"

**Agent Tool Call:**
```json
{
  "tool": "get_asset",
  "arguments": {
    "ticker": "FLOCK"
  }
}
```

**Tool Returns (Envelope):**
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
      "addedAt": "2026-06-07",
      "entryPriceUsd": 0.2194,
      "currentPriceUsd": 0.2194,
      "pnlPct": 0,
      "priceUpdatedAt": "2026-09-04T00:58:38.053Z",
      "tokenAddress": "B9kvUCW36BpAPKjUvdB2q1FgiYyDZ1uxutafVqXw5YQ",
      "dexUrl": "https://dexscreener.com/solana/gv5f4xoe3yx23t1juefpz4tgvtgrkpork2qhkyd6h3er"
    }
  },
  "meta": {
    "source": "webmcp",
    "page_url": "https://marvelus-tech.github.io/solana-alpha/",
    "tool": "get_asset",
    "as_of": "2026-09-04T02:45:00.000Z"
  },
  "delight": {
    "line": "The reward mechanic is the reason it's here. Price movement is secondary.",
    "tone": "curious",
    "emoji": null,
    "media_url": null
  }
}
```

**What Agent Should Say Out Loud:**

> "FLOCK (FLock.io) is trading at $0.2194, matching its entry price with 0% PnL since it was added on June 7th. It's a hold-to-earn token with AI training and gmFLOCK staking rewards, carrying a 75 confidence score. Market cap is around $21.66M. The reward mechanic is the reason it's here — price movement is secondary."

**Key Points:**
- Relay exact facts from `data.asset` first
- Use natural language, not JSON structure
- Add delight line as brief aside at the end
- Don't invent or embellish data

---

## Scenario 2: Owner Asks for Overview

**Owner Question:**  
"Give me a quick overview of what's tracked here."

**Agent Tool Call:**
```json
{
  "tool": "get_overview",
  "arguments": {}
}
```

**Tool Returns (Envelope):**
```json
{
  "ok": true,
  "data": {
    "scout": {
      "total": 62,
      "withPnL": 62,
      "avgConfidence": 73
    },
    "strategy": {
      "total": 8,
      "withPnL": 7
    },
    "combined": {
      "total": 70,
      "withPnL": 69
    }
  },
  "meta": {
    "source": "webmcp",
    "page_url": "https://marvelus-tech.github.io/solana-alpha/",
    "tool": "get_overview",
    "as_of": "2026-09-04T02:46:00.000Z"
  },
  "delight": {
    "line": "Curator adds tokens with explicit reward mechanics. Memes without yield don't make the cut.",
    "tone": "wry",
    "emoji": null,
    "media_url": null
  }
}
```

**What Agent Should Say Out Loud:**

> "Solana Alpha tracks 70 total instruments: 62 scout finds (curated hold-to-earn tokens) and 8 strategy instruments (MSTR and preferreds). 69 of them have PnL tracking with entry prices. The scout picks average 73 confidence. Curator adds tokens with explicit reward mechanics — memes without yield don't make the cut."

**Key Points:**
- Combine stats naturally
- Explain what the numbers mean
- Add delight as closing observation

---

## Scenario 3: Owner Asks About Strategy Stack

**Owner Question:**  
"What's in the Strategy / Saylor Stack?"

**Agent Tool Call:**
```json
{
  "tool": "list_strategy_stack",
  "arguments": {}
}
```

**Tool Returns (Envelope):**
```json
{
  "ok": true,
  "data": {
    "instruments": [
      {
        "ticker": "MSTR",
        "name": "Strategy Inc Class A Common Stock",
        "type": "equity",
        "category": "traditional",
        "description": "MicroStrategy (now Strategy Inc) common stock",
        "currentPriceUsd": 144.82,
        "entryPriceUsd": 144.82,
        "pnlPct": 0,
        "priceSource": "Yahoo Finance",
        "priceUpdatedAt": "2026-09-04T01:07:17.164Z",
        "addedAt": "2026-09-04",
        "dexUrl": "https://dexscreener.com/solana/dmryq83qiugurjd36qky5y2cefzajqrhuxw8kyvg1z2e",
        "infoUrl": "https://www.strategy.com"
      },
      {
        "ticker": "MSTR",
        "name": "MSTR (Backpack Securities 1:1 redeemable)",
        "type": "tokenized_equity",
        "category": "solana",
        "description": "Backpack/Sunrise 1:1 redeemable tokenized MSTR equity on Solana",
        "currentPriceUsd": 142.38,
        "entryPriceUsd": 142.38,
        "pnlPct": 0,
        "priceSource": "DexScreener",
        "priceUpdatedAt": "2026-09-04T01:07:17.618Z",
        "addedAt": "2026-09-04",
        "dexUrl": "https://dexscreener.com/solana/3hro9bwkxiyv7zfh2zbdqyunevzt69ixnyqbamcvyvys",
        "infoUrl": "https://backpack.exchange"
      }
    ],
    "count": 8
  },
  "meta": {
    "source": "webmcp",
    "page_url": "https://marvelus-tech.github.io/solana-alpha/",
    "tool": "list_strategy_stack",
    "as_of": "2026-09-04T02:47:00.000Z"
  },
  "delight": {
    "line": "Strategy stack is MSTR and preferreds. The tokenized forms track within basis points.",
    "tone": "deadpan",
    "emoji": null,
    "media_url": null
  }
}
```

**What Agent Should Say Out Loud:**

> "The Strategy / Saylor Stack has 8 instruments total. There's MSTR common stock at $144.82 (Yahoo Finance), MSTR tokenized equity via Backpack at $142.38 (1:1 redeemable), an MSTRx cash-settled tracker at $142.25, and five perpetual preferreds: STRF at $104.40, STRC at $97.82, STRK at $77.10, STRD at $75.85, and STRE. There's also a STRCx tracker. All have zero PnL since they were just added. Strategy stack is MSTR and preferreds — the tokenized forms track within basis points."

**Key Points:**
- Summarize key instruments
- Note types (equity, tokenized, synthetic, preferred)
- Compare prices where relevant
- Close with delight observation

---

## Scenario 4: Serious Context (No Delight)

**Owner Question:**  
"I need to report an error with the INVALID ticker data."

**Agent Tool Call:**
```json
{
  "tool": "get_asset",
  "arguments": {
    "ticker": "INVALID",
    "intent": "serious"
  }
}
```

**Tool Returns (Envelope):**
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
    "as_of": "2026-09-04T02:48:00.000Z"
  }
}
```

**What Agent Should Say Out Loud:**

> "That ticker (INVALID) wasn't found in the scout or strategy data. The dashboard tracks 62 scout tokens and 8 strategy instruments. If you believe this is an error, you can check the data files directly or open an issue on the GitHub repo."

**Key Points:**
- No delight on errors
- Explain what's available
- Offer next steps
- Professional tone (no personality beats)

---

## Scenario 5: Describe the Site

**Owner Question:**  
"What is this site?"

**Agent Tool Call:**
```json
{
  "tool": "describe_site",
  "arguments": {}
}
```

**Tool Returns (Envelope):**
```json
{
  "ok": true,
  "data": {
    "name": "Solana Alpha",
    "tagline": "Tracking reward-generating assets and wealth-building instruments on Solana",
    "sections": [
      {
        "name": "Scout Finds",
        "description": "Curated hold-to-earn and reward-generating tokens",
        "count": 62
      },
      {
        "name": "Strategy / Saylor Stack",
        "description": "Strategy Inc (MSTR) common + preferreds + tokenized forms",
        "count": 8
      }
    ],
    "user_jobs": [
      "Browse scout list - scan curated hold-to-earn tokens",
      "Browse strategy stack - view MSTR + preferreds + tokenized forms",
      "Lookup one asset by ticker - get entry/now/PnL for specific instrument",
      "See entry/now/PnL - track performance since addition",
      "Share with agents - send dashboard URL to AI assistants"
    ],
    "mutating_operations": "None - read-only dashboard",
    "data_refresh": "Hourly via GitHub Action"
  },
  "meta": {
    "source": "webmcp",
    "page_url": "https://marvelus-tech.github.io/solana-alpha/",
    "tool": "describe_site",
    "as_of": "2026-09-04T02:49:00.000Z"
  },
  "delight": {
    "line": "This is a position tracker, not a recommendation engine. Do your own research.",
    "tone": "deadpan",
    "emoji": null,
    "media_url": null
  }
}
```

**What Agent Should Say Out Loud:**

> "Solana Alpha is a dashboard tracking reward-generating assets and wealth-building instruments on Solana. It has two sections: Scout Finds with 62 curated hold-to-earn tokens, and the Strategy / Saylor Stack with 8 MSTR-related instruments including common stock, preferreds, and tokenized forms. It's a read-only dashboard — you can browse the lists, look up assets by ticker, and track entry/current/PnL. Data refreshes hourly. This is a position tracker, not a recommendation engine — do your own research."

**Key Points:**
- Start with high-level purpose
- Explain both sections
- Clarify read-only nature
- End with delight disclaimer

---

## Pattern Summary

**For every tool call:**

1. **Check envelope `ok` field:**
   - `ok: true` → relay `data` content
   - `ok: false` → relay `error.message`, no delight

2. **Relay `data` first:**
   - Use natural language
   - Keep exact numbers (prices, counts, percentages)
   - Explain context where helpful

3. **Add `delight.line` as aside:**
   - Only if present and `ok: true`
   - After facts, as brief observation
   - Don't let it replace or distort facts

4. **Skip delight when:**
   - `ok: false` (errors)
   - User intent is serious
   - Context includes return/refund/error/problem keywords

---

**Last Updated:** 2026-09-04  
**Purpose:** Agent interaction examples for Solana Alpha tools
