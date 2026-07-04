// Prisma 7 requires a driver adapter, so we reuse the configured client
// singleton from src/lib/db.ts rather than instantiating a bare PrismaClient.
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";

const PRODUCTS = [
  { title: "Organic Cotton Tee", sku: "TEE-001", currentPrice: 3200, cogs: 1200, category: "Apparel", estUnits: 120 },
  { title: "Merino Wool Beanie", sku: "BEAN-002", currentPrice: 2800, cogs: 2600, category: "Apparel", estUnits: 60 },
  { title: "Stainless Water Bottle", sku: "BOT-003", currentPrice: 1800, cogs: 700, category: "Drinkware", estUnits: 200 },
  { title: "Canvas Tote Bag", sku: "TOTE-004", currentPrice: 2500, cogs: 900, category: "Bags", estUnits: 90 },
  { title: "Bamboo Toothbrush 4pk", sku: "BRUSH-005", currentPrice: 1200, cogs: 400, category: "Home", estUnits: 300 },
  { title: "Soy Wax Candle", sku: "CAND-006", currentPrice: 2200, cogs: 800, category: "Home", estUnits: 150 },
  { title: "Leather Card Wallet", sku: "WALL-007", currentPrice: 4500, cogs: 1500, category: "Accessories", estUnits: 70 },
  { title: "Ceramic Mug", sku: "MUG-008", currentPrice: 1600, cogs: 1450, category: "Drinkware", estUnits: 180 },
];

async function main() {
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.recommendation.deleteMany();
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
      },
    });
  }
  await prisma.user.create({
    data: {
      email: "demo@priceiq.example",
      passwordHash: await hashPassword("demo1234"),
      merchantId: merchant.id,
    },
  });

  console.log(
    `Seeded merchant ${merchant.id} with ${PRODUCTS.length} products. Login: demo@priceiq.example / demo1234`,
  );
}

main().finally(() => prisma.$disconnect());
