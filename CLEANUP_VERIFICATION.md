# Strategy Stack Data Cleanup Verification

## Date: 2026-09-05

## Problem Identified

Traditional NASDAQ Strategy Inc securities were assigned fake Solana mints that resolved to completely different tokens:

### Before Cleanup (WRONG):
```
MSTR (traditional equity)   → 7MsJCvDi5t5U... (NEVERZERO token) ❌
STRF (preferred)            → 7MsJCvDi5t5U... (NEVERZERO token) ❌
STRC (preferred)            → 7MsJCvDi5t5U... (NEVERZERO token) ❌
STRK (preferred)            → 7MsJCvDi5t5U... (NEVERZERO token) ❌
STRD (preferred)            → 7MsJCvDi5t5U... (NEVERZERO token) ❌
STRE (preferred)            → PLAYs3GS...     (Play Solana token) ❌

Backpack MSTR (1:1)         → MSTRdWXM...     (correct) ✅
MSTRx (xStock)              → XsP7xzNP...     (correct) ✅
STRCx (xStock)              → Xs78JED6...     (correct) ✅
```

## After Cleanup (CORRECT):
```
MSTR (traditional equity)   → NO MINT (Yahoo Finance only) ✅
STRF (preferred)            → NO MINT (Yahoo Finance only) ✅
STRC (preferred)            → NO MINT (Yahoo Finance only) ✅
STRK (preferred)            → NO MINT (Yahoo Finance only) ✅
STRD (preferred)            → NO MINT (Yahoo Finance only) ✅
STRE (preferred)            → NO MINT (Yahoo Finance only) ✅

Backpack MSTR (1:1)         → MSTRdWXMeZxdE8osAQy3fA4rvTY5rgummDSMEx6U7Nz ✅
MSTRx (xStock)              → XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ ✅
STRCx (xStock)              → Xs78JED6PFZxWc2wCEPspZW9kL3Se5J7L5TChKgsidH ✅
```

## Verified Solana Mints (Allowlist)

Only these 3 mints are legitimate Strategy-related Solana tokens:

1. **MSTRdWXMeZxdE8osAQy3fA4rvTY5rgummDSMEx6U7Nz**  
   Backpack Securities 1:1 redeemable tokenized MSTR equity

2. **XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ**  
   MSTRx - xStock cash-settled synthetic tracker

3. **Xs78JED6PFZxWc2wCEPspZW9kL3Se5J7L5TChKgsidH**  
   STRCx - Stretch Preferred xStock cash-settled tracker

## Changes Made

### 1. Data File (`data/strategy-stack.json`)
- Removed `solanaTokenAddress` from traditional MSTR equity
- Removed `solanaDexUrl` from traditional MSTR equity
- Removed both fields from STRF, STRC, STRK, STRD, STRE
- Kept verified mints on Backpack MSTR, MSTRx, STRCx

### 2. Enrich Script (`scripts/enrich-strategy-stack.mjs`)
- Added `VERIFIED_SOLANA_MINTS` constant with 3 allowlisted addresses
- Removed dangerous `searchSolanaTokenByTicker()` for traditional instruments
- Added validation: rejects unverified mints on traditional instruments
- Added warnings for unverified mints on Solana instruments

### 3. Safeguards Added
- Enrich script will now **actively remove** any unverified mints found
- Ticker-based DexScreener search **disabled** for traditional instruments
- Only allowlisted mints accepted for Solana category instruments

## Testing Results

```bash
# Enrich script test
$ node scripts/enrich-strategy-stack.mjs
✅ All instruments fetched prices successfully
✅ No fake mints added back
✅ Traditional instruments tracked via Yahoo Finance only
✅ Solana instruments tracked via DexScreener with verified mints

# Data validation
$ grep -r "7MsJCvDi5t5U\|PLAYs3G" data/
✅ No matches (fake mints removed)

# Mint verification
$ cat data/strategy-stack.json | jq '.instruments[] | select(.tokenAddress or .solanaTokenAddress)'
✅ Only 3 instruments have mints (all verified)
```

## Impact

### Before (Data Integrity Issue):
- Users could see wrong contract addresses for Strategy preferreds
- DexScreener links pointed to unrelated tokens (NEVERZERO, Play Solana)
- Contract copy functionality (if added) would give wrong addresses
- Agent tools would return incorrect Solana data for traditional securities

### After (Fixed):
- Traditional securities tracked via Yahoo Finance only (no fake contracts)
- Solana instruments use verified mints exclusively
- Links fallback gracefully to Yahoo Finance for traditional instruments
- Agent tools return accurate data with proper category labels

## Future Prevention

The allowlist approach prevents this issue from recurring:
1. No ticker-based search for ambiguous symbols
2. New Strategy Solana instruments must be manually added to allowlist
3. Enrich script validates and removes unverified mints automatically
4. Clear separation between traditional (NASDAQ) and Solana (on-chain) instruments

## Pull Request

- Branch: `cursor/fix-strategy-fake-mints-6b58`
- PR: https://github.com/marvelus-tech/solana-alpha/pull/7
- Status: Ready for review

---

**Verification Date**: 2026-09-05  
**Verified By**: Cloud Agent (Claude Sonnet 4.5)  
**Commit**: 76b68c2
