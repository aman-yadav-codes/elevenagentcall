"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Database,
  Store,
  Boxes,
  AlertTriangle,
  Users,
  Activity,
  RefreshCw,
  Search,
  Play,
  Thermometer,
  UserCheck,
} from "lucide-react";

interface Variant {
  sku: string;
  variantName: string;
  colorOrFlavor: string;
  size: string;
  price: number;
  stock: number;
}

interface Product {
  sku: string;
  name: string;
  sectionName: string;
  aisle: string;
  category: string;
  price: number;
  unit: string;
  stockQuantity: number;
  reorderThreshold: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  supplier: string;
  variants: Variant[];
  expiryDate: string;
}

interface Section {
  sectionId: string;
  name: string;
  aisleNumber: string;
  zone: string;
  temperature: string;
  manager: string;
  shelvesCount: number;
  restockPriority: "High" | "Critical" | "Normal" | "Low";
  description: string;
}

interface Customer {
  customerId: string;
  name: string;
  phone: string;
  membershipTier: string;
  shoppingFrequency: string;
  loyaltyPoints: number;
  totalSpent: number;
  recurrentWeeklyItems: Array<{
    sku: string;
    productName: string;
    typicalQty: number;
    aisle: string;
  }>;
  notes: string;
}

interface StockAlert {
  alertId: string;
  sku: string;
  productName: string;
  sectionName: string;
  aisle: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  currentStock: number;
  reorderThreshold: number;
  message: string;
}

interface ToolLog {
  id: string;
  timestamp: string;
  action: string;
  parameters: Record<string, unknown>;
  resultSummary: string;
  durationMs: number;
}

interface DatabasePanelProps {
  onSimulateTool?: (toolName: string, query: string) => void;
}

export const DatabasePanel: React.FC<DatabasePanelProps> = ({ onSimulateTool }) => {
  const [activeTab, setActiveTab] = useState<"inventory" | "aisles" | "alerts" | "customers" | "logs">("inventory");
  const [searchFilter, setSearchFilter] = useState("");
  const [data, setData] = useState<{
    sections: Section[];
    products: Product[];
    customers: Customer[];
    stockAlerts: StockAlert[];
    toolLogs: ToolLog[];
    stats?: {
      totalProducts: number;
      totalSections: number;
      totalCustomers: number;
      activeAlerts: number;
      lowStockCount: number;
    };
  }>({
    sections: [],
    products: [],
    customers: [],
    stockAlerts: [],
    toolLogs: [],
  });

  const [loading, setLoading] = useState(false);
  const [testQuery, setTestQuery] = useState("Oat Milk");
  const [testResult, setTestResult] = useState<unknown>(null);
  const [testingTool, setTestingTool] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchDatabase = useCallback(async () => {
    // Lighthouse performance optimization: skip background polling if user tab is inactive
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      const res = await fetch("/api/database/records", {
        signal: abortControllerRef.current.signal,
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Failed to fetch MongoDB records:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDatabase();
    const interval = setInterval(fetchDatabase, 6000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchDatabase]);

  const handleRunTestQuery = async () => {
    setTestingTool(true);
    try {
      const res = await fetch("/api/tools/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check_product_stock",
          parameters: { query: testQuery },
        }),
      });
      const json = await res.json();
      setTestResult(json);
      fetchDatabase();
      if (onSimulateTool) {
        onSimulateTool("check_product_stock", testQuery);
      }
    } catch (e) {
      setTestResult({ error: String(e) });
    } finally {
      setTestingTool(false);
    }
  };

  const filteredProducts = data.products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.category.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.aisle.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full">
      {/* Top Header */}
      <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/70 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-['Outfit']">
            MongoDB Supermarket Hub
          </h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-mono font-bold">
            CLUSTER0 SYNCED
          </span>
        </div>

        <div className="flex items-center gap-3">
          {data.stats && (
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <span className="text-slate-300 font-semibold">{data.stats.totalProducts}</span> Products •
              <span className="text-amber-400 font-semibold"> {data.stats.activeAlerts}</span> Alerts
            </div>
          )}
          <button
            onClick={() => fetchDatabase()}
            aria-label="Refresh database records"
            className="text-xs text-slate-400 hover:text-slate-200 p-1.5 rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
            title="Refresh database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav aria-label="Database sections" className="flex border-b border-slate-800/70 bg-slate-950/40 px-3 pt-2 gap-1 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg font-medium transition-all cursor-pointer ${
            activeTab === "inventory"
              ? "bg-slate-800 text-indigo-300 border-t-2 border-indigo-500"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Boxes className="w-3.5 h-3.5" aria-hidden="true" />
          Inventory ({data.products.length})
        </button>
        <button
          onClick={() => setActiveTab("aisles")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg font-medium transition-all cursor-pointer ${
            activeTab === "aisles"
              ? "bg-slate-800 text-indigo-300 border-t-2 border-indigo-500"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Store className="w-3.5 h-3.5" aria-hidden="true" />
          Categories & Sections ({data.sections.length})
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg font-medium transition-all cursor-pointer ${
            activeTab === "alerts"
              ? "bg-slate-800 text-amber-300 border-t-2 border-amber-500"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
          Stock Alerts ({data.stockAlerts.length})
        </button>
        <button
          onClick={() => setActiveTab("customers")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg font-medium transition-all cursor-pointer ${
            activeTab === "customers"
              ? "bg-slate-800 text-cyan-300 border-t-2 border-cyan-500"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
          Regular Shoppers ({data.customers.length})
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg font-medium transition-all cursor-pointer ${
            activeTab === "logs"
              ? "bg-slate-800 text-indigo-300 border-t-2 border-indigo-500"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5" aria-hidden="true" />
          AI Logs ({data.toolLogs.length})
        </button>
      </nav>

      {/* Tab Panels */}
      <div className="p-4 flex-1 overflow-y-auto max-h-[360px]">
        {/* INVENTORY TAB */}
        {activeTab === "inventory" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 pb-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" aria-hidden="true" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter by name, SKU, category, section..."
                  aria-label="Filter products"
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 w-full focus:outline-none focus:border-indigo-500"
                />
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Showing {filteredProducts.length} of {data.products.length}
              </span>
            </div>

            <div className="space-y-2">
              {filteredProducts.map((p) => (
                <div
                  key={p.sku}
                  className="bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 hover:border-indigo-500/40 rounded-xl p-3 text-xs transition-all space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-indigo-300">{p.sku}</span>
                        <h3 className="text-slate-100 font-semibold inline">{p.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            p.status === "In Stock"
                              ? "bg-emerald-950/70 text-emerald-300 border border-emerald-500/30"
                              : p.status === "Low Stock"
                              ? "bg-amber-950/70 text-amber-300 border border-amber-500/30"
                              : "bg-rose-950/70 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5 flex items-center gap-2">
                        <span className="text-cyan-400 font-medium">Category: {p.category}</span> • Section:{" "}
                        <span className="text-slate-300">{p.sectionName}</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-slate-100 text-sm">${p.price}</span>
                      <span className="text-slate-400 text-[10px]"> /{p.unit}</span>
                      <p className="text-[11px] font-mono text-emerald-400 font-semibold">
                        {p.stockQuantity} {p.unit} in stock
                      </p>
                    </div>
                  </div>

                  {/* Variants */}
                  {p.variants && p.variants.length > 0 && (
                    <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-2 text-[11px] space-y-1">
                      <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">
                        Color / Flavor / Size Variants ({p.variants.length}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {p.variants.map((v) => (
                          <div
                            key={v.sku}
                            className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800 text-[10px]"
                          >
                            <span className="text-slate-300 font-medium truncate max-w-[130px]">
                              {v.variantName}
                            </span>
                            <span className="font-mono text-cyan-300">
                              {v.stock} pcs • ${v.price}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AISLES TAB */}
        {activeTab === "aisles" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Supermarket floorplan across 8 specialized aisles and climate zones:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {data.sections.map((s) => (
                <div
                  key={s.sectionId}
                  className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-300 font-mono">{s.aisleNumber}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        s.restockPriority === "Critical"
                          ? "bg-rose-950/80 text-rose-300 border border-rose-500/40"
                          : s.restockPriority === "High"
                          ? "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      Priority: {s.restockPriority}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-100">{s.name}</h3>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{s.description}</p>
                  <div className="pt-1.5 border-t border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-cyan-400" aria-hidden="true" />
                      {s.temperature}
                    </span>
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-indigo-400" aria-hidden="true" />
                      Mgr: {s.manager}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ALERTS TAB */}
        {activeTab === "alerts" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Manager Intervention Required</span>
              <span className="text-amber-400 font-mono font-semibold">{data.stockAlerts.length} Active Warnings</span>
            </div>

            <div className="space-y-2">
              {data.stockAlerts.map((alt) => (
                <div
                  key={alt.alertId}
                  className={`border rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    alt.severity === "CRITICAL"
                      ? "bg-rose-950/30 border-rose-500/40"
                      : "bg-amber-950/30 border-amber-500/40"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-100 inline">{alt.productName}</h3>
                      <span className="font-mono text-slate-400 text-[10px]">{alt.sku}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          alt.severity === "CRITICAL"
                            ? "bg-rose-600 text-white"
                            : "bg-amber-600 text-white"
                        }`}
                      >
                        {alt.severity}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] mt-1">{alt.message}</p>
                    <p className="text-slate-400 text-[10px] mt-0.5">Location: {alt.aisle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400">Current Stock</span>
                    <p className="font-mono font-bold text-rose-400 text-base">{alt.currentStock}</p>
                    <span className="text-[10px] text-slate-400">Threshold: {alt.reorderThreshold}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CUSTOMERS TAB */}
        {activeTab === "customers" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Regular and weekly loyalty shoppers tracked in our database:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.customers.map((c) => (
                <div
                  key={c.customerId}
                  className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm">{c.name}</h3>
                      <p className="text-cyan-400 text-[11px] font-medium">{c.membershipTier}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-400 font-mono font-bold text-xs">${c.totalSpent.toFixed(2)}</span>
                      <p className="text-[10px] text-slate-400">{c.loyaltyPoints} pts</p>
                    </div>
                  </div>

                  <div className="text-slate-300 text-[11px]">
                    <span className="text-slate-400">Shopping Pattern: </span>
                    {c.shoppingFrequency}
                  </div>

                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                      Weekly Recurring Basket:
                    </span>
                    {c.recurrentWeeklyItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px] text-slate-300">
                        <span className="truncate max-w-[150px]">• {item.productName}</span>
                        <span className="font-mono text-cyan-400">{item.typicalQty} pcs ({item.aisle})</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-400 italic">&quot;{c.notes}&quot;</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === "logs" && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 mb-2">
              Live audit trail of AI voice agent MongoDB queries:
            </p>
            {data.toolLogs.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">
                No tool executions logged yet. Speak into the microphone to trigger a query!
              </p>
            ) : (
              data.toolLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-xs font-mono space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-cyan-400 font-semibold">⚡ {log.action}</span>
                    <span className="text-slate-500">{log.timestamp} ({log.durationMs}ms)</span>
                  </div>
                  <p className="text-slate-300 text-[11px] font-sans">{log.resultSummary}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Query simulator */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row items-center gap-2">
        <div className="flex-1 flex items-center gap-2 w-full">
          <label htmlFor="test-stock-input" className="text-[11px] text-slate-400 font-medium shrink-0">
            Test Query:
          </label>
          <input
            id="test-stock-input"
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="e.g. Oat Milk, Ribeye, Aman"
            aria-label="Test stock query"
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono w-full focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button
          onClick={handleRunTestQuery}
          disabled={testingTool}
          aria-label="Simulate voice query"
          className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Play className="w-3 h-3 fill-current" aria-hidden="true" />
          <span>{testingTool ? "Querying..." : "Simulate Query"}</span>
        </button>
      </div>

      {/* Response Preview */}
      {Boolean(testResult) && (
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/90 text-[11px] font-mono text-emerald-400 flex items-center justify-between">
          <span className="truncate">Response: {JSON.stringify(testResult)}</span>
          <button
            onClick={() => setTestResult(null)}
            aria-label="Dismiss response preview"
            className="text-slate-500 hover:text-slate-300 ml-2 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
