# Willingness-to-Pay (Van Westendorp) Survey — Design

## Problem

Zorin's pricing recommendations are built entirely from *revealed* preference — historical sales behavior fed into the elasticity model. There's no *stated* preference signal: Zorin never asks a merchant's actual customers what they'd pay. Pricing-strategy platforms and pricing analysts routinely use direct customer research (willingness-to-pay surveys) as a second, independent data source alongside transaction analysis. Zorin has no equivalent.

## Goal

Let a merchant generate a shareable, no-login price-sensitivity survey link per product, collect customer responses to the four classic Van Westendorp questions, and see the results (a price-sensitivity chart with confidence tiering) as an advisory panel alongside — not blended into — the existing elasticity-based recommendation.

## Non-goals

- Zorin does not send survey emails or store a customer email list. Distribution is entirely the merchant's responsibility (their own newsletter, social, order-confirmation page, etc.) — this keeps the feature free of new customer-PII storage and consent/compliance surface area.
- No blending of Van Westendorp results into the `RAISE`/`LOWER`/`HOLD` recommendation engine. The two data sources measure genuinely different things (stated vs. revealed preference) and combining them responsibly is out of scope for this version.
- No survey-builder flexibility (custom questions, multi-product surveys, branching logic). Exactly the four standard Van Westendorp questions, one product per survey.

## Architecture

Three pieces:

1. **Survey creation** (authenticated, merchant-only) — from a product's detail page, a "Create WTP survey" action generates a `PriceSurvey` row with an unguessable token and returns a shareable URL (`/survey/[token]`). A merchant can create multiple surveys per product over time (e.g. re-running seasonally); each is a separate row with its own responses, so history isn't overwritten.
2. **Public survey page** (`/survey/[token]`, no auth, no app chrome) — shows the product name/image and the four Van Westendorp price questions as plain number inputs. Submission is guarded by a browser cookie (blocks immediate resubmission from the same device) plus the existing IP-based rate limiter (the same one built for the webhook receivers) — proportionate for a low-stakes, opt-in survey, not intended to defeat a determined bad actor.
3. **Results panel** (authenticated) — a new card on the product detail page, positioned alongside (not replacing) the existing `RecommendationCard`. Shows a price-sensitivity chart (four cumulative-distribution curves, standard Van Westendorp intersections) and a confidence tier badge reusing the existing `ModelHealthBadge` visual pattern.

The Van Westendorp calculation itself is a deterministic algorithm (no ML) — implemented as a pure function in the same style as the existing `src/lib/elasticity/` modules.

## Data model

```prisma
model PriceSurvey {
  id         String   @id @default(cuid())
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  merchantId String
  token      String   @unique
  createdAt  DateTime @default(now())
  responses  PriceSurveyResponse[]
}

model PriceSurveyResponse {
  id                    String      @id @default(cuid())
  surveyId              String
  survey                PriceSurvey @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  tooCheapCents         Int
  goodValueCents        Int
  gettingExpensiveCents Int
  tooExpensiveCents     Int
  submittedAt           DateTime    @default(now())
}
```

- `PriceSurveyResponse` deliberately stores only the four price points — no email, name, IP address, or any other identifying field. The anti-spam cookie/rate-limit check happens at the API layer and is never persisted, so the response table itself contains nothing that could be considered customer PII.
- `token` is generated via the same `randomBytes`-based approach already used elsewhere in this codebase (e.g. `generateWooWebhookSecret`) — unguessable, not a sequential ID, so a stranger can't enumerate a merchant's other survey links.

## API routes

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/products/[id]/surveys` | Merchant | Creates a new `PriceSurvey`, returns the shareable URL |
| `GET /api/products/[id]/surveys` | Merchant | Lists surveys for a product with response counts |
| `GET /api/survey/[token]` | Public | Returns product title/image + survey validity for rendering the form; 404 on unknown/expired token |
| `POST /api/survey/[token]/respond` | Public | Accepts the four price fields, rate-limits + cookie-checks, validates values, inserts the response |
| `GET /api/products/[id]/surveys/[surveyId]/results` | Merchant | Computes and returns Van Westendorp curve data + confidence tier |

`POST /api/survey/[token]/respond` validation: each price must be a positive integer (cents), and the four values must be in a sane relative order (reject a submission where "too cheap" > "too expensive," which is either a user mistake or garbage data) — this is data-quality validation, not authentication.

## Van Westendorp calculation

```typescript
// src/lib/priceSurvey/vanWestendorp.ts
export interface VanWestendorpResult {
  pointOfMarginalCheapness: number;      // cents
  pointOfMarginalExpensiveness: number;  // cents
  optimalPricePoint: number;             // cents
  indifferencePricePoint: number;        // cents
  acceptableRange: { min: number; max: number };
  responseCount: number;
  confidence: "none" | "low" | "good";
}

export function calculateVanWestendorp(
  responses: {
    tooCheapCents: number;
    goodValueCents: number;
    gettingExpensiveCents: number;
    tooExpensiveCents: number;
  }[],
): VanWestendorpResult
```

Standard method: build four cumulative distributions across the price range (e.g. "% of respondents who said 'too cheap' at or below price X" for each of the four questions), then find:
- **Point of Marginal Cheapness (PMC)** — intersection of the "too cheap" and "getting expensive" curves
- **Point of Marginal Expensiveness (PME)** — intersection of the "too expensive" and "good value" curves
- **Optimal Price Point (OPP)** — intersection of "too cheap" and "too expensive"
- **Indifference Price Point (IPP)** — intersection of "good value" and "getting expensive"
- **Acceptable range** — `[PMC, PME]`

Confidence tier is purely a function of `responseCount`: `none` (<5), `low` (5–19), `good` (20+). Results are computed and returned even at `none`/`low` tiers — the UI is responsible for visibly labeling low-confidence results, not the API withholding them.

## UI

- **Product detail page**: new "Price Sensitivity Survey" card near `RecommendationCard`. Empty state: "Create a survey link" button. Active state: shareable link with a copy button, response count, and (once ≥5 responses exist) the price-sensitivity chart. Chart rendered as pure SVG matching the existing style used by `DemandCurve.tsx`/`PortfolioTrendChart.tsx` — no new charting library dependency.
- **`/survey/[token]` page**: minimal standalone page, no `AppShell`/sidebar (public respondents should never see Zorin's authenticated dashboard chrome) — product name/image, the four price inputs with standard Van Westendorp question wording, submit button, thank-you state after submission.

## Testing

- `vanWestendorp.ts`: unit tests with hand-computed known-input/known-output cases, plus edge cases (all-identical responses, a single response, an empty array).
- API routes: follow the existing `vi.mock`-based route-test pattern used throughout this codebase. Cover survey creation/listing (authenticated), the public respond endpoint (validation rejects malformed/out-of-order prices, rate-limit integration, cookie-based resubmit block), and the results endpoint (confidence-tier thresholds at the 5/20 boundaries).
- No dedicated component/UI tests beyond what the implementation plan decides is warranted — consistent with this codebase's existing selective component-test coverage.

## Out of scope (explicitly deferred)

- Blending Van Westendorp results into the elasticity-based recommendation engine.
- Zorin-hosted email distribution / customer list collection.
- Multi-product or multi-question survey customization.
- Survey expiration/deactivation controls (a created survey accepts responses indefinitely; revisit if merchants ask for it).
