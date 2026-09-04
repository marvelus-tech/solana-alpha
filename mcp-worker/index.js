/**
 * Solana Alpha Remote MCP Server
 * Cloudflare Worker implementing Streamable HTTP MCP
 * Exposes read-only tools for scout assets and strategy instruments
 */

// Delight lines (embedded for Worker use)
const DELIGHT_LINES = [
  { id: "entry-unchanged", tone: "deadpan", text: "Entry price unchanged since addition. That's either patience or the market confirming the thesis." },
  { id: "confidence-score", tone: "quiet", text: "The confidence score reflects scout assessment at time of addition, not a prediction." },
  { id: "pnl-tracking", tone: "deadpan", text: "PnL tracks from scout entry, not your entry. Adjust expectations accordingly." },
  { id: "reward-mechanic", tone: "curious", text: "The reward mechanic is the reason it's here. Price movement is secondary." },
  { id: "scout-timing", tone: "quiet", text: "Scout added this one four months ago. The reward clarity came later." },
  { id: "strategy-stack", tone: "deadpan", text: "Strategy stack is MSTR and preferreds. The tokenized forms track within basis points." },
  { id: "solana-native", tone: "quiet", text: "Solana-native means on-chain settlement. That's the entire infrastructure advantage." },
  { id: "hold-to-earn", tone: "curious", text: "Hold-to-earn isn't staking. The yield accrues from protocol mechanics, not validator rewards." },
  { id: "market-cap", tone: "wry", text: "Market cap estimates vary by source. We show what DexScreener reports at fetch time." },
  { id: "no-promises", tone: "deadpan", text: "This is a position tracker, not a recommendation engine. Do your own research." },
  { id: "hourly-refresh", tone: "quiet", text: "Prices refresh hourly via GitHub Action. Intraday moves won't show until next commit." },
  { id: "curator-lens", tone: "wry", text: "Curator adds tokens with explicit reward mechanics. Memes without yield don't make the cut." },
  { id: "dex-links", tone: "quiet", text: "DexScreener links go to the exact pair tracked. Different pairs may show different prices." },
  { id: "preferred-yield", tone: "deadpan", text: "Preferred shares show fixed or variable dividend rates. Check the description for terms." },
  { id: "tokenized-equity", tone: "curious", text: "1:1 redeemable means Backpack will convert to real shares. Synthetic trackers settle in cash." },
  { id: "confidence-distribution", tone: "quiet", text: "Most scout picks sit at 75 confidence. Below 50 means experimental or unconfirmed mechanics." },
  { id: "pnl-zero", tone: "wry", text: "Zero PnL means entry equals current. Boring, but less volatile than the alternative." },
  { id: "added-dates", tone: "deadpan", text: "Added dates track when scout included the token. First seen may predate that by weeks." }
];

const recentLines = new Set();
const MAX_RECENT = 5;

// Data cache
let scoutDataCache = null;
let strategyDataCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 3600000; // 1 hour

// Fetch data from GitHub Pages
async function fetchData() {
  const now = Date.now();
  if (scoutDataCache && strategyDataCache && (now - cacheTimestamp) < CACHE_TTL) {
    return { scout: scoutDataCache, strategy: strategyDataCache };
  }

  try {
    const [scoutRes, strategyRes] = await Promise.all([
      fetch('https://marvelus-tech.github.io/solana-alpha/data/scout-findings.json'),
      fetch('https://marvelus-tech.github.io/solana-alpha/data/strategy-stack.json')
    ]);

    scoutDataCache = scoutRes.ok ? await scoutRes.json() : { tokens: [] };
    strategyDataCache = strategyRes.ok ? await strategyRes.json() : { instruments: [] };
    cacheTimestamp = now;

    return { scout: scoutDataCache, strategy: strategyDataCache };
  } catch (err) {
    console.error('Failed to fetch data:', err);
    return { scout: { tokens: [] }, strategy: { instruments: [] } };
  }
}

// Delight system
function pickDelightLine() {
  if (!DELIGHT_LINES.length) return null;
  
  const available = DELIGHT_LINES.filter(line => !recentLines.has(line.id));
  
  if (available.length === 0) {
    recentLines.clear();
    return DELIGHT_LINES[Math.floor(Math.random() * DELIGHT_LINES.length)];
  }
  
  const chosen = available[Math.floor(Math.random() * available.length)];
  
  recentLines.add(chosen.id);
  if (recentLines.size > MAX_RECENT) {
    const firstId = Array.from(recentLines)[0];
    recentLines.delete(firstId);
  }
  
  return chosen;
}

function shouldSkipDelight(params = {}) {
  if (params.serious === true || params.intent === 'serious') {
    return true;
  }
  
  const textToCheck = [
    params.query,
    params.ticker,
    params.context
  ].filter(Boolean).join(' ').toLowerCase();
  
  const seriousKeywords = [
    'return', 'refund', 'defect', 'safety', 'billing', 
    'error', 'problem', 'issue', 'complaint', 'broken'
  ];
  
  return seriousKeywords.some(keyword => textToCheck.includes(keyword));
}

function createEnvelope(result, options = {}) {
  const { tool = 'unknown', skipDelight = false } = options;

  // Error response
  if (result && result.error) {
    return {
      ok: false,
      error: {
        code: result.error.code || 'UNKNOWN_ERROR',
        message: result.error.message || 'An unknown error occurred'
      },
      meta: {
        source: 'remote-mcp',
        page_url: 'https://marvelus-tech.github.io/solana-alpha/',
        tool,
        as_of: new Date().toISOString()
      }
    };
  }

  // Success response
  const envelope = {
    ok: true,
    data: result,
    meta: {
      source: 'remote-mcp',
      page_url: 'https://marvelus-tech.github.io/solana-alpha/',
      tool,
      as_of: new Date().toISOString()
    }
  };

  // Add delight if appropriate
  if (!skipDelight && !shouldSkipDelight(options)) {
    const line = pickDelightLine();
    if (line) {
      envelope.delight = {
        line: line.text,
        tone: line.tone,
        emoji: null,
        media_url: null
      };
    }
  }

  return envelope;
}

// Tool implementations
const tools = {
  describe_site: async (params) => {
    const { scout, strategy } = await fetchData();
    return createEnvelope({
      name: 'Solana Alpha',
      tagline: 'Tracking reward-generating assets and wealth-building instruments on Solana',
      sections: [
        {
          name: 'Scout Finds',
          description: 'Curated hold-to-earn and reward-generating tokens',
          count: scout.tokens?.length || 0
        },
        {
          name: 'Strategy / Saylor Stack',
          description: 'Strategy Inc (MSTR) common + preferreds + tokenized forms',
          count: strategy.instruments?.length || 0
        }
      ],
      user_jobs: [
        'Browse scout list - scan curated hold-to-earn tokens',
        'Browse strategy stack - view MSTR + preferreds + tokenized forms',
        'Lookup one asset by ticker - get entry/now/PnL for specific instrument',
        'See entry/now/PnL - track performance since addition',
        'Share with agents - send dashboard URL to AI assistants'
      ],
      mutating_operations: 'None - read-only dashboard',
      data_refresh: 'Hourly via GitHub Action'
    }, { tool: 'describe_site', ...params });
  },

  describe_page: async (params) => {
    const { scout, strategy } = await fetchData();
    const lastUpdated = scout.enrichedAt || strategy.enrichedAt || new Date().toISOString();
    
    return createEnvelope({
      title: 'Solana Alpha — Live',
      canonical_url: 'https://marvelus-tech.github.io/solana-alpha/',
      purpose: 'Live dashboard showing curated hold-to-earn Solana tokens and Strategy/Saylor Stack instruments with entry/current prices and PnL tracking',
      page_type: 'Single-page dashboard',
      last_updated: lastUpdated
    }, { tool: 'describe_page', ...params });
  },

  list_scout_assets: async (params) => {
    const { scout } = await fetchData();
    
    if (!scout.tokens) {
      return createEnvelope({ error: { code: 'NO_DATA', message: 'Scout data not available' } }, {
        tool: 'list_scout_assets',
        skipDelight: true
      });
    }
    
    return createEnvelope({
      tokens: scout.tokens.map(t => ({
        name: t.name,
        ticker: t.ticker,
        marketCap: t.marketCap,
        rewardMechanic: t.rewardMechanic,
        confidence: t.confidence,
        addedAt: t.addedAt,
        entryPriceUsd: t.entryPriceUsd,
        currentPriceUsd: t.currentPriceUsd,
        pnlPct: t.pnlPct,
        priceUpdatedAt: t.priceUpdatedAt,
        tokenAddress: t.tokenAddress,
        dexUrl: t.dexUrl
      })),
      count: scout.tokens.length
    }, { tool: 'list_scout_assets', ...params });
  },

  list_strategy_stack: async (params) => {
    const { strategy } = await fetchData();
    
    if (!strategy.instruments) {
      return createEnvelope({ error: { code: 'NO_DATA', message: 'Strategy data not available' } }, {
        tool: 'list_strategy_stack',
        skipDelight: true
      });
    }
    
    return createEnvelope({
      instruments: strategy.instruments.map(inst => ({
        ticker: inst.ticker,
        name: inst.name,
        type: inst.type,
        category: inst.category,
        description: inst.description,
        currentPriceUsd: inst.currentPriceUsd,
        entryPriceUsd: inst.entryPriceUsd,
        pnlPct: inst.pnlPct,
        priceSource: inst.priceSource,
        priceUpdatedAt: inst.priceUpdatedAt,
        addedAt: inst.addedAt,
        dexUrl: inst.dexUrl,
        infoUrl: inst.infoUrl,
        tokenAddress: inst.tokenAddress
      })),
      count: strategy.instruments.length
    }, { tool: 'list_strategy_stack', ...params });
  },

  get_asset: async (params) => {
    const { ticker } = params;
    
    if (!ticker) {
      return createEnvelope({ error: { code: 'MISSING_TICKER', message: 'Ticker parameter required' } }, {
        tool: 'get_asset',
        skipDelight: true
      });
    }
    
    const { scout, strategy } = await fetchData();
    const tickerUpper = ticker.toUpperCase();
    
    // Search scout
    if (scout.tokens) {
      const match = scout.tokens.find(t => t.ticker?.toUpperCase() === tickerUpper);
      if (match) {
        return createEnvelope({
          found: true,
          source: 'scout',
          asset: {
            name: match.name,
            ticker: match.ticker,
            marketCap: match.marketCap,
            rewardMechanic: match.rewardMechanic,
            confidence: match.confidence,
            addedAt: match.addedAt,
            entryPriceUsd: match.entryPriceUsd,
            currentPriceUsd: match.currentPriceUsd,
            pnlPct: match.pnlPct,
            priceUpdatedAt: match.priceUpdatedAt,
            tokenAddress: match.tokenAddress,
            dexUrl: match.dexUrl
          }
        }, { tool: 'get_asset', query: ticker, ...params });
      }
    }
    
    // Search strategy
    if (strategy.instruments) {
      const match = strategy.instruments.find(inst => inst.ticker?.toUpperCase() === tickerUpper);
      if (match) {
        return createEnvelope({
          found: true,
          source: 'strategy',
          asset: {
            ticker: match.ticker,
            name: match.name,
            type: match.type,
            category: match.category,
            description: match.description,
            currentPriceUsd: match.currentPriceUsd,
            entryPriceUsd: match.entryPriceUsd,
            pnlPct: match.pnlPct,
            priceSource: match.priceSource,
            priceUpdatedAt: match.priceUpdatedAt,
            addedAt: match.addedAt,
            dexUrl: match.dexUrl,
            infoUrl: match.infoUrl,
            tokenAddress: match.tokenAddress
          }
        }, { tool: 'get_asset', query: ticker, ...params });
      }
    }
    
    return createEnvelope({ error: { code: 'NOT_FOUND', message: `Ticker ${ticker} not found in scout or strategy data` } }, {
      tool: 'get_asset',
      skipDelight: true
    });
  },

  get_overview: async (params) => {
    const { scout, strategy } = await fetchData();
    
    const scoutCount = scout.tokens?.length || 0;
    const strategyCount = strategy.instruments?.length || 0;
    
    const scoutWithPnL = scout.tokens?.filter(t => t.entryPriceUsd > 0).length || 0;
    const strategyWithPnL = strategy.instruments?.filter(inst => inst.entryPriceUsd > 0).length || 0;
    
    const avgConfidence = scout.tokens?.length 
      ? Math.round(scout.tokens.reduce((sum, t) => sum + (t.confidence || 0), 0) / scout.tokens.length)
      : 0;
    
    return createEnvelope({
      scout: {
        total: scoutCount,
        withPnL: scoutWithPnL,
        avgConfidence
      },
      strategy: {
        total: strategyCount,
        withPnL: strategyWithPnL
      },
      combined: {
        total: scoutCount + strategyCount,
        withPnL: scoutWithPnL + strategyWithPnL
      }
    }, { tool: 'get_overview', ...params });
  }
};

// MCP JSON-RPC handlers
async function handleToolsList() {
  return {
    tools: [
      {
        name: 'describe_site',
        description: 'What Solana Alpha is, sections, primary jobs. Relay data first, in your own voice. If delight.line is present, add it as a brief aside after the facts. Do not let it replace or alter facts.',
        inputSchema: {
          type: 'object',
          properties: {
            serious: { type: 'boolean', description: 'Set true to skip delight beat' }
          }
        }
      },
      {
        name: 'describe_page',
        description: 'Current page title/purpose/canonical URL. Relay data first, in your own voice. If delight.line is present, add it as a brief aside after the facts. Do not let it replace or alter facts.',
        inputSchema: {
          type: 'object',
          properties: {
            serious: { type: 'boolean', description: 'Set true to skip delight beat' }
          }
        }
      },
      {
        name: 'list_scout_assets',
        description: 'List curated hold-to-earn scout tokens on Solana. Relay data first, in your own voice. If delight.line is present, add it as a brief aside after the facts. Do not let it replace or alter facts.',
        inputSchema: {
          type: 'object',
          properties: {
            serious: { type: 'boolean', description: 'Set true to skip delight' },
            intent: { type: 'string', description: 'Query intent - use "serious" to skip delight' }
          }
        }
      },
      {
        name: 'list_strategy_stack',
        description: 'List Strategy Inc / Saylor Stack instruments. Relay data first, in your own voice. If delight.line is present, add it as a brief aside after the facts. Do not let it replace or alter facts.',
        inputSchema: {
          type: 'object',
          properties: {
            serious: { type: 'boolean', description: 'Set true to skip delight' },
            intent: { type: 'string', description: 'Query intent - use "serious" to skip delight' }
          }
        }
      },
      {
        name: 'get_asset',
        description: 'Lookup asset by ticker (searches both scout and strategy). Relay data first, in your own voice. If delight.line is present, add it as a brief aside after the facts. Do not let it replace or alter facts.',
        inputSchema: {
          type: 'object',
          properties: {
            ticker: { type: 'string', description: 'Asset ticker symbol (e.g., FLOCK, MSTR, CGPT)' },
            serious: { type: 'boolean', description: 'Set true to skip delight' },
            intent: { type: 'string', description: 'Query intent - use "serious" to skip delight' }
          },
          required: ['ticker']
        }
      },
      {
        name: 'get_overview',
        description: 'Get counts and confidence summary only. Relay data first, in your own voice. If delight.line is present, add it as a brief aside after the facts. Do not let it replace or alter facts.',
        inputSchema: {
          type: 'object',
          properties: {
            serious: { type: 'boolean', description: 'Set true to skip delight' },
            intent: { type: 'string', description: 'Query intent - use "serious" to skip delight' }
          }
        }
      }
    ]
  };
}

async function handleToolsCall(name, args) {
  const tool = tools[name];
  if (!tool) {
    return {
      error: {
        code: 'TOOL_NOT_FOUND',
        message: `Tool ${name} not found`
      }
    };
  }
  
  return await tool(args || {});
}

// Main Worker handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Handle MCP endpoint
    if (url.pathname === '/mcp' && request.method === 'POST') {
      try {
        const body = await request.json();
        
        let result;
        if (body.method === 'tools/list') {
          result = await handleToolsList();
        } else if (body.method === 'tools/call') {
          const { name, arguments: args } = body.params || {};
          result = await handleToolsCall(name, args);
        } else {
          result = {
            error: {
              code: 'METHOD_NOT_FOUND',
              message: `Method ${body.method} not supported`
            }
          };
        }
        
        return new Response(JSON.stringify(result), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({
          error: {
            code: 'INTERNAL_ERROR',
            message: err.message
          }
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }
    
    // Default response
    return new Response(JSON.stringify({
      name: 'Solana Alpha MCP Server',
      version: '1.0.0',
      endpoint: '/mcp',
      method: 'POST',
      supported_methods: ['tools/list', 'tools/call']
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
};
