import { ProductsTable } from "@/components/ProductsTable";
import { IngestUpload } from "@/components/IngestUpload";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl p-8 pb-24">
      <h1 className="mb-6 text-2xl font-bold">PriceIQ — Demo Store</h1>
      <IngestUpload />
      <ProductsTable />
    </main>
  );
}
