import { ShopifyConnectionCard } from "@/components/ShopifyConnectionCard";
import { WooCommerceConnectionCard } from "@/components/WooCommerceConnectionCard";

export default function IntegrationsSettingsPage() {
  return (
    <div className="space-y-6">
      <ShopifyConnectionCard />
      <WooCommerceConnectionCard />
    </div>
  );
}
