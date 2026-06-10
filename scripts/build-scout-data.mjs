#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(REPO_ROOT, 'data', 'scout-findings.json');

const candidateDatabasePaths = [
  process.env.SCOUT_DATABASE_PATH,
  path.join(REPO_ROOT, 'memory', 'scout-findings', 'database.md'),
  path.resolve(REPO_ROOT, '..', 'memory', 'scout-findings', 'database.md')
].filter(Boolean);

const candidateReportDirs = [
  process.env.SCOUT_REPORTS_DIR,
  path.join(REPO_ROOT, 'reports', 'solana-scout'),
  path.resolve(REPO_ROOT, '..', 'reports', 'solana-scout'),
  path.join(REPO_ROOT, 'memory', 'scout-findings'),
  path.resolve(REPO_ROOT, '..', 'memory', 'scout-findings')
].filter(Boolean);

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalizeTicker(raw = '') {
  return raw.trim().replace(/^\$/, '').toUpperCase();
}

function shortMechanic(text = '') {
  return text.replace(/^\s*New:\s*/i, '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

function inferConfidence(status = '') {
  const s = status.toLowerCase();
  if (s.includes('unconfirmed')) return 40;
  if (s.includes('known baseline')) return 55;
  if (s.includes('tracking')) return 62;
  if (s.includes('new:')) return 65;
  return 58;
}

function parseMarkdownTableRows(content) {
  const rows = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;
    if (/^\|\s*-+/.test(trimmed)) continue;
    const cols = trimmed.slice(1, -1).split('|').map((c) => c.trim());
    rows.push(cols);
  }
  return rows;
}

async function resolveDatabasePath() {
  for (const filePath of candidateDatabasePaths) {
    if (await exists(filePath)) return filePath;
  }
  return null;
}

async function resolveLatestReportPath() {
  let latest = null;
  for (const dir of candidateReportDirs) {
    if (!(await exists(dir))) continue;
    const files = await fs.readdir(dir);
    const reports = files
      .filter((name) => name.endsWith('.md'))
      .filter((name) => /report|scout/i.test(name));

    for (const file of reports) {
      const fullPath = path.join(dir, file);
      const stat = await fs.stat(fullPath);
      const mtime = Number(stat.mtimeMs || 0);
      if (!latest || mtime > latest.mtime) {
        latest = { path: fullPath, mtime };
      }
    }
  }
  return latest?.path || null;
}

function parseDatabase(content) {
  const rows = parseMarkdownTableRows(content);
  const out = [];

  for (const cols of rows) {
    if (cols.length < 5) continue;
    const [token, ticker, marketCap, firstSeen, status] = cols;
    if (!token || /^token$/i.test(token)) continue;
    if (!ticker || /^ticker$/i.test(ticker)) continue;

    out.push({
      name: token,
      ticker: normalizeTicker(ticker),
      marketCap: marketCap || 'n/a',
      rewardMechanic: shortMechanic(status || 'Tracked hold-to-earn token'),
      confidence: inferConfidence(status),
      firstSeen: /^\d{4}-\d{2}-\d{2}$/.test(firstSeen) ? firstSeen : null,
      isNew: false
    });
  }

  return out;
}

function parseLatestReport(content) {
  const blocks = content.split(/\n---+\n/g);
  const tokens = [];

  for (const block of blocks) {
    const titleMatch = block.match(/\*\*\d+\.\s*([^(*\n]+?)\s*\(([^)]+)\)\*\*/i);
    if (!titleMatch) continue;

    const name = titleMatch[1].trim();
    const ticker = normalizeTicker(titleMatch[2]);

    const marketCapMatch = block.match(/-\s*\*\*Market Cap:\*\*\s*(.+)/i);
    const confidenceMatch = block.match(/-\s*\*\*Confidence:\*\*\s*(\d{1,3})\s*\/\s*100/i);

    let rewardMechanic = '';
    const rewardStart = block.match(/-\s*\*\*Reward Mechanic:\*\*/i);
    if (rewardStart) {
      const after = block.slice(rewardStart.index + rewardStart[0].length);
      const stopIdx = after.search(/\n-\s*\*\*(Links|Confidence|Description):\*\*/i);
      const chunk = (stopIdx === -1 ? after : after.slice(0, stopIdx))
        .replace(/^[\s\-:•]+/gm, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      rewardMechanic = chunk;
    }

    tokens.push({
      name,
      ticker,
      marketCap: (marketCapMatch?.[1] || 'n/a').trim(),
      rewardMechanic: shortMechanic(rewardMechanic || 'Hold-to-earn mechanic referenced in scout report'),
      confidence: Math.max(0, Math.min(100, Number(confidenceMatch?.[1] || 60))),
      firstSeen: null,
      isNew: true
    });
  }

  return tokens;
}

function mergeTokens(dbTokens, reportTokens) {
  const map = new Map();
  for (const t of dbTokens) {
    map.set(t.ticker, t);
  }

  for (const t of reportTokens) {
    const existing = map.get(t.ticker);
    if (!existing) {
      map.set(t.ticker, t);
      continue;
    }

    map.set(t.ticker, {
      ...existing,
      ...t,
      rewardMechanic: t.rewardMechanic || existing.rewardMechanic,
      marketCap: t.marketCap || existing.marketCap,
      confidence: Number.isFinite(t.confidence) ? t.confidence : existing.confidence,
      isNew: true
    });
  }

  return [...map.values()]
    .filter((t) => t.ticker && t.name)
    .sort((a, b) => {
      if ((b.isNew ? 1 : 0) !== (a.isNew ? 1 : 0)) return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return (b.firstSeen || '').localeCompare(a.firstSeen || '');
    });
}

async function main() {
  const [databasePath, latestReportPath] = await Promise.all([
    resolveDatabasePath(),
    resolveLatestReportPath()
  ]);

  const dbContent = databasePath ? await fs.readFile(databasePath, 'utf8') : '';
  const reportContent = latestReportPath ? await fs.readFile(latestReportPath, 'utf8') : '';

  const dbTokens = dbContent ? parseDatabase(dbContent) : [];
  const reportTokens = reportContent ? parseLatestReport(reportContent) : [];

  if (dbTokens.length === 0 && reportTokens.length === 0) {
    if (await exists(OUTPUT_PATH)) {
      console.log('No scout markdown sources found; keeping existing scout-findings.json');
      return;
    }
  }

  const tokens = mergeTokens(dbTokens, reportTokens).slice(0, 30);
  const latestReportFile = latestReportPath ? path.basename(latestReportPath) : null;

  const output = {
    generatedAt: new Date().toISOString(),
    source: {
      databasePath,
      latestReportPath,
      latestReportFile
    },
    summary: {
      trackedCount: dbTokens.length,
      latestReportCount: reportTokens.length,
      totalDisplayed: tokens.length
    },
    tokens
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2));

  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Scout tokens: ${tokens.length} (new from latest report: ${reportTokens.length})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
