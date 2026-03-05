const STEPS = [
  {
    number: "01",
    title: "Drop your content",
    desc: "Paste any YouTube URL or your own transcript. Timestamps help but aren't required.",
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
  },
  {
    number: "02",
    title: "AI scans every moment",
    desc: "Claude reads the full transcript looking for hooks, payoffs, emotional shifts, and standalone value.",
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
  },
  {
    number: "03",
    title: "Get 6 ranked candidates",
    desc: "Each clip comes with timestamps, a hook, and a confidence score so you know exactly what to cut.",
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  },
  {
    number: "04",
    title: "Copy and ship",
    desc: "Hit copy on any clip to grab the timestamps and metadata. Open your editor and start cutting.",
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
  },
];

export default function HowItWorks() {
  return (
    <section className="mt-28" id="how-it-works">
      <div className="flex items-center gap-3 mb-12">
        <span className="h-px flex-1 bg-surface-3" />
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest px-3">The 60-second method</span>
        <span className="h-px flex-1 bg-surface-3" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STEPS.map((step) => (
          <div key={step.number} className="bg-surface-1 border border-surface-3 rounded-xl p-6 relative overflow-hidden group hover:border-brand-500/30 transition-colors">
            <div className="absolute top-4 right-4 font-display text-5xl text-surface-3 group-hover:text-surface-4 transition-colors select-none">{step.number}</div>
            <div className="text-brand-500 mb-4">{step.icon}</div>
            <h3 className="font-display text-lg text-white tracking-wide mb-2">{step.title}</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-surface-1 border border-surface-3 rounded-xl p-6 flex items-start gap-4">
        <div className="text-brand-500 shrink-0 mt-0.5">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <div>
          <p className="text-sm text-zinc-300 font-medium mb-1">Why 60 seconds?</p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Short-form platforms reward clips that hook within 3 seconds and resolve within 60–90. ClipRush specifically looks for moments that work inside that window — with a clear open, a turning point, and a payoff — so your clips don't just get watched, they get rewatched and shared.
          </p>
        </div>
      </div>
    </section>
  );
}