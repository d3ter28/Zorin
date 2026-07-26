/*
  Warnings:

  - You are about to drop the `CompetitorPrice` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN "shopifyVariantId" TEXT;
ALTER TABLE "Product" ADD COLUMN "woocommerceParentId" TEXT;
ALTER TABLE "Product" ADD COLUMN "woocommerceVariantId" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CompetitorPrice";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "SalesRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "unitsSold" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "promotionFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ElasticityModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "elasticity" REAL NOT NULL,
    "intercept" REAL NOT NULL,
    "r2" REAL NOT NULL,
    "dataPoints" INTEGER NOT NULL,
    "minPriceCents" INTEGER NOT NULL DEFAULT 0,
    "maxPriceCents" INTEGER NOT NULL DEFAULT 0,
    "effectiveSampleSize" REAL NOT NULL DEFAULT 0,
    "confidenceScore" REAL NOT NULL DEFAULT 0,
    "priorApplied" BOOLEAN NOT NULL DEFAULT false,
    "fittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ElasticityModel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "fromCents" INTEGER NOT NULL,
    "toCents" INTEGER NOT NULL,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceChange_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShopifyConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "encryptedToken" TEXT NOT NULL,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShopifyConnection_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EarlyAccessInterest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "storeUrl" TEXT,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WooCommerceConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "storeUrl" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WooCommerceConnection_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesRecord_productId_date_key" ON "SalesRecord"("productId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ElasticityModel_productId_key" ON "ElasticityModel"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_merchantId_key" ON "User"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyConnection_merchantId_key" ON "ShopifyConnection"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "WooCommerceConnection_merchantId_key" ON "WooCommerceConnection"("merchantId");
