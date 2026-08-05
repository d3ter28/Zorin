import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { ProfitMarginCalculator } from "@/components/marketing/ProfitMarginCalculator";

export const metadata = {
  title: "Shopify Profit Margin Calculator (Free) - Zorin",
  description:
    "Calculate your exact profit margin per unit in seconds. Enter your selling price, unit cost, and shipping cost - free, no signup required.",
};

export default function ProfitMarginCalculatorPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-32 md:pb-32">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          Shopify Profit Margin Calculator
        </h1>
        <p className="mt-4 max-w-[55ch] text-base leading-relaxed text-zinc-500">
          Enter your selling price, unit cost, and shipping cost to see your exact profit
          per unit and margin. Free, no signup required.
        </p>

        <div className="mt-10">
          <ProfitMarginCalculator />
        </div>
      </main>
      <Footer />
    </>
  );
}
