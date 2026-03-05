"use client";

import { useState, useRef } from "react";
import type { AnalyzeResponse } from "@/lib/types";

interface InputCardProps {
  onResults: (data: AnalyzeResponse) => void;
  onLoading: (loading: boolean) => void;
  isLoading: boolean;
}

export default function InputCard({ onResults, onLoading, isLoading }: InputCardProps) {
  const [tab, setTab] = useState<"url" | "transcript">("url");
  const [urlValue, setUrlValue] = useState("");
  const [transcriptValue, setTranscriptValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function validate(): string | null {
    if (tab === "url") {
      const v = urlValue.trim();
      if (!v) return "Please paste a YouTube URL.";
      if (!v.includes("youtube.com") && !v.includes("youtu.be"))
        return "That doesn't look like a YouTube URL.";
    } else {
      const v = transcriptValue.trim();
      if (!v) return "Please paste a transcript.";
      if (v.length < 50) return "Transcript is too short.";
    }
    return null;
  }

  async function handleSubmit() {
    setError(null);
    const err = validate();
    if (err) { setError(err); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    onLoading(true);
    onResults({ clips: [] });

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: tab,
          input: tab === "url" ? urlValue.trim() : transcriptValue.trim(),
        }),
        signal: controller.signal,
      });

      const data: AnalyzeResponse = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        onResults({ clips: [] });
        return;
      }

      onResults(data);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError("Network error. Please check your connection and try again.");
      onResults({ clips: [] });
    } finally {
      onLoading(false);
    }
  }

  return (
    <div className="bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden glow-orange">
      <div className="flex border-b border-surface-3">
        {(["url", "transcript"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
              tab === t
                ? "tab-active text-white bg-surface-2"
                : "text-zinc-500 hover:text-zinc-300 bg-surface-1"
            }`}
          >
            {t === "url" ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                YouTube URL
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Paste Transcript
              </>
            )}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === "url" ? (
          <div>
            <label className="block text-xs text-zinc-500 mb-2 font-mono uppercase tracking-wider">
              YouTube Video URL
            </label>
            <input
              type="url"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full bg-surface-2 border border-surface-4 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all"
            />
            <p className="text-xs text-zinc-600 mt-2">
              Works best with videos that have captions enabled.
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-xs text-zinc-500 mb-2 font-mono uppercase tracking-wider">
              Transcript Text
            </label>
            <textarea
              value={transcriptValue}
              onChange={(e) => setTranscriptValue(e.target.value)}
              placeholder={`Paste your transcript here.\n\n[0:00] Hey everyone, welcome back...\n[1:24] So here's the thing nobody talks about...`}
              rows={8}
              className="w-full bg-surface-2 border border-surface-4 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all resize-none font-mono leading-relaxed"
            />
            <p className="text-xs text-zinc-600 mt-2">
              Timestamps like <code className="text-zinc-500">[1:24]</code> are parsed automatically.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-3 bg-red-950/40 border border-red-800/40 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="mt-5 w-full flex items-center justify-center gap-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-700 disabled:opacity-60 text-white font-display text-xl tracking-widest py-4 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/25 active:scale-[0.99]"
        >
          {isLoading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              ANALYZING...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              FIND CLIPS
            </>
          )}
        </button>
      </div>
    </div>
  );
}