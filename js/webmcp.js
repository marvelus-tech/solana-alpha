/**
 * WebMCP Tool Registration for Solana Alpha
 * Uses shared envelope module for consistent response format
 * Registers 6 read-only tools with document.modelContext or navigator.modelContext
 */

let scoutData = null;
let strategyData = null;

/**
 * Load data files
 */
async function loadData() {
  try {
    const [scoutRes, strategyRes] = await Promise.all([
      fetch('./data/scout-findings.json?ts=' + Date.now(), { cache: 'no-store' }),
      fetch('./data/strategy-stack.json?ts=' + Date.now(), { cache: 'no-store' })
    ]);
    
    if (scoutRes.ok) {
      scoutData = await scoutRes.json();
    }
    
    if (strategyRes.ok) {
      strategyData = await strategyRes.json();
    }
  } catch (err) {
    console.warn('Failed to load data for WebMCP:', err);
  }
}

/**
 * Get modelContext (try document first, then navigator for older implementations)
 */
function getModelContext() {
  if (typeof document !== 'undefined' && document.modelContext) {
    return document.modelContext;
  }
  if (typeof navigator !== 'undefined' && navigator.modelContext) {
    return navigator.modelContext;
  }
  return null;
}

/**
 * Register WebMCP tools
 */
async function registerTools() {
  await loadData();
  
  const modelContext = getModelContext();
  if (!modelContext || !modelContext.registerTool) {
    console.log('WebMCP not available - tools not registered');
    return false;
  }
  
  if (!window.EnvelopeModule) {
    console.error('Envelope module not loaded');
    return false;
  }

  const { wrapWithEnvelope } = window.EnvelopeModule;
  
  try {
    // Tool 1: describe_site
    modelContext.registerTool({
      name: 'describe_site',
      description: 'What Solana Alpha is, sections, primary jobs. Relay data first, in your own voice. If delight.line is present, add it as a brief aside after the facts. Do not let it replace or alter facts.',
      annotations: {
        readOnlyHint: true,
        consequentialHint: false
      },
      inputSchema: {
        type: 'object',
        properties: {
          serious: {
            type: 'boolean',
            description: 'Set true to skip delight beat'
          }
        }
      },
      handler: (input) => {
        const data = {
          name: 'Solana Alpha',
          tagline: 'Tracking reward-generating assets and wealth-building instruments on Solana',
          sections: [
            {
              name: 'Scout Finds',
              description: 'Curated hold-to-earn and reward-generating tokens',
              count: scoutData?.tokens?.length || 0
            },
            {
              name: 'Strategy / Saylor Stack',
              description: 'Strategy Inc (MSTR) common + preferreds + tokenized forms',
              count: strategyData?.instruments?.length || 0
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
        };
        
        return wrapWithEnvelope(data, {
          source: 'webmcp',
          tool: 'describe_site',
          ...input
        });
      }
    });

    // Tool 2: describe_page
    modelContext.registerTool({
      name: 'describe_page',
      description: 'Current page title/purpose/canonical URL. Relay data first, in your own voice. If delight.line is present, add it as a brief aside after the facts. Do not let it replace or alter facts.',
      annotations: {
        readOnlyHint: true,
        consequentialHint: false
      },
      inputSchema: {
        type: 'object',
        properties: {
          serious: {
            type: 'boolean',
            description: 'Set true to skip delight beat'
          }
        }
      },
      handler: (input) => {
        const data = {
          title: document.title || 'Solana Alpha — Live',
          canonical_url: 'https://marvelus-tech.github.io/solana-alpha/',
          purpose: 'Live dashboard showing curated hold-to-earn Solana tokens and Strategy/Saylor Stack instruments with entry/current prices and PnL tracking',
          page_type: 'Single-page dashboard',
          last_updated: scoutData?.enrichedAt || strategyData?.enrichedAt || new Date().toISOString()
        };
        
        return wrapWithEnvelope(data, {
          source: 'webmcp',
          tool: 'describe_page',
          ...input
        });
      }
    });

    // Tool 3: list_scout_assets
    modelContext.registerTool({
      name: 'list_scout_assets',
      description: 'List curated hold-to-earn and reward-generating scout tokens on Solana with exact fields from scout-findings.json. Relay data first, in your own voice. If delight.line is present, add it as a brief aside after the facts. Do not let it replace or alter facts.',
      annotations: {
        readOnlyHint: true,
        consequentialHint: false
      },
      inputSchema: {
        type: 'object',
        properties: {
          serious: {
            type: 'boolean',
            description: 'Set true to skip delight beat'
          },
          intent: {
            type: 'string',
            description: 'Query intent - use "serious" to skip delight'
          }
        }
      },
      handler: (input) => {
        if (!scoutData || !scoutData.tokens) {
          return wrapWithEnvelope({ error: { code: 'NO_DATA', message: 'Scout data not loaded' } }, {
            source: 'webmcp',
            tool: 'list_scout_assets',
            skipDelight: true
          });
        }
        
        const data = {
          tokens: scoutData.tokens.map(t => ({
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
          count: scoutData.tokens.length
        };
        
        return wrapWithEnvelope(data, {
          source: 'webmcp',
          tool: 'list_scout_assets',
          ...input
        });
      }
    });

    // Tool 4: list_strategy_stack
    modelContext.registerTool({
      name: 'list_strategy_stack',
      description: 'List Strategy Inc / Saylor Stack instruments with exact fields from strategy-stack.json. Relay data first, in your own voice. If delight.line is present, add it as a brief aside after the facts. Do not let it replace or alter facts.',
      annotations: {
        readOnlyHint: true,
        consequentialHint: false
      },
      inputSchema: {
        type: 'object',
        properties: {
          serious: {
            type: 'boolean',
            description: 'Set true to skip delight beat'
          },
          intent: {
            type: 'string',
            description: 'Query intent - use "serious" to skip delight'
          }
        }
      },
      handler: (input) => {
        if (!strategyData || !strategyData.instruments) {
          return wrapWithEnvelope({ error: { code: 'NO_DATA', message: 'Strategy data not loaded' } }, {
            source: 'webmcp',
            tool: 'list_strategy_stack',
            skipDelight: true
          });
        }
        
        const data = {
          instruments: strategyData.instruments.map(inst => ({
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
          count: strategyData.instruments.length
        };
        
        return wrapWithEnvelope(data, {
          source: 'webmcp',
          tool: 'list_strategy_stack',
          ...input
        });
      }
    });

    // Tool 5: get_asset
    modelContext.registerTool({
      name: 'get_asset',
      description: 'Lookup asset by ticker (searches both scout and strategy). Returns exact structured item or not-found. Relay data first, in your own voice. If delight.line is present, add it as a brief aside after the facts. Do not let it replace or alter facts.',
      annotations: {
        readOnlyHint: true,
        consequentialHint: false
      },
      inputSchema: {
        type: 'object',
        properties: {
          ticker: {
            type: 'string',
            description: 'Asset ticker symbol (e.g., FLOCK, MSTR, CGPT)'
          },
          serious: {
            type: 'boolean',
            description: 'Set true to skip delight beat'
          },
          intent: {
            type: 'string',
            description: 'Query intent - use "serious" to skip delight'
          }
        },
        required: ['ticker']
      },
      handler: (input) => {
        const ticker = input.ticker?.toUpperCase();
        if (!ticker) {
          return wrapWithEnvelope({ error: { code: 'MISSING_TICKER', message: 'Ticker parameter required' } }, {
            source: 'webmcp',
            tool: 'get_asset',
            skipDelight: true
          });
        }
        
        // Search scout tokens
        if (scoutData?.tokens) {
          const scoutMatch = scoutData.tokens.find(t => 
            t.ticker?.toUpperCase() === ticker
          );
          if (scoutMatch) {
            const data = {
              found: true,
              source: 'scout',
              asset: {
                name: scoutMatch.name,
                ticker: scoutMatch.ticker,
                marketCap: scoutMatch.marketCap,
                rewardMechanic: scoutMatch.rewardMechanic,
                confidence: scoutMatch.confidence,
                addedAt: scoutMatch.addedAt,
                entryPriceUsd: scoutMatch.entryPriceUsd,
                currentPriceUsd: scoutMatch.currentPriceUsd,
                pnlPct: scoutMatch.pnlPct,
                priceUpdatedAt: scoutMatch.priceUpdatedAt,
                tokenAddress: scoutMatch.tokenAddress,
                dexUrl: scoutMatch.dexUrl
              }
            };
            return wrapWithEnvelope(data, {
              source: 'webmcp',
              tool: 'get_asset',
              query: ticker,
              ...input
            });
          }
        }
        
        // Search strategy instruments
        if (strategyData?.instruments) {
          const strategyMatch = strategyData.instruments.find(inst => 
            inst.ticker?.toUpperCase() === ticker
          );
          if (strategyMatch) {
            const data = {
              found: true,
              source: 'strategy',
              asset: {
                ticker: strategyMatch.ticker,
                name: strategyMatch.name,
                type: strategyMatch.type,
                category: strategyMatch.category,
                description: strategyMatch.description,
                currentPriceUsd: strategyMatch.currentPriceUsd,
                entryPriceUsd: strategyMatch.entryPriceUsd,
                pnlPct: strategyMatch.pnlPct,
                priceSource: strategyMatch.priceSource,
                priceUpdatedAt: strategyMatch.priceUpdatedAt,
                addedAt: strategyMatch.addedAt,
                dexUrl: strategyMatch.dexUrl,
                infoUrl: strategyMatch.infoUrl,
                tokenAddress: strategyMatch.tokenAddress
              }
            };
            return wrapWithEnvelope(data, {
              source: 'webmcp',
              tool: 'get_asset',
              query: ticker,
              ...input
            });
          }
        }
        
        return wrapWithEnvelope({ error: { code: 'NOT_FOUND', message: `Ticker ${ticker} not found in scout or strategy data` } }, {
          source: 'webmcp',
          tool: 'get_asset',
          skipDelight: true
        });
      }
    });

    // Tool 6: get_overview
    modelContext.registerTool({
      name: 'get_overview',
      description: 'Get counts and confidence summary only (no invented stats). Returns factual overview. Relay data first, in your own voice. If delight.line is present, add it as a brief aside after the facts. Do not let it replace or alter facts.',
      annotations: {
        readOnlyHint: true,
        consequentialHint: false
      },
      inputSchema: {
        type: 'object',
        properties: {
          serious: {
            type: 'boolean',
            description: 'Set true to skip delight beat'
          },
          intent: {
            type: 'string',
            description: 'Query intent - use "serious" to skip delight'
          }
        }
      },
      handler: (input) => {
        const scoutCount = scoutData?.tokens?.length || 0;
        const strategyCount = strategyData?.instruments?.length || 0;
        
        const scoutWithPnL = scoutData?.tokens?.filter(t => 
          t.entryPriceUsd > 0
        ).length || 0;
        
        const strategyWithPnL = strategyData?.instruments?.filter(inst => 
          inst.entryPriceUsd > 0
        ).length || 0;
        
        const avgConfidence = scoutData?.tokens?.length 
          ? Math.round(
              scoutData.tokens.reduce((sum, t) => sum + (t.confidence || 0), 0) / 
              scoutData.tokens.length
            )
          : 0;
        
        const data = {
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
        };
        
        return wrapWithEnvelope(data, {
          source: 'webmcp',
          tool: 'get_overview',
          ...input
        });
      }
    });
    
    console.log('WebMCP tools registered successfully (6 tools)');
    return true;
    
  } catch (err) {
    console.error('Failed to register WebMCP tools:', err);
    return false;
  }
}

// Auto-register when loaded
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    registerTools();
  });
}
