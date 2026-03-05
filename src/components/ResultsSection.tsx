"use client";

import { useState } from "react";
import type { AnalyzeResponse } from "@/lib/types";
import ClipCard, { formatClipText } from "./ClipCard";

function SkeletonCard() {
  return (
    <div className="bg-surface-2 border border-surface-3 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-surface-3 border-b border-surface-4">
        <div className="flex gap-2">
          <div className="h-4 w-6 shimmer rounded" />
          <div className="h-4 w-20 shimmer rounded-full" />
        </div>
        <div className="h-4 w-24 shimmer rounded" />
      </div>
      <div className="p-5 space-y-3">
        <div className="h-6 w-3/4 shimmer rounded" />
        <div className="h-4 w-full shimmer rounded" />
        <div className="h-4 w-5/6 shimmer rounded" />
        <div className="h-3 w-full shimmer rounded" />
        <div className="h-2 w-full shimmer rounded-full mt-4" />
        <div className="h-10 w-full shimmer rounded-lg mt-2" />
      </div>
    </div>
  );
}

export default function ResultsSection({ data, isLoading }: { data: AnalyzeResponse; isLoading: boolean }) {
  const [copiedAll, setCopiedAll] = useState(false);

  if (!isLoading && data.clips.length === 0) return null;

  async function handleCopyAll() {
    const allText = data.clips
      .map((clip, i) => `--- CLIP ${i + 1} ---\n${formatClipText(clip)}`)
      .join("\n\n");
    await navigator.clipboard.writeText(allText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  }

  return (
    <section id="results" className="mt-16 scroll-mt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-3xl text-white tracking-wide">
            {isLoading ? "SCANNING FOR MOMENTS..." : `${data.clips.length} VIRAL CLIPS FOUND`}
          </h2>
          {!isLoading && data.usedEstimatedTimestamps && (
            <p className="text-xs text-zinc-500 mt-1">⚠️ Timestamps are estimated — no timestamps detected in source</p>
          )}
        </div>

        {!isLoading && data.clips.length > 0 && (
          <button
            onClick={handleCopyAll}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              copiedAll
                ? "bg-green-950/50 border-green-700/50 text-green-400"
                : "bg-surface-2 border-surface-4 text-zinc-300 hover:border-brand-500/50 hover:text-brand-400"
            }`}
          >
            {copiedAll ? (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>All copied!</>
            ) : (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>Copy all</>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : data.clips.map((clip, i) => <ClipCard key={i} clip={clip} index={i} />)}
      </div>
    </section>
  );
}