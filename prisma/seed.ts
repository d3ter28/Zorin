// Prisma 7 requires a driver adapter, so we reuse the configured client
// singleton from src/lib/db.ts rather than instantiating a bare PrismaClient.
import { prisma } from "../src/lib/db";

const PRODUCTS = [
  { title: "Organic Cotton Tee", sku: "TEE-001", currentPrice: 3200, cogs: 1200, category: "Apparel", estUnits: 120, comps: [2800, 3000, 3100] },
  { title: "Merino Wool Beanie", sku: "BEAN-002", currentPrice: 2800, cogs: 2600, category: "Apparel", estUnits: 60, comps: [2400, 2500] },
  { title: "Stainless Water Bottle", sku: "BOT-003", currentPrice: 1800, cogs: 700, category: "Drinkware", estUnits: 200, comps: [2200, 2400, 2300] },
  { title: "Canvas Tote Bag", sku: "TOTE-004", currentPrice: 2500, cogs: 900, category: "Bags", estUnits: 90, comps: [2450, 2550, 2500] },
  { title: "Bamboo Toothbrush 4pk", sku: "BRUSH-005", currentPrice: 1200, cogs: 400, category: "Home", estUnits: 300, comps: [1500, 1600] },
  { title: "Soy Wax Candle", sku: "CAND-006", currentPrice: 2200, cogs: 800, category: "Home", estUnits: 150, comps: [2100, 2300, 2200] },
  { title: "Leather Card Wallet", sku: "WALL-007", currentPrice: 4500, cogs: 1500, category: "Accessories", estUnits: 70, comps: [3800, 4000, 4200] },
  { title: "Ceramic Mug", sku: "MUG-008", currentPrice: 1600, cogs: 1450, category: "Drinkware", estUnits: 180, comps: [1400, 1500] },
];

const COMP_NAMES = ["RivalShop", "MarketCo", "PriceLeader"];

async function main() {
  await prisma.recommendation.deleteMany();
  await prisma.competitorPrice.deleteMany();
  await prisma.product.deleteMany();
  await prisma.merchant.deleteMany();

  const merchant = await prisma.merchant.create({
    data: { name: "Demo Store", storeUrl: "https://demo-store.example.com" },
  });

  for (const p of PRODUCTS) {
    await prisma.product.create({
      data: {
        merchantId: merchant.id,
        title: p.title,
        sku: p.sku,
        currentPrice: p.currentPrice,
        cogs: p.cogs,
        category: p.category,
        estUnits: p.estUnits,
        competitors: {
          create: p.comps.map((price, i) => ({
            competitorName: COMP_NAMES[i % COMP_NAMES.length],
            price,
          })),
        },
      },
    });
  }
  console.log(`Seeded merchant ${merchant.id} with ${PRODUCTS.length} products.`);
}

main().finally(() => prisma.$disconnect());
