/**
 * Agent Delight Payload System
 * Returns structured data with personality beats for AI agents
 */

// Track recently used delight lines to avoid repetition
const recentLines = new Set();
const MAX_RECENT = 3;

let delightLines = [];

/**
 * Load delight lines from JSON
 */
async function loadDelightLines() {
  try {
    const response = await fetch('./agent/delight-lines.json');
    const data = await response.json();
    delightLines = data.lines;
  } catch (err) {
    console.warn('Failed to load delight lines:', err);
    delightLines = [];
  }
}

/**
 * Pick a random delight line, avoiding recent reuse
 */
function pickDelightLine() {
  if (!delightLines.length) return null;
  
  // Filter out recently used lines
  const available = delightLines.filter(line => !recentLines.has(line.id));
  
  // If all used, clear history
  if (available.length === 0) {
    recentLines.clear();
    return delightLines[Math.floor(Math.random() * delightLines.length)];
  }
  
  // Pick random from available
  const chosen = available[Math.floor(Math.random() * available.length)];
  
  // Track usage
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
  
  // Check for serious keywords in any text fields
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
 * Wrap response data with optional delight
 */
function withDelight(data, options = {}) {
  // Skip delight for serious contexts
  if (shouldSkipDelight(options)) {
    return data;
  }
  
  const line = pickDelightLine();
  if (!line) {
    return data;
  }
  
  return {
    ...data,
    delight: {
      line: line.text,
      tone: line.tone,
      emoji: line.emoji
    }
  };
}

// Initialize on load
if (typeof window !== 'undefined') {
  loadDelightLines();
}
