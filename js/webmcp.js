/**
 * WebMCP Tool Registration for Solana Alpha
 * Registers agent-callable tools using document.modelContext or navigator.modelContext
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
  
  try {
    // Tool 1: list_scout_assets
    modelContext.registerTool({
      name: 'list_scout_assets',
      description: 'List curated hold-to-earn and reward-generating scout tokens on Solana',
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
            description: 'Query intent (e.g., "serious" to skip delight)'
          }
        }
      },
      handler: (input) => {
        if (!scoutData || !scoutData.tokens) {
          return { items: [], count: 0 };
        }
        
        const result = {
          items: scoutData.tokens.map(t => ({
            name: t.name,
            ticker: t.ticker,
            marketCap: t.marketCap,
            rewardMechanic: t.rewardMechanic,
            confidence: t.confidence,
            addedAt: t.addedAt,
            entryPriceUsd: t.entryPriceUsd,
            currentPriceUsd: t.currentPriceUsd,
            pnlPct: t.pnlPct,
            tokenAddress: t.tokenAddress,
            links: {
              dexUrl: t.dexUrl
            }
          })),
          count: scoutData.tokens.length
        };
        
        return withDelight(result, input);
      }
    });
    
    // Tool 2: list_strategy_stack
    modelContext.registerTool({
      name: 'list_strategy_stack',
      description: 'List Strategy Inc / Saylor Stack instruments with prices and PnL',
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
            description: 'Query intent (e.g., "serious" to skip delight)'
          }
        }
      },
      handler: (input) => {
        if (!strategyData || !strategyData.instruments) {
          return { items: [], count: 0 };
        }
        
        const result = {
          items: strategyData.instruments.map(inst => ({
            ticker: inst.ticker,
            name: inst.name,
            type: inst.type,
            description: inst.description,
            currentPriceUsd: inst.currentPriceUsd,
            entryPriceUsd: inst.entryPriceUsd,
            pnlPct: inst.pnlPct,
            priceSource: inst.priceSource,
            addedAt: inst.addedAt,
            links: {
              dexUrl: inst.dexUrl,
              infoUrl: inst.infoUrl
            }
          })),
          count: strategyData.instruments.length
        };
        
        return withDelight(result, input);
      }
    });
    
    // Tool 3: get_asset
    modelContext.registerTool({
      name: 'get_asset',
      description: 'Lookup asset by ticker (searches both scout and strategy)',
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
            description: 'Query intent (e.g., "serious" to skip delight)'
          }
        },
        required: ['ticker']
      },
      handler: (input) => {
        const ticker = input.ticker?.toUpperCase();
        if (!ticker) {
          return { error: 'Ticker required' };
        }
        
        // Search scout tokens
        if (scoutData?.tokens) {
          const scoutMatch = scoutData.tokens.find(t => 
            t.ticker?.toUpperCase() === ticker
          );
          if (scoutMatch) {
            const result = {
              found: true,
              source: 'scout',
              item: {
                name: scoutMatch.name,
                ticker: scoutMatch.ticker,
                marketCap: scoutMatch.marketCap,
                rewardMechanic: scoutMatch.rewardMechanic,
                confidence: scoutMatch.confidence,
                addedAt: scoutMatch.addedAt,
                entryPriceUsd: scoutMatch.entryPriceUsd,
                currentPriceUsd: scoutMatch.currentPriceUsd,
                pnlPct: scoutMatch.pnlPct,
                tokenAddress: scoutMatch.tokenAddress,
                links: {
                  dexUrl: scoutMatch.dexUrl
                }
              }
            };
            return withDelight(result, { ...input, query: ticker });
          }
        }
        
        // Search strategy instruments
        if (strategyData?.instruments) {
          const strategyMatch = strategyData.instruments.find(inst => 
            inst.ticker?.toUpperCase() === ticker
          );
          if (strategyMatch) {
            const result = {
              found: true,
              source: 'strategy',
              item: {
                ticker: strategyMatch.ticker,
                name: strategyMatch.name,
                type: strategyMatch.type,
                description: strategyMatch.description,
                currentPriceUsd: strategyMatch.currentPriceUsd,
                entryPriceUsd: strategyMatch.entryPriceUsd,
                pnlPct: strategyMatch.pnlPct,
                priceSource: strategyMatch.priceSource,
                addedAt: strategyMatch.addedAt,
                links: {
                  dexUrl: strategyMatch.dexUrl,
                  infoUrl: strategyMatch.infoUrl
                }
              }
            };
            return withDelight(result, { ...input, query: ticker });
          }
        }
        
        return { found: false, ticker };
      }
    });
    
    // Tool 4: get_overview
    modelContext.registerTool({
      name: 'get_overview',
      description: 'Get counts and confidence summary (no invented stats)',
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
            description: 'Query intent (e.g., "serious" to skip delight)'
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
        
        const result = {
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
        
        return withDelight(result, input);
      }
    });
    
    console.log('WebMCP tools registered successfully');
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
