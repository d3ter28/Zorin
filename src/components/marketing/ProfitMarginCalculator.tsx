"use client";

import { PaymentFeeCalculator, type FeePreset } from "./PaymentFeeCalculator";

const SHOPIFY_REGIONS: Record<string, FeePreset> = {
  us: { label: "United States", feePct: "2.9", feeFixed: "0.30" },
  uk: { label: "United Kingdom", feePct: "2.5", feeFixed: "0.25" },
  eu: { label: "European Union", feePct: "2.5", feeFixed: "0.25" },
  ca: { label: "Canada", feePct: "2.9", feeFixed: "0.30" },
  au: { label: "Australia", feePct: "2.6", feeFixed: "0.30" },
};

export function ProfitMarginCalculator() {
  return (
    <PaymentFeeCalculator
      presets={SHOPIFY_REGIONS}
      defaultPresetKey="us"
      selectorLabel="Region"
      selectorHelp="Defaults to a typical Shopify Payments rate for your region - edit if your plan or processor differs."
    />
  );
}
