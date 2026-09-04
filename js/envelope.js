/**
 * Shared Envelope Module
 * Used by both WebMCP (browser) and remote MCP (Cloudflare Worker)
 * 
 * Envelope format:
 * Success: { ok: true, data: {}, meta: {}, delight?: {} }
 * Error: { ok: false, error: {}, meta: {} }
 */

// Track recently used delight lines to avoid repetition
const recentLines = new Set();
const MAX_RECENT = 5;

let delightLines = [];

/**
 * Load delight lines from JSON
 * Browser version - loads from agent/delight-lines.json
 */
async function loadDelightLines() {
  if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
    try {
      const response = await fetch('./agent/delight-lines.json');
      const data = await response.json();
      delightLines = data.lines || [];
    } catch (err) {
      console.warn('Failed to load delight lines:', err);
      delightLines = [];
    }
  }
}

/**
 * Set delight lines (for Worker usage where fetch is different)
 */
function setDelightLines(lines) {
  delightLines = lines || [];
}

/**
 * Pick a random delight line, avoiding recent reuse
 */
function pickDelightLine() {
  if (!delightLines.length) return null;
  
  const available = delightLines.filter(line => !recentLines.has(line.id));
  
  if (available.length === 0) {
    recentLines.clear();
    return delightLines[Math.floor(Math.random() * delightLines.length)];
  }
  
  const chosen = available[Math.floor(Math.random() * available.length)];
  
  recentLines.add(chosen.id);
  if (recentLines.size > MAX_RECENT) {
    const firstId = Array.from(recentLines)[0];
    recentLines.delete(firstId);
  }
  
  return chosen;
}

/**
 * Check if request should skip delight (serious context)
 */
function shouldSkipDelight(options = {}) {
  if (options.serious === true || options.intent === 'serious') {
    return true;
  }
  
  const textToCheck = [
    options.query,
    options.ticker,
    options.context
  ].filter(Boolean).join(' ').toLowerCase();
  
  const seriousKeywords = [
    'return', 'refund', 'defect', 'safety', 'billing', 
    'error', 'problem', 'issue', 'complaint', 'broken'
  ];
  
  return seriousKeywords.some(keyword => textToCheck.includes(keyword));
}

/**
 * Create success envelope
 */
function createSuccessEnvelope(data, options = {}) {
  const {
    source = 'webmcp',
    tool = 'unknown',
    pageUrl = 'https://marvelus-tech.github.io/solana-alpha/',
    skipDelight = false
  } = options;

  const envelope = {
    ok: true,
    data,
    meta: {
      source,
      page_url: pageUrl,
      tool,
      as_of: new Date().toISOString()
    }
  };

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

/**
 * Create error envelope
 */
function createErrorEnvelope(code, message, options = {}) {
  const {
    source = 'webmcp',
    tool = 'unknown',
    pageUrl = 'https://marvelus-tech.github.io/solana-alpha/'
  } = options;

  return {
    ok: false,
    error: {
      code,
      message
    },
    meta: {
      source,
      page_url: pageUrl,
      tool,
      as_of: new Date().toISOString()
    }
  };
}

/**
 * Wrap tool result with envelope
 * Handles both success and error cases
 */
function wrapWithEnvelope(result, options = {}) {
  if (result && result.error) {
    return createErrorEnvelope(
      result.error.code || 'UNKNOWN_ERROR',
      result.error.message || 'An unknown error occurred',
      options
    );
  }
  
  return createSuccessEnvelope(result, options);
}

// Browser export
if (typeof window !== 'undefined') {
  window.EnvelopeModule = {
    loadDelightLines,
    setDelightLines,
    createSuccessEnvelope,
    createErrorEnvelope,
    wrapWithEnvelope
  };
  
  loadDelightLines();
}

// Node.js / Worker export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadDelightLines,
    setDelightLines,
    createSuccessEnvelope,
    createErrorEnvelope,
    wrapWithEnvelope,
    pickDelightLine,
    shouldSkipDelight
  };
}
