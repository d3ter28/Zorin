"use client";
import { useState } from "react";
import { IntegrationTile } from "@/components/IntegrationTile";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { ShopifyConnectionCard } from "@/components/ShopifyConnectionCard";
import { WooCommerceConnectionCard } from "@/components/WooCommerceConnectionCard";

function getShopifyLabel(data: Record<string, unknown>): string | null {
  return typeof data.shopDomain === "string" ? data.shopDomain : null;
}

function getWooCommerceLabel(data: Record<string, unknown>): string | null {
  const storeUrl = typeof data.storeUrl === "string" ? data.storeUrl : null;
  if (!storeUrl) return null;
  try {
    return new URL(storeUrl).hostname;
  } catch {
    return storeUrl;
  }
}

const INTEGRATION_DESCRIPTION = "Sync products, orders, and push price changes back to your store.";

export default function IntegrationsSettingsPage() {
  const [openDrawer, setOpenDrawer] = useState<"shopify" | "woocommerce" | null>(null);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <IntegrationTile
          name="Shopify"
          description={INTEGRATION_DESCRIPTION}
          logoSrc="/shopify-logo.svg"
          logoAlt="Shopify"
          statusUrl="/api/shopify/status"
          getConnectedLabel={getShopifyLabel}
          onOpen={() => setOpenDrawer("shopify")}
        />
        <IntegrationTile
          name="WooCommerce"
          description={INTEGRATION_DESCRIPTION}
          logoSrc="/woocommerce-logo.jpg"
          logoAlt="WooCommerce"
          statusUrl="/api/woocommerce/status"
          getConnectedLabel={getWooCommerceLabel}
          onOpen={() => setOpenDrawer("woocommerce")}
        />
      </div>

      {openDrawer === "shopify" && (
        <SettingsDrawer title="Shopify" onClose={() => setOpenDrawer(null)}>
          <ShopifyConnectionCard />
        </SettingsDrawer>
      )}
      {openDrawer === "woocommerce" && (
        <SettingsDrawer title="WooCommerce" onClose={() => setOpenDrawer(null)}>
          <WooCommerceConnectionCard />
        </SettingsDrawer>
      )}
    </div>
  );
}
