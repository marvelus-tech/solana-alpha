#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(REPO_ROOT, 'data', 'live-data.json');

const DEX_BASE = 'https://api.dexscreener.com';
const MIN_LIQUIDITY_USD = 50_000;
const MIN_VOLUME_USD = 25_000;
const MAX_MARKET_CAP_USD = 1_000_000_000;
const MAX_ABS_24H_CHANGE_PCT = 500;

async function mkdirp(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function fetchJson(url, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'accept': 'application/json',
          'user-agent': 'solana-alpha-live-data/1.0'
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

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) {
    out.push(array.slice(i, i + size));
  }
  return out;
}

async function readScoutSummary() {
  const candidateDirs = [
    process.env.SCOUT_FINDINGS_DIR,
    path.join(REPO_ROOT, 'memory', 'scout-findings'),
    path.resolve(REPO_ROOT, '..', 'memory', 'scout-findings')
  ].filter(Boolean);

  for (const dir of candidateDirs) {
    try {
      const files = (await fs.readdir(dir)).filter((name) => name.endsWith('.md'));

      if (files.length === 0) continue;

      const dbPath = path.join(dir, 'database.md');
      let trackedTokens = 0;
      try {
        const dbContent = await fs.readFile(dbPath, 'utf8');
        trackedTokens = (dbContent.match(/^\|\s*[^|]+\|\s*[^|]+\|\s*[^|]+\|\s*\d{4}-\d{2}-\d{2}\s*\|/gm) || []).length;
      } catch {
        trackedTokens = 0;
      }

      const reportCandidates = files.filter((f) => /scout|report/i.test(f));
      const selected = reportCandidates.length ? reportCandidates : files;

      let latestReportFile = selected[0];
      let latestMtime = 0;
      for (const file of selected) {
        const stat = await fs.stat(path.join(dir, file));
        const mtime = Number(stat.mtimeMs || 0);
        if (mtime >= latestMtime) {
          latestMtime = mtime;
          latestReportFile = file;
        }
      }

      const latestReportPath = path.join(dir, latestReportFile);
      const latestContent = await fs.readFile(latestReportPath, 'utf8');

      const lines = latestContent.split('\n');
      const tickers = [];
      for (const line of lines) {
        const match = line.match(/^\|\s*([^|]+)\|\s*([^|]+)\|\s*✅|^\|\s*([^|]+)\|\s*([^|]+)\|\s*~?\$/);
        if (!match) continue;
        const maybeTicker = (match[2] || match[4] || '').trim();
        if (maybeTicker && maybeTicker.length <= 12 && /^[\$A-Za-z0-9._-]+$/.test(maybeTicker)) {
          tickers.push(maybeTicker.replace(/^\$/, ''));
        }
      }

      return {
        sourceDir: dir,
        latestReportFile,
        trackedTokens,
        sampleTickers: [...new Set(tickers)].slice(0, 12)
      };
    } catch {
      // Try next directory
    }
  }

  return {
    sourceDir: null,
    latestReportFile: null,
    trackedTokens: 0,
    sampleTickers: []
  };
}

function selectBestPairByToken(pairs) {
  const byToken = new Map();
  for (const pair of pairs) {
    const base = pair?.baseToken;
    if (!base?.address) continue;
    const existing = byToken.get(base.address);
    const currentLiquidity = safeNumber(pair?.liquidity?.usd);
    const existingLiquidity = safeNumber(existing?.liquidity?.usd);
    if (!existing || currentLiquidity > existingLiquidity) {
      byToken.set(base.address, pair);
    }
  }
  return [...byToken.values()];
}

function normalizePair(pair) {
  const priceChange24h = safeNumber(pair?.priceChange?.h24);
  const volume24h = safeNumber(pair?.volume?.h24);
  const liquidityUsd = safeNumber(pair?.liquidity?.usd);
  const marketCap = safeNumber(pair?.marketCap || pair?.fdv);

  return {
    tokenAddress: pair?.baseToken?.address || null,
    symbol: pair?.baseToken?.symbol || 'N/A',
    name: pair?.baseToken?.name || 'Unknown Token',
    pairAddress: pair?.pairAddress || null,
    dexId: pair?.dexId || null,
    url: pair?.url || null,
    imageUrl: pair?.info?.imageUrl || null,
    website: pair?.info?.websites?.[0]?.url || null,
    labels: pair?.labels || [],
    priceUsd: safeNumber(pair?.priceUsd),
    marketCap,
    fdv: safeNumber(pair?.fdv),
    liquidityUsd,
    volume24h,
    buys24h: safeNumber(pair?.txns?.h24?.buys),
    sells24h: safeNumber(pair?.txns?.h24?.sells),
    priceChange24h,
    priceChange6h: safeNumber(pair?.priceChange?.h6),
    pairCreatedAt: safeNumber(pair?.pairCreatedAt),
    chainId: pair?.chainId || 'solana'
  };
}

function isInvestableToken(p) {
  return (
    p.liquidityUsd >= MIN_LIQUIDITY_USD &&
    p.volume24h >= MIN_VOLUME_USD &&
    p.marketCap > 0 &&
    p.marketCap <= MAX_MARKET_CAP_USD &&
    Math.abs(p.priceChange24h) <= MAX_ABS_24H_CHANGE_PCT
  );
}

function isReasonableNewListing(p) {
  return (
    p.pairCreatedAt > 0 &&
    p.marketCap > 0 &&
    p.marketCap <= MAX_MARKET_CAP_USD &&
    p.liquidityUsd >= 10_000 &&
    p.volume24h >= 5_000
  );
}

async function main() {
  const [profiles, boostsTop, boostsLatest] = await Promise.all([
    fetchJson(`${DEX_BASE}/token-profiles/latest/v1`),
    fetchJson(`${DEX_BASE}/token-boosts/top/v1`).catch(() => []),
    fetchJson(`${DEX_BASE}/token-boosts/latest/v1`).catch(() => [])
  ]);

  const solProfiles = Array.isArray(profiles) ? profiles.filter((p) => p.chainId === 'solana') : [];
  const boosted = [...(Array.isArray(boostsTop) ? boostsTop : []), ...(Array.isArray(boostsLatest) ? boostsLatest : [])]
    .filter((b) => b.chainId === 'solana');

  const tokenAddressSet = new Set();
  for (const p of solProfiles.slice(0, 150)) {
    if (p?.tokenAddress) tokenAddressSet.add(p.tokenAddress);
  }
  for (const b of boosted.slice(0, 100)) {
    if (b?.tokenAddress) tokenAddressSet.add(b.tokenAddress);
  }

  const tokenAddresses = [...tokenAddressSet];
  if (tokenAddresses.length === 0) {
    throw new Error('No Solana token addresses returned by DexScreener.');
  }

  const pairResponses = await Promise.all(
    chunk(tokenAddresses, 30).map((tokenChunk) =>
      fetchJson(`${DEX_BASE}/tokens/v1/solana/${tokenChunk.join(',')}`).catch(() => [])
    )
  );

  const allPairs = pairResponses.flat().filter((p) => p?.chainId === 'solana');
  const bestPairs = selectBestPairByToken(allPairs).map(normalizePair);

  const investable = bestPairs.filter(isInvestableToken);

  const topGainers = [...investable]
    .filter((p) => p.priceChange24h > 0)
    .sort((a, b) => b.priceChange24h - a.priceChange24h)
    .slice(0, 12);

  const now = Date.now();
  const seventyTwoHoursAgo = now - 72 * 60 * 60 * 1000;
  const newListings = [...bestPairs]
    .filter((p) => p.pairCreatedAt && p.pairCreatedAt >= seventyTwoHoursAgo)
    .filter(isReasonableNewListing)
    .sort((a, b) => b.pairCreatedAt - a.pairCreatedAt)
    .slice(0, 12);

  const boostScore = new Map();
  for (const b of boosted) {
    if (!b.tokenAddress) continue;
    const score = safeNumber(b.totalAmount || b.amount) + safeNumber(b.amount);
    boostScore.set(b.tokenAddress, Math.max(score, boostScore.get(b.tokenAddress) || 0));
  }

  const trending = [...investable]
    .filter((p) => boostScore.has(p.tokenAddress) || p.volume24h > 250_000)
    .map((p) => ({ ...p, trendScore: boostScore.get(p.tokenAddress) || 0 }))
    .sort((a, b) => (b.trendScore - a.trendScore) || (b.volume24h - a.volume24h))
    .slice(0, 12);

  const scoutSummary = await readScoutSummary();

  const marketOverview = {
    tokenUniverse: bestPairs.length,
    investableUniverse: investable.length,
    total24hVolumeUsd: investable.reduce((sum, t) => sum + t.volume24h, 0),
    totalLiquidityUsd: investable.reduce((sum, t) => sum + t.liquidityUsd, 0),
    avg24hChangePct: investable.length ? (investable.reduce((sum, t) => sum + t.priceChange24h, 0) / investable.length) : 0,
    gainersCount: investable.filter((t) => t.priceChange24h > 0).length,
    losersCount: investable.filter((t) => t.priceChange24h < 0).length
  };

  const output = {
    generatedAt: new Date().toISOString(),
    source: {
      dexscreener: 'token-profiles/latest/v1 + token-boosts + tokens/v1',
      scoutFindings: scoutSummary.sourceDir ? {
        sourceDir: scoutSummary.sourceDir,
        latestReportFile: scoutSummary.latestReportFile,
        trackedTokens: scoutSummary.trackedTokens,
        sampleTickers: scoutSummary.sampleTickers
      } : null
    },
    marketOverview,
    topGainers,
    newListings,
    trending
  };

  await mkdirp(OUTPUT_PATH);
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2));

  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Universe: ${bestPairs.length} tokens | Gainers: ${topGainers.length} | New listings: ${newListings.length} | Trending: ${trending.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
