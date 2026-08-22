"use client";

import { PaymentFeeCalculator, type FeePreset } from "./PaymentFeeCalculator";

const WOOCOMMERCE_PROCESSORS: Record<string, FeePreset> = {
  woopayments: { label: "WooPayments", feePct: "2.9", feeFixed: "0.30" },
  stripe: { label: "Stripe", feePct: "2.9", feeFixed: "0.30" },
  paypal: { label: "PayPal", feePct: "2.99", feeFixed: "0.49" },
  square: { label: "Square", feePct: "2.6", feeFixed: "0.10" },
  authorizenet: { label: "Authorize.net", feePct: "2.9", feeFixed: "0.30" },
};

export function WooCommerceProfitMarginCalculator() {
  return (
    <PaymentFeeCalculator
      presets={WOOCOMMERCE_PROCESSORS}
      defaultPresetKey="woopayments"
      selectorLabel="Payment processor"
      selectorHelp="WooCommerce doesn't lock you into one processor, so pick yours - this defaults to a typical online rate for that processor. Edit if your actual negotiated rate differs."
    />
  );
}
