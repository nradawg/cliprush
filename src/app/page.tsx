"use client";

import { useState, useRef } from "react";
import type { AnalyzeResponse } from "@/lib/types";
import InputCard from "@/components/InputCard";
import ResultsSection from "@/components/ResultsSection";
import HowItWorks from "@/components/HowItWorks";
import ExampleSection from "@/components/ExampleSection";
import Footer from "@/components/Footer";

export default function HomePage() {
  const [results, setResults] = useState<AnalyzeResponse>({ clips: [] });
  const [isLoading, setIsLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  function handleResults(data: AnalyzeResponse) {
    setResults(data);
    if (data.clips.length > 0) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }

  function handleLoading(loading: boolean) {
    setIsLoading(loading);
    if (loading) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }

  return (
    <main className="min-h-screen">
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-4">
        <div className="flex justify-center mb-10">
          <span className="inline-flex items-center gap-2 bg-surface-2 border border-surface-3 px-4 py-2 rounded-full text-xs font-mono text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse2" />
            AI-powered clip finder — no account needed
          </span>
        </div>

        <div className="text-center mb-6">
          <h1 className="font-display text-6xl sm:text-8xl md:text-9xl text-white tracking-widest leading-none mb-4">
            CLIP<span className="text-brand-500">RUSH</span>
          </h1>
          <p className="text-lg sm:text-xl text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Drop a YouTube URL or transcript. Get{" "}
            <span className="text-white font-medium">6 viral clip moments</span> with timestamps,
            hooks, and confidence scores — in seconds.
          </p>
        </div>

        <div className="flex items-center justify-center gap-8 mb-14">
          {[
            { value: "6", label: "clips per run" },
            { value: "60s", label: "max clip length" },
            { value: "0", label: "accounts needed" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-3xl text-brand-500 tracking-wider">{stat.value}</div>
              <div className="text-xs text-zinc-600 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto">
          <InputCard onResults={handleResults} onLoading={handleLoading} isLoading={isLoading} />
        </div>
      </section>

      <section ref={resultsRef} className="max-w-5xl mx-auto px-6">
        <ResultsSection data={results} isLoading={isLoading} />
      </section>

      <section className="max-w-5xl mx-auto px-6">
        <HowItWorks />
        <ExampleSection />
      </section>

      <div className="max-w-5xl mx-auto px-6">
        <Footer />
      </div>
    </main>
  );
}