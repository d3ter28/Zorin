"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CogsInput } from "./CogsInput";
import { formatCents, pct } from "@/lib/money";

interface Row {
  id: string;
  title: string;
  sku: string;
  currentPrice: number;
  cogs: number | null;
  category: string;
  estUnits: number | null;
  margin: number | null;
  comparison: {
    compMedian: number | null;
    pctVsMedian: number | null;
    competitorCount: number;
  };
  recommendationAction: string | null;
}

const FLOOR = 0.15;

function positionBadge(pctVsMedian: number | null): string {
  if (pctVsMedian === null) return "—";
  if (pctVsMedian > 0.1) return "Above market";
  if (pctVsMedian < -0.1) return "Below market";
  return "At market";
}

export function ProductsTable() {
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/products");
    setRows(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <table className="w-full text-sm">
      <thead className="text-left text-gray-500">
        <tr>
          <th className="py-2">Product</th>
          <th>Price</th>
          <th>COGS</th>
          <th>Margin</th>
          <th>Comp. median</th>
          <th>Position</th>
          <th>Opportunity</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const belowFloor = r.margin !== null && r.margin < FLOOR;
          const opp =
            r.estUnits !== null && r.comparison.compMedian !== null
              ? (r.comparison.compMedian - r.currentPrice) * r.estUnits
              : null;
          return (
            <tr key={r.id} className="border-t">
              <td className="py-2">
                <Link className="font-medium underline" href={`/product/${r.id}`}>
                  {r.title}
                </Link>
                <div className="text-xs text-gray-400">{r.sku}</div>
              </td>
              <td>{formatCents(r.currentPrice)}</td>
              <td>
                <CogsInput
                  productId={r.id}
                  initialCents={r.cogs}
                  onSaved={load}
                />
              </td>
              <td className={belowFloor ? "font-semibold text-red-600" : ""}>
                {r.margin === null ? "—" : pct(r.margin)}
                {belowFloor ? " ⚠" : ""}
              </td>
              <td>
                {r.comparison.compMedian === null
                  ? "—"
                  : formatCents(r.comparison.compMedian)}
              </td>
              <td>{positionBadge(r.comparison.pctVsMedian)}</td>
              <td>{opp === null ? "—" : formatCents(opp)}</td>
              <td>{r.recommendationAction ?? ""}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
