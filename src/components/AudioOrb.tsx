"use client";

import React, { useMemo } from "react";
import { Mic, Volume2, Sparkles, Radio } from "lucide-react";

interface AudioOrbProps {
  status: "connected" | "connecting" | "disconnected" | "error" | string;
  isSpeaking: boolean;
  mode: "speaking" | "listening" | string;
}

export const AudioOrb: React.FC<AudioOrbProps> = ({ status, isSpeaking, mode }) => {
  const stateMeta = useMemo(() => {
    if (status === "connecting") {
      return {
        label: "Connecting to ElevenLabs...",
        accent: "from-amber-500/20 via-orange-500/20 to-amber-600/30",
        ringColor: "border-amber-400/40",
        pulseGlow: "rgba(245, 158, 11, 0.4)",
        icon: <Radio className="w-8 h-8 text-amber-400 animate-pulse" aria-hidden="true" />,
      };
    }
    if (status === "connected") {
      if (isSpeaking || mode === "speaking") {
        return {
          label: "Agent is Speaking (Voice Output Active)",
          accent: "from-violet-600/30 via-fuchsia-600/25 to-indigo-600/35",
          ringColor: "border-violet-400/60",
          pulseGlow: "rgba(168, 85, 247, 0.55)",
          icon: <Volume2 className="w-8 h-8 text-violet-300 animate-bounce" aria-hidden="true" />,
        };
      }
      return {
        label: "Listening to Manager Voice...",
        accent: "from-emerald-500/20 via-cyan-500/25 to-teal-500/25",
        ringColor: "border-emerald-400/50",
        pulseGlow: "rgba(16, 185, 129, 0.45)",
        icon: <Mic className="w-8 h-8 text-emerald-300 animate-pulse" aria-hidden="true" />,
      };
    }
    return {
      label: "Ready to Connect (Supermarket AI Online)",
      accent: "from-slate-800/40 via-indigo-950/30 to-slate-900/50",
      ringColor: "border-indigo-500/20",
      pulseGlow: "rgba(99, 102, 241, 0.15)",
      icon: <Sparkles className="w-8 h-8 text-indigo-400/70" aria-hidden="true" />,
    };
  }, [status, isSpeaking, mode]);

  // Static bar scale delays for pure GPU 60fps animations with ZERO JS overhead
  const barDelays = ["0s", "0.2s", "0.4s", "0.15s", "0.35s", "0.25s", "0.1s"];

  return (
    <div
      className="relative flex flex-col items-center justify-center p-8 select-none"
      role="region"
      aria-label="Voice Visualizer"
    >
      {/* Outer ambient glow - GPU accelerated with will-change */}
      <div
        className="absolute w-72 h-72 rounded-full transition-all duration-700 blur-3xl pointer-events-none will-change-transform"
        style={{
          backgroundColor: stateMeta.pulseGlow,
          transform: status === "connected" ? (isSpeaking ? "scale(1.25)" : "scale(1.05)") : "scale(0.8)",
        }}
      />

      {/* Ripple ring 1 */}
      {status === "connected" && (
        <div
          className={`absolute w-64 h-64 rounded-full border ${stateMeta.ringColor} transition-all duration-700 ${
            isSpeaking ? "animate-pulse-ring" : "animate-pulse"
          }`}
        />
      )}

      {/* Ripple ring 2 */}
      {status === "connected" && isSpeaking && (
        <div
          className="absolute w-80 h-80 rounded-full border border-violet-500/20 animate-pulse-ring"
          style={{ animationDelay: "1s" }}
        />
      )}

      {/* Main Glowing Sphere */}
      <div
        className={`relative w-48 h-48 rounded-full flex flex-col items-center justify-center bg-gradient-to-tr ${stateMeta.accent} backdrop-blur-xl border ${stateMeta.ringColor} shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-500`}
      >
        <div className="absolute inset-2 rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

        <div className="relative z-10 transition-transform duration-300">
          {stateMeta.icon}
        </div>

        {/* Pure CSS Soundwave bars - zero memory allocations */}
        {status === "connected" && (
          <div className="flex items-center gap-1.5 mt-3 h-5">
            {barDelays.map((delay, i) => (
              <span
                key={i}
                className={`w-1 rounded-full transition-all ${
                  isSpeaking
                    ? "bg-violet-300 animate-pulse"
                    : "bg-emerald-300/80"
                }`}
                style={{
                  height: isSpeaking ? "18px" : "6px",
                  animationDelay: delay,
                  animationDuration: "0.8s",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* State label */}
      <div className="mt-5 text-center" role="status" aria-live="polite">
        <span
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium tracking-wide uppercase border backdrop-blur-md ${
            status === "connected"
              ? isSpeaking
                ? "bg-violet-950/60 border-violet-500/40 text-violet-300"
                : "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
              : status === "connecting"
              ? "bg-amber-950/60 border-amber-500/40 text-amber-300"
              : "bg-slate-900/60 border-slate-700/50 text-slate-400"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              status === "connected"
                ? isSpeaking
                  ? "bg-violet-400 animate-ping"
                  : "bg-emerald-400 animate-pulse"
                : status === "connecting"
                ? "bg-amber-400 animate-ping"
                : "bg-slate-500"
            }`}
          />
          {stateMeta.label}
        </span>
      </div>
    </div>
  );
};
