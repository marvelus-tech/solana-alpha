#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const STRATEGY_DATA_PATH = path.join(REPO_ROOT, 'data', 'strategy-stack.json');
const DEX_BASE = 'https://api.dexscreener.com';

async function fetchJson(url, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'accept': 'application/json',
          'user-agent': 'solana-alpha-strategy-enrichment/1.0'
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function fetchSolanaTokenPrice(tokenAddress) {
  try {
    const url = `${DEX_BASE}/tokens/v1/solana/${tokenAddress}`;
    const pairs = await fetchJson(url);
    
    if (!Array.isArray(pairs) || pairs.length === 0) return null;
    
    // Pick pair with highest liquidity
    const best = pairs.reduce((acc, pair) => {
      const liq = safeNumber(pair?.liquidity?.usd);
      const accLiq = safeNumber(acc?.liquidity?.usd);
      return liq > accLiq ? pair : acc;
    }, pairs[0]);
    
    return {
      priceUsd: safeNumber(best?.priceUsd),
      source: 'DexScreener',
      liquidity: safeNumber(best?.liquidity?.usd),
      pairAddress: best?.pairAddress,
      dexUrl: best?.url
    };
  } catch (error) {
    console.error(`Failed to fetch Solana price for ${tokenAddress}:`, error.message);
    return null;
  }
}

async function searchSolanaTokenByTicker(ticker) {
  try {
    const searchUrl = `${DEX_BASE}/latest/dex/search?q=${encodeURIComponent(ticker)} solana`;
    const result = await fetchJson(searchUrl);
    const solanaPairs = (result?.pairs || []).filter((p) => p?.chainId === 'solana');
    
    if (solanaPairs.length === 0) return null;
    
    // Pick pair with highest liquidity
    const best = solanaPairs.reduce((acc, pair) => {
      const liq = safeNumber(pair?.liquidity?.usd);
      const accLiq = safeNumber(acc?.liquidity?.usd);
      return liq > accLiq ? pair : acc;
    }, solanaPairs[0]);
    
    return {
      priceUsd: safeNumber(best?.priceUsd),
      source: 'DexScreener',
      tokenAddress: best?.baseToken?.address,
      pairAddress: best?.pairAddress,
      dexUrl: best?.url
    };
  } catch (error) {
    console.error(`Failed to search Solana for ${ticker}:`, error.message);
    return null;
  }
}

async function fetchTraditionalStockPrice(ticker) {
  try {
    // Try Yahoo Finance query API (free, no key needed)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
    const data = await fetchJson(url);
    
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (price && price > 0) {
      return {
        priceUsd: price,
        source: 'Yahoo Finance',
        infoUrl: `https://finance.yahoo.com/quote/${ticker}`
      };
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch traditional price for ${ticker}:`, error.message);
    return null;
  }
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

async function enrichStrategyStack() {
  let strategyData;
  try {
    const content = await fs.readFile(STRATEGY_DATA_PATH, 'utf8');
    strategyData = JSON.parse(content);
  } catch (error) {
    console.error('Failed to read strategy-stack.json:', error.message);
    return;
  }
  
  const instruments = strategyData.instruments || [];
  let updated = false;
  
  console.log(`\nEnriching ${instruments.length} Strategy Inc instruments...\n`);
  
  for (const instrument of instruments) {
    const displayName = `${instrument.ticker}${instrument.category === 'solana' ? ' (Solana)' : ''}`;
    console.log(`Processing ${displayName}...`);
    
    // Bootstrap addedAt if missing
    if (!instrument.addedAt) {
      instrument.addedAt = getTodayDate();
      updated = true;
      console.log(`  ✓ Set addedAt: ${instrument.addedAt}`);
    }
    
    let priceData = null;
    
    // Fetch price based on category
    if (instrument.category === 'solana' && instrument.tokenAddress) {
      console.log(`  → Fetching Solana token price...`);
      priceData = await fetchSolanaTokenPrice(instrument.tokenAddress);
      
      // If we have dexUrl, update it
      if (priceData?.dexUrl && !instrument.dexUrl) {
        instrument.dexUrl = priceData.dexUrl;
        updated = true;
      }
    } else if (instrument.category === 'traditional') {
      console.log(`  → Fetching ${instrument.exchange} price...`);
      priceData = await fetchTraditionalStockPrice(instrument.ticker);
      
      // Also try to find Solana representation
      const solanaPrice = await searchSolanaTokenByTicker(instrument.ticker);
      if (solanaPrice && !instrument.solanaTokenAddress) {
        console.log(`  → Found Solana representation: ${solanaPrice.tokenAddress?.slice(0, 8)}...`);
        instrument.solanaTokenAddress = solanaPrice.tokenAddress;
        instrument.solanaDexUrl = solanaPrice.dexUrl;
        updated = true;
      }
      
      // Update infoUrl if we got one
      if (priceData?.infoUrl && !instrument.infoUrl) {
        instrument.infoUrl = priceData.infoUrl;
        updated = true;
      }
    }
    
    if (priceData?.priceUsd > 0) {
      instrument.currentPriceUsd = priceData.priceUsd;
      instrument.priceUpdatedAt = new Date().toISOString();
      instrument.priceSource = priceData.source;
      
      // Bootstrap entry price if missing (immutable after first set)
      if (!instrument.entryPriceUsd || instrument.entryPriceUsd === 0) {
        instrument.entryPriceUsd = priceData.priceUsd;
        updated = true;
        console.log(`  ✓ Set entryPriceUsd: $${priceData.priceUsd.toFixed(4)} (${priceData.source})`);
      }
      
      // Calculate PnL
      if (instrument.entryPriceUsd > 0) {
        instrument.pnlPct = ((instrument.currentPriceUsd - instrument.entryPriceUsd) / instrument.entryPriceUsd) * 100;
        console.log(`  ✓ Current: $${instrument.currentPriceUsd.toFixed(4)} | Entry: $${instrument.entryPriceUsd.toFixed(4)} | PnL: ${instrument.pnlPct > 0 ? '+' : ''}${instrument.pnlPct.toFixed(2)}%`);
      }
      
      updated = true;
    } else {
      console.log(`  ✗ Could not fetch current price`);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  
  if (updated) {
    // Write back with enriched data
    strategyData.instruments = instruments;
    strategyData.enrichedAt = new Date().toISOString();
    await fs.writeFile(STRATEGY_DATA_PATH, JSON.stringify(strategyData, null, 2));
    console.log(`\n✓ Updated ${STRATEGY_DATA_PATH} with enriched price data`);
  } else {
    console.log('\nNo updates needed');
  }
}

enrichStrategyStack().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
