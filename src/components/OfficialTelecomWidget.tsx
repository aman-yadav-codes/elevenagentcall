"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import { Zap, ShieldCheck, Sparkles, Volume2 } from "lucide-react";

interface OfficialTelecomWidgetProps {
  agentId: string;
}

export function OfficialTelecomWidget({ agentId }: OfficialTelecomWidgetProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const widgetRef = useRef<HTMLElement | null>(null);

  // Helper to execute MongoDB database tools
  const executeDatabaseTool = useCallback(async (action: string, parameters: Record<string, unknown>) => {
    try {
      console.log(`[Official Widget] Executing tool ${action}:`, parameters);
      const res = await fetch("/api/tools/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, parameters }),
      });
      const json = await res.json();
      console.log(`[Official Widget] Tool ${action} result:`, json.data);
      return JSON.stringify(json.data);
    } catch (err) {
      console.error(`[Official Widget] Tool ${action} failed:`, err);
      return JSON.stringify({ error: String(err) });
    }
  }, []);

  useEffect(() => {
    const handleWidgetCall = (event: Event) => {
      const customEvent = event as CustomEvent<{
        config?: {
          clientTools?: Record<string, (params: Record<string, unknown>) => Promise<string>>;
        };
      }>;

      if (!customEvent.detail) return;
      if (!customEvent.detail.config) {
        customEvent.detail.config = {};
      }

      console.log("[Official Widget] elevenlabs-convai:call event received, attaching MongoDB tools...");
      // Attach all 5 MongoDB Supermarket tools directly to the official widget configuration
      customEvent.detail.config.clientTools = {
        check_product_stock: async (params: Record<string, unknown>) => {
          return executeDatabaseTool("check_product_stock", params);
        },
        get_low_stock_alerts: async (params: Record<string, unknown>) => {
          return executeDatabaseTool("get_low_stock_alerts", params);
        },
        get_section_overview: async (params: Record<string, unknown>) => {
          return executeDatabaseTool("get_section_overview", params);
        },
        get_customer_info: async (params: Record<string, unknown>) => {
          return executeDatabaseTool("get_customer_info", params);
        },
        update_product_stock: async (params: Record<string, unknown>) => {
          return executeDatabaseTool("update_product_stock", params);
        },
        update_customer_record: async (params: Record<string, unknown>) => {
          return executeDatabaseTool("update_customer_record", params);
        },
        delete_customer_record: async (params: Record<string, unknown>) => {
          return executeDatabaseTool("delete_customer_record", params);
        },
        delete_product_record: async (params: Record<string, unknown>) => {
          return executeDatabaseTool("delete_product_record", params);
        },
      };
    };

    const el = document.querySelector("elevenlabs-convai");
    if (el) {
      widgetRef.current = el as HTMLElement;
      el.addEventListener("elevenlabs-convai:call", handleWidgetCall);
    }

    // Also listen at document level as fallback
    document.addEventListener("elevenlabs-convai:call", handleWidgetCall);

    return () => {
      if (el) {
        el.removeEventListener("elevenlabs-convai:call", handleWidgetCall);
      }
      document.removeEventListener("elevenlabs-convai:call", handleWidgetCall);
    };
  }, [executeDatabaseTool]);

  return (
    <div className="w-full flex flex-col items-center justify-center p-6 bg-slate-900/60 border border-slate-800 rounded-3xl backdrop-blur-xl relative overflow-hidden shadow-2xl">
      {/* Background Accent Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Script from ElevenLabs CDN - Exactly what powers elevenlabs.io/agents/telecommunications */}
      <Script
        src="https://unpkg.com/@elevenlabs/convai-widget-embed"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />

      {/* Header Info */}
      <div className="text-center max-w-xl mb-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
          <Zap className="w-3.5 h-3.5" />
          <span>Official ElevenLabs Telecom Embed Engine + Live MongoDB Tools</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white font-['Outfit'] mb-2">
          Official ElevenLabs Conversational AI Widget
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          This is the exact same widget architecture and LiveKit WebRTC pipeline featured on the official{" "}
          <a
            href="https://elevenlabs.io/agents/telecommunications"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline hover:text-emerald-300"
          >
            ElevenLabs Telecom Demo
          </a>
          , with full live client tools connected to our MongoDB Supermarket Database!
        </p>
      </div>

      {/* Widget Container */}
      <div className="my-4 relative z-10 flex flex-col items-center justify-center min-h-[140px] w-full">
        {/* Render Official Custom Web Component */}
        {React.createElement("elevenlabs-convai", {
          "agent-id": agentId,
          style: { width: "100%", display: "flex", justifyContent: "center" },
        })}

        {!scriptLoaded && (
          <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse mt-2">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span>Loading official ElevenLabs widget engine...</span>
          </div>
        )}
      </div>

      {/* Badge & Help Guide */}
      <div className="mt-4 pt-4 border-t border-slate-800/80 w-full max-w-lg flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2 relative z-10">
        <div className="flex items-center gap-1.5 font-mono text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>MongoDB Tools Active: Low Stock, Inventory, Aisles, Customers</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Click the widget button above to talk!</span>
        </div>
      </div>
    </div>
  );
}
