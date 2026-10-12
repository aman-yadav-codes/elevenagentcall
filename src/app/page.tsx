"use client";

import React, { useState, useCallback } from "react";
import { ConversationProvider, useConversation, useConversationClientTool } from "@elevenlabs/react";
import {
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Settings,
  Store,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Zap,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import { AudioOrb } from "@/components/AudioOrb";
import { TranscriptFeed, MessageItem } from "@/components/TranscriptFeed";
import { DatabasePanel } from "@/components/DatabasePanel";
import { OfficialTelecomWidget } from "@/components/OfficialTelecomWidget";

function SupermarketVoiceManager() {
  const [agentId, setAgentId] = useState<string>(
    process.env.NEXT_PUBLIC_AGENT_ID || "agent_0701m4qgzp9efg582te690zt2mwf"
  );
  const [showSettings, setShowSettings] = useState(false);
  const [activeMode, setActiveMode] = useState<"cockpit" | "telecom_widget">("cockpit");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeProtocol, setActiveProtocol] = useState<"webrtc" | "websocket">("webrtc");

  // Helper to add messages with strict memory bounds (max 50 to prevent memory leaks)
  const appendMessage = useCallback((msg: MessageItem) => {
    setMessages((prev) => [...prev.slice(-49), msg]);
  }, []);

  // Database tool execution helper
  const executeDbAction = useCallback(async (action: string, parameters: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/tools/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, parameters }),
      });
      const json = await res.json();
      appendMessage({
        id: `tool-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        source: "system",
        text: `MongoDB Tool Executed: ${action} (${JSON.stringify(parameters)})`,
        timestamp: new Date().toLocaleTimeString(),
        toolEvent: {
          toolName: action,
          params: parameters,
          result: json.data,
        },
      });
      return JSON.stringify(json.data);
    } catch (e) {
      console.error(`Tool ${action} execution failed:`, e);
      return JSON.stringify({ error: String(e) });
    }
  }, [appendMessage]);

  // Official ElevenLabs React SDK Tool Registration via useConversationClientTool
  useConversationClientTool("check_product_stock", async (parameters: Record<string, unknown>) => {
    return executeDbAction("check_product_stock", parameters);
  });

  useConversationClientTool("get_low_stock_alerts", async (parameters: Record<string, unknown>) => {
    return executeDbAction("get_low_stock_alerts", parameters);
  });

  useConversationClientTool("get_section_overview", async (parameters: Record<string, unknown>) => {
    return executeDbAction("get_section_overview", parameters);
  });

  useConversationClientTool("get_customer_info", async (parameters: Record<string, unknown>) => {
    return executeDbAction("get_customer_info", parameters);
  });

  useConversationClientTool("update_product_stock", async (parameters: Record<string, unknown>) => {
    return executeDbAction("update_product_stock", parameters);
  });

  useConversationClientTool("update_customer_record", async (parameters: Record<string, unknown>) => {
    return executeDbAction("update_customer_record", parameters);
  });

  useConversationClientTool("delete_customer_record", async (parameters: Record<string, unknown>) => {
    return executeDbAction("delete_customer_record", parameters);
  });

  useConversationClientTool("delete_product_record", async (parameters: Record<string, unknown>) => {
    return executeDbAction("delete_product_record", parameters);
  });

  // Initialize ElevenLabs Conversational AI hook
  const conversation = useConversation({
    onConnect: () => {
      setErrorMsg(null);
      appendMessage({
        id: `msg-${Date.now()}`,
        source: "system",
        text: `Connected to ElevenLabs AI Agent via LiveKit WebRTC (Full-Duplex Automatic Barge-in Active)`,
        timestamp: new Date().toLocaleTimeString(),
      });
    },
    onDisconnect: () => {
      appendMessage({
        id: `msg-${Date.now()}`,
        source: "system",
        text: "Voice session ended",
        timestamp: new Date().toLocaleTimeString(),
      });
    },
    onMessage: (message: { message: string; source: "user" | "ai" }) => {
      appendMessage({
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        source: message.source,
        text: message.message,
        timestamp: new Date().toLocaleTimeString(),
      });
    },
    onInterruption: () => {
      appendMessage({
        id: `msg-${Date.now()}-interrupt`,
        source: "system",
        text: "⚡ User Barge-in Detected: AI playback immediately paused to listen.",
        timestamp: new Date().toLocaleTimeString(),
      });
    },
    onError: (err: unknown) => {
      console.error("ElevenLabs Agent Error:", err);
      const text = typeof err === "string" ? err : (err as Error)?.message || "Agent session encounter";
      setErrorMsg(text);
    },
  });

  const handleStartSession = useCallback(async () => {
    setErrorMsg(null);
    try {
      // Fetch WebRTC conversation token from backend
      const res = await fetch(`/api/agent?agent_id=${encodeURIComponent(agentId)}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to retrieve session authorization");
      }

      if (data.connectionType === "webrtc" && data.conversationToken) {
        setActiveProtocol("webrtc");
        await conversation.startSession({
          conversationToken: data.conversationToken,
          connectionType: "webrtc",
        });
      } else if (data.signedUrl) {
        setActiveProtocol("websocket");
        await conversation.startSession({
          signedUrl: data.signedUrl,
        });
      }
    } catch (err: unknown) {
      console.error("Failed to start session:", err);
      const text = err instanceof Error ? err.message : "Could not connect to microphone or agent.";
      setErrorMsg(text);
    }
  }, [agentId, conversation]);

  const handleEndSession = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (err) {
      console.error("Failed to end session:", err);
    }
  }, [conversation]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    conversation.setVolume({ volume: next ? 0 : 1 });
  };

  const handleSimulateTool = (toolName: string, query: string) => {
    appendMessage({
      id: `sim-${Date.now()}`,
      source: "system",
      text: `Simulated Query: ${toolName} for "${query}"`,
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  return (
    <main className="min-h-screen bg-[#07090e] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(99,102,241,0.08),rgba(255,255,255,0))] text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 backdrop-blur-md bg-slate-950/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Store className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base tracking-tight text-white font-['Outfit']">
                  MarketVoice AI
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold uppercase tracking-wider">
                  Manager Co-Pilot
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono">
                  <Zap className="w-2.5 h-2.5" />
                  LiveKit WebRTC
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Supermarket Sections, Categories & MongoDB Live Voice Co-Pilot (Full Read & Write)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
              <button
                onClick={() => setActiveMode("cockpit")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-medium ${
                  activeMode === "cockpit"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Manager Cockpit</span>
              </button>
              <button
                onClick={() => setActiveMode("telecom_widget")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-medium ${
                  activeMode === "telecom_widget"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Official Telecom Demo Widget</span>
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span>Agent:</span>
              <span className="text-emerald-300 truncate max-w-[130px]">{agentId}</span>
            </div>

            <button
              onClick={() => setShowSettings(!showSettings)}
              aria-label="Agent configuration settings"
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs cursor-pointer"
              title="Agent Settings"
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            <a
              href="https://elevenlabs.io/agents/telecommunications"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open official ElevenLabs Telecom Demo in new tab"
              className="p-2 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 transition-all flex items-center gap-1 text-xs"
              title="Official ElevenLabs Telecom Demo"
            >
              <span className="hidden sm:inline">Telecom Demo</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="border-b border-emerald-500/20 bg-slate-900/90 backdrop-blur-xl px-4 py-4 animate-in fade-in slide-in-from-top duration-200">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4 justify-between">
            <div className="w-full sm:w-auto flex-1">
              <label htmlFor="agent-id-setting" className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                ElevenLabs Voice Agent ID:
              </label>
              <input
                id="agent-id-setting"
                type="text"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="e.g. agent_0701m4qgzp9efg582te690zt2mwf"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto pt-2 sm:pt-4">
              <button
                onClick={() => setShowSettings(false)}
                aria-label="Save and close settings"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition-all cursor-pointer"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="bg-rose-950/60 border-y border-rose-500/30 px-4 py-2 text-xs text-rose-300 flex items-center justify-between" role="alert">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} aria-label="Dismiss alert" className="text-rose-400 hover:text-rose-200 ml-4 font-bold cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full flex flex-col gap-6">
        {/* If user selected the Official Telecom Widget tab */}
        {activeMode === "telecom_widget" ? (
          <div className="w-full flex flex-col gap-6">
            <OfficialTelecomWidget agentId={agentId} />
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[440px]">
              <TranscriptFeed
                messages={messages}
                onPromptClick={() => setActiveMode("cockpit")}
              />
              <DatabasePanel onSimulateTool={handleSimulateTool} />
            </section>
          </div>
        ) : (
          <>
            {/* Top Hero: Voice Orb with Manager Fast-Action Prompts */}
            <section className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 md:p-8 backdrop-blur-md relative overflow-hidden shadow-2xl flex flex-col items-center">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98108_1px,transparent_1px),linear-gradient(to_bottom,#10b98108_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

              {/* Central 3D Glowing Audio Orb */}
              <AudioOrb
                status={conversation.status}
                isSpeaking={conversation.isSpeaking}
                mode={conversation.status === "connected" ? (conversation.isSpeaking ? "speaking" : "listening") : "idle"}
              />

              {/* Control Bar */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4 relative z-10">
                {conversation.status === "connected" ? (
                  <>
                    <button
                      onClick={handleEndSession}
                      aria-label="End voice session"
                      className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
                    >
                      <PhoneOff className="w-4 h-4" aria-hidden="true" />
                      <span>End Session</span>
                    </button>

                    <button
                      onClick={toggleMute}
                      aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        isMuted
                          ? "bg-amber-600/20 border-amber-500/40 text-amber-300"
                          : "bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300"
                      }`}
                      title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                    >
                      {isMuted ? <MicOff className="w-4 h-4" aria-hidden="true" /> : <Mic className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleStartSession}
                    disabled={conversation.status === "connecting"}
                    aria-label="Start manager voice session"
                    className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 active:scale-95 text-white font-semibold text-sm flex items-center gap-2.5 shadow-xl shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-60"
                  >
                    <PhoneCall className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {conversation.status === "connecting"
                        ? "Connecting via WebRTC..."
                        : "Start Manager Voice Session"}
                    </span>
                  </button>
                )}
              </div>

              {/* Real-time WebRTC Barge-In Badge */}
              <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950/50 px-3 py-1 rounded-full border border-slate-800/70 text-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>
                  <strong>Full-Duplex WebRTC Active:</strong> Speak naturally while the AI talks—it instantly cuts off and listens.
                </span>
              </div>

              {/* Manager Voice Chips */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 max-w-2xl relative z-10">
                <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                  Try asking:
                </span>
                {[
                  "Add note to Aman: Father prefers lactose-free milk",
                  "How much Whole Milk is left in the Dairy Section?",
                  "What items are currently low on stock?",
                  "What does customer Aman usually buy every week?",
                  "Aman ka record update karo (Hinglish)",
                ].map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (conversation.status !== "connected") {
                        handleStartSession();
                      }
                    }}
                    aria-label={`Prompt example: ${p}`}
                    className="text-xs bg-slate-950/70 hover:bg-emerald-950/60 hover:border-emerald-500/40 border border-slate-800 rounded-full px-3 py-1 text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    &quot;{p}&quot;
                  </button>
                ))}
              </div>
            </section>

            {/* Lower Grid: Transcript vs Supermarket Hub */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[440px]">
              <TranscriptFeed
                messages={messages}
                onPromptClick={() => {
                  if (conversation.status !== "connected") {
                    handleStartSession();
                  }
                }}
              />

              <DatabasePanel onSimulateTool={handleSimulateTool} />
            </section>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MarketVoice • Powered by ElevenLabs Conversational AI & MongoDB Atlas Cluster0</span>
          <div className="flex items-center gap-4">
            <span className="text-emerald-400 font-mono">Protocol: {activeProtocol.toUpperCase()} (LiveKit)</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <ConversationProvider>
      <SupermarketVoiceManager />
    </ConversationProvider>
  );
}
