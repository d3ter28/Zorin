-- CreateTable
CREATE TABLE "CogsChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "fromCents" INTEGER,
    "toCents" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CogsChange_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CogsChange_productId_changedAt_idx" ON "CogsChange"("productId", "changedAt");
