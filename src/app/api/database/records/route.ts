import { NextResponse } from "next/server";
import {
  getSupermarketSections,
  getSupermarketProducts,
  getCustomers,
  getStockAlerts,
  getRecentOperationLogs,
} from "@/lib/supermarket-db";

export async function GET() {
  try {
    const [sections, products, customers, stockAlerts, logs] = await Promise.all([
      getSupermarketSections(),
      getSupermarketProducts(),
      getCustomers(),
      getStockAlerts(),
      getRecentOperationLogs(),
    ]);

    return NextResponse.json({
      sections,
      products,
      customers,
      stockAlerts,
      toolLogs: logs,
      stats: {
        totalProducts: products.length,
        totalSections: sections.length,
        totalCustomers: customers.length,
        activeAlerts: stockAlerts.length,
        lowStockCount: products.filter((p) => p.status === "Low Stock" || p.status === "Out of Stock").length,
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Database fetch error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
