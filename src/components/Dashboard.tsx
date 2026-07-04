"use client";
import { useState } from "react";
import { ProductUpload } from "./ProductUpload";
import { ProductsTable } from "./ProductsTable";

/**
 * Composes the upload control and the products table with a shared refresh
 * signal. Bumping the token after an import re-fetches the table in place,
 * so the import summary stays on screen instead of being wiped by a full
 * page reload (the previous behavior hid the summary entirely).
 */
export function Dashboard() {
  const [refreshToken, setRefreshToken] = useState(0);
  return (
    <>
      <ProductUpload onImported={() => setRefreshToken((n) => n + 1)} />
      <ProductsTable refreshToken={refreshToken} />
    </>
  );
}
