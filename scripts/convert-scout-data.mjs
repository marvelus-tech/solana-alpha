#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const candidateInputPaths = [
  path.join(REPO_ROOT, 'memory', 'scout-findings', 'database.md'),
  path.resolve(REPO_ROOT, '..', 'memory', 'scout-findings', 'database.md')
];

const OUTPUT_PATH = path.join(REPO_ROOT, 'data', 'scout-findings.json');

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveInputPath() {
  for (const p of candidateInputPaths) {
    if (await exists(p)) return p;
  }
  throw new Error(`database.md not found. Checked:\n- ${candidateInputPaths.join('\n- ')}`);
}

function normalizeTicker(value = '') {
  return value.trim().replace(/^\$/, '').toUpperCase();
}

function parseConfidence(status = '') {
  const s = status.toLowerCase();
  if (s.includes('unconfirmed')) return 40;
  if (s.includes('known baseline')) return 55;
  if (s.includes('tracking')) return 62;
  if (s.includes('new:')) return 75;
  return 60;
}

function normalizeRewardMechanic(status = '') {
  const cleaned = status
    .replace(/^\s*new\s*:\s*/i, '')
    .replace(/^\s*tracking\s*$/i, 'Tracked reward mechanic')
    .replace(/^\s*known baseline\s*$/i, 'Known baseline token')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || 'Reward mechanic not specified';
}

function parseDate(text = '') {
  return /^\d{4}-\d{2}-\d{2}$/.test(text.trim()) ? text.trim() : null;
}

function isNewFromDate(firstSeen) {
  if (!firstSeen) return false;
  const seen = new Date(`${firstSeen}T00:00:00Z`).getTime();
  const now = Date.now();
  const days = (now - seen) / (24 * 60 * 60 * 1000);
  return Number.isFinite(days) && days >= 0 && days <= 3;
}

function parseRows(markdown) {
  const lines = markdown.split('\n');
  const rows = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;
    if (/^\|\s*-+/.test(trimmed)) continue;

    const cols = trimmed
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim());

    if (cols.length < 5) continue;

    const [name, tickerRaw, marketCap, firstSeenRaw, status] = cols;
    if (/^token$/i.test(name) || /^ticker$/i.test(tickerRaw)) continue;

    const ticker = normalizeTicker(tickerRaw);
    const firstSeen = parseDate(firstSeenRaw);
    if (!name || !ticker) continue;

    rows.push({
      name,
      ticker,
      marketCap: marketCap || 'n/a',
      rewardMechanic: normalizeRewardMechanic(status),
      confidence: parseConfidence(status),
      firstSeen,
      isNew: isNewFromDate(firstSeen)
    });
  }

  return rows;
}

function dedupeTokens(tokens) {
  const byTicker = new Map();

  for (const token of tokens) {
    const existing = byTicker.get(token.ticker);
    if (!existing) {
      byTicker.set(token.ticker, token);
      continue;
    }

    const existingDate = existing.firstSeen || '';
    const tokenDate = token.firstSeen || '';

    if (tokenDate > existingDate) {
      byTicker.set(token.ticker, token);
    }
  }

  return [...byTicker.values()].sort((a, b) => {
    if ((b.firstSeen || '') !== (a.firstSeen || '')) {
      return (b.firstSeen || '').localeCompare(a.firstSeen || '');
    }
    return b.confidence - a.confidence;
  });
}

async function main() {
  const inputPath = await resolveInputPath();
  const markdown = await fs.readFile(inputPath, 'utf8');

  const tokens = dedupeTokens(parseRows(markdown));
  const output = { tokens };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n');

  console.log(`Converted ${tokens.length} scout rows from ${inputPath}`);
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
