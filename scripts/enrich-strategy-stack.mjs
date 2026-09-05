#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const STRATEGY_DATA_PATH = path.join(REPO_ROOT, 'data', 'strategy-stack.json');
const DEX_BASE = 'https://api.dexscreener.com';

// Allowlist of verified Solana mints for Strategy instruments
// Only these mints are legitimate - never search DexScreener for Strategy tickers
const VERIFIED_SOLANA_MINTS = new Set([
  'MSTRdWXMeZxdE8osAQy3fA4rvTY5rgummDSMEx6U7Nz', // Backpack MSTR 1:1 redeemable
  'XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ',  // MSTRx xStock tracker
  'Xs78JED6PFZxWc2wCEPspZW9kL3Se5J7L5TChKgsidH'   // STRCx xStock tracker
]);

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
      dexUrl: best?.url,
      imageUrl: best?.info?.imageUrl || best?.baseToken?.info?.imageUrl
    };
  } catch (error) {
    console.error(`Failed to fetch Solana price for ${tokenAddress}:`, error.message);
    return null;
  }
}

// searchSolanaTokenByTicker() REMOVED
// This function was dangerous - ticker ambiguity caused wrong token matches
// Strategy ticker search (STRF, STRC, etc.) matched unrelated Solana tokens
// New policy: Only allowlisted mints accepted (see VERIFIED_SOLANA_MINTS)

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
      // Validate that Solana instruments use verified mints only
      if (!VERIFIED_SOLANA_MINTS.has(instrument.tokenAddress)) {
        console.log(`  ✗ WARNING: Solana instrument has unverified mint: ${instrument.tokenAddress}`);
        console.log(`  → Skipping price fetch for unverified mint`);
      } else {
        console.log(`  → Fetching Solana token price...`);
        priceData = await fetchSolanaTokenPrice(instrument.tokenAddress);
        
        // If we have dexUrl, update it
        if (priceData?.dexUrl && !instrument.dexUrl) {
          instrument.dexUrl = priceData.dexUrl;
          updated = true;
        }
      }
      // Store imageUrl if available
      if (priceData?.imageUrl && !instrument.imageUrl) {
        instrument.imageUrl = priceData.imageUrl;
        updated = true;
      }
    } else if (instrument.category === 'traditional') {
      console.log(`  → Fetching ${instrument.exchange} price...`);
      priceData = await fetchTraditionalStockPrice(instrument.ticker);
      
      // NEVER search DexScreener for traditional Strategy instruments
      // Ticker ambiguity (STRF, STRC, etc.) leads to wrong token matches
      // If an instrument has existing solana fields, validate them against allowlist
      if (instrument.solanaTokenAddress) {
        if (!VERIFIED_SOLANA_MINTS.has(instrument.solanaTokenAddress)) {
          console.log(`  ✗ Removing unverified Solana mint: ${instrument.solanaTokenAddress}`);
          delete instrument.solanaTokenAddress;
          delete instrument.solanaDexUrl;
          updated = true;
        }
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
