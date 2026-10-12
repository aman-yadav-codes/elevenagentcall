"use client";

import React, { useRef, useEffect } from "react";
import { User, Bot, Sparkles, Database, CheckCircle2 } from "lucide-react";

export interface MessageItem {
  id: string;
  source: "user" | "ai" | "system";
  text: string;
  timestamp: string;
  toolEvent?: {
    toolName: string;
    params?: unknown;
    result?: unknown;
  };
}

interface TranscriptFeedProps {
  messages: MessageItem[];
  onPromptClick: (prompt: string) => void;
}

export const TranscriptFeed: React.FC<TranscriptFeedProps> = ({ messages, onPromptClick }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Live Conversation Transcript
          </h2>
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {messages.length} event{messages.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Message Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[320px] max-h-[460px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">No active conversation yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Click <span className="text-indigo-400 font-semibold">Start Voice Session</span> and speak into your microphone, or try one of the prompts below:
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center max-w-sm pt-2">
              {[
                "What is the status of order ORD-9401?",
                "Can you check Aman's account balance?",
                "Do you have HyperAudio Headsets in stock?",
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => onPromptClick(p)}
                  className="text-xs bg-slate-800/70 hover:bg-indigo-950/70 hover:border-indigo-500/40 border border-slate-700/60 rounded-xl px-3 py-1.5 text-slate-300 transition-all text-left flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  &quot;{p}&quot;
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.source === "user";
            const isSys = m.source === "system";

            if (isSys) {
              return (
                <div key={m.id} className="flex justify-center my-2">
                  <div className="px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/40 text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                    <Database className="w-3 h-3 text-cyan-400" />
                    {m.text}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                    isUser
                      ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                      : "bg-fuchsia-600/20 border-fuchsia-500/40 text-fuchsia-300"
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-lg ${
                    isUser
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none"
                      : "bg-slate-800/90 border border-slate-700/60 text-slate-200 rounded-tl-none"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">
                      {isUser ? "You" : "ElevenVoice AI"}
                    </span>
                    <span className="text-[10px] opacity-60 font-mono">{m.timestamp}</span>
                  </div>

                  <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>

                  {/* Tool Call event attached */}
                  {m.toolEvent && (
                    <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex flex-col gap-1 text-[11px] font-mono text-cyan-300 bg-cyan-950/30 p-2 rounded-lg border border-cyan-500/20">
                      <div className="flex items-center gap-1 font-semibold text-cyan-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Tool Executed: {m.toolEvent.toolName}</span>
                      </div>
                      {Boolean(m.toolEvent.params) && (
                        <div className="text-slate-400 truncate">
                          Params: {JSON.stringify(m.toolEvent.params)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
