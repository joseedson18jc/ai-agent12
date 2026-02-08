# Test Coverage Analysis

## Current State

**Test coverage: 0%.** The project has no test framework installed, no test files, no test scripts, and no CI/CD pipeline. This is a critical gap for a financial application that processes monetary data, performs accounting calculations, and integrates with external AI services.

---

## Codebase Summary

| Layer | Files | Key Modules |
|-------|-------|-------------|
| Utility functions | 2 | `finance.ts`, `contaAzulAutoMapper.ts` |
| Custom hooks | 11 | Data validation, financial goals, anomalies, metrics, import history, mapping templates |
| React components | 20 (dashboard) + 73 (UI library) | CSV preview, analytics, mapping, forecasting, PDF export |
| Supabase edge functions | 5 | CSV parsing, anomaly detection, auto-fill, category mapping, financial insights |
| Database migrations | 2 | financial_metrics, financial_anomalies, financial_goals, push_subscriptions |

---

## Priority 1: Pure Utility Functions (Highest ROI)

These are stateless, pure functions with no dependencies on React or external services. They are the easiest to test and carry the highest risk because they handle financial calculations.

### 1.1 `src/utils/finance.ts` - Financial Calculations

**Risk: Critical.** Incorrect calculations directly corrupt financial reports (DRE).

| Function | What to Test | Why |
|----------|-------------|-----|
| `parseDecimal()` | Brazilian number formats (`"1.234,56"` -> `1234.56`), negative values, edge cases (`""`, `"-"`, `"0"`) | Parsing errors silently produce wrong monetary values |
| `parseContaAzulCsv()` | Delimiter detection (`;`, `\t`, `,`), quoted values with embedded delimiters, column name matching (accent-insensitive), DD/MM/YYYY date parsing, type detection (`"Crédito"` vs `"Débito"`), error messages for missing columns | This is the data ingestion entry point; malformed parsing corrupts all downstream analysis |
| `computeDreKpis()` | Revenue/deduction/COGS/OpEx sign handling, margin calculations, zero-revenue edge case, entries with missing `bpSection` | DRE is the core financial report; every line item flows through this function |
| `computeDreByMonth()` | Monthly bucketing by date, invalid dates, entries without `bpSection` | Incorrect bucketing causes entries to appear in wrong months |
| `formatCurrency()` | Brazilian Real formatting, negative values, zero | Display errors in financial data are misleading |
| `formatPercent()` | Sign prefix (`+`/`-`), decimal precision | Margin percentages shown to users |

**Recommended test count: ~40-50 test cases.**

### 1.2 `src/utils/contaAzulAutoMapper.ts` - Category Auto-Mapping

**Risk: High.** Incorrect mapping assigns revenue to expenses (or vice versa), corrupting the DRE.

| Function | What to Test | Why |
|----------|-------------|-----|
| `autoMapContaAzulCategory()` | Each keyword -> section mapping, accent-insensitive matching, priority ordering (e.g., `"ICMS"` matches `deductions` not `other`), short category names, unrecognized categories returning `null` | Automatic classification drives the entire DRE structure |
| `autoMapContaAzulCategories()` | Batch mapping, partial match rates, empty input | Bulk operation used during import |
| `getMappingConfidence()` | Confidence thresholds (high/medium/low/none) per rule priority | Users rely on confidence indicators to review mappings |

**Recommended test count: ~30-40 test cases.**

---

## Priority 2: Business Logic in Hooks (High ROI)

These hooks contain stateful business logic. The logic itself can be extracted and tested independently, or tested with a lightweight React hook testing setup (`@testing-library/react-hooks`).

### 2.1 `src/hooks/useDataValidation.ts` - Data Validation Engine

**Risk: High.** Validation gates whether users proceed with corrupted data.

| Logic Area | What to Test |
|------------|-------------|
| Field validation | Missing category, empty date, invalid date format, null/NaN amount |
| Suspicious value detection | Amounts > 10M threshold, zero amounts |
| Duplicate detection | Same date+category+amount flagged, unique entries not flagged |
| Statistical anomaly detection | Z-score > 3 flagged, normal values not flagged, edge case with single entry (stdDev = 0 causes division by zero) |
| Date range validation | Period > 365 days triggers warning |
| Result classification | `isValid` is `false` only when critical errors exist |

**Specific bug to test:** When entries has length 1, `stdDev` is 0, causing `zScore` to be `Infinity` or `NaN` on line 146. This should be caught by a test.

**Recommended test count: ~25-30 test cases.**

### 2.2 `src/hooks/useFinancialGoals.ts` - Goal Progress Calculation

**Risk: Medium.** Incorrect progress reporting misleads users about their financial health.

| Logic Area | What to Test |
|------------|-------------|
| `calculateProgress()` | Status determination: `exceeded` (>=100%), `at_risk` (>= threshold), `on_track` (>=50%), `behind` (<50%) |
| | `percentAchieved` capped at 150% |
| | `target_value = 0` edge case (division by zero) |
| `formatGoalValue()` | Percentage metrics formatted with `%`, currency metrics formatted as BRL |
| CRUD operations | Create sets correct defaults, update preserves other fields, delete removes correctly |

**Recommended test count: ~15-20 test cases.**

### 2.3 `src/hooks/useImportHistory.ts` - Import History & Fuzzy Matching

**Risk: Medium.** Fuzzy matching determines whether saved mappings are reused.

| Logic Area | What to Test |
|------------|-------------|
| `saveToHistory()` | New entries added, duplicate headers update existing entry, mappings merged correctly, MAX_HISTORY (10) limit enforced |
| `findSimilarImport()` | Exact header match found, 70% fuzzy match threshold, case-insensitive comparison, no match returns null |
| `updateMappings()` | Merges new mappings with existing ones |

**Side-effect bug to test:** `saveToHistory` calls `.sort()` on `entry.columnHeaders` (line 39), which **mutates the original array**. This should be caught and fixed.

**Recommended test count: ~15-20 test cases.**

### 2.4 `src/hooks/useRealtimeMetrics.ts` - KPI Calculation

| Logic Area | What to Test |
|------------|-------------|
| `calculateKpis()` | Filters by current month, maps metric types correctly, missing metrics default to 0 |
| `saveMetrics()` | Upsert behavior (update existing, insert new) |

**Recommended test count: ~10 test cases.**

---

## Priority 3: Supabase Edge Functions (Medium ROI)

These are serverless functions that call external AI APIs. Testing should focus on input validation, error handling, and response parsing - not the AI output itself.

### 3.1 All Edge Functions - Common Patterns

| Function | What to Test |
|----------|-------------|
| `parse-csv/index.ts` | Rejects missing `csvContent`, handles 429/402 status codes, strips markdown code blocks from AI response |
| `detect-anomalies/index.ts` | Parses valid JSON from AI response, handles malformed AI responses gracefully, saves anomalies to database, returns empty array when no anomalies |
| `auto-map-categories/index.ts` | Rejects empty categories array, validates returned sections against allowed values (falls back to `'other'`), strips markdown code blocks |
| `auto-fill-entries/index.ts` | `parseAIResponse()` handles markdown-wrapped JSON, rejects empty entries array, handles 429/402 |
| `financial-insights/index.ts` | Streams response body correctly, handles API errors |

**Recommended approach:** Use Deno's testing framework with mocked `fetch` to avoid hitting real AI APIs. Focus on the parsing and error-handling paths, not the AI prompt quality.

**Recommended test count: ~25-30 test cases across all 5 functions.**

---

## Priority 4: React Component Integration Tests (Lower ROI, Higher Effort)

These tests require a DOM environment and React Testing Library. They are more expensive to write and maintain but catch UI integration bugs.

### 4.1 High-Value Component Tests

| Component | What to Test |
|-----------|-------------|
| `CsvPreview.tsx` (58KB) | File upload triggers parsing, parsed data displayed in table, column mapping UI updates state, error states shown for invalid files |
| `MappingTab.tsx` (30KB) | Category-to-DRE section assignment, auto-map button triggers mapping, template save/load |
| `AnalyticsTab.tsx` (16KB) | DRE KPIs rendered from entries, chart data computed correctly, filter by cost center |
| `FinancialGoals.tsx` (14KB) | Goal creation form, progress bars reflect status, delete confirmation |
| `Index.tsx` (23KB) | Tab navigation, data flow between tabs, demo data loading |

**Recommended test count: ~20-30 test cases across key components.**

---

## Proposed Testing Infrastructure

### Framework Recommendation: Vitest

Vitest is the natural choice for this Vite-based project. It shares the same configuration, supports TypeScript natively, and runs significantly faster than Jest for Vite projects.

### Required Dependencies

```
devDependencies:
  vitest                        - Test runner
  @testing-library/react        - Component testing
  @testing-library/jest-dom     - DOM matchers
  @testing-library/user-event   - User interaction simulation
  jsdom                         - DOM environment for component tests
  msw                           - API mocking for Supabase/AI calls
```

### Suggested Directory Structure

```
src/
  utils/
    __tests__/
      finance.test.ts
      contaAzulAutoMapper.test.ts
  hooks/
    __tests__/
      useDataValidation.test.ts
      useFinancialGoals.test.ts
      useImportHistory.test.ts
      useRealtimeMetrics.test.ts
  components/
    dashboard/
      __tests__/
        CsvPreview.test.tsx
        MappingTab.test.tsx
        AnalyticsTab.test.tsx
supabase/
  functions/
    __tests__/
      parse-csv.test.ts
      detect-anomalies.test.ts
      auto-map-categories.test.ts
      auto-fill-entries.test.ts
```

### Configuration (`vitest.config.ts`)

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/utils/**', 'src/hooks/**', 'src/components/dashboard/**'],
      exclude: ['src/components/ui/**'], // shadcn components are third-party
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## Bugs and Issues Discovered During Analysis

1. **Division by zero in `useDataValidation.ts:145-146`**: When there is a single entry, `stdDev` is 0, making `zScore = Infinity`. The z-score check (`> 3`) will incorrectly flag every single-entry dataset as anomalous.

2. **Array mutation in `useImportHistory.ts:39`**: `entry.columnHeaders.sort()` mutates the caller's array. This should use `[...entry.columnHeaders].sort()`.

3. **Inconsistent severity types**: `detect-anomalies/index.ts` returns `"critical" | "warning" | "info"` but `useFinancialAnomalies.ts` expects `"low" | "medium" | "high" | "critical"`. The AI response severities are never properly mapped to the client-side types.

---

## Implementation Roadmap

| Phase | Scope | Estimated Test Count | Coverage Target |
|-------|-------|---------------------|-----------------|
| **Phase 1** | `finance.ts` + `contaAzulAutoMapper.ts` | ~80 tests | Utility layer: 90%+ |
| **Phase 2** | Hook business logic (validation, goals, history, metrics) | ~70 tests | Hook layer: 80%+ |
| **Phase 3** | Edge function parsing and error handling | ~30 tests | Edge functions: 70%+ |
| **Phase 4** | Key dashboard component integration tests | ~25 tests | Component layer: 50%+ |
| **Total** | | ~205 tests | Overall meaningful coverage: 70%+ |

Phase 1 should be tackled first as it provides the highest return on investment: pure functions with no mocking required, protecting the most critical financial calculation paths.
