# PriceIQ — CSV Competitor Price Ingestion (Slice 2)

**Date:** 2026-06-29
**Status:** Approved (design)
**Depends on:** Slice 1 (rules engine, recommendations, products table) — merged to `master`

## 1. Problem

All competitor prices in PriceIQ today come from `prisma/seed.ts` — they are fake.
The comparison and recommendation logic is sound, but it operates on invented data,
so no recommendation is trustworthy. This slice replaces seeded competitor data with
**real prices the merchant supplies via CSV upload**, through a clean, testable
ingestion pipeline.

Live scraping/fetching from competitor URLs is explicitly **out of scope** (deferred to
a future slice) — it is brittle, hard to test, and raises ToS/anti-bot concerns. The
ingestion pipeline is designed so a future scraper could feed the same
`applyIngest` path.

## 2. Scope

**In scope:**
- A pure CSV parser/validator.
- A DB application step that upserts competitor prices and invalidates affected
  recommendations.
- A `POST /api/ingest` endpoint (raw `text/csv` body).
- A minimal "Upload competitor prices" UI control on the products page.
- A schema migration adding a uniqueness constraint required for upserts.

**Out of scope (future slices):** live scraping/URL fetching, multipart/file-field
uploads, price history/trends, scheduled re-ingestion, per-row observed dates,
competitor-URL ingestion.

## 3. CSV format

```
sku,competitor_name,price
TEE-001,RivalShop,28.50
TEE-001,MarketCo,30.00
BOT-003,PriceLeader,22.00
```

- **Columns:** `sku`, `competitor_name`, `price` (in that order).
- **Match key:** `sku` — the merchant's own product identifier, already on `Product`.
- **Price:** dollars with optional decimals (e.g. `28.50`), parsed to integer **cents**
  (`2850`). Reject non-numeric, negative, or empty.
- **Header row:** tolerated. A first line equal to the expected header
  (case-insensitive `sku,competitor_name,price`) is skipped.
- **`observedAt`:** set to upload time. No per-row date column in v1.

## 4. Architecture

Three units, each understandable and testable in isolation.

### 4.1 `src/lib/ingest/parseCsv.ts` — pure parser (no DB, no I/O)

```ts
interface ParsedRow { sku: string; competitorName: string; priceCents: number; }
interface RowError { line: number; raw: string; reason: string; }
interface ParseResult { rows: ParsedRow[]; errors: RowError[]; }

function parseCsv(input: string): ParseResult;
```

- Splits on newlines (handles `\r\n` and `\n`), trims each line, skips blank lines.
- Skips a leading header line matching the expected header.
- Each remaining line must split into exactly 3 comma-separated fields. Otherwise →
  `RowError` ("malformed line: expected 3 columns").
- `sku` and `competitor_name` must be non-empty after trim → else `RowError`.
- `price` parsed via a dollars→cents helper: must be a finite, non-negative number;
  rounds to nearest cent. Invalid → `RowError` ("invalid price").
- **Never throws.** Every problem becomes a `RowError` carrying its 1-based line number
  and the raw line text. Valid rows accumulate in `rows`.

### 4.2 `src/lib/ingest/applyIngest.ts` — DB application

```ts
interface IngestSummary {
  inserted: number;
  updated: number;
  skipped: number;          // unknown-sku rows + parser errors
  errors: RowError[];
}

async function applyIngest(
  prisma: PrismaLike,
  parsed: ParseResult,
): Promise<IngestSummary>;
```

- One `product.findMany({ where: { sku: { in: [...uniqueSkus] } } })` to build a
  `sku → productId` map.
- Rows whose `sku` is not in the map → appended to `errors` as "unknown SKU" and
  counted in `skipped` (they do not abort the batch).
- For each matched row: `competitorPrice.upsert` keyed on
  `(productId, competitorName)`, setting `price = priceCents` and
  `observedAt = new Date()`. Upsert `create` → counts as `inserted`; `update` →
  `updated`. (Distinguish via an existence check or upsert return; see plan.)
- Collect the set of touched `productId`s. After upserts, delete their
  `Recommendation` rows (`recommendation.deleteMany({ where: { productId: { in: [...] } } })`)
  so stale recommendations regenerate on next view — mirrors the existing cogs endpoint.
- Returns the summary (carrying forward the parser's `errors`).

`PrismaLike` is a minimal structural type covering the methods used, so tests can pass a
mock without the real client.

### 4.3 `POST /api/ingest` route

- Wrapped in the existing `withErrorHandling` (`src/lib/api/errors.ts`).
- Reads the raw request body as text (`await req.text()`). Empty body → 400 via an
  `HttpError`.
- Calls `parseCsv` then `applyIngest`, returns the `IngestSummary` as JSON with **200**
  even when row-level errors exist — partial success is the normal outcome for CSV
  ingestion; the body reports what was skipped.

### 4.4 Minimal UI

- A small "Upload competitor prices" control on the products page (`ProductsTable` area
  or a sibling component `IngestUpload.tsx`): a file `<input>` reads the file as text in
  the browser and POSTs it to `/api/ingest`.
- On response, shows a brief result panel: e.g. "2 inserted, 12 updated, 3 skipped",
  and lists the row errors if any. Refreshes the products list afterward so updated
  prices/recommendations show.
- Deliberately thin — the value is the pipeline, not the UI.

## 5. Schema change

Add a uniqueness constraint to support the upsert:

```prisma
model CompetitorPrice {
  // ...existing fields...
  @@unique([productId, competitorName])
}
```

The seed creates exactly one row per (product, competitor) today, so it remains
compatible. A migration is generated and applied; the seed is re-run to confirm.

## 6. Data flow

```
CSV text
  → parseCsv(text)            -> { rows, errors }
  → applyIngest(prisma, ...)  -> upsert CompetitorPrice (product+competitor)
                                -> invalidate Recommendation for touched products
                                -> IngestSummary { inserted, updated, skipped, errors }
  → JSON response (200)
```

## 7. Error handling

| Situation | Behavior |
|-----------|----------|
| Empty / non-text request body | 400 (`HttpError` via wrapper) |
| Malformed line (≠3 columns) | row skipped, `RowError` in summary |
| Missing sku or competitor_name | row skipped, `RowError` in summary |
| Invalid/negative price | row skipped, `RowError` in summary |
| Unknown sku (no matching product) | row skipped, `RowError` in summary |
| Valid rows alongside bad ones | valid rows applied; 200 with summary |
| Unexpected DB failure | opaque 500 via existing wrapper (no stack leak) |

## 8. Testing

- **`parseCsv` (pure unit):** happy path; dollars→cents (`28.50`→2850, `30`→3000);
  header tolerance; CRLF handling; blank-line skipping; each error class (wrong column
  count, empty sku, empty name, non-numeric price, negative price). Asserts line numbers
  in errors.
- **`applyIngest` (mocked prisma):** upsert called once per matched row with correct
  args; unknown-sku rows reported and counted in `skipped`; recommendation `deleteMany`
  called with exactly the touched productIds; summary counts correct; parser errors
  carried through.
- **`/api/ingest` route (mocked prisma):** valid CSV body → 200 + summary; empty body →
  400.
- Full suite (`npm test`) and `npm run build` stay green.

## 9. Definition of done

- `parseCsv`, `applyIngest`, and `/api/ingest` implemented test-first; all new tests
  pass alongside the existing 40.
- Schema migration applied; `npm run seed` succeeds against the new constraint.
- Uploading a CSV through the UI updates competitor prices, invalidates affected
  recommendations, and reports a summary.
- `npm run build` succeeds with no type errors.
- Branch finished via superpowers:finishing-a-development-branch.
