"use client";

import { useState } from "react";
import type { ClipResult } from "@/lib/types";

const CATEGORY_CONFIG = {
  intense:   { label: "INTENSE",   bg: "bg-red-950/60",    border: "border-red-800/40",    text: "text-red-400",    dot: "bg-red-500"    },
  funny:     { label: "FUNNY",     bg: "bg-yellow-950/60", border: "border-yellow-800/40", text: "text-yellow-400", dot: "bg-yellow-400" },
  emotional: { label: "EMOTIONAL", bg: "bg-blue-950/60",   border: "border-blue-800/40",   text: "text-blue-400",   dot: "bg-blue-400"   },
};

export function formatClipText(clip: ClipResult): string {
  return [
    `🎬 ${clip.title}`,
    `⏱ ${clip.start_time} → ${clip.end_time}`,
    `🪝 Hook: ${clip.hook}`,
    `💡 Why it works: ${clip.why_it_works}`,
    `📊 Confidence: ${clip.confidence}/100`,
    `🏷 Category: ${clip.category}`,
    clip.timestampsAreEstimates ? "⚠️ Timestamps are estimates" : "",
  ].filter(Boolean).join("\n");
}

export default function ClipCard({ clip, index }: { clip: ClipResult; index: number }) {
  const [copied, setCopied] = useState(false);
  const cat = CATEGORY_CONFIG[clip.category] ?? CATEGORY_CONFIG.intense;
  const confidenceColor = clip.confidence >= 90 ? "bg-green-500" : clip.confidence >= 70 ? "bg-brand-500" : "bg-yellow-500";

  async function handleCopy() {
    await navigator.clipboard.writeText(formatClipText(clip));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="clip-card bg-surface-2 border border-surface-3 rounded-xl overflow-hidden animate-fade-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both", opacity: 0 }}
    >
      <div className="flex items-center justify-between px-4 py-3 bg-surface-3 border-b border-surface-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-zinc-500">#{index + 1}</span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-medium px-2 py-0.5 rounded-full border ${cat.bg} ${cat.border} ${cat.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
            {cat.label}
          </span>
          {clip.timestampsAreEstimates && (
            <span className="text-xs text-zinc-500 border border-zinc-700 px-2 py-0.5 rounded-full">~estimated</span>
          )}
        </div>
        <span className="font-mono text-xs text-zinc-400">{clip.start_time} → {clip.end_time}</span>
      </div>

      <div className="p-5">
        <h3 className="font-display text-xl text-white leading-tight mb-2 tracking-wide">{clip.title}</h3>
        <p className="text-sm text-zinc-300 mb-4 leading-relaxed">
          <span className="text-brand-500 font-medium">Hook:</span> {clip.hook}
        </p>
        <p className="text-xs text-zinc-500 leading-relaxed mb-5">{clip.why_it_works}</p>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-zinc-500 font-mono">Confidence</span>
            <span className="text-xs font-mono font-medium text-white">{clip.confidence}/100</span>
          </div>
          <div className="h-1.5 bg-surface-4 rounded-full overflow-hidden">
            <div className={`h-full rounded-full confidence-fill ${confidenceColor}`} style={{ width: `${clip.confidence}%` }} />
          </div>
        </div>

        <button
          onClick={handleCopy}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
            copied
              ? "bg-green-950/50 border-green-800/50 text-green-400"
              : "bg-surface-3 border-surface-4 text-zinc-300 hover:bg-brand-600/20 hover:border-brand-600/40 hover:text-brand-400"
          }`}
        >
          {copied ? (
            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied!</>
          ) : (
            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy this clip</>
          )}
        </button>
      </div>
    </div>
  );
}