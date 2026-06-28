import { ProductsTable } from "@/components/ProductsTable";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-2xl font-bold">PriceIQ — Demo Store</h1>
      <ProductsTable />
    </main>
  );
}
