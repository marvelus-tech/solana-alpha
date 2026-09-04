#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SCOUT_DATA_PATH = path.join(REPO_ROOT, 'data', 'scout-findings.json');
const DEX_BASE = 'https://api.dexscreener.com';

async function fetchJson(url, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'accept': 'application/json',
          'user-agent': 'solana-alpha-scout-enrichment/1.0'
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

async function searchTokenByTicker(ticker) {
  try {
    const searchUrl = `${DEX_BASE}/latest/dex/search?q=${encodeURIComponent(ticker)}`;
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
      tokenAddress: best?.baseToken?.address,
      pairAddress: best?.pairAddress,
      dexUrl: best?.url,
      priceUsd: safeNumber(best?.priceUsd),
      liquidity: safeNumber(best?.liquidity?.usd)
    };
  } catch (error) {
    console.error(`Failed to search ticker ${ticker}:`, error.message);
    return null;
  }
}

async function fetchTokenPrice(tokenAddress) {
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
      liquidity: safeNumber(best?.liquidity?.usd),
      pairAddress: best?.pairAddress,
      dexUrl: best?.url
    };
  } catch (error) {
    console.error(`Failed to fetch price for ${tokenAddress}:`, error.message);
    return null;
  }
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

async function enrichScoutTokens() {
  let scoutData;
  try {
    const content = await fs.readFile(SCOUT_DATA_PATH, 'utf8');
    scoutData = JSON.parse(content);
  } catch (error) {
    console.error('Failed to read scout-findings.json:', error.message);
    return;
  }
  
  const tokens = scoutData.tokens || [];
  let updated = false;
  
  for (const token of tokens) {
    console.log(`Processing ${token.ticker}...`);
    
    // Bootstrap addedAt if missing
    if (!token.addedAt) {
      token.addedAt = token.firstSeen || getTodayDate();
      updated = true;
      console.log(`  ✓ Set addedAt: ${token.addedAt}`);
    }
    
    // Resolve token address if missing
    if (!token.tokenAddress && token.ticker) {
      console.log(`  → Searching for ${token.ticker} on DexScreener...`);
      const searchResult = await searchTokenByTicker(token.ticker);
      if (searchResult?.tokenAddress) {
        token.tokenAddress = searchResult.tokenAddress;
        token.pairAddress = searchResult.pairAddress;
        token.dexUrl = searchResult.dexUrl;
        updated = true;
        console.log(`  ✓ Found tokenAddress: ${token.tokenAddress.slice(0, 8)}...`);
      } else {
        console.log(`  ✗ Could not find token address`);
      }
    }
    
    // Fetch current price
    if (token.tokenAddress) {
      const priceData = await fetchTokenPrice(token.tokenAddress);
      
      if (priceData?.priceUsd > 0) {
        token.currentPriceUsd = priceData.priceUsd;
        token.priceUpdatedAt = new Date().toISOString();
        
        // Update pair/dex info if we got better data
        if (priceData.pairAddress && !token.pairAddress) {
          token.pairAddress = priceData.pairAddress;
        }
        if (priceData.dexUrl && !token.dexUrl) {
          token.dexUrl = priceData.dexUrl;
        }
        
        // Bootstrap entry price if missing (immutable after first set)
        if (!token.entryPriceUsd || token.entryPriceUsd === 0) {
          token.entryPriceUsd = priceData.priceUsd;
          updated = true;
          console.log(`  ✓ Set entryPriceUsd: $${priceData.priceUsd.toFixed(8)}`);
        }
        
        // Calculate PnL
        if (token.entryPriceUsd > 0) {
          token.pnlPct = ((token.currentPriceUsd - token.entryPriceUsd) / token.entryPriceUsd) * 100;
          console.log(`  ✓ Current: $${token.currentPriceUsd.toFixed(8)} | Entry: $${token.entryPriceUsd.toFixed(8)} | PnL: ${token.pnlPct > 0 ? '+' : ''}${token.pnlPct.toFixed(2)}%`);
        }
        
        updated = true;
      } else {
        console.log(`  ✗ Could not fetch current price`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  if (updated) {
    // Write back with enriched data
    scoutData.tokens = tokens;
    scoutData.enrichedAt = new Date().toISOString();
    await fs.writeFile(SCOUT_DATA_PATH, JSON.stringify(scoutData, null, 2));
    console.log(`\n✓ Updated ${SCOUT_DATA_PATH} with enriched price data`);
  } else {
    console.log('\nNo updates needed');
  }
}

enrichScoutTokens().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
